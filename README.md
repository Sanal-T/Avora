# Avora ERP

Avora ERP is a modular Enterprise Resource Planning web application tailored for architectural and interior fit-out businesses. It unifies operations across sales, design, estimation, shop-floor production, on-site labour, and post-delivery client satisfaction into a single centralized system.

---

## 1. Core Business Workflow & Data Flow

Data flows sequentially through six integrated department workspaces:

```
[Customer Record]
       │
       ▼
[1. Enquiries] ──(Qualified)──► [2. Designs]
                                    │
                                (Approved)
                                    │
                                    ▼
                             [3. Quotations]
                                    │
                         (Approved & Handover)
                                    │
                                    ▼
                            [4. Production] ◄─── [5. Labour]
                             (Work Orders)      (Worker Allocation)
                                    │
                               (Completed)
                                    │
                                    ▼
                             [6. Feedback]
                          (Customer Survey)
```

1. **Customer Management (`/customers`):** Central customer directory storing corporate entities, contact persons, billing addresses, and tax identifiers.
2. **Enquiries Workspace (`/enquiries`):** Captures incoming customer leads, budget estimates, and site requirements. Follow-up status history tracks qualification progress.
3. **Design Studio (`/designs`):** Manages architectural drawings, 3D renderings, revisions, and design team assignments.
4. **Quotations & Estimation (`/quotations`):** Dynamic quotation builder with multi-item line pricing, percentage-based discounts, tax calculation, and version revisions (Rev 0, Rev 1, ...).
5. **Production & Work Orders (`/production`):** Converts approved quotations into active Work Orders with task breakdowns, priority scheduling, and milestone dates.
6. **Labour Operations (`/labour`):** Allocates skilled workers and field teams to active work orders and tracks fulfillment.
7. **Customer Feedback (`/feedback`):** Captures post-delivery client satisfaction ratings (1–5 stars), survey remarks, and ticket resolution workflows.
8. **Management Overview (`/`):** Unified executive dashboard with live department metrics, KPI cards, dynamic date filtering (`7d`, `30d`, `month`), and pending action items.

---

## 2. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, Lucide React.
  - Directory: `src/`
  - Dev Server: `http://localhost:5173` (Vite dev server proxies `/api` requests to backend).
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, Alembic migrations, Pydantic v2.
  - Directory: `backend/`
  - API Server: `http://localhost:8000` (FastAPI interactive Swagger documentation at `http://localhost:8000/docs`).
- **Database:** PostgreSQL 16 (or local SQLite fallback during standalone testing).
  - 33 relational tables managed by Alembic.

---

## 3. Quick Start & Setup

### Prerequisites
- Node.js 20+ and npm
- Python 3.12+
- PostgreSQL 16 (or remote LAN database connection)

### Backend Setup
```powershell
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
Copy-Item .env.example .env
# Edit .env with your DATABASE_URL, SECRET_KEY, etc.

# Run migrations to build all 33 tables
alembic upgrade head

# Seed initial departments, roles, permissions, admin user, and sample data
python app/db/init_db.py

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```powershell
# In project root
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

**Initial Administrator Credentials (Configured in `backend/.env` during initial database seed):**
- Email: `ADMIN_EMAIL` (default: `admin@avora.io`)
- Password: `ADMIN_PASSWORD` (configured in your local `.env`)

---

## 4. Security & Role-Based Access Control (RBAC)

Avora enforces a strict role hierarchy on all mutative API routes via dependency guards:

| Role | Permissions & Operational Scope |
| :--- | :--- |
| **Administrator** | Full system governance, staff management, organization settings, database bootstrap. |
| **Management** | Cross-department operational oversight, financial reporting, immutable audit logs. |
| **Sales / Accounts** | Customer creation, Enquiry lifecycle, Quotation calculation, revisions, follow-ups. |
| **Design Team** | Design proposals, CAD drawing versions, technical completion tracking. |
| **Production Manager** | Work Order scheduling, task checklists, machine bay and slot allocation. |
| **Labour Coordinator** | Worker registry, skill classifications, site crew allocation requests. |

---

## 5. Telemetry & Production Error Monitoring

Both the backend and frontend are pre-wired for instant developer error alerting:

* **Backend (`FastAPI`):** Set `ERROR_WEBHOOK_URL` in `backend/.env` (Discord, Slack, or Teams). Any unhandled `500 Internal Server Error` automatically delivers a formatted alert with endpoint, exception type, and stack trace snippet without leaking details to clients.
* **Frontend (`React 19`):** Set `VITE_ERROR_WEBHOOK_URL` in `.env`. Uncaught React component crashes caught by `ErrorBoundary` and unhandled Promise rejections are automatically dispatched.
* **Sentry SDK (Optional):** Define `SENTRY_DSN` in `backend/.env` to enable deep APM tracing.

---

## 6. Key Architectural Guarantees

- **Data Integrity First:** All dashboard metrics, status histories, and table lists connect directly to persisted PostgreSQL records. Zero mock-data fallbacks in production screens.
- **Atomic Multi-Record Transactions:** Multi-entity operations (e.g., Quotation-to-Work-Order conversion, Customer creation with contacts) execute inside atomic database transactions (`try...except: db.rollback()`). Audit logs are staged in the same transaction for guaranteed consistency.
- **Concurrency & Idempotency:** Database-level uniqueness constraints prevent duplicate work orders on quotation conversions, with graceful `409 Conflict` handling.
- **Reactive UI Performance:** Live KPI cards with GPU-accelerated interactive edge glow (`BorderGlow`), tabular grids, and instant client-side date-range filtering.

---

## 7. Documentation & Implementation Links

- [15-Day Implementation Pilot Plan](docs/implementation/15-day-pilot-plan.md)
- [Operational Setup & Migrations Guide](docs/implementation/operational-setup-guide.md)
- [Dashboard Architecture Plan](docs/architecture/dashboard-architecture.md)
- [Decision Log](docs/decisions/README.md)
