from fastapi import APIRouter

from app.api.routes.accounts import router as accounts_router
from app.api.routes.audit_logs import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.communications import router as communications_router
from app.api.routes.customers import router as customers_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.designs import router as designs_router
from app.api.routes.enquiries import router as enquiries_router
from app.api.routes.feedback import router as feedback_router
from app.api.routes.files import router as files_router
from app.api.routes.health import router as health_router
from app.api.routes.labour import router as labour_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.production import router as production_router
from app.api.routes.projects import router as projects_router
from app.api.routes.quotations import router as quotations_router
from app.api.routes.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(customers_router, prefix="/customers", tags=["customers"])
api_router.include_router(enquiries_router, prefix="/enquiries", tags=["enquiries"])
api_router.include_router(designs_router, prefix="/designs", tags=["designs"])
api_router.include_router(quotations_router, prefix="/quotations", tags=["quotations"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
api_router.include_router(production_router, prefix="/production", tags=["production"])
api_router.include_router(accounts_router, prefix="/accounts", tags=["accounts"])
api_router.include_router(communications_router, prefix="/communications", tags=["communications"])
api_router.include_router(feedback_router, prefix="/feedback", tags=["feedback"])
api_router.include_router(labour_router, prefix="/labour", tags=["labour"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
api_router.include_router(audit_router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(files_router, prefix="/files", tags=["files"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
