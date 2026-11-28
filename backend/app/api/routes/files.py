import os
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.api.routes.accounts import FINANCE_EDIT_ROLES, FINANCE_VIEW_ROLES
from app.models.accounts import AccountsRecord, Invoice
from app.models.auth import User
from app.models.communication import Communication
from app.models.design import Design
from app.models.enquiry import Enquiry
from app.models.feedback import Feedback
from app.models.production import Installation, WorkOrder
from app.models.project import Project
from app.models.quotation import Quotation
from app.models.system import Attachment

router = APIRouter()

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads"))
ALLOWED_EXTENSIONS = {".pdf", ".dwg", ".dxf", ".png", ".jpg", ".jpeg", ".xlsx", ".docx"}
ALLOWED_ENTITY_TYPES = {
    "enquiry",
    "design",
    "quotation",
    "project",
    "production",
    "accounts",
    "invoice",
    "installation",
    "feedback",
    "communication",
    "general",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

_ADMIN_MANAGEMENT_ROLES = {"Administrator", "Super Admin", "Management"}

_ENTITY_READ_ROLES: dict[str, set[str] | None] = {
    "accounts": set(FINANCE_VIEW_ROLES),
    "invoice": set(FINANCE_VIEW_ROLES),
    "enquiry": None,
    "design": None,
    "quotation": None,
    "project": None,
    "production": None,
    "installation": None,
    "feedback": None,
    "communication": None,
    "general": None,
}

_ENTITY_WRITE_ROLES: dict[str, set[str] | None] = {
    "accounts": set(FINANCE_EDIT_ROLES),
    "invoice": set(FINANCE_EDIT_ROLES),
    "enquiry": {"Administrator", "Super Admin", "Management", "Sales / Accounts", "Enquiry Staff"},
    "design": {"Administrator", "Super Admin", "Management", "Design Team"},
    "quotation": {"Administrator", "Super Admin", "Management", "Sales / Accounts"},
    "project": {"Administrator", "Super Admin", "Management", "Department Manager"},
    "production": {"Administrator", "Super Admin", "Management", "Production Manager"},
    "installation": {"Administrator", "Super Admin", "Management", "Production Manager"},
    "feedback": None,
    "communication": None,
    "general": None,
}


def _user_has_any_role(user: User, allowed_roles: set[str] | None) -> bool:
    if allowed_roles is None or user.is_superuser:
        return True
    user_roles = {r.name for r in user.roles}
    return any(role in user_roles for role in allowed_roles)


def _validate_entity_type(entity_type: str) -> None:
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported entity_type '{entity_type}'.",
        )


def _parse_entity_uuid(entity_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(entity_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity_id format; expected UUID.",
        ) from exc


def _linked_record_exists(db: Session, entity_type: str, entity_uuid: uuid.UUID) -> bool:
    if entity_type == "enquiry":
        return db.query(Enquiry.id).filter(Enquiry.id == entity_uuid, Enquiry.is_deleted == False).first() is not None
    if entity_type == "design":
        return db.query(Design.id).filter(Design.id == entity_uuid, Design.is_deleted == False).first() is not None
    if entity_type == "quotation":
        return db.query(Quotation.id).filter(Quotation.id == entity_uuid, Quotation.is_deleted == False).first() is not None
    if entity_type == "project":
        return db.query(Project.id).filter(Project.id == entity_uuid, Project.is_deleted == False).first() is not None
    if entity_type == "production":
        return db.query(WorkOrder.id).filter(WorkOrder.id == entity_uuid, WorkOrder.is_deleted == False).first() is not None
    if entity_type == "installation":
        return (
            db.query(Installation.id)
            .join(WorkOrder, Installation.work_order_id == WorkOrder.id)
            .filter(Installation.id == entity_uuid, WorkOrder.is_deleted == False)
            .first()
            is not None
        )
    if entity_type == "accounts":
        return db.query(AccountsRecord.id).filter(AccountsRecord.id == entity_uuid, AccountsRecord.is_deleted == False).first() is not None
    if entity_type == "invoice":
        return (
            db.query(Invoice.id)
            .join(AccountsRecord, Invoice.accounts_record_id == AccountsRecord.id)
            .filter(Invoice.id == entity_uuid, AccountsRecord.is_deleted == False)
            .first()
            is not None
        )
    if entity_type == "feedback":
        return db.query(Feedback.id).filter(Feedback.id == entity_uuid, Feedback.is_deleted == False).first() is not None
    if entity_type == "communication":
        return db.query(Communication.id).filter(Communication.id == entity_uuid).first() is not None
    return False


def _authorize_entity_access(
    db: Session,
    current_user: User,
    entity_type: str,
    entity_id: str,
    *,
    require_write: bool = False,
    uploaded_by_id: uuid.UUID | None = None,
) -> None:
    _validate_entity_type(entity_type)

    allowed_roles = _ENTITY_WRITE_ROLES[entity_type] if require_write else _ENTITY_READ_ROLES[entity_type]
    if not _user_has_any_role(current_user, allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation not permitted for entity_type '{entity_type}'.",
        )

    if entity_type == "general":
        if not require_write and not _user_has_any_role(current_user, _ADMIN_MANAGEMENT_ROLES):
            if uploaded_by_id is not None and uploaded_by_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operation not permitted for this attachment.",
                )
        return

    entity_uuid = _parse_entity_uuid(entity_id)
    if not _linked_record_exists(db, entity_type, entity_uuid):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Linked {entity_type} record not found.",
        )


