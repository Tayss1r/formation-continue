"""
API endpoints for Coordinator Dashboard.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Integer

from ..db.database import get_session
from ..db.models import (
    User, UserRole, CallStatus, ApplicationStatus, EmployeeSubmissionStatus,
    CallForApplicants, CompanyApplication, EmployeeSubmission, AuditLog
)
from ..dependencies import RoleChecker
from ..schemas.coordinator_schema import (
    DashboardStats,
    DashboardResponse,
    PendingReviewItem,
    PendingReviewsResponse,
    AnalyticsData,
    AnalyticsResponse,
    RecentActivityItem,
    RecentActivityResponse,
    CallStats,
    ApplicationStats,
    SubmissionStats,
)

coordinator_router = APIRouter()

# Coordinator role checker
require_coordinator = RoleChecker([UserRole.COORDINATOR, UserRole.ADMIN])


# =============================================================================
# DASHBOARD ENDPOINTS
# =============================================================================

@coordinator_router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get coordinator dashboard statistics.
    Coordinator only.
    """
    # Build query filters based on role
    # Admins see all, coordinators see only their own calls
    is_admin = current_user.role == UserRole.ADMIN
    
    # Call statistics
    call_query = select(
        func.count(CallForApplicants.id).label('total'),
        func.sum(cast(CallForApplicants.status == CallStatus.DRAFT, Integer)).label('draft'),
        func.sum(cast(CallForApplicants.status == CallStatus.PUBLISHED, Integer)).label('published'),
        func.sum(cast(CallForApplicants.status == CallStatus.CLOSED, Integer)).label('closed'),
        func.sum(cast(CallForApplicants.status == CallStatus.UNDER_REVIEW, Integer)).label('under_review'),
        func.sum(cast(CallForApplicants.status == CallStatus.RESULTS_PUBLISHED, Integer)).label('results_published'),
    )
    
    if not is_admin:
        call_query = call_query.where(CallForApplicants.created_by_id == current_user.id)
    
    call_result = await session.execute(call_query)
    call_row = call_result.one()
    
    call_stats = CallStats(
        total=call_row.total or 0,
        draft=call_row.draft or 0,
        published=call_row.published or 0,
        closed=call_row.closed or 0,
        under_review=call_row.under_review or 0,
        results_published=call_row.results_published or 0,
    )
    
    # Get call IDs for this coordinator
    coordinator_calls_query = select(CallForApplicants.id)
    if not is_admin:
        coordinator_calls_query = coordinator_calls_query.where(
            CallForApplicants.created_by_id == current_user.id
        )
    coordinator_calls_result = await session.execute(coordinator_calls_query)
    coordinator_call_ids = [row[0] for row in coordinator_calls_result.all()]
    
    # Application statistics
    app_query = select(
        func.count(CompanyApplication.id).label('total'),
        func.sum(cast(CompanyApplication.status == ApplicationStatus.DOCUMENTS_PENDING, Integer)).label('pending'),
        func.sum(cast(CompanyApplication.status == ApplicationStatus.SUBMITTED, Integer)).label('submitted'),
        func.sum(cast(CompanyApplication.status == ApplicationStatus.UNDER_REVIEW, Integer)).label('under_review'),
        func.sum(cast(CompanyApplication.status == ApplicationStatus.APPROVED, Integer)).label('approved'),
        func.sum(cast(CompanyApplication.status == ApplicationStatus.REJECTED, Integer)).label('rejected'),
    ).where(CompanyApplication.call_id.in_(coordinator_call_ids)) if coordinator_call_ids else select(
        func.literal(0).label('total'),
        func.literal(0).label('pending'),
        func.literal(0).label('submitted'),
        func.literal(0).label('under_review'),
        func.literal(0).label('approved'),
        func.literal(0).label('rejected'),
    )
    
    if coordinator_call_ids:
        app_result = await session.execute(app_query)
        app_row = app_result.one()
        app_stats = ApplicationStats(
            total=app_row.total or 0,
            pending=app_row.pending or 0,
            submitted=app_row.submitted or 0,
            under_review=app_row.under_review or 0,
            approved=app_row.approved or 0,
            rejected=app_row.rejected or 0,
        )
    else:
        app_stats = ApplicationStats(
            total=0, pending=0, submitted=0, under_review=0, approved=0, rejected=0
        )
    
    # Submission statistics - need to join through applications
    if coordinator_call_ids:
        sub_query = select(
            func.count(EmployeeSubmission.id).label('total'),
            func.sum(cast(EmployeeSubmission.status == EmployeeSubmissionStatus.PENDING, Integer)).label('pending'),
            func.sum(cast(EmployeeSubmission.status == EmployeeSubmissionStatus.SUBMITTED, Integer)).label('submitted'),
            func.sum(cast(EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED, Integer)).label('approved'),
            func.sum(cast(EmployeeSubmission.status == EmployeeSubmissionStatus.REJECTED, Integer)).label('rejected'),
        ).select_from(EmployeeSubmission).join(
            CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id
        ).where(CompanyApplication.call_id.in_(coordinator_call_ids))
        
        sub_result = await session.execute(sub_query)
        sub_row = sub_result.one()
        sub_stats = SubmissionStats(
            total=sub_row.total or 0,
            pending=sub_row.pending or 0,
            submitted=sub_row.submitted or 0,
            approved=sub_row.approved or 0,
            rejected=sub_row.rejected or 0,
        )
    else:
        sub_stats = SubmissionStats(
            total=0, pending=0, submitted=0, approved=0, rejected=0
        )
    
    stats = DashboardStats(
        calls=call_stats,
        applications=app_stats,
        submissions=sub_stats,
    )
    
    return DashboardResponse(
        stats=stats,
        last_updated=datetime.now(timezone.utc).isoformat(),
    )


