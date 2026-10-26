import time
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.core.config import settings
from app.db.models import init_db
from app.api.routes import auth, projects, deployments, slo
from app.metrics.instrumentation import (
    http_requests_total,
    http_request_duration_seconds,
    http_errors_total,
)

app = FastAPI(title="Deploy Platform Dashboard API")

init_db()

# SessionMiddleware must be added first
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Record request count and latency for every request."""
    start = time.time()
    # Normalize endpoint path (strip path params like /slo/123 -> /slo/{id})
    path = request.url.path
    method = request.method

    response = await call_next(request)

    duration = time.time() - start
    status = str(response.status_code)

    http_requests_total.labels(method=method, endpoint=path, status_code=status).inc()
    http_request_duration_seconds.labels(method=method, endpoint=path).observe(duration)

    if response.status_code >= 400:
        http_errors_total.labels(method=method, endpoint=path, status_code=status).inc()

    return response


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(deployments.router)
app.include_router(slo.router)


@app.get("/")
def read_root():
    return {"message": "Deploy Platform Dashboard API is running"}


@app.get("/healthz")
def healthz():
    """Liveness probe — returns OK if the process is alive."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    """Readiness probe — checks database connectivity."""
    from sqlalchemy import text
    from app.db.models import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database not ready: {e}")


@app.get("/metrics")
def metrics():
    """Prometheus scrape endpoint for dashboard-backend metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
