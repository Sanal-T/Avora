from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.config import get_settings

_backend_dir = Path(__file__).resolve().parent.parent.parent
_root_dir = _backend_dir.parent


def normalize_pg_url(url: str) -> str:
    """Normalize postgresql/postgres URLs to synchronous psycopg2 SQLAlchemy driver."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql+psycopg://"):
        url = url.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
    return url


class SyncConfig(BaseSettings):
    """Independent DB connections & polling settings for LAN or Supabase/Hetzner."""

    avora_database_url: str = Field(default_factory=lambda: get_settings().sync_database_url)
    scheduler_sync_database_url: str = (
        "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/designers_task_scheduler"
    )
    quotations_sync_database_url: str = (
        "postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/quotations_software"
    )
    sync_enable_scheduler: bool = True
    sync_enable_quotations: bool = True
    sync_poll_interval_seconds: float = 5.0
    sync_batch_size: int = 100
    sync_backfill_chunk_size: int = 500
    sync_outbox_retention_days: int = 14
    sync_connect_timeout_seconds: int = 5
    sync_statement_timeout_ms: int = 15000

    model_config = SettingsConfigDict(
        env_file=[
            str(_backend_dir / ".env.sync"),
            str(_backend_dir / ".env"),
            str(_root_dir / ".env"),
            ".env",
        ],
        extra="ignore",
    )

    @property
    def normalized_avora_url(self) -> str:
        return normalize_pg_url(self.avora_database_url)

    @property
    def normalized_scheduler_url(self) -> str:
        return normalize_pg_url(self.scheduler_sync_database_url)

    @property
    def normalized_quotations_url(self) -> str:
        return normalize_pg_url(self.quotations_sync_database_url)


@lru_cache
def get_sync_config() -> SyncConfig:
    return SyncConfig()