@coordinator_router.get("/pending-reviews", response_model=PendingReviewsResponse)
async def get_pending_reviews(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get items pending review.
    Coordinator only.
    """
    is_admin = current_user.role == UserRole.ADMIN
    
    pending_items = []
    
    # Get coordinator's call IDs
    coordinator_calls_query = select(CallForApplicants.id)
    if not is_admin:
        coordinator_calls_query = coordinator_calls_query.where(
            CallForApplicants.created_by_id == current_user.id
        )
    coordinator_calls_result = await session.execute(coordinator_calls_query)
    coordinator_call_ids = [row[0] for row in coordinator_calls_result.all()]
    
    if coordinator_call_ids:
        # Get submitted applications awaiting review
        apps_query = select(CompanyApplication).where(
            CompanyApplication.call_id.in_(coordinator_call_ids),
            CompanyApplication.status.in_([
                ApplicationStatus.SUBMITTED, 
                ApplicationStatus.UNDER_REVIEW
            ])
        ).order_by(CompanyApplication.submitted_at.asc()).limit(limit // 2)
        
        apps_result = await session.execute(apps_query)
        applications = apps_result.scalars().all()
        
        for app in applications:
            pending_items.append(PendingReviewItem(
                type="application",
                id=app.id,
                call_id=app.call_id,
                company_id=app.company_id,
                submitted_at=app.submitted_at,
                status=app.status.value if hasattr(app.status, 'value') else app.status,
            ))
        
        # Get submitted employee submissions awaiting review
        subs_query = select(EmployeeSubmission).join(
            CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id
        ).where(
            CompanyApplication.call_id.in_(coordinator_call_ids),
            EmployeeSubmission.status == EmployeeSubmissionStatus.SUBMITTED
        ).order_by(EmployeeSubmission.created_at.asc()).limit(limit // 2)
        
        subs_result = await session.execute(subs_query)
        submissions = subs_result.scalars().all()
        
        for sub in submissions:
            pending_items.append(PendingReviewItem(
                type="submission",
                id=sub.id,
                application_id=sub.company_application_id,
                employee_id=sub.employee_id,
                submitted_at=sub.created_at,
                status=sub.status.value if hasattr(sub.status, 'value') else sub.status,
            ))
    
    # Sort by submitted_at
    pending_items.sort(key=lambda x: x.submitted_at or datetime.min.replace(tzinfo=timezone.utc))
    
    return {
        'items': [item.model_dump() for item in pending_items[:limit]],
        'total': len(pending_items),
    }


@coordinator_router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    days: int = Query(7, ge=1, le=365),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get recent activity from audit logs.
    Coordinator only.
    """
    is_admin = current_user.role == UserRole.ADMIN
    
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Query audit logs - select only existing DB columns (user_role not in DB)
    query = select(
        AuditLog.id,
        AuditLog.user_id,
        AuditLog.action,
        AuditLog.entity_type,
        AuditLog.entity_id,
        AuditLog.old_values,
        AuditLog.new_values,
        AuditLog.notes,
        AuditLog.ip_address,
        AuditLog.created_at,
    ).where(
        AuditLog.created_at >= since
    )
    
    if not is_admin:
        query = query.where(AuditLog.user_id == current_user.id)
    
    query = query.order_by(AuditLog.created_at.desc()).limit(limit)
    
    result = await session.execute(query)
    logs = result.mappings().all()
    
    activities = []
    for log in logs:
        activities.append({
            'id': log['id'],
            'action': log['action'],
            'entity_type': log['entity_type'],
            'entity_id': log['entity_id'],
            'old_status': None,
            'new_status': None,
            'notes': log['notes'],
            'created_at': log['created_at'].isoformat() if log['created_at'] else None,
            'user_id': log['user_id'],
        })
    
    return {
        'activities': activities,
        'total': len(activities),
    }


@coordinator_router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    period_days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get analytics data for charts/reports.
    Coordinator only.
    """
    is_admin = current_user.role == UserRole.ADMIN
    
    since = datetime.now(timezone.utc) - timedelta(days=period_days)
    
    # Get coordinator call IDs
    coordinator_calls_query = select(CallForApplicants.id)
    if not is_admin:
        coordinator_calls_query = coordinator_calls_query.where(
            CallForApplicants.created_by_id == current_user.id
        )
    coordinator_calls_result = await session.execute(coordinator_calls_query)
    coordinator_call_ids = [row[0] for row in coordinator_calls_result.all()]
    
    # Applications by status
    applications_by_status = {}
    if coordinator_call_ids:
        for status in ApplicationStatus:
            count_query = select(func.count(CompanyApplication.id)).where(
                CompanyApplication.call_id.in_(coordinator_call_ids),
                CompanyApplication.status == status
            )
            count_result = await session.execute(count_query)
            applications_by_status[status.value] = count_result.scalar() or 0
    
    # Applications over time (last N days)
    applications_over_time = []
    if coordinator_call_ids:
        for i in range(period_days, -1, -7):  # Weekly buckets
            start_date = since + timedelta(days=period_days - i)
            end_date = start_date + timedelta(days=7)
            
            count_query = select(func.count(CompanyApplication.id)).where(
                CompanyApplication.call_id.in_(coordinator_call_ids),
                CompanyApplication.submitted_at >= start_date,
                CompanyApplication.submitted_at < end_date
            )
            count_result = await session.execute(count_query)
            count = count_result.scalar() or 0
            
            applications_over_time.append({
                'date': start_date.isoformat(),
                'count': count,
            })
    
    # Calls by department
    calls_by_department = {}
    calls_dept_query = select(
        CallForApplicants.department, 
        func.count(CallForApplicants.id)
    ).group_by(CallForApplicants.department)
    
    if not is_admin:
        calls_dept_query = calls_dept_query.where(
            CallForApplicants.created_by_id == current_user.id
        )
    
    calls_dept_result = await session.execute(calls_dept_query)
    for dept, count in calls_dept_result.all():
        dept_value = dept.value if hasattr(dept, 'value') else dept
        calls_by_department[dept_value] = count
    
    # Approval rate
    total_reviewed = applications_by_status.get('approved', 0) + applications_by_status.get('rejected', 0)
    approval_rate = 0.0
    if total_reviewed > 0:
        approval_rate = (applications_by_status.get('approved', 0) / total_reviewed) * 100
    
    return {
        'data': {
            'period_days': period_days,
            'applications_by_status': applications_by_status,
            'applications_over_time': applications_over_time,
            'calls_by_department': calls_by_department,
            'approval_rate': round(approval_rate, 2),
            'total_calls': len(coordinator_call_ids),
            'total_applications': sum(applications_by_status.values()) if applications_by_status else 0,
        },
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }


@coordinator_router.get("/my-calls")
async def get_my_calls(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all calls created by current coordinator.
    Coordinator only.
    """
    from ..services.call_service import CallService
    
    is_admin = current_user.role == UserRole.ADMIN
    
    # Convert status string to CallStatus enum list for filtering if provided
    status_list = None
    if status_filter:
        try:
            status_list = [CallStatus(status_filter)]
        except ValueError:
            status_list = None
    
    calls, total = await CallService.get_coordinator_calls(
        coordinator_id=current_user.id,
        session=session,
        status_filter=status_list,
    )
    
    result = []
    for call in calls:
        dept = call.department.value if hasattr(call.department, 'value') else call.department
        call_status = call.status.value if hasattr(call.status, 'value') else call.status
        
        # Count applications
        app_count = await CallService.get_application_count(call.id, session)
        
        result.append({
            'id': call.id,
            'title': call.title,
            'reference_number': call.reference_number,
            'department': dept,
            'status': call_status,
            'application_deadline': call.application_deadline.isoformat() if call.application_deadline else None,
            'application_count': app_count,
            'created_at': call.created_at.isoformat() if call.created_at else None,
        })
    
    return {
        'calls': result,
        'total': total,
    }
