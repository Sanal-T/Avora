import uuid
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.auth import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception

    user_id_str = payload["sub"]
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account.",
        )
    return current_user


def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: Annotated[User, Depends(get_current_active_user)]) -> User:
        if current_user.is_superuser:
            return current_user
        user_role_names = [r.name for r in current_user.roles]
        if not any(role in user_role_names for role in allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {allowed_roles}",
            )
        return current_user
    return role_checker


def require_permissions(required_permissions: list[str]):
    def perm_checker(current_user: Annotated[User, Depends(get_current_active_user)]) -> User:
        if current_user.is_superuser:
            return current_user
        all_perms: set[str] = set()
        for r in current_user.roles:
            for p in r.permissions:
                all_perms.add(p.code)
        if not all(p in all_perms for p in required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required permissions: {required_permissions}",
            )
        return current_user
    return perm_checker
