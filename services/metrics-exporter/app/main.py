from fastapi import FastAPI, Response
from sqlalchemy import create_engine, text
from prometheus_client import Gauge, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI()

# Same database, different port fix as build-worker (5433, not 5432)
DATABASE_URL = "postgresql://devops:devops123@127.0.0.1:5433/deploy_platform"
engine = create_engine(DATABASE_URL)

# Prometheus gauges — these hold the current value each time they're set
successful_deployments_gauge = Gauge(
    "deployments_successful_total",
    "Total number of successful deployments"
)
total_deployments_gauge = Gauge(
    "deployments_total",
    "Total number of deployments attempted"
)
success_rate_gauge = Gauge(
    "deployment_success_rate_percent",
    "Current deployment success rate as a percentage"
)


def fetch_deployment_stats():
    """
    Queries Postgres for success/total counts within a rolling time window.
    Using a rolling window (instead of all-time) means the SLI reflects
    recent reliability and can actually recover after an incident,
    rather than being permanently dragged down by old failures.
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
        successful, total = result[0], result[1]
        return successful, total


@app.get("/")
def read_root():
    return {"message": "Hello from metrics-exporter"}


@app.get("/metrics")
def metrics():
    """
    This is the endpoint Prometheus will scrape.
    Every time it's hit, we query Postgres fresh and update the gauges.
    """
    successful, total = fetch_deployment_stats()
    success_rate = round((successful / total) * 100, 2) if total > 0 else 0

    successful_deployments_gauge.set(successful)
    total_deployments_gauge.set(total)
    success_rate_gauge.set(success_rate)

    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)