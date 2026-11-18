# Avora ERP

Planning workspace for a modular ERP system with a centralized management dashboard and department workspaces for enquiries, design, quotations, production, feedback, and labour.

## Project status

Requirements intake and dashboard-first architecture planning. The initial scope, KPI definitions, and technology choices are proposals from the project brief and still need business validation. Application code has not started.

## Documents

- [Initial scope](docs/requirements/initial-scope.md)
- [Dashboard architecture](docs/architecture/dashboard-architecture.md)
- [Architecture plan and deliverables](docs/architecture/README.md)
- [Open business questions](docs/open-questions.md)
- [Decision log](docs/decisions/README.md)

## Working approach

Finalize the centralized dashboard information architecture and its department views first. Use a mock-data UI prototype only after that structure is approved, then integrate backend and database capabilities.

## Dashboard prototype

The React prototype implements the centralized overview and the six department dashboard views with isolated mock data. To run it locally:

```powershell
npm install
npm run dev
```

Use `npm run build` to create a production bundle in `dist/`.
