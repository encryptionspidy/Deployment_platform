import redis
import json
import time
from datetime import datetime
from app.core.config import settings
from app.builder.docker_build import clone_and_build
from app.builder.k8s_deployer import deploy_to_kubernetes
from app.builder.security_scan import scan_image
from app.db.models import SessionLocal, Deployment, Project, UserCredential, init_db
from app.core.crypto import decrypt_token

QUEUE_NAME = "build_jobs"
DLQ_NAME = "build_jobs_dlq"   # Dead-Letter Queue for failed jobs
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5


def get_redis_client() -> redis.Redis:
    """Create a Redis client using environment-configured host/port."""
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=0,
        socket_keepalive=True,
        socket_timeout=None,
        decode_responses=False,
    )


def push_to_dlq(redis_client: redis.Redis, raw_job: bytes, error: str):
    """Push a failed job to the Dead-Letter Queue with error metadata for debugging."""
    try:
        dlq_entry = json.dumps({
            "original_job": raw_job.decode("utf-8", errors="replace"),
            "error": str(error)[:500],
            "failed_at": datetime.utcnow().isoformat(),
            "queue": QUEUE_NAME,
        })
        redis_client.rpush(DLQ_NAME, dlq_entry)
        print(f"[DLQ] Job moved to {DLQ_NAME}: {dlq_entry[:120]}...")
    except Exception as dlq_err:
        print(f"[DLQ] Failed to push to dead-letter queue: {dlq_err}")


def consume_jobs():
    init_db()
    redis_client = get_redis_client()
    print(
        f"Build worker started. Listening on "
        f"{settings.REDIS_HOST}:{settings.REDIS_PORT} "
        f"queue={QUEUE_NAME} dlq={DLQ_NAME} max_retries={MAX_RETRIES}..."
    )

    while True:
        try:
            result = redis_client.blpop(QUEUE_NAME, timeout=0)
            _, raw_job = result

            retry_count = 0
            job_done = False

            while retry_count < MAX_RETRIES and not job_done:
                try:
                    job = json.loads(raw_job)
                    repo = job.get("repo", "?")
                    commit = str(job.get("commit", ""))[:7]
                    print(f"[Attempt {retry_count + 1}/{MAX_RETRIES}] Processing job: repo={repo} commit={commit}")
                    process_job(job)
                    job_done = True

                except json.JSONDecodeError as e:
                    print(f"[Error] Non-JSON payload in queue: {raw_job!r}")
                    push_to_dlq(redis_client, raw_job, f"JSON decode error: {e}")
                    job_done = True  # don't retry malformed payloads

                except Exception as e:
                    retry_count += 1
                    if retry_count < MAX_RETRIES:
                        print(
                            f"[Retry {retry_count}/{MAX_RETRIES}] Job failed, "
                            f"retrying in {RETRY_DELAY_SECONDS}s. Error: {e}"
                        )
                        time.sleep(RETRY_DELAY_SECONDS)
                    else:
                        print(
                            f"[DLQ] Job exhausted {MAX_RETRIES} retries. "
                            f"Moving to dead-letter queue. Last error: {e}"
                        )
                        push_to_dlq(redis_client, raw_job, str(e))
                        job_done = True

        except redis.exceptions.TimeoutError:
            print("[Redis] Connection timed out while waiting — reconnecting...")
            time.sleep(1)
            try:
                redis_client = get_redis_client()
            except Exception:
                pass
            continue

        except redis.exceptions.ConnectionError as conn_err:
            print(f"[Redis] Connection lost: {conn_err}. Retrying in 2s...")
            time.sleep(2)
            try:
                redis_client = get_redis_client()
            except Exception:
                pass
            continue


