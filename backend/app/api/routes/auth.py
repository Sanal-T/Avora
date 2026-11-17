from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.auth import Role, User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, Token, UserRead

router = APIRouter()


def _format_user_read(user: User) -> UserRead:
    role_names = [r.name for r in user.roles]
    permissions: set[str] = set()
    for r in user.roles:
        for p in r.permissions:
            permissions.add(p.code)
    return UserRead(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        roles=role_names,
        permissions=sorted(list(permissions)),
    )


@router.post("/login", response_model=Token)
def login_for_access_token(
    login_data: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated.",
        )

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"email": user.email, "roles": [r.name for r in user.roles]},
    )
    return Token(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserRead)
def read_current_user(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserRead:
    return _format_user_read(current_user)


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"message": "Logged out successfully."}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed.",
        )
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully."}
