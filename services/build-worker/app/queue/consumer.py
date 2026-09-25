import redis
import json
import time
from datetime import datetime
from app.builder.docker_build import clone_and_build
from app.builder.k8s_deployer import deploy_to_kubernetes
from app.builder.security_scan import scan_image
from app.db.models import SessionLocal, Deployment, Project, UserCredential, init_db
from app.core.crypto import decrypt_token

redis_client = redis.Redis(
    host="localhost",
    port=6379,
    db=0,
    socket_keepalive=True,
    socket_timeout=None,
)

QUEUE_NAME = "build_jobs"


def consume_jobs():
    init_db()
    print("Build worker started. Waiting for jobs...")
    while True:
        try:
            result = redis_client.blpop(QUEUE_NAME, timeout=0)
            _, raw_job = result

            try:
                job = json.loads(raw_job)
                print(f"Picked up job: {job}")
                process_job(job)
            except json.JSONDecodeError:
                print(f"Skipping non-JSON item in queue: {raw_job}")

        except redis.exceptions.TimeoutError:
            print("Redis connection timed out while waiting — reconnecting...")
            time.sleep(1)
            continue

        except redis.exceptions.ConnectionError:
            print("Lost connection to Redis — retrying in 2 seconds...")
            time.sleep(2)
            continue


def process_job(job: dict):
    repo = job.get("repo")
    commit = job.get("commit")
    started_at = datetime.utcnow()

    # Dynamically resolve repository owner's OAuth access token from Postgres
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
                    print(f"Notice: Failed to decrypt user token for {repo}: {e}")
    finally:
        db.close()

    print(f"Building repo '{repo}' at commit '{commit}'...")
    build_result = clone_and_build(repo, commit, access_token=access_token)

    live_url = None
    scan_result = {"critical": 0, "high": 0}
    deployment_status = "failed"

    CRITICAL_THRESHOLD = 0  # any CRITICAL CVE triggers a review, doesn't auto-block

    if build_result["success"]:
        try:
            scan_result = scan_image(build_result["image_tag"])
        except Exception as e:
            print(f"Security scan failed: {e}")

        needs_review = scan_result.get("critical", 0) > CRITICAL_THRESHOLD

        if needs_review:
            # Surface security vulnerabilities for manual approval
            print(
                f"⚠️  {scan_result['critical']} CRITICAL vulnerabilities found. Deployment held for manual approval."
            )
            deployment_status = "pending_approval"
        else:
            try:
                print(f"Deploying {repo} to Kubernetes...")
                # Dynamic container port fallback
                container_port = 3000
                deploy_result = deploy_to_kubernetes(
                    repo, build_result["image_tag"], container_port
                )
                live_url = deploy_result["url"]
                print(f"Deployed successfully. Live at: {live_url}")
                deployment_status = "success"
            except Exception as e:
                print(f"Deployment to Kubernetes failed: {e}")
                deployment_status = "failed"

    finished_at = datetime.utcnow()

    db = SessionLocal()
    try:
        deployment = Deployment(
            repo=repo,
            commit_sha=commit,
            status=deployment_status,
            image_tag=build_result.get("image_tag"),
            logs=build_result.get("logs"),
            live_url=live_url,
            critical_vulns=scan_result.get("critical", 0),
            high_vulns=scan_result.get("high", 0),
            started_at=started_at,
            finished_at=finished_at,
        )
        db.add(deployment)
        db.commit()
        print(
            f"Recorded deployment #{deployment.id} — status: {deployment.status}"
        )
    finally:
        db.close()

    print(
        f"Job complete. Status: {deployment_status}, "
        f"Image: {build_result.get('image_tag')}, "
        f"Live URL: {live_url}, "
        f"Vulnerabilities: {scan_result.get('critical', 0)} critical / {scan_result.get('high', 0)} high"
    )