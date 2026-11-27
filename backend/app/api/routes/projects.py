import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.auth import User
from app.schemas.project import (
    ProjectCreate,
    ProjectListResponse,
    ProjectMilestoneCreate,
    ProjectMilestoneUpdate,
    ProjectRead,
    ProjectStatusUpdate,
    ProjectSummaryResponse,
    ProjectTimelineEvent,
    ProjectUpdate,
)
from app.services import project_service

router = APIRouter()


@router.get("/summary", response_model=ProjectSummaryResponse)
def get_project_summary(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> ProjectSummaryResponse:
    return project_service.get_project_summary(db)


@router.get("", response_model=ProjectListResponse)
def list_projects(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=5000),
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
    customer_id: uuid.UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    compact: bool = Query(default=False),
) -> ProjectListResponse:
    total, items = project_service.list_projects(
        db,
        page=page,
        page_size=page_size,
        status_filter=status_filter,
        priority_filter=priority,
        customer_id=customer_id,
        search=search,
        compact=compact,
    )
    return ProjectListResponse(total=total, items=items, page=page, page_size=page_size)


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Department Manager"]))],
) -> ProjectRead:
    return project_service.create_project(db, data, user_id=current_user.id)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> ProjectRead:
    return project_service.get_project(db, project_id)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Department Manager"]))],
) -> ProjectRead:
    return project_service.update_project(db, project_id, data, user_id=current_user.id)


@router.patch("/{project_id}/status", response_model=ProjectRead)
def update_project_status(
    project_id: uuid.UUID,
    data: ProjectStatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Department Manager"]))],
) -> ProjectRead:
    return project_service.update_project_status(db, project_id, data, user_id=current_user.id)


@router.get("/{project_id}/timeline", response_model=list[ProjectTimelineEvent])
def get_project_timeline(
    project_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> list[ProjectTimelineEvent]:
    return project_service.get_project_timeline(db, project_id)


@router.post("/{project_id}/milestones", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def add_project_milestone(
    project_id: uuid.UUID,
    data: ProjectMilestoneCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Department Manager"]))],
) -> ProjectRead:
    return project_service.add_milestone(db, project_id, data, user_id=current_user.id)


@router.patch("/{project_id}/milestones/{milestone_id}", response_model=ProjectRead)
def update_project_milestone(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    data: ProjectMilestoneUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["Administrator", "Super Admin", "Management", "Department Manager"]))],
) -> ProjectRead:
    return project_service.update_milestone(db, project_id, milestone_id, data, user_id=current_user.id)
