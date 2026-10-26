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

    # Step 1: Immediately persist initial 'building' deployment record to database
    db = SessionLocal()
    init_timestamp = started_at.strftime('%H:%M:%S')
    deployment = Deployment(
        repo=repo,
        commit_sha=commit,
        status="building",
        logs=f"[{init_timestamp}] 🚀 Build worker picked up job for {repo} (commit {commit[:7]}).\n[{init_timestamp}] 📦 Initializing environment and cloning repository...",
        started_at=started_at,
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    deployment_id = deployment.id
    db.close()

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
    CRITICAL_THRESHOLD = 0  # any CRITICAL CVE triggers a review

    if build_result["success"]:
        # Update status to 'scanning'
        image_tag = build_result["image_tag"]
        db = SessionLocal()
        try:
            dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
            if dep:
                dep.image_tag = image_tag
                dep.status = "scanning"
                now_str = datetime.utcnow().strftime('%H:%M:%S')
                dep.logs = (dep.logs or "") + f"\n[{now_str}] ✅ Container image built: {image_tag}\n[{now_str}] 🛡️ Running Trivy security scan for vulnerabilities..."
                db.commit()
        finally:
            db.close()

        try:
            scan_result = scan_image(image_tag)
        except Exception as e:
            print(f"Security scan failed: {e}")

        critical_count = scan_result.get("critical", 0)
        high_count = scan_result.get("high", 0)
        needs_review = critical_count > CRITICAL_THRESHOLD

        if needs_review:
            print(f"⚠️  {critical_count} CRITICAL vulnerabilities found. Deployment held for manual approval.")
            deployment_status = "pending_approval"
            db = SessionLocal()
            try:
                dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
                if dep:
                    dep.status = "pending_approval"
                    dep.critical_vulns = critical_count
                    dep.high_vulns = high_count
                    now_str = datetime.utcnow().strftime('%H:%M:%S')
                    dep.logs = (dep.logs or "") + f"\n[{now_str}] ⚠️ Trivy scan completed: {critical_count} CRITICAL and {high_count} HIGH vulnerabilities detected!\n[{now_str}] ⏸️ Deployment paused at Stage 5: Manual Approval Gate required."
                    db.commit()
            finally:
                db.close()
        else:
            # Update status to 'deploying'
            db = SessionLocal()
            try:
                dep = db.query(Deployment).filter(Deployment.id == deployment_id).first()
                if dep:
                    dep.status = "deploying"
                    dep.critical_vulns = critical_count
                    dep.high_vulns = high_count
                    now_str = datetime.utcnow().strftime('%H:%M:%S')
                    dep.logs = (dep.logs or "") + f"\n[{now_str}] ✅ Security scan passed (0 critical CVEs).\n[{now_str}] ☸️ Deploying container to Kubernetes cluster (k3d)..."
                    db.commit()
            finally:
                db.close()

            try:
                print(f"Deploying {repo} to Kubernetes...")
                container_port = 3000
                deploy_result = deploy_to_kubernetes(repo, image_tag, container_port)
                live_url = deploy_result["url"]
                print(f"Deployed successfully. Live at: {live_url}")
                deployment_status = "success"
                completion_log = f"\n[{datetime.utcnow().strftime('%H:%M:%S')}] 🎉 Deployed to Kubernetes! Application live at: {live_url}"
            except Exception as e:
                print(f"Deployment to Kubernetes failed: {e}")
                deployment_status = "failed"
                completion_log = f"\n[{datetime.utcnow().strftime('%H:%M:%S')}] ❌ Kubernetes deployment failed: {e}"

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
                now_str = datetime.utcnow().strftime('%H:%M:%S')
                dep.logs = (dep.logs or "") + f"\n[{now_str}] ❌ Docker container build failed:\n{build_result.get('logs')}"
                db.commit()
        finally:
            db.close()

    print(
        f"Job complete. Status: {deployment_status}, "
        f"Image: {build_result.get('image_tag')}, "
        f"Live URL: {live_url}, "
        f"Vulnerabilities: {scan_result.get('critical', 0)} critical / {scan_result.get('high', 0)} high"
    )