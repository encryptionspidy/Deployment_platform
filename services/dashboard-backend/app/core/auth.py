"""
GitHub OAuth and Session Authentication Utilities
"""

from typing import Dict, Any, Optional
from app.core.config import settings

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


def get_github_auth_url(redirect_uri: str = "http://localhost:8002/auth/callback", scope: str = "repo") -> str:
    """
    Generates the GitHub OAuth redirect authorization URL.
    """
    return (
        f"{GITHUB_AUTHORIZE_URL}"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
    )


def extract_session_user(session: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extracts logged-in user profile dictionary from Starlette request session.
    """
    return session.get("user")
