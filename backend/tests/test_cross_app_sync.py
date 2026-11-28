import json
import os
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token, get_password_hash
from app.db.session import get_db
from app.main import app
from app.models.auth import Role, User
from app.models.customer import Customer
from app.models.sync_mirrors import (
    ExternalIdMapping,
    SyncComplaint,
    SyncDesignTask,
    SyncEnquiry,
    SyncFailedEvent,
    SyncProcessedEvent,
    SyncQuotation,
    SyncSchedulerQuotationRef,
    SyncSource,
    SyncStaffDirectory,
    SyncWorkConfirmed,
)
from app.sync.config import SyncConfig
from app.sync.mapper import SOURCE_QUOTATIONS, SOURCE_SCHEDULER
from app.sync.worker import OutboxEvent, SyncWorker

AVORA_BACKEND_DIR = Path(__file__).resolve().parent.parent
QM_OUTBOX_SQL = Path("D:/Quotation System/server/migrations/001_sync_outbox.sql")
DTS_OUTBOX_SQL = Path("D:/Designers Task Scheduler/server/migrations/001_sync_outbox.sql")

PG_USER = os.environ.get("PGUSER", "postgres")
PG_PASSWORD = os.environ.get("PGPASSWORD", "postgres")
PG_HOST = os.environ.get("PGHOST", "127.0.0.1")
PG_PORT = os.environ.get("PGPORT", "5432")


def _find_pg_bin(exe_name: str) -> str:
    found = shutil.which(exe_name)
    if found:
        return found
    for ver in ("17", "16", "15", "14"):
        candidate = Path(f"C:/Program Files/PostgreSQL/{ver}/bin/{exe_name}.exe")
        if candidate.exists():
            return str(candidate)
    raise RuntimeError(f"PostgreSQL binary not found: {exe_name}")


def _pg_url(db_name: str, host: str = PG_HOST, port: str = PG_PORT) -> str:
    return f"postgresql+psycopg2://{PG_USER}:{PG_PASSWORD}@{host}:{port}/{db_name}"


def _run_pg_cmd(args: list[str]) -> str:
    env = os.environ.copy()
    env["PGPASSWORD"] = PG_PASSWORD
    res = subprocess.run(args, env=env, capture_output=True, text=True, check=True)
    return res.stdout


def _clone_schema_only(source_db: str, target_db: str) -> None:
    pg_dump = _find_pg_bin("pg_dump")
    psql = _find_pg_bin("psql")
    dump_sql = _run_pg_cmd(
        [
            pg_dump,
            "-h",
            PG_HOST,
            "-p",
            PG_PORT,
            "-U",
            PG_USER,
            "--schema-only",
            "--no-owner",
            "--no-privileges",
            source_db,
        ]
    )
    env = os.environ.copy()
    env["PGPASSWORD"] = PG_PASSWORD
    subprocess.run(
        [psql, "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", target_db, "-v", "ON_ERROR_STOP=1"],
        input=dump_sql,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )


def _exec_sql_file(target_db: str, sql_path: Path) -> None:
    psql = _find_pg_bin("psql")
    env = os.environ.copy()
    env["PGPASSWORD"] = PG_PASSWORD
    sql_text = sql_path.read_text(encoding="utf-8")
    subprocess.run(
        [psql, "-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", target_db, "-v", "ON_ERROR_STOP=1"],
        input=sql_text,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )


