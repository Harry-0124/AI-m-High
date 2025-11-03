# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URI: str
    DB_NAME: str
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    ADMIN_EMAIL: str
    GEMINI_API_KEY: str

    class Config:
        env_file = ".env"  # Automatically load your environment variables

# ✅ Instantiate global settings
settings = Settings()
