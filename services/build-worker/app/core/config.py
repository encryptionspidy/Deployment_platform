import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # No hardcoded fallback - missing key must be caught at startup, not silently used
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://devops:devops123@localhost:5433/deploy_platform"
    )
    BUILD_TIMEOUT_SECONDS: int = int(os.getenv("BUILD_TIMEOUT_SECONDS", "300"))


settings = Settings()