@router.get("")
def list_files(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[dict[str, str | int]]:
    _authorize_entity_access(db, current_user, entity_type, entity_id, require_write=False)

    query = db.query(Attachment).filter(Attachment.entity_type == entity_type, Attachment.entity_id == entity_id)
    if entity_type == "general" and not _user_has_any_role(current_user, _ADMIN_MANAGEMENT_ROLES):
        query = query.filter(Attachment.uploaded_by_id == current_user.id)

    items = query.order_by(Attachment.created_at.desc()).all()
    return [
        {
            "id": str(att.id),
            "file_name": att.file_name,
            "file_size": att.file_size,
            "mime_type": att.mime_type,
            "created_at": att.created_at.isoformat() if att.created_at else "",
        }
        for att in items
    ]


@router.get("/batch")
def list_files_batch(
    entity_type: str,
    entity_ids: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, list[dict[str, str | int]]]:
    _validate_entity_type(entity_type)
    if not _user_has_any_role(current_user, _ENTITY_READ_ROLES[entity_type]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operation not permitted for entity_type '{entity_type}'.",
        )

    ids = [eid.strip() for eid in entity_ids.split(",") if eid.strip()]
    if not ids:
        return {}

    query = db.query(Attachment).filter(Attachment.entity_type == entity_type, Attachment.entity_id.in_(ids))
    if entity_type == "general" and not _user_has_any_role(current_user, _ADMIN_MANAGEMENT_ROLES):
        query = query.filter(Attachment.uploaded_by_id == current_user.id)

    items = query.order_by(Attachment.created_at.desc()).all()
    grouped: dict[str, list[dict[str, str | int]]] = {eid: [] for eid in ids}
    for att in items:
        grouped.setdefault(att.entity_id, []).append(
            {
                "id": str(att.id),
                "file_name": att.file_name,
                "file_size": att.file_size,
                "mime_type": att.mime_type,
                "created_at": att.created_at.isoformat() if att.created_at else "",
            }
        )
    return grouped


@router.post("/upload")
async def upload_file(
    entity_type: str,
    entity_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str | int]:
    _authorize_entity_access(db, current_user, entity_type, entity_id, require_write=True)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(list(ALLOWED_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 10 MB limit.",
        )

    target_dir = os.path.realpath(os.path.join(UPLOAD_DIR, entity_type))
    if not target_dir.startswith(os.path.realpath(UPLOAD_DIR)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid upload path.")
    os.makedirs(target_dir, exist_ok=True)
    stored_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(target_dir, stored_name)

    with open(file_path, "wb") as f:
        f.write(content)

    attachment = Attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        file_name=file.filename or stored_name,
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        storage_path=file_path,
        uploaded_by_id=current_user.id,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": str(attachment.id),
        "file_name": attachment.file_name,
        "file_size": attachment.file_size,
        "mime_type": attachment.mime_type,
    }


@router.get("/{attachment_id}/download")
def download_file(
    attachment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    att = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found.")

    _authorize_entity_access(
        db,
        current_user,
        att.entity_type,
        att.entity_id,
        require_write=False,
        uploaded_by_id=att.uploaded_by_id,
    )

    if not os.path.exists(att.storage_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found.")

    return FileResponse(path=att.storage_path, filename=att.file_name, media_type=att.mime_type)