@pytest.fixture(scope="module")
def sync_env():
    """Create 3 isolated test databases cloned from live DDL schemas (zero production mutations)."""
    suffix = uuid.uuid4().hex[:8]
    qm_db = f"sync_test_qm_{suffix}"
    dts_db = f"sync_test_dts_{suffix}"
    avora_db = f"sync_test_avora_{suffix}"

    admin_engine = create_engine(_pg_url("postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        for db_name in (qm_db, dts_db, avora_db):
            conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)'))
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))

    avora_eng = None
    dts_eng = None
    qm_eng = None
    try:
        _clone_schema_only("quotations_software", qm_db)
        _clone_schema_only("designers_task_scheduler", dts_db)
        _clone_schema_only("avora", avora_db)

        # Apply additive source outbox migrations on temporary source DBs
        _exec_sql_file(qm_db, QM_OUTBOX_SQL)
        _exec_sql_file(dts_db, DTS_OUTBOX_SQL)

        # Stamp the test DB with the current Alembic head of source DB (schema-only dump omits rows)
        with create_engine(_pg_url("avora")).connect() as live_conn:
            head_rev = live_conn.execute(text("SELECT version_num FROM public.alembic_version")).scalar_one()

        # Run Avora Alembic migration in isolated subprocess pointed strictly at temporary Avora DB
        alembic_env = os.environ.copy()
        alembic_env["DATABASE_URL"] = _pg_url(avora_db)
        try:
            subprocess.run(
                [sys.executable, "-m", "alembic", "stamp", head_rev],
                cwd=str(AVORA_BACKEND_DIR),
                env=alembic_env,
                capture_output=True,
                text=True,
                check=True,
            )
            subprocess.run(
                [sys.executable, "-m", "alembic", "upgrade", "head"],
                cwd=str(AVORA_BACKEND_DIR),
                env=alembic_env,
                capture_output=True,
                text=True,
                check=True,
            )
        except subprocess.CalledProcessError as exc:
            raise RuntimeError(f"Alembic failed:\nSTDOUT:\n{exc.stdout}\nSTDERR:\n{exc.stderr}") from exc

        avora_eng = create_engine(_pg_url(avora_db), pool_pre_ping=True)
        dts_eng = create_engine(_pg_url(dts_db), pool_pre_ping=True)
        qm_eng = create_engine(_pg_url(qm_db), pool_pre_ping=True)

        cfg = SyncConfig(
            avora_database_url=_pg_url(avora_db),
            scheduler_sync_database_url=_pg_url(dts_db),
            quotations_sync_database_url=_pg_url(qm_db),
            sync_poll_interval_seconds=1.0,
            sync_batch_size=100,
        )
        worker = SyncWorker(
            config=cfg,
            avora_engine=avora_eng,
            source_engines={
                SOURCE_SCHEDULER: dts_eng,
                SOURCE_QUOTATIONS: qm_eng,
            },
        )
        worker.ensure_sources_registered()

        yield {
            "avora_db": avora_db,
            "dts_db": dts_db,
            "qm_db": qm_db,
            "avora_eng": avora_eng,
            "dts_eng": dts_eng,
            "qm_eng": qm_eng,
            "worker": worker,
            "cfg": cfg,
        }
    finally:
        for eng in (avora_eng, dts_eng, qm_eng):
            if eng is not None:
                eng.dispose()
        with admin_engine.connect() as conn:
            for db_name in (qm_db, dts_db, avora_db):
                conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)'))
        admin_engine.dispose()


