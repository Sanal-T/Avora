# Avora ERP: 15-Day Implementation Plan

**Planning target:** 15 working days, 6 focused hours per day, 90 hours total.  
**Delivery target:** a database-backed pilot for the existing ERP application, not a fully production-hardened enterprise rollout.  
**Technology stack:** TypeScript, React, Vite, Tailwind CSS, Python, FastAPI, PostgreSQL, SQLAlchemy, Alembic, Docker.

## Instructions for an AI assistant continuing this project

Treat this document as the agreed timebox and pilot scope. Before changing code, inspect the current repository and its local instructions because the implementation may have changed since this plan was written. Preserve existing user work. Do not replace working screens or services just to match this document's descriptions.

Work in six-hour daily increments. At the start of each day, state the target and inspect the relevant code. Implement one small end-to-end slice at a time. At the end of the day, report completed items, validation performed, blockers, remaining work, and the next day's target. Keep business rules that are not confirmed as explicit open decisions; do not silently invent them.

Stay within the pilot scope below. If schedule pressure appears, reduce optional scope before weakening data integrity, authentication, authorization, or persistence. Do not deploy to a public or production environment without explicit authorization.

## Project context at planning time

The repository already contains a React and TypeScript interface, Vite configuration, shared UI components, department pages, mock data, and API client code. The backend contains FastAPI routes, SQLAlchemy models and services for customers, enquiries, designs, quotations, production, feedback, labour, authentication, reports, notifications, files, and audit logs. Docker Compose defines PostgreSQL and API services.

The key known database blocker at planning time is `backend/alembic/versions/9370b19e875f_initial_schema.py`: its `upgrade()` and `downgrade()` bodies are empty. The repository also has `backend/app/db/init_db.py` with sample records and a default administrator, but migrations and development seeding must remain deliberate operations. Several frontend department screens still use mock data. Recheck these facts before acting because the repository can change.

## Pilot outcome

At the end of day 15, a local or controlled internal pilot should be able to:

1. Start PostgreSQL and the API through the documented development setup.
2. Create a fresh database schema through Alembic migrations.
3. Sign in with a configured development account and use backend-protected APIs.
4. Manage the agreed core customer and enquiry records with data persisting across reloads.
5. Complete the agreed basic design, quotation, production handover, and work-status flows using the existing implementation where practical.
6. View the six-department dashboard using persisted summary data for metrics whose definitions have been confirmed.
7. Review remaining limitations and known decisions in a handover note.

Feedback and labour flows are included as a basic pilot target if the core path stays on schedule. Advanced reporting, integrations, file storage beyond local development, and production operations are excluded from the 90-hour commitment.

## Scope rules

### In scope

- PostgreSQL setup, SQLAlchemy connection/session handling, Alembic migrations, and safe development-only sample data.
- Login and existing RBAC protection needed for the pilot.
- Connect the existing frontend to the existing API in this business path: customer -> enquiry -> design -> quotation -> approved quotation -> work order -> production status -> feedback.
- Basic labour worker and assignment/request visibility if schedule allows.
- Database-backed dashboard summaries and agreed date filters.
- Error, loading, empty, and permission-denied states for connected screens.
- Manual end-to-end verification and focused automated checks where useful.
- Setup and handover instructions.

### Explicitly deferred

- Full production security review, high availability, autoscaling, and cloud deployment.
- S3-compatible object storage and robust document versioning.
- Email/SMS/push delivery and scheduled notification workers.
- Complex approval routing, configurable workflow designer, payroll, inventory, purchasing, accounting, and multi-company support.
- Advanced analytics, exports, and custom report builder.
- Data migration from real spreadsheets or legacy systems.
- Full audit coverage of every field and every system action.
- Polish or redesign of screens that are not needed for the pilot path.

### Business rules to confirm before they are encoded

- What qualifies an enquiry and what exact event means it is converted.
- Whether an enquiry can have multiple designs, quotation versions, or resulting work orders.
- Quote calculations: currency, taxes, discounts, validity, deposits, rounding, approval, revision, and final bill rules.
- Allowed status transitions, cancellation/rejection/archive behavior, and what counts as delayed.
- Which roles can see or change records and department-level data.
- KPI definitions, date basis, business timezone/calendar, and treatment of revised or deleted records.

Where an answer is unavailable, preserve current behavior as a clearly labelled pilot assumption or leave that function out; record the decision needed.

