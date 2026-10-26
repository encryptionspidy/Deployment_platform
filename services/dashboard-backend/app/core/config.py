import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "change-me-in-production")
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://devops:devops123@localhost:5433/deploy_platform"
    )
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    PROMETHEUS_URL: str = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    # Guard for demo login bypass — must be explicitly enabled
    ENABLE_DEMO_LOGIN: bool = os.getenv("ENABLE_DEMO_LOGIN", "false").lower() == "true"
    WEBHOOK_TARGET_URL: str = os.getenv(
        "WEBHOOK_TARGET_URL", "http://localhost:8000/webhook/github"
    )
    GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET", "")


settings = Settings()
