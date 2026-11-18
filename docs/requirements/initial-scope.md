# Initial scope and requirement status

This document captures the project brief as received. The source notes that the requirements came from a handwritten business requirements document, may change, and have not yet been validated with the business. Nothing below should be treated as a finalized workflow or policy until confirmed.

## Initial modules requested

### Enquiry management

- Track enquiries by day, week, and month.
- Track qualified, pending, and converted enquiries.
- Report enquiry conversion statistics.

### Design management

- Manage design proposals and design work status.
- Track designs by day, week, and month, including pending and completed work.
- Report by design and manage design documents.

### Quotation management

- Track quotations by day, week, and month.
- Track quotation follow-ups, next reminder dates, and customer approval.
- Send approved quotations to production.
- Track final bill calculations and monetary values.

### Production and feedback management

- Schedule production work and daily production slots.
- Track production status and completion.
- Track installation.
- Collect customer feedback.
- Report production activity by day, week, and month.

### Labour management

- Keep labour and worker contact information.
- Manage confirmations, approvals, and labour requests.
- Capture suggestions and allocate labour.

## Design constraints stated in the brief

- Begin with a modular monolith and keep business modules independently organized.
- Support centralized workflows, department communication, reusable services, and configurable statuses.
- Include role-based permissions, audit history, notifications and reminders, reporting, document management, and room for future integrations.
- Preserve transactional consistency and avoid duplicating business data.
- Support department dashboards, a management dashboard, and daily, weekly, monthly, and custom-range reporting.

## Proposed technology preferences

These are initial preferences, not finalized decisions:

- React, Tailwind CSS, and REST APIs.
- Python with FastAPI.
- PostgreSQL, SQLAlchemy, and Alembic.
- JWT or secure session-based authentication and RBAC.
- Docker and S3-compatible object storage.

## Proposed considerations to validate

- A customer may have multiple enquiries.
- An enquiry may produce multiple design proposals or quotation versions.
- An approved quotation should link to a production work order.
- Production and installation progress should be traceable.
- Important business actions should have an audit trail.

These relationships and policies need confirmation before database and workflow design.

## Assumptions

None recorded. Do not infer approval rules, status transitions, calculations, or data access rules from the module names alone.

## Future enhancements

No future enhancements have been committed yet. External integrations and expansion beyond the initial modules are architectural goals, with specific systems and scope still to be identified.