def test_race_free_backfill_with_concurrent_edits_and_deletes(sync_env):
    """
    Backfill opens REPEATABLE READ snapshot after capture triggers are active.
    Concurrent updates and deletes committed while backfill runs must replay safely
    without missed changes or stale overwrites.
    """
    qm_eng = sync_env["qm_eng"]
    avora_eng = sync_env["avora_eng"]
    worker: SyncWorker = sync_env["worker"]

    # Insert 2 rows cleanly before backfill
    with qm_eng.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO public.quotations (
                    quote_id, quote_no, quote_version, project_name, client_name,
                    material_items, expenses,
                    status, active_option_index, rounded_total, grand_total, tax_amount, options
                ) VALUES
                ('801', '801-V1', 1, 'Alpha Lobby', 'Alpha Client', '[]', '{}', 'Estimator Part', 0, 10000, 11800, 0,
                 CAST(:opts1 AS jsonb)),
                ('802', '802-V1', 1, 'Temp Quote', 'Delete Me', '[]', '{}', 'Designer Part', 0, 5000, 5000, 0,
                 CAST(:opts2 AS jsonb))
                """
            ),
            {
                "opts1": json.dumps([{"name": "Option 1", "include_tax": True, "gst_percent": 18, "gst_amount": 1800}]),
                "opts2": json.dumps([{"name": "Option 1", "include_tax": False}]),
            },
        )

    # Clear outbox acked state or ack baseline first so backfill snapshot copy carries baseline v=1
    # AND then commit a concurrent edit (v=2) and concurrent delete (v=2) AFTER snapshot state!
    # We simulate real concurrent commit during copy by intercepting _apply_snapshot_batch once.
    original_apply = worker._apply_snapshot_batch
    injected = {"done": False}

    def concurrent_edit_hook(source_system, table_name, rows):
        if source_system == SOURCE_QUOTATIONS and table_name == "quotations" and not injected["done"]:
            injected["done"] = True
            with qm_eng.begin() as c_conn:
                c_conn.execute(
                    text(
                        """
                        UPDATE public.quotations
                        SET project_name = 'Alpha Lobby REVISED CONCURRENT',
                            quote_no = '801-V2',
                            quote_version = 2,
                            rounded_total = 12000,
                            grand_total = 14160,
                            options = CAST(:opts AS jsonb)
                        WHERE quote_id = '801'
                        """
                    ),
                    {
                        "opts": json.dumps(
                            [{"name": "Option 1", "include_tax": True, "gst_percent": 18, "gst_amount": 2160, "products": [{"name": "Signage"}]}]
                        )
                    },
                )
                c_conn.execute(text("DELETE FROM public.quotations WHERE quote_id = '802'"))
        return original_apply(source_system, table_name, rows)

    worker._apply_snapshot_batch = concurrent_edit_hook
    try:
        res = worker.backfill_source(SOURCE_QUOTATIONS)
    finally:
        worker._apply_snapshot_batch = original_apply

    assert res["copied"]["quotations"] == 2
    assert res["replayed_outbox"] >= 2

    SessionLocal = sessionmaker(bind=avora_eng)
    with SessionLocal() as db:
        q801 = db.query(SyncQuotation).filter(SyncQuotation.quote_id == "801").one()
        assert q801.is_deleted is False
        assert q801.quote_no == "801-V2"
        assert q801.project_name == "Alpha Lobby REVISED CONCURRENT"
        assert q801.source_rounded_total == Decimal("12000.00")
        assert q801.source_tax_amount == Decimal("2160.00")
        assert q801.source_grand_total == Decimal("14160.00")

        q802 = db.query(SyncQuotation).filter(SyncQuotation.quote_id == "802").one()
        assert q802.is_deleted is True

    reconcile = worker.reconcile_source(SOURCE_QUOTATIONS)
    assert reconcile["in_sync"] is True


def test_real_trace_quotation_math_pii_and_mapping_guarantees(sync_env):
    """
    Trace enquiry -> design task -> revised quote (417-V5 totals) -> confirmed work -> complaint.
    Verify PII exclusion, non-recalculation of totals, separate accounts_quotations ref,
    and zero unintended writes to native Avora business tables.
    """
    dts_eng = sync_env["dts_eng"]
    qm_eng = sync_env["qm_eng"]
    avora_eng = sync_env["avora_eng"]
    worker: SyncWorker = sync_env["worker"]

    SessionLocal = sessionmaker(bind=avora_eng)
    # Seed Avora native User + duplicate-email Customers to test identity & ambiguity safety
    with SessionLocal() as db:
        role = db.query(Role).filter(Role.name == "Administrator").first()
        if not role:
            role = Role(name="Administrator", description="Admin")
            db.add(role)
            db.flush()
        admin_user = User(
            email="niranjan@interext.test",
            full_name="Niranjan Bose",
            hashed_password=get_password_hash("Admin@123456"),
            is_active=True,
            is_superuser=True,
        )
        admin_user.roles.append(role)
        db.add(admin_user)

        # Ambiguous customers sharing same email
        db.add(Customer(customer_code="CUST-901", name="Polson One", email="ambig@client.test", phone="9990001111"))
        db.add(Customer(customer_code="CUST-902", name="Polson Two", email="ambig@client.test", phone="9990002222"))
        db.commit()

    # Insert Scheduler staff WITH sensitive PII fields that MUST be excluded
    with dts_eng.begin() as conn:
        u_id = conn.execute(
            text(
                """
                INSERT INTO public.users (
                    name, role, specialization, department, email, phone, password, status, last_login_ip
                ) VALUES (
                    'Niranjan Bose', 'designer', 'Signage Designer', 'Signage',
                    'niranjan@interext.test', '9876543210', '$2b$10$SECRET_HASH_DO_NOT_SYNC', 'active', '10.0.0.5'
                ) RETURNING id
                """
            )
        ).scalar_one()

        conn.execute(
            text(
                """
                INSERT INTO public.employee_profiles (
                    user_id, employee_code, designation, department, employment_type,
                    work_shift, work_location, reporting_manager, salary_ctc,
                    bank_name, bank_account_no, bank_ifsc, aadhaar_no, pan_no, passport_no
                ) VALUES (
                    :uid, 'EMP-09', 'Senior Designer', 'Signage', 'full_time',
                    'Day', 'Kochi', 'Manoj PM', 750000,
                    'SBI', '123456789012', 'SBIN0001234', '999988887777', 'ABCDE1234F', 'Z9999999'
                )
                """
            ),
            {"uid": u_id},
        )

        task_id = conn.execute(
            text(
                """
                INSERT INTO public.tasks (user_id, title, description, priority, task_date, status, total_active_seconds)
                VALUES (:uid, 'POLSON BAKERS Facade', '3D ACP & LED Sign', 'high', CURRENT_DATE, 'completed', 5400)
                RETURNING id
                """
            ),
            {"uid": u_id},
        ).scalar_one()

        qref_id = conn.execute(
            text(
                """
                INSERT INTO public.accounts_quotations (
                    quotation_no, client_name, project_title, department, estimated_amount, status
                ) VALUES ('QT-ACC-417', 'POLSON BAKERS', 'Polson Ref', 'Signage', 81394, 'approved')
                RETURNING id
                """
            )
        ).scalar_one()

        wc_id = conn.execute(
            text(
                """
                INSERT INTO public.accounts_work_confirmed (
                    project_name, client_name, project_category, confirmed_quotation_no,
                    quotation_amount, advance_received, balance_amount, billing_status,
                    designer_assigned, production_status, job_card_no
                ) VALUES (
                    'POLSON BAKERS', 'POLSON BAKERS', 'Signage', '417-V5',
                    81394, 40000, 41394, 'partial', 'Niranjan Bose', 'in_production', 'JC-4170'
                ) RETURNING id
                """
            )
        ).scalar_one()

        conn.execute(
            text(
                """
                INSERT INTO public.enquiries_register (
                    sl_no, department, project_name, client_name, client_phone, client_email,
                    designer_id, designer_name, quotation_number, quotation_amount,
                    job_card_no, status, linked_task_id, linked_quotation_id, linked_work_confirmed_id
                ) VALUES (
                    42, 'Signage', 'POLSON BAKERS', 'POLSON BAKERS', '9847000001', 'ambig@client.test',
                    :uid, 'Niranjan Bose', '', 81394,
                    'JC-4170', 'Confirmed', :tid, :qid, :wcid
                )
                """
            ),
            {"uid": u_id, "tid": task_id, "qid": qref_id, "wcid": wc_id},
        )

        # Complaint with rectified_by + missing email client
        conn.execute(
            text(
                """
                INSERT INTO public.complaints_register (
                    sl_no, complaint_date, client_name, category, complaint_details,
                    rectified_date, rectified_by, status, linked_task_id
                ) VALUES (
                    1, CURRENT_DATE, 'SABELLA', 'Signage', 'LED strip dim',
                    CURRENT_DATE, 'Rahul K', 'Rectified', :tid
                )
                """
            ),
            {"tid": task_id},
        )

    # Insert real 417-V5 quotation shape (Option 2 active_option_index=1, tax 18% GST 12416, grand_total 81394)
    options_417 = [
        {
            "name": "Option 1 - Standard",
            "rounded_total": 50000,
            "grand_total": 50000,
            "include_tax": False,
            "products": [{"name": "ACP Board", "total": 50000}],
        },
        {
            "name": "Option 2 - Premium LED",
            "rounded_total": 68978,
            "grand_total": 81394,
            "include_tax": True,
            "gst_percent": 18,
            "gst_amount": 12416,
            "products": [{"name": "3D Acrylic LED Channel", "qty": 1, "total": 68978}],
        },
    ]
    with qm_eng.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO public.quotations (
                    quote_id, quote_no, quote_version, project_name, client_name,
                    material_items, expenses,
                    designer_name, estimator_name, status, approval_status,
                    active_option_index, subtotal, tax_percent, tax_amount,
                    rounded_total, grand_total, options
                ) VALUES (
                    '417', '417-V5', 5, 'POLSON BAKERS', 'POLSON BAKERS',
                    '[]', '{}',
                    'Niranjan Bose', 'Estimation Team', 'Forwarded to Front Office', 'approved',
                    1, 27657.74, 18, 0,
                    68978, 81394, CAST(:opts AS jsonb)
                )
                """
            ),
            {"opts": json.dumps(options_417)},
        )

    # Check source outbox NEVER captured passwords or bank/gov IDs before polling
    with dts_eng.connect() as s_conn:
        outbox_payloads = [
            json.dumps(r[0])
            for r in s_conn.execute(text("SELECT payload FROM public.sync_outbox_events")).all()
        ]
    joined = "\n".join(outbox_payloads)
    for forbidden in (
        "SECRET_HASH_DO_NOT_SYNC",
        "10.0.0.5",
        "123456789012",
        "SBIN0001234",
        "999988887777",
        "ABCDE1234F",
        "Z9999999",
        "salary_ctc",
    ):
        assert forbidden not in joined

    stats = worker.poll_all_once()
    assert stats[SOURCE_SCHEDULER]["processed"] >= 6
    assert stats[SOURCE_QUOTATIONS]["processed"] >= 1

    with SessionLocal() as db:
        q417 = db.query(SyncQuotation).filter(SyncQuotation.quote_id == "417").one()
        assert q417.quote_no == "417-V5"
        assert q417.quote_version == 5
        assert q417.active_option_index == 1
        assert q417.selected_option_label == "Option 2 - Premium LED"
        assert q417.include_tax is True
        assert q417.source_rounded_total == Decimal("68978.00")
        assert q417.source_tax_amount == Decimal("12416.00")
        assert q417.source_grand_total == Decimal("81394.00")
        assert q417.selected_option_items == [{"name": "3D Acrylic LED Channel", "qty": 1, "total": 68978}]
        # Missing email on quotations table -> remains reviewable (never auto-merged by client_name!)
        assert q417.avora_customer_id is None
        assert q417.customer_match_status == "missing_email"

        enq = db.query(SyncEnquiry).filter(SyncEnquiry.sl_no == 42).one()
        assert enq.avora_customer_id is None
        assert enq.customer_match_status == "ambiguous"
        assert enq.linked_work_confirmed_source_pk == str(wc_id)

        staff = db.query(SyncStaffDirectory).filter(SyncStaffDirectory.email == "niranjan@interext.test").one()
        assert staff.identity_status == "matched_auto"
        assert staff.avora_user_id is not None
        assert staff.employee_code == "EMP-09"

        comp = db.query(SyncComplaint).filter(SyncComplaint.sl_no == 1).one()
        assert comp.rectified_by == "Rahul K"

        qref = db.query(SyncSchedulerQuotationRef).filter(SyncSchedulerQuotationRef.quotation_no == "QT-ACC-417").one()
        assert qref.is_commercial_quote is False

        # Native Avora tables remain completely untouched by sync
        assert db.execute(text("SELECT COUNT(*) FROM work_orders")).scalar_one() == 0
        assert db.execute(text("SELECT COUNT(*) FROM invoices")).scalar_one() == 0
        assert db.execute(text("SELECT COUNT(*) FROM notifications")).scalar_one() == 0


