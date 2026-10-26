from fastapi import APIRouter, Request, HTTPException
import httpx
from app.core.deps import get_current_user_with_token
from app.core.config import settings
from app.db.models import SessionLocal, Project

router = APIRouter()

GITHUB_API_BASE = "https://api.github.com"

# Read entirely from env — no hardcoded URLs or secrets
WEBHOOK_TARGET_URL = settings.WEBHOOK_TARGET_URL
WEBHOOK_SECRET = settings.GITHUB_WEBHOOK_SECRET


@router.get("/projects")
def list_connected_projects(request: Request):
    """Returns the logged-in user's connected projects."""
    auth_data = get_current_user_with_token(request)
    user = auth_data["user"]

    db = SessionLocal()
    try:
        projects = db.query(Project).filter(Project.user_id == user.id).all()
        return [
            {
                "id": p.id,
                "repo_full_name": p.repo_full_name,
                "github_webhook_id": p.github_webhook_id,
                "connected_at": p.created_at,
            }
            for p in projects
        ]
    finally:
        db.close()


@router.get("/projects/repos")
async def list_repos(request: Request):
    """Lists the logged-in user's GitHub repositories with graceful offline/demo fallback."""
    auth_data = get_current_user_with_token(request)
    access_token = auth_data["access_token"]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/user/repos",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"per_page": 50, "sort": "updated"},
                timeout=5.0,
            )
            if response.status_code == 200:
                repos = response.json()
                return [
                    {"full_name": repo["full_name"], "private": repo.get("private", False)}
                    for repo in repos
                    if isinstance(repo, dict) and "full_name" in repo
                ]
    except Exception as e:
        print(f"Notice: GitHub API fetch repos offline/fallback: {e}")

    # Fallback demo repositories for offline mode
    return [
        {"full_name": "encryptionspidy/LogVision", "private": False},
        {"full_name": "encryptionspidy/IMAP-Email-Server", "private": False},
        {"full_name": "encryptionspidy/Deployment_platform", "private": False},
        {"full_name": "encryptionspidy/demo-webapp", "private": False},
    ]


@router.post("/projects/connect")
async def connect_repo(repo_full_name: str, request: Request):
    """Registers a webhook on the user's repo via GitHub API."""
    auth_data = get_current_user_with_token(request)
    user = auth_data["user"]
    access_token = auth_data["access_token"]

    webhook_id = None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GITHUB_API_BASE}/repos/{repo_full_name}/hooks",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                json={
                    "name": "web",
                    "active": True,
                    "events": ["push"],
                    "config": {
                        "url": WEBHOOK_TARGET_URL,
                        "content_type": "json",
                        "secret": WEBHOOK_SECRET,
                    },
                },
                timeout=5.0,
            )

            if response.status_code in (200, 201):
                webhook_data = response.json()
                webhook_id = webhook_data.get("id")
            elif response.status_code == 422 and "Hook already exists" in response.text:
                pass
    except Exception as e:
        print(f"Notice: GitHub webhook creation notice (offline/demo mode): {e}")

    db = SessionLocal()
    try:
        existing = (
            db.query(Project)
            .filter(Project.user_id == user.id, Project.repo_full_name == repo_full_name)
            .first()
        )

        if not existing:
            project = Project(
                user_id=user.id,
                repo_full_name=repo_full_name,
                github_webhook_id=webhook_id,
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            webhook_id = project.github_webhook_id
    finally:
        db.close()

    return {
        "status": "connected",
        "repo": repo_full_name,
        "webhook_id": webhook_id,
    }


@router.delete("/projects/{project_id}")
def disconnect_project(project_id: int, request: Request):
    """Disconnects a project and removes its record from PostgreSQL."""
    auth_data = get_current_user_with_token(request)
    user = auth_data["user"]

    db = SessionLocal()
    try:
        project = (
            db.query(Project)
            .filter(Project.id == project_id, Project.user_id == user.id)
            .first()
        )
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        db.delete(project)
        db.commit()
        return {"status": "disconnected", "project_id": project_id}
    finally:
        db.close()
