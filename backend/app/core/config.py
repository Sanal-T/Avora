import os
from functools import lru_cache
from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_dir = Path(__file__).resolve().parent.parent.parent
_root_dir = _backend_dir.parent
_env_files = [
    str(_backend_dir / ".env"),
    str(_root_dir / ".env"),
    ".env",
]


class Settings(BaseSettings):
    app_name: str = "Avora ERP API"
    app_env: str = "development"
    # Primary production LAN database (Avora LAN DB)
    database_url: str = "postgresql+psycopg2://postgres:postgres@192.168.1.88:5432/avora"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    secret_key: str = "avora-super-secret-development-key-change-in-production-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    admin_email: str = "admin@avora.io"
    admin_password: str = "Admin@123456"
    sentry_dsn: str | None = None
    error_webhook_url: str | None = None

    model_config = SettingsConfigDict(env_file=_env_files, extra="ignore")

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env.lower() == "production":
            insecure_key_tokens = ["change-in-production", "avora-super-secret", "secret", "default"]
            if any(token in self.secret_key.lower() for token in insecure_key_tokens) or len(self.secret_key) < 32:
                raise ValueError("In production, SECRET_KEY must be provided via environment variable with a strong, random value of at least 32 characters.")
            if self.admin_password == "Admin@123456" or len(self.admin_password) < 8:
                raise ValueError("In production, ADMIN_PASSWORD must be explicitly provided with a secure value of at least 8 characters.")
            if "sqlite" in self.database_url.lower():
                raise ValueError("In production, DATABASE_URL must connect to a production-grade relational database (e.g. PostgreSQL), not SQLite.")
        return self

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
