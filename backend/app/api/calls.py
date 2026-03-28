"""
API endpoints for Call for Applicants.
"""

import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole, CallStatus, Department
from ..dependencies import get_current_user, RoleChecker
from ..services.call_service import CallService
from ..services.application_service import ApplicationService
from ..services.audit_service import AuditService
from ..schemas.call_schema import (
    CallCreate,
    CallUpdate,
    CallOut,
    CallListOut,
    CallPublicOut,
    CallResultsOut,
    CallListResponse,
    CallPublicListResponse,
    CallResultsListResponse,
    CallCreateResponse,
    CallActionResponse,
    CallCoordinatorInfo,
)
from ..error import CallNotFound, InsufficientPermission

calls_router = APIRouter()

# Coordinator role checker
require_coordinator = RoleChecker([UserRole.COORDINATOR, UserRole.ADMIN])


def build_call_out(call, application_count: int = 0) -> CallOut:
    """Build CallOut from model"""
    created_by = None
    if call.created_by:
        created_by = CallCoordinatorInfo(
            id=call.created_by.id,
            fullname=call.created_by.fullname,
            email=call.created_by.email,
        )
    
    return CallOut(
        id=call.id,
        title=call.title,
        reference_number=call.reference_number,
        department=call.department.value if hasattr(call.department, 'value') else call.department,
        description=call.description,
        eligibility_criteria=call.eligibility_criteria,
        required_documents=call.required_documents,
        employee_required_documents=call.employee_required_documents,
        application_start_date=call.application_start_date,
        application_deadline=call.application_deadline,
        results_publication_date=call.results_publication_date,
        status=call.status.value if hasattr(call.status, 'value') else call.status,
        created_at=call.created_at,
        updated_at=call.updated_at,
        published_at=call.published_at,
        created_by=created_by,
        application_count=application_count,
    )


def build_public_call_out(call) -> CallPublicOut:
    """Build CallPublicOut for landing page"""
    dept = call.department.value if hasattr(call.department, 'value') else call.department
    
    now = datetime.now(timezone.utc)
    deadline = call.application_deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    start = call.application_start_date
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    
    is_open = (
        call.status == CallStatus.PUBLISHED and
        start <= now < deadline
    )
    
    is_upcoming = (
        call.status == CallStatus.PUBLISHED and
        now < start and
        now < deadline
    )
    
    days_remaining = None
    days_until_open = None
    
    if is_open:
        days_remaining = (deadline - now).days
    elif is_upcoming:
        days_until_open = (start - now).days + 1  # +1 to show "1 day" instead of "0 days"
        days_remaining = (deadline - now).days
    
    return CallPublicOut(
        id=call.id,
        title=call.title,
        reference_number=call.reference_number,
        department=dept,
        department_display=Department.get_display_name(dept),
        description=call.description,
        eligibility_criteria=call.eligibility_criteria,
        required_documents=call.required_documents,
        application_start_date=call.application_start_date,
        application_deadline=call.application_deadline,
        is_open=is_open,
        is_upcoming=is_upcoming,
        days_remaining=days_remaining,
        days_until_open=days_until_open,
    )


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@calls_router.get("/public", response_model=CallPublicListResponse)
async def get_public_calls(
    department: Optional[str] = Query(None, description="Filter by department"),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all published calls (for landing page).
    Public endpoint.
    """
    calls = await CallService.get_public_calls(
        session=session,
        department=department,
    )
    
    return CallPublicListResponse(
        calls=[build_public_call_out(call) for call in calls],
        total=len(calls),
    )


@calls_router.get("/active", response_model=CallPublicListResponse)
async def get_active_calls(
    department: Optional[str] = Query(None, description="Filter by department"),
    session: AsyncSession = Depends(get_session)
):
    """
    Get currently active calls (open for applications).
    Public endpoint.
    """
    calls = await CallService.get_public_calls(
        session=session,
        department=department,
        active_only=True,
    )
    
    return CallPublicListResponse(
        calls=[build_public_call_out(call) for call in calls],
        total=len(calls),
    )


@calls_router.get("/results", response_model=CallResultsListResponse)
async def get_published_results(
    department: Optional[str] = Query(None, description="Filter by department"),
    session: AsyncSession = Depends(get_session)
):
    """
    Get calls with published results.
    Public endpoint.
    """
    calls = await CallService.get_calls_with_results(
        session=session,
        department=department,
    )
    
    results = []
    for call in calls:
        dept = call.department.value if hasattr(call.department, 'value') else call.department
        
        # Get approved companies
        approved_apps = [
            app for app in call.applications 
            if (app.status.value if hasattr(app.status, 'value') else app.status) == 'approved'
        ]
        
        admitted_companies = [
            {
                'id': app.company.id,
                'name': app.company.name,
                'industry_sector': app.company.industry_sector,
            }
            for app in approved_apps if app.company
        ]
        
        results.append(CallResultsOut(
            id=call.id,
            title=call.title,
            reference_number=call.reference_number,
            department=dept,
            department_display=Department.get_display_name(dept),
            results_publication_date=call.results_publication_date,
            admitted_companies=admitted_companies,
            total_admitted=len(admitted_companies),
        ))
    
    return CallResultsListResponse(
        results=results,
        total=len(results),
    )


@calls_router.get("/public/{call_id}", response_model=CallPublicOut)
async def get_public_call(
    call_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Get public details of a specific call.
    Public endpoint.
    """
    call = await CallService.get_call_by_id(call_id, session, include_creator=False)
    
    if not call:
        raise CallNotFound()
    
    # Only show published calls
    if call.status == CallStatus.DRAFT:
        raise CallNotFound()
    
    return build_public_call_out(call)


@calls_router.get("/department/{department}", response_model=CallPublicListResponse)
async def get_calls_by_department(
    department: str,
    session: AsyncSession = Depends(get_session)
):
    """
    Get all published calls for a specific department.
    Public endpoint.
    """
    try:
        Department(department)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid department: {department}"
        )
    
    calls = await CallService.get_public_calls(
        session=session,
        department=department,
    )
    
    return CallPublicListResponse(
        calls=[build_public_call_out(call) for call in calls],
        total=len(calls),
    )


