from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.auth import User
from app.schemas.system import AuditLogListResponse
from app.services import audit_service

router = APIRouter()


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Management"]))],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    entity_type: str | None = Query(default=None),
) -> AuditLogListResponse:
    total, items = audit_service.list_audit_logs(db, page=page, page_size=page_size, entity_type=entity_type)
    return AuditLogListResponse(total=total, items=items, page=page, page_size=page_size)