## Day-by-day plan

Each day represents up to six hours of focused work. The exit condition is the day's reviewable result. If a blocker consumes time, move optional work later rather than stretching the daily budget silently.

### Day 1 - Establish a reproducible database connection

- Inspect current configuration, dependency versions, Docker Compose, model registration, and current database defaults.
- Choose and document one PostgreSQL driver consistently across the connection URL and Python dependencies.
- Confirm environment variables are loaded correctly by both the API and Alembic.
- Start PostgreSQL and verify API-to-database connectivity and health reporting.
- Identify and document the clean-database migration blocker and migration command.

**Exit:** a developer can start the database and API from documented commands, and the API can connect to PostgreSQL. No schema is assumed to exist yet.

### Day 2 - Create schema and safe development data workflow

- Ensure all SQLAlchemy models are imported into Alembic metadata.
- Generate and review a real initial Alembic migration from the current models; check foreign keys, indexes, unique constraints, and deletion behavior.
- Apply the migration to an empty database and confirm the revision is recorded.
- Make development seed data an explicit, repeatable command; never seed production automatically.
- Move default credentials to environment configuration, ensure no production default password is accepted, and document reset/cleanup behavior for disposable development data.

**Exit:** a fresh PostgreSQL database reaches the current schema using Alembic, and optional development seed data can be added intentionally.

### Day 3 - Connect authentication and customer records

- Verify login, token storage, current-user retrieval, logout behavior, expired-token handling, and API authorization headers.
- Confirm customer endpoints enforce authentication and intended permissions.
- Connect customer lookup/list/detail and any customer create/edit UI used by the enquiry flow.
- Add useful empty, loading, validation, and API error states.

**Exit:** a signed-in pilot user can create and find a customer through the UI, and the record remains after reload.

### Day 4 - Connect enquiry workflow

- Connect enquiry list, search/filter, detail, create/edit, assignment, and status updates to existing routes.
- Preserve customer links and assignment references rather than copying customer details into enquiry records.
- Confirm status history is written for meaningful transitions.
- Confirm date filters and pagination are consistent with API behavior.

**Exit:** a customer can have multiple enquiries; an enquiry can be created, found, updated, and inspected after reload.

### Day 5 - Connect design workflow

- Connect design list, detail, create/update, assignment, status, and version metadata where present.
- Preserve the enquiry relationship and designer/user relationships.
- Use existing file references only; do not claim cloud document storage is ready.
- Review status history and permissions.

**Exit:** an enquiry can progress to one or more persisted designs, subject to confirmed business rules, and status changes are traceable.

### Day 6 - Connect quotation creation and revisions

- Connect quotation list, detail, and builder to existing APIs.
- Persist quotation line items and monetary values as decimal/numeric values, not binary floating point.
- Verify revision handling preserves historical totals and change notes.
- Confirm UI validation matches the current server-side calculations.
- Record any unresolved tax, discount, rounding, or deposit assumptions.

**Exit:** a quotation and its items can be saved and read back; revisions do not silently lose the prior commercial record.

### Day 7 - Connect approval and production handover

- Connect customer approval/status actions to backend routes.
- Verify unauthorized users cannot approve or convert.
- Convert an approved quotation to a work order as one transaction.
- Make conversion safe against duplicate submissions, including concurrent requests where practical.
- Verify quotation and work-order history remain consistent when conversion succeeds or fails.

**Exit:** an approved quotation creates the intended work order exactly once and is linked back to the quotation.

### Day 8 - Connect production tracking and schedule basics

- Connect work-order list/detail, status updates, tasks, and basic schedule views to persisted APIs.
- Verify planned dates and completed dates are stored consistently, with timezone-aware timestamps where applicable.
- Resolve how delayed status is determined for the pilot; do not count both manually delayed and overdue work twice.
- Defer capacity planning or complex slot conflict rules unless already confirmed and implemented.

**Exit:** work-order status and schedule changes persist and can be reviewed from the detail view.

### Day 9 - Connect labour basics

- Connect worker list/detail and basic labour assignment/request views.
- Verify worker availability is not inferred from a stale mock count.
- Confirm relationship and status rules for requests and assignments.
- Keep payroll, attendance, and wage calculation out of scope.

**Exit:** basic worker and request/assignment records are persisted and visible to authorized users, or a specific blocker is documented and feedback takes priority.

