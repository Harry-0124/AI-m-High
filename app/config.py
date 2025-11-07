from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str
    DB_NAME: str

    # SMTP (Email)
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    ADMIN_EMAIL: str

    # JWT (Auth)
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str
    JWT_EXPIRATION_MINUTES: int

    # Gemini API (Optional)
    GEMINI_API_KEY: str | None = None

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