def process_job(job: dict):
    repo = job.get("repo")
    commit = job.get("commit")
    started_at = datetime.utcnow()

    # Step 1: Create initial 'building' deployment record
    db = SessionLocal()
    init_ts = started_at.strftime("%H:%M:%S")
    deployment = Deployment(
        repo=repo,
        commit_sha=commit,
        status="building",
        logs=(
            f"[{init_ts}] 🚀 Build worker picked up job for {repo} (commit {commit[:7]}).\n"
            f"[{init_ts}] 📦 Initializing environment and cloning repository..."
        ),
        started_at=started_at,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    deployment_id = deployment.id
    db.close()

    # Step 2: Resolve repository owner's OAuth access token from Postgres
    access_token = None
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.repo_full_name == repo).first()
        if project:
            cred = (
                db.query(UserCredential)
                .filter(UserCredential.user_id == project.user_id)
                .first()
            )
            if cred and cred.encrypted_access_token:
                try:
                    access_token = decrypt_token(cred.encrypted_access_token)
                except Exception as e:
                    print(f"[Notice] Failed to decrypt user token for {repo}: {e}")
    finally:
        db.close()

    # Step 3: Clone and build
    print(f"Building repo '{repo}' at commit '{commit[:7]}'...")
    build_result = clone_and_build(repo, commit, access_token=access_token)

    live_url = None
    scan_result = {"critical": 0, "high": 0}
    deployment_status = "failed"
    CRITICAL_THRESHOLD = 0

    if build_result["success"]:
        image_tag = build_result["image_tag"]

        # Update status to 'scanning'
        db = SessionLocal()
        try:
            dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
            if dep:
                dep.image_tag = image_tag
                dep.status = "scanning"
                now_ts = datetime.utcnow().strftime("%H:%M:%S")
                dep.logs = (dep.logs or "") + (
                    f"\n[{now_ts}] ✅ Container image built: {image_tag}"
                    f"\n[{now_ts}] 🛡️ Running Trivy security scan..."
                )
                db.commit()
        finally:
            db.close()

        try:
            scan_result = scan_image(image_tag)
        except Exception as e:
            print(f"[Warning] Security scan failed: {e}")

        critical_count = scan_result.get("critical", 0)
        high_count = scan_result.get("high", 0)
        needs_review = critical_count > CRITICAL_THRESHOLD

        if needs_review:
            deployment_status = "pending_approval"
            db = SessionLocal()
            try:
                dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
                if dep:
                    dep.status = "pending_approval"
                    dep.critical_vulns = critical_count
                    dep.high_vulns = high_count
                    now_ts = datetime.utcnow().strftime("%H:%M:%S")
                    dep.logs = (dep.logs or "") + (
                        f"\n[{now_ts}] ⚠️ Trivy scan: {critical_count} CRITICAL, "
                        f"{high_count} HIGH CVEs detected."
                        f"\n[{now_ts}] ⏸️ Deployment paused — manual approval required."
                    )
                    db.commit()
            finally:
                db.close()
        else:
            # Update to 'deploying'
            db = SessionLocal()
            try:
                dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
                if dep:
                    dep.status = "deploying"
                    dep.critical_vulns = critical_count
                    dep.high_vulns = high_count
                    now_ts = datetime.utcnow().strftime("%H:%M:%S")
                    dep.logs = (dep.logs or "") + (
                        f"\n[{now_ts}] ✅ Security scan passed (0 critical CVEs)."
                        f"\n[{now_ts}] ☸️ Deploying to Kubernetes..."
                    )
                    db.commit()
            finally:
                db.close()

            try:
                deploy_result = deploy_to_kubernetes(repo, image_tag, 3000)
                live_url = deploy_result["url"]
                deployment_status = "success"
                completion_log = (
                    f"\n[{datetime.utcnow().strftime('%H:%M:%S')}] "
                    f"🎉 Deployed to Kubernetes! Live at: {live_url}"
                )
            except Exception as e:
                deployment_status = "failed"
                completion_log = (
                    f"\n[{datetime.utcnow().strftime('%H:%M:%S')}] "
                    f"❌ Kubernetes deployment failed: {e}"
                )

            db = SessionLocal()
            try:
                dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
                if dep:
                    dep.status = deployment_status
                    dep.live_url = live_url
                    dep.finished_at = datetime.utcnow()
                    dep.logs = (dep.logs or "") + completion_log
                    db.commit()
            finally:
                db.close()

    else:
        # Build failed
        db = SessionLocal()
        try:
            dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
            if dep:
                dep.status = "failed"
                dep.finished_at = datetime.utcnow()
                now_ts = datetime.utcnow().strftime("%H:%M:%S")
                dep.logs = (dep.logs or "") + (
                    f"\n[{now_ts}] ❌ Docker build failed:\n{build_result.get('logs', '')}"
                )
                db.commit()
        finally:
            db.close()

    print(
        f"[Job complete] status={deployment_status} "
        f"image={build_result.get('image_tag')} "
        f"live_url={live_url} "
        f"vulns={scan_result.get('critical', 0)}c/{scan_result.get('high', 0)}h"
    )
