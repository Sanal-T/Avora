import os
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.models.auth import User
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


@router.get("")
def list_files(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[dict[str, str | int]]:
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported entity_type '{entity_type}'.",
        )
    items = (
        db.query(Attachment)
        .filter(Attachment.entity_type == entity_type, Attachment.entity_id == entity_id)
        .order_by(Attachment.created_at.desc())
        .all()
    )
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


@router.post("/upload")
async def upload_file(
    entity_type: str,
    entity_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict[str, str | int]:
    if entity_type not in ALLOWED_ENTITY_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported entity_type '{entity_type}'.",
        )

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
    if not att or not os.path.exists(att.storage_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment file not found.")

    return FileResponse(path=att.storage_path, filename=att.file_name, media_type=att.mime_type)
