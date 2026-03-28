from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .services.user_service import UserService
from .utils import decode_token
from .db.database import get_session
from .db.models import User, UserRole
from .db.redis import token_in_blocklist
from .error import *
from sqlalchemy.ext.asyncio import AsyncSession

from typing import List, Any, Callable
from functools import wraps


class TokenBearer(HTTPBearer):
    def __init__(self, auto_error = True):
        super().__init__(auto_error = auto_error)

    async def __call__(self, request: Request) -> HTTPAuthorizationCredentials | None:
        creds = await super().__call__(request)
        token = creds.credentials # scheme, (credentials)
        token_data = decode_token(token)

        if not self.token_valid(token):
            raise InvalidToken()
        if await token_in_blocklist(token_data['jti']):
            raise InvalidToken()

        self.verify_token_data(token_data)

        return token_data

    def token_valid(self, token: str) -> bool:
        token_data = decode_token(token)
        return token_data is not None

    def verify_token_data(self, token_data):
        raise NotImplementedError("Please Override this method in child class")

class AccessTokenBearer(HTTPBearer):
    async def __call__(self, request: Request) -> dict:
        credentials: HTTPAuthorizationCredentials | None = await super().__call__(request)
        if not credentials or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        token = credentials.credentials
        payload = decode_token(token)

        if not payload:
            raise InvalidToken()

        if payload.get("refresh"):
            raise AccessTokenRequired()

        return payload

async def RefreshTokenBearer(request: Request) -> dict:
    """Read refresh token from HttpOnly cookie."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise RefreshTokenRequired()

    payload = decode_token(token)

    if not payload:
        raise InvalidToken()

    if not payload.get("refresh"):
        raise RefreshTokenRequired()

    return payload

async def get_current_user(token_data=Depends(AccessTokenBearer()), session: AsyncSession = Depends(get_session)):
    email = token_data['user']['email']
    user = await UserService.get_user_by_email(email, session)
    return user


class RoleChecker:
    """
    Dependency class to check if user has required role(s).
    Usage: Depends(RoleChecker([UserRole.STAFF, UserRole.ADMIN]))
    """
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    async def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in [role.value for role in self.allowed_roles]:
            raise InsufficientPermission()
        return current_user


# Pre-configured role checkers for common use cases
require_staff = RoleChecker([UserRole.STAFF, UserRole.ADMIN])
require_admin = RoleChecker([UserRole.ADMIN])
require_professor = RoleChecker([UserRole.PROFESSOR, UserRole.ADMIN])
require_coordinator = RoleChecker([UserRole.COORDINATOR, UserRole.ADMIN])
require_course_manager = RoleChecker([UserRole.STAFF, UserRole.COORDINATOR, UserRole.ADMIN])
require_company = RoleChecker([UserRole.COMPANY])
require_employee = RoleChecker([UserRole.EMPLOYEE])
require_company = RoleChecker([UserRole.COMPANY])


async def get_staff_user(
    current_user: User = Depends(require_staff)
) -> User:
    """Dependency to get current user if they are staff or admin"""
    return current_user


async def get_admin_user(
    current_user: User = Depends(require_admin)
) -> User:
    """Dependency to get current user if they are admin"""
    return current_user


async def get_course_manager_user(
    current_user: User = Depends(require_course_manager)
) -> User:
    """Dependency to get current user if they can create/manage courses"""
    return current_user