import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is in pythonpath
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Ensure test DB is used
os.environ["DATABASE_URL"] = "sqlite:///./test_avora.db"

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
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_avora.db"):
        try:
            os.remove("./test_avora.db")
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
