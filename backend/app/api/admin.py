"""
Admin API endpoints for account verification and management.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette import status
from pydantic import BaseModel

from ..db.database import get_session
from ..db.models import User, UserRole, AccountStatus, Company, Professor
from ..dependencies import get_current_user
from ..celery_tasks import send_email

logger = logging.getLogger(__name__)

admin_router = APIRouter()


class PendingUserResponse(BaseModel):
    id: int
    email: str
    fullname: str
    role: str
    created_at: str
    verification_document_url: Optional[str] = None
    # Company-specific
    company_name: Optional[str] = None
    industry_sector: Optional[str] = None
    # Professor-specific
    specialization: Optional[str] = None
    username: Optional[str] = None

    class Config:
        from_attributes = True


class PendingUsersListResponse(BaseModel):
    users: List[PendingUserResponse]
    total: int


def require_staff_or_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure user is staff or admin."""
    if user.role not in [UserRole.STAFF, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or admin access required"
        )
    return user


@admin_router.get("/pending-verifications", response_model=PendingUsersListResponse)
async def get_pending_verifications(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    """
    Get all users with pending account verification.
    Only accessible by staff and admin users.
    """
    # Query users with pending status (companies and professors only)
    query = (
        select(User)
        .where(User.account_status == AccountStatus.PENDING)
        .where(User.role.in_([UserRole.COMPANY, UserRole.PROFESSOR]))
        .options(
            selectinload(User.company),
            selectinload(User.professor)
        )
        .order_by(User.created_at.desc())
    )
    
    result = await session.execute(query)
    users = result.scalars().all()
    
    pending_users = []
    for user in users:
        user_data = PendingUserResponse(
            id=user.id,
            email=user.email,
            fullname=user.fullname,
            role=user.role.value,
            created_at=user.created_at.isoformat(),
            verification_document_url=f"/uploads/verifications/{user.verification_document}" if user.verification_document else None,
            username=user.username
        )
        
        # Add company-specific data
        if user.company:
            user_data.company_name = user.company.name
            user_data.industry_sector = user.company.industry_sector
        
        # Add professor-specific data
        if user.professor:
            user_data.specialization = user.professor.specialization
        
        pending_users.append(user_data)
    
    return PendingUsersListResponse(users=pending_users, total=len(pending_users))


@admin_router.post("/verification/{user_id}/approve")
async def approve_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    """
    Approve a pending user account.
    Sets account_status to ACTIVE.
    """
    # Get the user
    query = select(User).where(User.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.account_status != AccountStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in pending status"
        )
    
    # Update status to active
    user.account_status = AccountStatus.ACTIVE
    await session.commit()
    
    # Send approval email
    try:
        send_email.delay(
            recipients=[user.email],
            subject="Votre compte a été approuvé - Formation Continue",
            body=f"""
            <html>
            <body>
                <h2>Félicitations {user.fullname}!</h2>
                <p>Votre compte a été approuvé par notre équipe.</p>
                <p>Vous pouvez maintenant vous connecter et accéder à toutes les fonctionnalités de la plateforme.</p>
                <p><a href="https://formation-continue.com/login">Se connecter</a></p>
                <br>
                <p>Cordialement,<br>L'équipe Formation Continue</p>
            </body>
            </html>
            """
        )
    except Exception as e:
        logger.error(f"Failed to send approval email: {e}")
    
    return {"message": "User approved successfully", "user_id": user_id}


@admin_router.post("/verification/{user_id}/reject")
async def reject_user(
    user_id: int,
    reason: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    """
    Reject a pending user account.
    Sets account_status to REJECTED.
    """
    # Get the user
    query = select(User).where(User.id == user_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.account_status != AccountStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in pending status"
        )
    
    # Update status to rejected
    user.account_status = AccountStatus.REJECTED
    await session.commit()
    
    # Send rejection email
    try:
        rejection_reason = reason or "Les documents fournis n'ont pas pu être vérifiés."
        send_email.delay(
            recipients=[user.email],
            subject="Demande de compte non approuvée - Formation Continue",
            body=f"""
            <html>
            <body>
                <h2>Bonjour {user.fullname},</h2>
                <p>Nous avons examiné votre demande d'inscription, et malheureusement, nous ne pouvons pas l'approuver pour le moment.</p>
                <p><strong>Raison:</strong> {rejection_reason}</p>
                <p>Si vous pensez qu'il s'agit d'une erreur, veuillez nous contacter avec des documents supplémentaires.</p>
                <br>
                <p>Cordialement,<br>L'équipe Formation Continue</p>
            </body>
            </html>
            """
        )
    except Exception as e:
        logger.error(f"Failed to send rejection email: {e}")
    
    return {"message": "User rejected successfully", "user_id": user_id}


@admin_router.get("/users/all")
async def get_all_users(
    page: int = 1,
    page_size: int = 20,
    role: Optional[str] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(require_staff_or_admin)
):
    """
    Get all users with filtering options.
    """
    query = select(User).options(
        selectinload(User.company),
        selectinload(User.professor)
    )
    
    if role:
        query = query.where(User.role == UserRole(role))
    
    if status:
        query = query.where(User.account_status == AccountStatus(status))
    
    # Count total
    count_query = select(User)
    if role:
        count_query = count_query.where(User.role == UserRole(role))
    if status:
        count_query = count_query.where(User.account_status == AccountStatus(status))
    
    count_result = await session.execute(count_query)
    total = len(count_result.scalars().all())
    
    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(User.created_at.desc())
    
    result = await session.execute(query)
    users = result.scalars().all()
    
    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "fullname": u.fullname,
                "username": u.username,
                "role": u.role.value,
                "account_status": u.account_status.value,
                "is_verified": u.is_verified,
                "created_at": u.created_at.isoformat(),
                "company_name": u.company.name if u.company else None,
                "specialization": u.professor.specialization if u.professor else None,
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }
