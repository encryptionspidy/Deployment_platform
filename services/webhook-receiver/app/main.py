import time
from fastapi import FastAPI, Request, HTTPException, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.core.security import verify_signature
from app.core.config import settings
from app.queue.publisher import publish_build_job
from app.metrics.instrumentation import (
    webhooks_received_total,
    webhooks_invalid_signature_total,
    webhooks_processed_total,
    webhook_processing_duration_seconds,
)

app = FastAPI(title="Deploy Platform Webhook Receiver")


@app.get("/")
def read_root():
    return {"message": "Deploy Platform Webhook Receiver is running"}


@app.get("/healthz")
def healthz():
    """Liveness probe — returns OK if the process is alive."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    """Readiness probe — checks Redis connectivity."""
    import redis
    try:
        r = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            socket_timeout=2,
        )
        r.ping()
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Redis not ready: {e}")


@app.get("/metrics")
def metrics():
    """Prometheus scrape endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/webhook/github")
async def github_webhook(request: Request):
    start = time.time()
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if not verify_signature(body, signature, settings.GITHUB_WEBHOOK_SECRET):
        webhooks_invalid_signature_total.inc()
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()

    # Determine event type for metrics label
    if "head_commit" in payload:
        event_type = "push"
        repo_name = payload["repository"]["full_name"]
        commit_sha = payload["head_commit"]["id"]
        webhooks_received_total.labels(event_type=event_type).inc()
        publish_build_job(repo_name, commit_sha)
        webhooks_processed_total.labels(repo=repo_name).inc()
    elif "hook" in payload or "zen" in payload:
        event_type = "ping"
        webhooks_received_total.labels(event_type=event_type).inc()
        print("Received ping event — skipping queue publish")
    else:
        event_type = "unknown"
        webhooks_received_total.labels(event_type=event_type).inc()
        print(f"Received unhandled event type — skipping")

    webhook_processing_duration_seconds.observe(time.time() - start)
    return {"status": "received"}
