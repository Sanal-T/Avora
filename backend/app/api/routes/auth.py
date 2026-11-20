from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, status
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
async def login_for_access_token(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    email = None
    password = None

    content_type = request.headers.get("content-type", "")
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        email = form.get("username") or form.get("email")
        password = form.get("password")
    else:
        try:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
        except Exception:
            pass

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Both email (or username) and password are required.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(str(password), user.hashed_password):
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
