import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Avora ERP API"
    app_env: str = "development"
    # Defaults to local sqlite for development if postgres is not provided
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./avora.db")
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    secret_key: str = os.getenv("SECRET_KEY", "avora-super-secret-development-key-change-in-production-2026")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    admin_email: str = os.getenv("ADMIN_EMAIL", "admin@avora.io")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "Admin@123456")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sync_database_url(self) -> str:
        url = self.database_url
        # If postgresql+psycopg is requested but psycopg v3 is not installed, switch to postgresql+psycopg2
        if url.startswith("postgresql+psycopg://"):
            url = url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
