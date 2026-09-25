import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET", "dev-secret-change-me")

settings = Settings()

print("Loaded webhook secret:", settings.GITHUB_WEBHOOK_SECRET)