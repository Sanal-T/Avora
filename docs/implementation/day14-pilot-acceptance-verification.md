# Day 14 Pilot Acceptance & Verification Report

This document records the end-to-end verification, direct URL tests, filter boundaries, form validation, authorization checks, and defect remediation completed during **Day 14** of the Avora ERP pilot implementation plan.

---

## 1. End-to-End Core Workflow Walkthrough

A complete, realistic commercial fit-out project was exercised end-to-end through real PostgreSQL database persistence and verified via automated integration suite (`backend/tests/test_e2e_pilot_lifecycle.py`):

```
[1. Customer] ──► [2. Enquiry] ──► [3. Design] ──► [4. Quotation] ──► [5. Production] ──► [6. Labour] ──► [7. Feedback]
  Horizon           Turnkey           3D Concept       Quotation Rev 1     Work Order WO-      Joiner Assigned     5-Star Review
  Landmark          Fit-out           Proposal         ₹21,29,900          Assembly Tasks      Site Handover       Closed Ticket
```

### Stage-by-Stage Verification

| Stage | Module | Entity Created / Transitioned | Verified Guarantees |
|---|---|---|---|
| **1** | **Customer** | `Horizon Landmark Towers` (`CUST-031`) with 2 contacts | Nested contact atomicity, tax ID validation, audit log recorded |
| **2** | **Enquiries** | `ENQ-0033` (₹45,00,000 budget) $\rightarrow$ `Qualified` | Status history record created, transition audit logged |
| **3** | **Designs** | `D-004` $\rightarrow$ Version 1 PDF uploaded $\rightarrow$ `Approved` | Version tracking, audit trail staged with status change |
| **4** | **Quotations** | `Q-2026-0005` (Rev 1) with 3 line items $\rightarrow$ `Approved` | Subtotal (₹19,00,000) - 5% discount + 18% GST = ₹21,29,900.00 exact arithmetic |
| **5** | **Production** | Converted to Work Order `WO-0845` $\rightarrow$ `Completed` | Atomic multi-table handover, duplicate conversion blocked (409), 2 tasks created |
| **6** | **Labour** | Worker `Mahesh Sharma` assigned to Work Order request | Labour request created, worker status updated to `Assigned` |
| **7** | **Feedback** | Customer rating 5/5 stars $\rightarrow$ `Closed` | Client review logged, resolution notes recorded, ticket closed |

---

## 2. Direct Record URLs & Navigation Verification

Direct record URLs and browser reload behavior were verified across all modules:

| Route | View | Direct URL / Reload Behavior |
|---|---|---|
| `/enquiries/:id` | Enquiry Detail | Directly resolves from PostgreSQL by UUID or `enquiry_number`; initializes cleanly without fake fallback data |
| `/designs/:id` | Design Detail | Directly resolves from PostgreSQL by UUID or `design_number`; renders drawing versions and review histories |
| `/quotations/:id` | Quotation Detail | Directly resolves from PostgreSQL by UUID or `quotation_number`; displays calculated line items, discount, GST, and conversion actions |
| `/production/:id` | Work Order Detail | Directly resolves from PostgreSQL by UUID or `work_order_number`; renders task checklist and linked quotation |
| `/feedback/:id` | Feedback Detail | Directly resolves from PostgreSQL by UUID; allows survey entry, star ratings, and ticket resolution |
| `/quotations/builder` | Quotation Builder | Loads customer & enquiry dropdowns, dynamically calculates line item subtotal, tax, and grand totals |
| `/` | Main Dashboard | Fetches live department overview with global date-range selector (`7d`, `30d`, `month`) |

> **Navigation Optimization:** Client-side SPA navigation via `useNavigate()` was wired across all department dashboards, replacing legacy hard-reloads (`window.location.href`) to ensure fast, stateful page transitions.

---

## 3. Empty Database & 404 Behavior

- **Nonexistent Record URLs:** Verified that querying nonexistent or invalid UUIDs returns clean `HTTP 404 Not Found` across all modules:
  - `customer_service.get_customer` $\rightarrow$ 404
  - `enquiry_service.get_enquiry` $\rightarrow$ 404
  - `design_service.get_design` $\rightarrow$ 404
  - `quotation_service.get_quotation` $\rightarrow$ 404
  - `production_service.get_work_order` $\rightarrow$ 404
  - `feedback_service.get_feedback` $\rightarrow$ 404
  - `labour_service.get_worker` $\rightarrow$ 404
- **Purged Mock Fallbacks:** Removed silent fallback to mock arrays in `QuotationsListPage`, `QuotationDetailPage`, `ProductionListPage`, `WorkOrderDetailPage`, and `LabourListPage`. On clean/empty database states, tables now accurately display empty states (`"No records found"`) rather than confusing users with hardcoded prototype data.

---

## 4. Input Validation & Form Constraints

Pydantic schemas and UI forms enforce strict operational rules:
- **Line Items:** Line item quantity must be strictly greater than 0 (`gt=0`); negative or zero quantities are rejected.
- **Unit Pricing:** Unit price cannot be negative (`ge=0`).
- **Discount & Tax Rates:** Enforced within bounds `0.00%` to `100.00%`.
- **Customer Identity:** Customer and contact names must not be empty (`min_length=1`); valid email formatting required.
- **Satisfaction Ratings:** Customer survey rating must be between 1 and 5 stars (`ge=1, le=5`).

---

## 5. Authorization & Permission Boundary Verification

- **Anonymous Access Blocked:** Anonymous requests to `/api/dashboard/overview`, `/api/dashboard/{dept}/summary`, `/api/audit-logs`, `/api/reports/*`, and all CRUD operations are strictly rejected with `HTTP 401 Unauthorized`.
- **Role-Based Access Control (RBAC):**
  - Administrative deletion (`DELETE /api/customers/{id}`) requires `Administrator` or `Management` roles.
  - Audit log inspection (`GET /api/audit-logs`) is restricted to `Administrator` and `Management` roles.
  - CSV report exports are protected by explicit role guards.

---

## 6. Automated Test Results

Ran test suite combining lifecycle, transactions, and edge cases:

```powershell
backend/tests/test_e2e_pilot_lifecycle.py::test_complete_end_to_end_pilot_lifecycle PASSED [ 14%]
backend/tests/test_e2e_pilot_lifecycle.py::test_form_validation_and_edge_cases PASSED       [ 28%]
backend/tests/test_e2e_pilot_lifecycle.py::test_nonexistent_records_return_404 PASSED       [ 42%]
backend/tests/test_audit_transactions.py::test_atomic_quote_conversion_and_audit_trail PASSED [ 57%]
backend/tests/test_audit_transactions.py::test_duplicate_conversion_conflict PASSED           [ 71%]
backend/tests/test_audit_transactions.py::test_customer_creation_atomic_and_audit PASSED     [ 85%]
backend/tests/test_audit_transactions.py::test_in_app_notifications_lifecycle PASSED         [100%]
```

- **Frontend Type Safety:** `npx tsc --noEmit` passed with **0 errors**.
- **Python Syntax:** All backend files verified with Python AST parser.
