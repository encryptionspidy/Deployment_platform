import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "JvPPQta6LlI-6UymvHBhQdqNM8N3yIIeo0F9T_6_vIo=")


settings = Settings()
