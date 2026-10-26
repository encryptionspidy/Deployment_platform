import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from sqlalchemy import create_engine, text
from prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST

load_dotenv()

app = FastAPI(title="Deploy Platform Metrics Exporter")

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://devops:devops123@localhost:5433/deploy_platform"
)
engine = create_engine(DATABASE_URL)

# Prometheus gauges
successful_deployments_gauge = Gauge(
    "deployments_successful_total",
    "Total successful deployments in the rolling 1-hour window",
)
total_deployments_gauge = Gauge(
    "deployments_total",
    "Total deployments attempted in the rolling 1-hour window",
)
success_rate_gauge = Gauge(
    "deployment_success_rate_percent",
    "Deployment success rate percentage (1-hour rolling window)",
)


def fetch_deployment_stats():
    """
    Queries Postgres for success/total counts in a 1-hour rolling window.
    Rolling window ensures the SLI reflects recent reliability.
    """
    query = text("""
        SELECT
            COUNT(*) FILTER (WHERE status = 'success') AS successful,
            COUNT(*) AS total
        FROM deployments
        WHERE started_at > NOW() - INTERVAL '1 hour';
    """)
    with engine.connect() as conn:
        result = conn.execute(query).fetchone()
        return result[0], result[1]


@app.get("/")
def read_root():
    return {"message": "Deploy Platform Metrics Exporter is running"}


@app.get("/healthz")
def healthz():
    """Liveness probe — returns OK if the process is alive."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    """Readiness probe — returns OK only if the database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {e}")


@app.get("/metrics")
def metrics():
    """
    Prometheus scrape endpoint. Queries Postgres on every scrape and
    updates gauges with fresh deployment statistics.
    """
    successful, total = fetch_deployment_stats()
    success_rate = round((successful / total) * 100, 2) if total > 0 else 0.0

    successful_deployments_gauge.set(successful)
    total_deployments_gauge.set(total)
    success_rate_gauge.set(success_rate)

    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