def test_duplicate_out_of_order_delete_recreate_crash_outage_and_retry(sync_env):
    """
    Tests:
    - Duplicate delivery idempotency
    - Out-of-order stale UPDATE arriving after DELETE (deletion stays deleted)
    - Delete then Recreate with same PK succeeds cleanly
    - Worker crash after Avora commit before source ACK recovers seamlessly
    - Quarantine SyncFailedEvent does not block healthy rows & retries cleanly
    - Unreachable LAN host sets SyncSource status = 'offline' without crashing
    """
    qm_eng = sync_env["qm_eng"]
    avora_eng = sync_env["avora_eng"]
    worker: SyncWorker = sync_env["worker"]
    SessionLocal = sessionmaker(bind=avora_eng)

    # 1. Worker crash after Avora commit before source ACK
    with qm_eng.begin() as conn:
        pk_crash = conn.execute(
            text(
                """
                INSERT INTO public.quotations (
                    quote_id, quote_no, quote_version, project_name, client_name,
                    material_items, expenses, rounded_total, grand_total
                )
                VALUES ('901', '901-V1', 1, 'Crash Recovery Job', 'Crash Client', '[]', '{}', 1500, 1500)
                RETURNING id
                """
            )
        ).scalar_one()

    with pytest.raises(RuntimeError, match="Simulated worker crash"):
        worker.poll_source_once(SOURCE_QUOTATIONS, simulate_crash_after_avora_commit=True)

    # Avora ALREADY has 901 committed, while source outbox still has acked_at IS NULL
    with SessionLocal() as db:
        assert db.query(SyncQuotation).filter(SyncQuotation.source_pk == str(pk_crash)).count() == 1
    with qm_eng.connect() as s_conn:
        unacked = s_conn.execute(
            text("SELECT COUNT(*) FROM public.sync_outbox_events WHERE source_pk = :pk AND acked_at IS NULL"),
            {"pk": str(pk_crash)},
        ).scalar_one()
        assert unacked == 1

    # Restart worker -> duplicate delivery check skips re-mutation and cleanly ACKs source
    res_recover = worker.poll_source_once(SOURCE_QUOTATIONS)
    assert res_recover["processed"] == 1
    with qm_eng.connect() as s_conn:
        unacked_after = s_conn.execute(
            text("SELECT COUNT(*) FROM public.sync_outbox_events WHERE source_pk = :pk AND acked_at IS NULL"),
            {"pk": str(pk_crash)},
        ).scalar_one()
        assert unacked_after == 0

    # 2. Out-of-order: Delete (ver=2) followed by delayed older Update (ver=1)
    with qm_eng.begin() as conn:
        conn.execute(text("DELETE FROM public.quotations WHERE id = :pk"), {"pk": pk_crash})
    worker.poll_source_once(SOURCE_QUOTATIONS)

    # Simulate stale out-of-order event with ver=1 arriving after delete ver=2
    stale_ev = OutboxEvent(
        event_seq=99999,
        event_id=uuid.uuid4(),
        source_system=SOURCE_QUOTATIONS,
        source_table="quotations",
        source_pk=str(pk_crash),
        operation="UPDATE",
        record_version=1,
        is_deleted=False,
        payload={"id": pk_crash, "quote_id": "901", "project_name": "STALE ZOMBIE"},
    )
    assert worker.apply_event(stale_ev) is True
    with SessionLocal() as db:
        q901 = db.query(SyncQuotation).filter(SyncQuotation.source_pk == str(pk_crash)).one()
        assert q901.is_deleted is True
        assert q901.project_name == "Crash Recovery Job"

    # 3. Delete + Recreate with explicit same primary key id -> version=3 resurrects cleanly!
    with qm_eng.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO public.quotations (
                    id, quote_id, quote_no, quote_version, project_name, client_name,
                    material_items, expenses, rounded_total, grand_total
                )
                VALUES (:pk, '901', '901-RECREATED', 2, 'Resurrected Job', 'Crash Client', '[]', '{}', 2500, 2500)
                """
            ),
            {"pk": pk_crash},
        )
    worker.poll_source_once(SOURCE_QUOTATIONS)
    with SessionLocal() as db:
        q901_new = db.query(SyncQuotation).filter(SyncQuotation.source_pk == str(pk_crash)).one()
        assert q901_new.is_deleted is False
        assert q901_new.quote_no == "901-RECREATED"
        assert q901_new.project_name == "Resurrected Job"

    # 4. Quarantine failed event + non-blocking healthy event + retry
    bad_eid = uuid.uuid4()
    bad_ev = OutboxEvent(
        event_seq=8888,
        event_id=bad_eid,
        source_system=SOURCE_QUOTATIONS,
        source_table="unsupported_table",
        source_pk="999",
        operation="INSERT",
        record_version=1,
        is_deleted=False,
        payload={"password": "must_never_persist_in_failed_event", "foo": "bar"},
    )
    assert worker.apply_event(bad_ev) is False
    with SessionLocal() as db:
        fe = db.query(SyncFailedEvent).filter(SyncFailedEvent.event_id == bad_eid).one()
        assert fe.status == "failed"
        assert "password" not in fe.payload
        assert fe.payload.get("foo") == "bar"

    # Resolve bad event table to valid so retry succeeds cleanly
    with SessionLocal() as db:
        fe = db.query(SyncFailedEvent).filter(SyncFailedEvent.event_id == bad_eid).one()
        fe.source_table = "quotations"
        fe.payload = {"id": 9999, "quote_id": "9999", "quote_no": "9999-V1", "rounded_total": 100, "grand_total": 100}
        db.commit()

    retry_res = worker.retry_failed_events(SOURCE_QUOTATIONS)
    assert retry_res["resolved"] == 1
    assert retry_res["still_failed"] == 0

    # 5. Simulated LAN outage -> graceful offline status without crashing
    offline_eng = create_engine(
        _pg_url(sync_env["qm_db"], host="127.0.0.1", port="59999"),
        connect_args={"connect_timeout": 1},
    )
    offline_worker = SyncWorker(
        config=sync_env["cfg"],
        avora_engine=avora_eng,
        source_engines={SOURCE_QUOTATIONS: offline_eng},
    )
    outage_res = offline_worker.poll_source_once(SOURCE_QUOTATIONS)
    assert outage_res["pending"] == -1
    with SessionLocal() as db:
        src_row = db.get(SyncSource, SOURCE_QUOTATIONS)
        assert src_row.status == "offline"
        assert src_row.last_error is not None
    offline_eng.dispose()

    # Restore healthy poll -> recovers to healthy
    worker.poll_source_once(SOURCE_QUOTATIONS)


def test_fastapi_readonly_enforcement_and_status_endpoints(sync_env):
    """
    Verify Avora FastAPI exposes /api/sync/* read endpoints and enforces read-only
    access (PUT/PATCH/DELETE rejected with 405 Method Not Allowed).
    """
    avora_eng = sync_env["avora_eng"]
    TestingSession = sessionmaker(bind=avora_eng, autocommit=False, autoflush=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    with TestingSession() as db:
        admin_user = db.query(User).filter(User.email == "niranjan@interext.test").first()
        assert admin_user is not None
        token = create_access_token(str(admin_user.id))

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}

        r_status = client.get("/api/sync/status", headers=headers)
        assert r_status.status_code == 200
        body = r_status.json()
        assert body["read_only"] is True
        assert body["last_successful_sync"] is not None
        assert body["counts"]["quotations"] >= 1
        assert body["counts"]["enquiries"] >= 1
        assert body["counts"]["complaints"] >= 1

        r_quotes = client.get("/api/sync/quotations", headers=headers)
        assert r_quotes.status_code == 200
        assert r_quotes.json()["read_only"] is True
        items = r_quotes.json()["items"]
        match_417 = next(i for i in items if i["quote_id"] == "417")
        assert match_417["quote_no"] == "417-V5"
        assert match_417["source_grand_total"] == 81394.0

        r_comp = client.get("/api/sync/complaints", headers=headers)
        assert r_comp.status_code == 200
        assert r_comp.json()["items"][0]["rectified_by"] == "Rahul K"

        # Verify no mutation methods exist on mirrored business data
        for method in ("POST", "PUT", "PATCH", "DELETE"):
            for path in ("/api/sync/quotations", "/api/sync/enquiries", "/api/sync/designs", "/api/sync/complaints"):
                resp = client.request(method, path, headers=headers)
                assert resp.status_code == 405
    finally:
        app.dependency_overrides.clear()