# =============================================================================
# COORDINATOR ENDPOINTS
# =============================================================================

@calls_router.post("", response_model=CallCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_call(
    call_data: CallCreate,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new call for applicants.
    Coordinator only.
    """
    call = await CallService.create_call(
        call_data=call_data,
        coordinator_id=current_user.id,
        session=session,
    )
    
    # Audit log
    await AuditService.log_call_action(
        user=current_user,
        action="create",
        call_id=call.id,
        new_status="draft",
        session=session,
    )
    await session.commit()
    
    return CallCreateResponse(
        message="Appel à candidatures créé avec succès",
        call=build_call_out(call),
    )


@calls_router.get("/{call_id}", response_model=CallOut)
async def get_call(
    call_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get call details.
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    # Check ownership (unless admin)
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()

    app_count = await CallService.get_application_count(call_id, session)
    
    return build_call_out(call, application_count=app_count)


@calls_router.put("/{call_id}", response_model=CallActionResponse)
async def update_call(
    call_id: int,
    update_data: CallUpdate,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Update a call (only in DRAFT status).
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()

    if call.status == CallStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cet appel est déjà fermé",
        )
    
    call = await CallService.update_call(call, update_data, session)
    
    return CallActionResponse(
        message="Appel à candidatures mis à jour",
        call=build_call_out(call),
    )


@calls_router.delete("/{call_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_call(
    call_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a call (only in DRAFT status with no applications).
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()

    if call.status in [CallStatus.UNDER_REVIEW, CallStatus.RESULTS_PUBLISHED]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="L'examen est déjà démarré pour cet appel",
        )
    
    await CallService.delete_call(call, session)
    
    return None


@calls_router.post("/{call_id}/publish", response_model=CallActionResponse)
async def publish_call(
    call_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Publish a call (DRAFT -> PUBLISHED).
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()

    if call.status == CallStatus.RESULTS_PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Les résultats sont déjà publiés pour cet appel",
        )
    
    old_status = call.status.value if hasattr(call.status, 'value') else call.status
    call = await CallService.publish_call(call, session)
    
    # Audit log
    await AuditService.log_call_action(
        user=current_user,
        action="publish",
        call_id=call.id,
        old_status=old_status,
        new_status="published",
        session=session,
    )
    await session.commit()
    
    return CallActionResponse(
        message="Appel à candidatures publié avec succès",
        call=build_call_out(call),
    )


@calls_router.post("/{call_id}/close", response_model=CallActionResponse)
async def close_call(
    call_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Close applications for a call (PUBLISHED -> CLOSED).
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()
    
    old_status = call.status.value if hasattr(call.status, 'value') else call.status
    call = await CallService.close_call(call, session)
    
    # Audit log
    await AuditService.log_call_action(
        user=current_user,
        action="close",
        call_id=call.id,
        old_status=old_status,
        new_status="closed",
        session=session,
    )
    await session.commit()
    
    return CallActionResponse(
        message="Les candidatures sont maintenant fermées",
        call=build_call_out(call),
    )


@calls_router.post("/{call_id}/start-review", response_model=CallActionResponse)
async def start_call_review(
    call_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Start reviewing applications (CLOSED -> UNDER_REVIEW).
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()
    
    old_status = call.status.value if hasattr(call.status, 'value') else call.status
    call = await CallService.start_review(call, session)
    
    # Audit log
    await AuditService.log_call_action(
        user=current_user,
        action="start_review",
        call_id=call.id,
        old_status=old_status,
        new_status="under_review",
        session=session,
    )
    await session.commit()
    
    return CallActionResponse(
        message="Examen des candidatures commencé",
        call=build_call_out(call),
    )


@calls_router.post("/{call_id}/publish-results", response_model=CallActionResponse)
async def publish_call_results(
    call_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Publish results (UNDER_REVIEW -> RESULTS_PUBLISHED).
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()
    
    old_status = call.status.value if hasattr(call.status, 'value') else call.status
    call = await CallService.publish_results(call, None, session)
    
    # Audit log
    await AuditService.log_call_action(
        user=current_user,
        action="publish_results",
        call_id=call.id,
        old_status=old_status,
        new_status="results_published",
        session=session,
    )
    await session.commit()
    
    return CallActionResponse(
        message="Résultats publiés avec succès",
        call=build_call_out(call),
    )


@calls_router.post("/{call_id}/reopen", response_model=CallActionResponse)
async def reopen_call(
    call_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Reopen a call (CLOSED/RESULTS_PUBLISHED -> PUBLISHED).
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    
    if not call:
        raise CallNotFound()
    
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()
    
    old_status = call.status.value if hasattr(call.status, 'value') else call.status
    call = await CallService.reopen_call(call, session)
    
    # Audit log
    await AuditService.log_call_action(
        user=current_user,
        action="reopen",
        call_id=call.id,
        old_status=old_status,
        new_status="published",
        session=session,
    )
    await session.commit()
    
    return CallActionResponse(
        message="Appel à candidatures réouvert",
        call=build_call_out(call),
    )
