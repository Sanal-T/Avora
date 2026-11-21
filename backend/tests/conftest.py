import os
import sys
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is in pythonpath
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Ensure test DB uses a fresh writable temp file
tmp_db_file = Path(tempfile.gettempdir()) / "avora_test_run.db"
if tmp_db_file.exists():
    try:
        tmp_db_file.unlink()
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite:///{tmp_db_file.as_posix()}"

from app.core.config import get_settings
get_settings.cache_clear()

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.init_db import init_db
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    init_db(db)
    db.close()
    yield
    try:
        engine.dispose()
        if tmp_db_file.exists():
            tmp_db_file.unlink()
    except Exception:
        pass


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)