### Day 10 - Connect feedback basics

- Connect feedback list/detail, create/response/status operations, and customer/work-order relationships.
- Avoid displaying a satisfaction score until the rating scale and calculation are confirmed.
- Confirm feedback access is limited to permitted users.

**Exit:** feedback can be recorded against the relevant customer or work order and retrieved after reload.

### Day 11 - Complete module UI/API wiring and authorization pass

- Search for remaining mock-data imports in the pilot screens and replace them only where a corresponding API exists.
- Check every pilot API route for authentication and permission enforcement, including dashboard summaries.
- Check UI permission-aware navigation and direct URL access; backend authorization remains authoritative.
- Confirm error messages do not leak stack traces or sensitive data.

**Exit:** the agreed pilot path no longer silently reads mock records; protected APIs reject anonymous or unauthorized access.

### Day 12 - Connect database-backed dashboard summaries

- Confirm definitions for each displayed KPI, date basis, timezone, statuses, and revised/cancelled/deleted record treatment.
- Use module service/query functions for department summary data; keep aggregation on the backend.
- Ensure all summary queries exclude soft-deleted data consistently and avoid double counting joins.
- Ensure the global date range is sent to every applicable summary and shown in the UI.
- Label any unconfirmed measure as provisional or omit it.

**Exit:** dashboard metrics shown as live are derived from persisted records and match documented definitions; no hard-coded “live” values remain.

### Day 13 - Integrity, audit, and operational basics

- Review transaction boundaries for multi-record writes, especially quote conversion and status/history updates.
- Ensure audit records are committed atomically with the business action where required.
- Verify notifications are stored and displayed in-app only if the existing implementation supports it; external delivery is deferred.
- Review FK behavior, required fields, uniqueness, indexes for list/search paths, and soft-delete filtering.
- Add setup notes for environment variables, migration, and seed commands.

**Exit:** critical multi-table operations either commit fully or roll back; audit/history and notification behavior are accurately described.

### Day 14 - End-to-end pilot review and defect fixing

- Walk through a realistic record from customer and enquiry through design, quotation, approval, work order, production status, and feedback.
- Check direct record URLs, browser refresh, pagination/search, form validation, permission-denied flows, and empty database behavior.
- Check calculations against agreed examples and test boundary dates for dashboard filters.
- Fix high-impact persistence, authorization, data-loss, and workflow defects first.

**Exit:** the primary path passes the agreed manual acceptance checklist on a clean or seeded PostgreSQL database.

### Day 15 - Pilot readiness and handover

- Resolve remaining critical defects and run a final clean database migration/startup walkthrough.
- Document known limitations, assumptions, admin setup, backup/restore expectations, and the first post-pilot work items.
- Prepare the local/internal pilot environment; do not publish externally without explicit authorization.
- Review the final accepted scope and capture user feedback for the next iteration.

**Exit:** a repeatable internal pilot setup and handover note exist; any deferred feature is visible and not represented as complete.

## Daily work rhythm

- 0:00-0:30 - inspect current state, select the day's scope, and list dependencies.
- 0:30-4:30 - implement the smallest end-to-end slice.
- 4:30-5:30 - manually verify the changed flow and fix critical defects.
- 5:30-6:00 - record decisions, blockers, changed files, and the next step.

## Completion definition

The 15-day pilot is complete when the database can be built from migrations; the agreed core business flow persists and can be reloaded; protected APIs enforce login and permissions; dashboard live metrics use confirmed definitions; the setup and known limitations are documented; and the user has reviewed the pilot. This is not the same as production hardening or completion of deferred features.

## Schedule risks and response

- **Empty or mismatched migration:** prioritize days 1-2; defer non-critical modules if schema creation slips.
- **Unconfirmed business rules:** record a decision and use a temporary, clearly marked pilot assumption only where safe; do not invent tax, approval, or KPI rules.
- **Mock data is more widespread than expected:** prioritize the customer/enquiry-to-production path and defer unrelated screens.
- **Authentication/RBAC gaps:** do not bypass protection to save time; reduce pilot users or scope while retaining server-side checks.
- **File storage or outbound communications not configured:** keep file metadata or in-app reminders only if already supported, and defer external integrations.
- **Time exceeds 90 hours:** ship the stable customer/enquiry/design/quotation/work-order path first, and label feedback/labour/reporting as deferred rather than shipping unverified behavior.
