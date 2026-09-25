import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
    SESSION_SECRET = os.getenv("SESSION_SECRET")
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

settings = Settings()