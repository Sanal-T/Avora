# Centralized dashboard architecture

## Status

**Active direction, pending business validation.** This captures the updated dashboard architecture brief. It defines page structure and navigation intent, while KPI formulas, status rules, and access rules remain open.

## Purpose

Provide management with a single, compact view of the company, then let authorized users open a department workspace for operational detail. The centralized dashboard is the default post-login destination and stays accessible from every page.

## View hierarchy

```text
Centralized main dashboard
├── Enquiry dashboard
├── Design dashboard
├── Quotation dashboard
├── Production dashboard
├── Feedback dashboard
└── Labour dashboard
```

## Main dashboard composition

1. Header: logo, company name, page title, global date filter, notifications, and profile menu.
2. Overall business summary: proposed management KPIs, pending definition.
3. Department overview grid: all six cards visible together.
4. Pending actions and important alerts.
5. Recent cross-department activity.
6. Business trends and analytics.

The grid targets three columns on desktop, two on tablet, and one on mobile. Each card links to the corresponding department dashboard using a visible **View details** action and the card itself may be clickable.

## Department card contract

Every card contains a department name, a primary KPI, up to three supporting metrics, applicable status indicators, and the detail action. Metric values come from summary APIs and must never be hardcoded in the live product.

| Department | Proposed card metrics requiring definition |
| --- | --- |
| Enquiries | Total, qualified, pending, converted |
| Designs | Total, pending, in progress, completed |
| Quotations | Total, approved, pending, converted |
| Production | Total work orders, active, completed, delayed |
| Feedback | Total feedback records, received, awaiting |
| Labour | Total workers, available, assigned, pending requests |

The table is a display proposal. Definitions, date scope, record lifecycle rules, and visibility rules must be confirmed before the metrics are calculated.

## Department dashboard contract

Each department dashboard follows the same structural pattern: detailed KPIs, charts, work queues split by relevant status, recent activity, search and filters, department actions, and navigation to full listings and record details. Content differs by department, while page shell, filters, loading states, empty states, error states, and navigation remain shared.

## Navigation

- Persistent main-dashboard entry point.
- Permission-aware sidebar for departments.
- Breadcrumbs from overview to department dashboard to record details.
- Clear department page titles and a back-to-overview action.
- Direct cross-department links when the current user has access.

## Frontend boundaries

Create separate views for the main dashboard and each department dashboard. Share a layout shell, navigation, date-range controls, KPI card, status badge, chart wrapper, table, empty state, error state, and API client. Keep mock data in an isolated adapter so it can be replaced by API clients without changing the views.

## Backend integration target

The modular monolith exposes an overview endpoint and department summaries. These endpoint shapes are proposed until metric definitions are confirmed:

```text
GET /api/dashboard/overview
GET /api/dashboard/enquiries/summary
GET /api/dashboard/designs/summary
GET /api/dashboard/quotations/summary
GET /api/dashboard/production/summary
GET /api/dashboard/feedback/summary
GET /api/dashboard/labour/summary
```

All summary queries accept a consistent date-range filter once the business date basis is chosen. The backend owns aggregation and lifecycle handling to prevent frontend calculations and double counting. Responses must support authorization-aware values, loading behavior, empty states, and recoverable API errors.

## Decisions still needed before implementation

- KPI formulas and their record lifecycle rules.
- Overall business summary metrics.
- Role and department visibility rules.
- Exact department dashboard actions and work queues.
- Date filter defaults, timezone, and business calendar.
- Notification/alert priorities and recipients.
