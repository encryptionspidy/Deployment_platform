from fastapi import Request, HTTPException
from app.db.models import SessionLocal, User, UserCredential
from app.core.crypto import decrypt_token


def get_current_user_with_token(request: Request):
    """
    Reads the logged-in user from the session, then fetches and decrypts
    their GitHub access token from Postgres. Raises 401 if not logged in.
    """
    session_user = request.session.get("user")
    if not session_user:
        raise HTTPException(status_code=401, detail="Not logged in")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.github_id == session_user["github_id"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        credential = db.query(UserCredential).filter(UserCredential.user_id == user.id).first()
        if not credential:
            raise HTTPException(status_code=401, detail="No credentials stored")

        access_token = decrypt_token(credential.encrypted_access_token)
        return {"user": user, "access_token": access_token}
    finally:
        db.close()