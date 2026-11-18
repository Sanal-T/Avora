# Avora ERP

Planning workspace for a modular ERP system with a centralized management dashboard and department workspaces for enquiries, design, quotations, production, feedback, and labour.

## Project status

Dashboard prototype and API foundation are implemented. KPI definitions and business workflow rules remain proposals and still need business validation before production data modeling begins.

## Technology stack

- Frontend: TypeScript, React, Vite, and Tailwind CSS
- Backend: Python and FastAPI
- Data layer: PostgreSQL and SQLAlchemy
- Deployment: Docker

## Documents

- [Initial scope](docs/requirements/initial-scope.md)
- [Dashboard architecture](docs/architecture/dashboard-architecture.md)
- [Architecture plan and deliverables](docs/architecture/README.md)
- [Open business questions](docs/open-questions.md)
- [Decision log](docs/decisions/README.md)

## Working approach

Finalize the centralized dashboard information architecture and its department views first. Use a mock-data UI prototype only after that structure is approved, then integrate backend and database capabilities.

## Dashboard prototype

The React prototype implements the centralized overview and the six department dashboard views with isolated mock data. It includes a shared date-range control, refresh state, loading state, and API fallback indicator. To run it locally:

```powershell
npm install
npm run dev
```

Use `npm run build` to create a production bundle in `dist/`.

## API foundation

The FastAPI service exposes prototype dashboard summaries at `/api/dashboard/overview` and `/api/dashboard/{department_id}/summary`. The overview endpoint accepts `date_from` and `date_to` in ISO format and rejects invalid date ranges. Set `VITE_API_BASE_URL=http://localhost:8000` in a frontend `.env` file to use it; with no value, the UI uses its local mock-data adapter.

Run the API and PostgreSQL locally with Docker:

```powershell
docker compose up --build
```

The API carries no production tables or metric calculations yet. Those will be added after the confirmed workflows, KPI formulas, and record lifecycle rules are available.
