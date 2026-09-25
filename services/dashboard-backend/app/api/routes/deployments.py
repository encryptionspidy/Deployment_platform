from fastapi import APIRouter, HTTPException, Request
from app.db.models import SessionLocal, Deployment, Project
from app.core.deps import get_current_user_with_token
from app.builder.k8s_deployer import deploy_to_kubernetes

router = APIRouter()


@router.get("/deployments/pending")
def list_pending_deployments(request: Request):
    """
    Returns deployments held for manual review for the logged-in user's repos.
    """
    auth_data = get_current_user_with_token(request)
    user = auth_data["user"]

    db = SessionLocal()
    try:
        user_projects = db.query(Project).filter(Project.user_id == user.id).all()
        user_repos = [p.repo_full_name for p in user_projects]

        if not user_repos:
            return []

        pending = (
            db.query(Deployment)
            .filter(
                Deployment.status == "pending_approval",
                Deployment.repo.in_(user_repos),
            )
            .all()
        )
        return [
            {
                "id": d.id,
                "repo": d.repo,
                "commit_sha": d.commit_sha,
                "image_tag": d.image_tag,
                "critical_vulns": d.critical_vulns,
                "high_vulns": d.high_vulns,
                "created_at": d.started_at,
            }
            for d in pending
        ]
    finally:
        db.close()


@router.get("/deployments")
def list_user_deployments(request: Request, repo: str = None, project_id: int = None):
    """
    Returns full deployment history scoped to the logged-in user's repos.
    Optionally filters by specific repo or project_id.
    """
    auth_data = get_current_user_with_token(request)
    user = auth_data["user"]

    db = SessionLocal()
    try:
        user_projects = db.query(Project).filter(Project.user_id == user.id).all()

        if project_id:
            user_projects = [p for p in user_projects if p.id == project_id]
        elif repo:
            user_projects = [p for p in user_projects if p.repo_full_name == repo]

        user_repos = [p.repo_full_name for p in user_projects]

        if not user_repos:
            return []

        deployments = (
            db.query(Deployment)
            .filter(Deployment.repo.in_(user_repos))
            .order_by(Deployment.id.desc())
            .all()
        )
        return [
            {
                "id": d.id,
                "repo": d.repo,
                "commit_sha": d.commit_sha,
                "status": d.status,
                "image_tag": d.image_tag,
                "live_url": d.live_url,
                "critical_vulns": d.critical_vulns,
                "high_vulns": d.high_vulns,
                "started_at": d.started_at,
                "finished_at": d.finished_at,
            }
            for d in deployments
        ]
    finally:
        db.close()


@router.post("/deployments/{deployment_id}/approve")
def approve_deployment(deployment_id: int, request: Request):
    """
    User explicitly accepts the risk and proceeds with deployment.
    """
    auth_data = get_current_user_with_token(request)
    user = auth_data["user"]

    db = SessionLocal()
    try:
        deployment = (
            db.query(Deployment).filter(Deployment.id == deployment_id).first()
        )
        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found")

        # Verify deployment belongs to user's connected project
        project = (
            db.query(Project)
            .filter(Project.user_id == user.id, Project.repo_full_name == deployment.repo)
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=403, detail="Not authorized to approve this deployment"
            )

        if deployment.status != "pending_approval":
            raise HTTPException(
                status_code=400, detail="Deployment is not pending approval"
            )

        deploy_result = deploy_to_kubernetes(deployment.repo, deployment.image_tag)
        deployment.status = "success"
        deployment.live_url = deploy_result["url"]
        db.commit()

        return {"status": "approved_and_deployed", "live_url": deployment.live_url}
    finally:
        db.close()


@router.post("/deployments/{deployment_id}/reject")
def reject_deployment(deployment_id: int, request: Request):
    """User reviews the vulnerabilities and decides not to deploy."""
    auth_data = get_current_user_with_token(request)
    user = auth_data["user"]

    db = SessionLocal()
    try:
        deployment = (
            db.query(Deployment).filter(Deployment.id == deployment_id).first()
        )
        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found")

        project = (
            db.query(Project)
            .filter(Project.user_id == user.id, Project.repo_full_name == deployment.repo)
            .first()
        )
        if not project:
            raise HTTPException(
                status_code=403, detail="Not authorized to reject this deployment"
            )

        deployment.status = "rejected"
        db.commit()
        return {"status": "rejected"}
    finally:
        db.close()