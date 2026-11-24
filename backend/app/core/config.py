import os
from functools import lru_cache
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Avora ERP API"
    app_env: str = "development"
    # Defaults to local sqlite for development if postgres is not provided
    database_url: str = "sqlite:///./avora.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    secret_key: str = "avora-super-secret-development-key-change-in-production-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    admin_email: str = "admin@avora.io"
    admin_password: str = "Admin@123456"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env.lower() == "production":
            if "change-in-production" in self.secret_key or self.admin_password == "Admin@123456":
                raise ValueError("In production, SECRET_KEY and ADMIN_PASSWORD must be explicitly provided with secure values.")
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
