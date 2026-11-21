# Avora ERP - Operational Setup, Database Migrations & Integrity Guide

This document defines the operational procedures, database lifecycle management, transaction boundaries, audit logging mechanisms, and notification behavior for **Avora ERP**.

---

## 1. Environment Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and configure:

```env
APP_NAME=Avora ERP API
APP_ENV=development

# Database Connection (PostgreSQL sync driver psycopg2 or SQLite fallback)
# Remote LAN Database:
DATABASE_URL=postgresql+psycopg2://postgres:postgres@192.168.1.88:5432/avora
# Local PostgreSQL:
# DATABASE_URL=postgresql+psycopg2://avora:avora@localhost:5432/avora

CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Security (JWT secret key and token lifetime)
SECRET_KEY=avora-super-secret-development-key-change-in-production-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Initial Admin Seeding Credentials
ADMIN_EMAIL=admin@avora.io
ADMIN_PASSWORD=Admin@123456
```

> **Security Note:** In `production` environment (`APP_ENV=production`), the backend validates that `SECRET_KEY` does not contain default placeholder tokens and that `ADMIN_PASSWORD` has been changed from `Admin@123456`.

### Frontend (`.env`)
The Vite dev server proxies `/api` directly to `http://localhost:8000`. If running outside the proxy, configure:
```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 2. Database Migrations & Seeding Commands

### Database Migrations (Alembic)
The relational schema comprises 33 tables managed by Alembic.

```powershell
# Navigate to backend directory
cd backend

# Inspect current database revision
alembic current

# Apply all migrations to the latest schema version
alembic upgrade head

# Create a new migration after model adjustments
alembic revision --autogenerate -m "describe_changes"

# Downgrade by one revision (if rollbacks are needed in dev)
alembic downgrade -1
```

### Development Database Initialization & Seeding
To populate a fresh or updated database with departments, default roles, permissions, administrative user, and baseline pilot records:

```powershell
# Run from backend directory with virtual environment active
python app/db/init_db.py
```

The seeder populates:
1. **6 Departments:** Enquiries, Designs, Quotations, Production, Feedback, Labour.
2. **6 Roles:** Administrator, Sales Rep, Designer, Production Manager, Site Supervisor, Customer Relations.
3. **Standard Permissions & Role Assignments:** Comprehensive RBAC matrix.
4. **Default Admin:** `admin@avora.io` with hashed password.
5. **Seeded Pilot Records:** 30 customers with contacts, 32 enquiries, designs with versions, draft/approved quotations, work orders, worker profiles, and customer feedback entries.

---

## 3. Transaction Boundaries & Data Integrity

### Multi-Record Atomic Transactions
Avora ERP enforces strict atomic boundaries around business workflows involving multiple tables:

1. **Quotation to Work Order Conversion (`convert_quotation_to_work_order`):**
   - Staging of new `WorkOrder` entity.
   - Staging of initial `WorkOrderStatusHistory` record.
   - Staging of `QuotationStatusHistory` record.
   - Updating `Quotation.status` to `"Converted"`.
   - Staging of `AuditLog` records for quotation conversion and work order creation (`commit=False`).
   - Single atomic `db.commit()` commits all mutations together.
   - If any step fails or violates a constraint, `db.rollback()` executes, leaving zero orphan records.

2. **Customer Creation (`create_customer`):**
   - Staging of `Customer` record.
   - Staging of nested `CustomerContact` records.
   - Staging of `AuditLog` record (`commit=False`).
   - Atomic `db.commit()` with `try...except Exception: db.rollback(); raise`.

3. **Status Transitions across Workflows:**
   - Every status transition (`update_enquiry_status`, `update_quotation_status`, `update_work_order_status`) generates a corresponding status history record and audit log committed in the same database transaction.

### Concurrency & Idempotency Protection
- `work_orders.quotation_id` has a unique database constraint (`unique=True`).
- In addition to pre-checking existing work orders, `convert_quotation_to_work_order` traps `sqlalchemy.exc.IntegrityError` to catch concurrent conversion attempts and returns a clean `HTTP 409 Conflict` without leaking database driver details.

### Foreign Key & Deletion Policies
- **Cascading Child Records (`ondelete="CASCADE"`):** Line items (`quotation_items`), revisions (`quotation_revisions`), follow-ups (`quotation_follow_ups`), tasks (`production_tasks`), and installations (`installations`) cascade with their parent header records.
- **Referential Protection (`ondelete="RESTRICT"`):** Customer and quotation links on work orders prevent accidental orphan data.
- **Soft Delete Filtering:** Customer, Enquiry, Design, Quotation, WorkOrder, and Feedback use `is_deleted=True` and `deleted_at=datetime.now(timezone.utc)` for soft deletion. All service queries consistently filter `is_deleted == False`.

---

## 4. Audit Trail (`/api/audit-logs`)

- **Table:** `audit_logs` records `action`, `entity_type`, `entity_id`, `user_id`, `changes_summary`, `ip_address`, and `created_at`.
- **Atomic Staging:** Through `audit_service.log_audit_action(db, ..., commit=False)`, audit entries are committed in the same transaction as the parent action.
- **Access Control:** `GET /api/audit-logs` is strictly restricted to `Administrator` and `Management` roles.

---

## 5. In-App Notifications & Operational Basics

- **Storage:** Persisted in PostgreSQL table `notifications` (`recipient_id`, `title`, `message`, `link`, `category`, `is_read`, `created_at`).
- **In-App Display:** The UI Topbar `NotificationsDropdown` queries `GET /api/notifications` for the logged-in user, supports marking individual items as read (`PATCH /api/notifications/{id}/read`), and marking all as read (`PATCH /api/notifications/read-all`).
- **Scope & Deferral:** In-app notifications are operational. Outbound external notifications (email delivery, SMS, third-party messaging integrations) are intentionally deferred beyond the 15-day pilot per specification.
