from fastapi import APIRouter, Request
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
    """
    Step 1: Redirect any user to GitHub's OAuth authorization page.
    prompt=select_account forces GitHub to show account switcher if requested.
    """
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
    """
    Step 2: GitHub redirects back here with a temporary authorization 'code'.
    Exchange code for access token and fetch the dynamic user's profile.
    """
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

    # Dynamically persist user + encrypted credential to Postgres
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
            # Update username if changed
            user.github_username = user_data.get("login")
            db.commit()

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

    # Store user in session
    request.session["user"] = {
        "login": user_data.get("login"),
        "github_id": user_data.get("id"),
        "access_token": access_token,
    }

    return RedirectResponse("http://localhost:3000/dashboard")


@router.get("/auth/me")
def get_current_user(request: Request):
    """Returns the currently logged-in dynamic user's info from the session."""
    user = request.session.get("user")
    if not user:
        return {"logged_in": False}
    return {"logged_in": True, "github_username": user["login"]}


@router.get("/auth/demo-login")
def demo_login(request: Request):
    """
    Step 1 (Alternative): 1-Click Demo Login to bypass GitHub OAuth when external network is unreachable.
    Instantly authenticates as demo user 'encryptionspidy' and ensures demo projects exist.
    """
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

        # Ensure demo projects exist for user
        demo_repos = ["encryptionspidy/LogVision", "encryptionspidy/IMAP-Email-Server"]
        for repo_name in demo_repos:
            proj = db.query(Project).filter(Project.user_id == user.id, Project.repo_full_name == repo_name).first()
            if not proj:
                db.add(Project(user_id=user.id, repo_full_name=repo_name, github_webhook_id=999999))
        db.commit()

        # Set user session
        request.session["user"] = {
            "login": user.github_username,
            "github_id": user.github_id,
            "access_token": "demo_token_offline_mode_12345",
        }
    finally:
        db.close()

    return RedirectResponse("http://localhost:3000/dashboard")


@router.get("/auth/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}