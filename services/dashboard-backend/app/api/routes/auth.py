from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
import httpx
from app.core.config import settings
from app.db.models import SessionLocal, User, UserCredential, Project
from app.core.crypto import encrypt_token

router = APIRouter()

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


@router.get("/auth/login")
def login(switch_account: bool = False):
    """Redirect user to GitHub's OAuth authorization page."""
    prompt_mode = "select_account" if switch_account else "consent"
    github_auth_url = (
        f"{GITHUB_AUTHORIZE_URL}"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri=http://localhost:8002/auth/callback"
        f"&scope=repo,read:user,user:email"
        f"&prompt={prompt_mode}"
    )
    return RedirectResponse(github_auth_url)


@router.get("/auth/callback")
async def callback(request: Request, code: str):
    """Exchange GitHub OAuth code for access token, persist encrypted token to DB."""
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            return {"error": "Failed to get access token", "details": token_data}

        user_response = await client.get(
            GITHUB_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_data = user_response.json()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.github_id == user_data.get("id")).first()

        if not user:
            user = User(
                github_id=user_data.get("id"),
                github_username=user_data.get("login"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.github_username = user_data.get("login")
            db.commit()

        # Store access token ENCRYPTED in DB — never raw in session cookie
        encrypted = encrypt_token(access_token)
        credential = db.query(UserCredential).filter(UserCredential.user_id == user.id).first()

        if credential:
            credential.encrypted_access_token = encrypted
        else:
            credential = UserCredential(user_id=user.id, encrypted_access_token=encrypted)
            db.add(credential)

        db.commit()
    finally:
        db.close()

    # Session cookie stores only non-sensitive identity — NO raw access_token
    request.session["user"] = {
        "login": user_data.get("login"),
        "github_id": user_data.get("id"),
        "avatar_url": user_data.get("avatar_url", ""),
    }

    return RedirectResponse("http://localhost:3000/dashboard")


@router.get("/auth/me")
def get_current_user(request: Request):
    """Returns the currently logged-in user's info from the session."""
    user = request.session.get("user")
    if not user:
        return {"logged_in": False}
    return {"logged_in": True, "github_username": user["login"]}


@router.get("/auth/demo-login")
def demo_login(request: Request):
    """
    Demo login bypass — only available when ENABLE_DEMO_LOGIN=true.
    Set ENABLE_DEMO_LOGIN=true in dashboard-backend/.env to enable.
    """
    if not settings.ENABLE_DEMO_LOGIN:
        raise HTTPException(
            status_code=403,
            detail="Demo login is disabled. Set ENABLE_DEMO_LOGIN=true in the environment to enable it.",
        )

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.github_username == "encryptionspidy").first()
        if not user:
            user = User(
                github_id=98765432,
                github_username="encryptionspidy",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        credential = db.query(UserCredential).filter(UserCredential.user_id == user.id).first()
        if not credential:
            credential = UserCredential(
                user_id=user.id,
                encrypted_access_token=encrypt_token("demo_token_offline_mode_12345"),
            )
            db.add(credential)
            db.commit()

        demo_repos = ["encryptionspidy/LogVision", "encryptionspidy/IMAP-Email-Server"]
        for repo_name in demo_repos:
            proj = (
                db.query(Project)
                .filter(Project.user_id == user.id, Project.repo_full_name == repo_name)
                .first()
            )
            if not proj:
                db.add(Project(user_id=user.id, repo_full_name=repo_name, github_webhook_id=999999))
        db.commit()

        # Store only non-sensitive identity in session
        request.session["user"] = {
            "login": user.github_username,
            "github_id": user.github_id,
            "avatar_url": "",
        }
    finally:
        db.close()

    return RedirectResponse("http://localhost:3000/dashboard")


@router.get("/auth/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}
