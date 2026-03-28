"""
API endpoints for Company Applications.
"""

from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import (
    User,
    UserRole,
    CallStatus,
    ApplicationStatus,
    DocumentReviewStatus,
    EmployeeSubmissionStatus,
    AttendanceStatus,
    CompanyApplication,
    EmployeeSubmission,
    EmployeeProfile,
    Cohort,
    CohortSession,
    CohortSessionAttendance,
)
from ..dependencies import get_current_user, RoleChecker
from ..services.application_service import ApplicationService
from ..services.call_service import CallService
from ..services.audit_service import AuditService
from ..schemas.application_schema import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationOut,
    ApplicationListResponse,
    ApplicationApprove,
    ApplicationReject,
    ApplicationRequestAdditionalInfo,
    ApplicationActionResponse,
    ApplicationWithCallOut,
    DocumentOut,
    DocumentReviewRequest,
    DocumentActionResponse,
    CompanyAttendanceEmployeeOut,
    CompanyAttendanceSummaryResponse,
)
from ..services.invitation_service import InvitationService
from ..error import (
    CallNotFound,
    ApplicationNotFound,
    InsufficientPermission,
    DuplicateApplication,
)

applications_router = APIRouter()

# Role checkers
require_company = RoleChecker([UserRole.COMPANY])
require_coordinator = RoleChecker([UserRole.COORDINATOR, UserRole.ADMIN])


def build_document_out(doc) -> DocumentOut:
    """Build DocumentOut from model"""
    review_status = doc.review_status.value if hasattr(doc.review_status, 'value') else doc.review_status
    return DocumentOut(
        id=doc.id,
        document_type=doc.document_type,
        document_label=doc.document_label,
        file_path=doc.file_path,
        original_filename=doc.original_filename,
        file_size=doc.file_size,
        mime_type=doc.mime_type,
        review_status=review_status,
        review_notes=doc.review_notes,
        uploaded_at=doc.uploaded_at,
        reviewed_at=doc.reviewed_at,
    )


def build_application_out(app, include_documents: bool = True) -> ApplicationOut:
    """Build ApplicationOut from model"""
    app_status = app.status.value if hasattr(app.status, 'value') else app.status
    
    company_info = None
    if app.company:
        company_info = {
            'id': app.company.id,
            'name': app.company.name,
            'industry_sector': app.company.industry_sector,
            'email': app.company.user.email if app.company.user else None,
            'phone': None,
        }
    
    documents = []
    if include_documents and hasattr(app, 'documents') and app.documents:
        documents = [build_document_out(doc) for doc in app.documents]

    call_info = None
    if app.call:
        dept = app.call.department.value if hasattr(app.call.department, 'value') else app.call.department
        call_status = app.call.status.value if hasattr(app.call.status, 'value') else app.call.status
        call_info = {
            'id': app.call.id,
            'title': app.call.title,
            'reference_number': app.call.reference_number,
            'department': dept,
            'application_deadline': app.call.application_deadline,
            'status': call_status,
        }
    
    return ApplicationOut(
        id=app.id,
        call_id=app.call_id,
        company_id=app.company_id,
        status=app_status,
        motivation_letter=app.motivation_letter,
        proposed_employee_count=app.proposed_employee_count,
        submitted_at=app.submitted_at,
        updated_at=app.updated_at,
        decision_date=app.decision_date,
        decision_notes=app.decision_notes,
        rejection_reason=app.rejection_reason,
        call=call_info,
        company=company_info,
        documents=documents,
    )


# =============================================================================
# COMPANY ENDPOINTS
# =============================================================================

@applications_router.post("", response_model=ApplicationActionResponse, status_code=status.HTTP_201_CREATED)
async def create_application(
    application_data: ApplicationCreate,
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new application for a call.
    Company only.
    """
    # Get company for this user
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise pour postuler"
        )
    
    # Check call exists and is open
    call = await CallService.get_call_by_id(application_data.call_id, session)
    if not call:
        raise CallNotFound()
    
    # Create application
    application = await ApplicationService.create_application(
        company_id=company.id,
        application_data=application_data,
        session=session,
    )
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="create",
        application_id=application.id,
        new_status="pending",
        session=session,
    )
    await session.commit()
    
    return ApplicationActionResponse(
        message="Candidature créée avec succès",
        application=build_application_out(application),
    )


@applications_router.get("/my-applications", response_model=ApplicationListResponse)
async def get_my_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all applications for the current company.
    Company only.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise"
        )
    
    apps = await ApplicationService.get_company_applications(
        company_id=company.id,
        session=session,
    )

    if status_filter:
        apps = [
            app for app in apps
            if (app.status.value if hasattr(app.status, "value") else app.status) == status_filter
        ]
    
    return ApplicationListResponse(
        applications=[build_application_out(app) for app in apps],
        total=len(apps),
        page=1,
        per_page=len(apps),
        total_pages=1 if apps else 0,
    )


@applications_router.get("/my-applications/{application_id}", response_model=ApplicationWithCallOut)
async def get_my_application(
    application_id: int,
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Get details of a specific application.
    Company only.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise"
        )
    
    app = await ApplicationService.get_application_by_id(
        application_id=application_id,
        session=session,
        include_documents=True,
        include_call=True,
    )
    
    if not app or app.company_id != company.id:
        raise ApplicationNotFound()
    
    app_out = build_application_out(app)
    return ApplicationWithCallOut(**app_out.model_dump())


@applications_router.delete("/my-applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_application(
    application_id: int,
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a company application if it has not been approved yet.
    Company only.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise"
        )

    app = await ApplicationService.get_application_by_id(
        application_id=application_id,
        session=session,
    )

    if not app or app.company_id != company.id:
        raise ApplicationNotFound()

    if app.status == ApplicationStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de supprimer une candidature déjà approuvée"
        )

    await ApplicationService.delete_company_application(app, session)

    return None


@applications_router.put("/my-applications/{application_id}", response_model=ApplicationActionResponse)
async def update_my_application(
    application_id: int,
    update_data: ApplicationUpdate,
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Update a company application if it has not been approved or rejected.
    Company only.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise"
        )

    app = await ApplicationService.get_application_by_id(
        application_id=application_id,
        session=session,
        include_documents=True,
        include_call=True,
    )

    if not app or app.company_id != company.id:
        raise ApplicationNotFound()

    if app.status in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de modifier une candidature déjà approuvée ou rejetée"
        )

    updated_app = await ApplicationService.update_application(
        application=app,
        update_data=update_data,
        session=session,
    )

    return ApplicationActionResponse(
        message="Candidature modifiée avec succès",
        application=build_application_out(updated_app),
    )


@applications_router.post("/{application_id}/documents", response_model=DocumentActionResponse)
async def upload_document(
    application_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Upload a document for an application.
    Company only.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise"
        )
    
    app = await ApplicationService.get_application_by_id(application_id, session)
    
    if not app or app.company_id != company.id:
        raise ApplicationNotFound()
    
    required_documents = app.call.required_documents if app.call and app.call.required_documents else []
    matched_doc = next(
        (doc for doc in required_documents if doc.get("type") == document_type),
        None,
    )
    document_label = matched_doc.get("label") if matched_doc else document_type

    upload_path = ApplicationService.get_upload_path(
        application_id=app.id,
        document_type=document_type,
        filename=file.filename or f"{document_type}.pdf",
    )

    os.makedirs(os.path.dirname(upload_path), exist_ok=True)
    content = await file.read()
    with open(upload_path, "wb") as out_file:
        out_file.write(content)

    document = await ApplicationService.upload_document(
        application=app,
        document_type=document_type,
        document_label=document_label,
        file_path=upload_path,
        original_filename=file.filename or os.path.basename(upload_path),
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        session=session,
    )
    
    return DocumentActionResponse(
        message="Document téléchargé avec succès",
        document=build_document_out(document),
    )


@applications_router.delete("/{application_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    application_id: int,
    document_id: int,
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a document from an application.
    Company only. Only possible if document is pending or rejected.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise"
        )
    
    app = await ApplicationService.get_application_by_id(application_id, session, include_documents=True)
    
    if not app or app.company_id != company.id:
        raise ApplicationNotFound()
    
    document = next((doc for doc in app.documents if doc.id == document_id), None)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )

    await ApplicationService.delete_document(document_id=document_id, application=app, session=session)
    
    return None


@applications_router.post("/{application_id}/submit", response_model=ApplicationActionResponse)
async def submit_application(
    application_id: int,
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session)
):
    """
    Submit application for review (after all documents uploaded).
    Company only.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise"
        )
    
    app = await ApplicationService.get_application_by_id(
        application_id, session, include_documents=True, include_call=True
    )
    
    if not app or app.company_id != company.id:
        raise ApplicationNotFound()
    
    app = await ApplicationService.submit_application(app, session)
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="submit",
        application_id=app.id,
        old_status="pending",
        new_status="submitted",
        session=session,
    )
    await session.commit()
    
    return ApplicationActionResponse(
        message="Candidature soumise avec succès",
        application=build_application_out(app),
    )


@applications_router.get(
    "/attendance-summary",
    response_model=CompanyAttendanceSummaryResponse,
)
async def get_company_attendance_summary(
    current_user: User = Depends(require_company),
    session: AsyncSession = Depends(get_session),
):
    """
    Return admitted employees attendance summary for the connected company.
    Company only.
    """
    company = current_user.company
    if not company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez être associé à une entreprise",
        )

    submissions_stmt = (
        select(EmployeeSubmission)
        .join(CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id)
        .where(CompanyApplication.company_id == company.id)
        .where(CompanyApplication.status == ApplicationStatus.APPROVED)
        .where(EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED)
        .options(
            selectinload(EmployeeSubmission.employee).selectinload(EmployeeProfile.user),
            selectinload(EmployeeSubmission.company_application),
        )
    )

    submissions = (await session.execute(submissions_stmt)).scalars().all()

    if not submissions:
        return CompanyAttendanceSummaryResponse(attendance=[], total=0)

    employee_ids = sorted({submission.employee_id for submission in submissions})
    call_ids = sorted({submission.company_application.call_id for submission in submissions if submission.company_application})

    cohort_context: dict[int, dict[str, str]] = {}
    session_context: dict[int, dict[str, object]] = {}
    if call_ids:
        cohorts_stmt = (
            select(Cohort)
            .where(Cohort.call_id.in_(call_ids))
            .options(
                selectinload(Cohort.course),
                selectinload(Cohort.sessions),
            )
        )
        cohorts = (await session.execute(cohorts_stmt)).scalars().all()

        for cohort in cohorts:
            cohort_context[cohort.id] = {
                "course_title": cohort.course.title if cohort.course and cohort.course.title else "",
                "cohort_title": cohort.name or "",
            }
            for session_item in cohort.sessions or []:
                session_context[session_item.id] = {
                    "session_title": session_item.title or "",
                    "cohort_id": cohort.id,
                }

    attendance_stmt = (
        select(
            CohortSessionAttendance.employee_id,
            CohortSessionAttendance.status,
            CohortSessionAttendance.session_id,
        )
        .join(CohortSession, CohortSession.id == CohortSessionAttendance.session_id)
        .join(Cohort, Cohort.id == CohortSession.cohort_id)
        .where(CohortSessionAttendance.employee_id.in_(employee_ids))
        .where(Cohort.call_id.in_(call_ids))
    )

    attendance_rows = (await session.execute(attendance_stmt)).all()

    metrics_by_employee: dict[int, dict[str, int]] = {
        employee_id: {
            AttendanceStatus.PRESENT.value: 0,
            AttendanceStatus.LATE.value: 0,
            AttendanceStatus.ABSENT.value: 0,
        }
        for employee_id in employee_ids
    }

    context_titles_by_employee: dict[int, dict[str, set[str]]] = {
        employee_id: {
            "course_titles": set(),
            "cohort_titles": set(),
            "session_titles": set(),
        }
        for employee_id in employee_ids
    }

    for employee_id, attendance_status, session_id in attendance_rows:
        status_value = (
            attendance_status.value if hasattr(attendance_status, "value") else str(attendance_status)
        )
        if status_value in metrics_by_employee[employee_id]:
            metrics_by_employee[employee_id][status_value] += 1

            session_info = session_context.get(session_id)
            if not session_info:
                continue

            employee_titles = context_titles_by_employee[employee_id]
            session_title = str(session_info.get("session_title") or "")
            if session_title:
                employee_titles["session_titles"].add(session_title)

            cohort_info = cohort_context.get(int(session_info.get("cohort_id")))
            if not cohort_info:
                continue

            cohort_title = cohort_info.get("cohort_title") or ""
            course_title = cohort_info.get("course_title") or ""
            if cohort_title:
                employee_titles["cohort_titles"].add(cohort_title)
            if course_title:
                employee_titles["course_titles"].add(course_title)

    summary_by_employee: dict[int, CompanyAttendanceEmployeeOut] = {}
    for submission in submissions:
        employee = submission.employee
        if not employee or not employee.user:
            continue

        employee_metrics = metrics_by_employee.get(submission.employee_id, {})
        present_count = employee_metrics.get(AttendanceStatus.PRESENT.value, 0)
        late_count = employee_metrics.get(AttendanceStatus.LATE.value, 0)
        absent_count = employee_metrics.get(AttendanceStatus.ABSENT.value, 0)
        total_sessions_marked = present_count + late_count + absent_count
        presence_percentage = (
            round(((present_count + late_count) / total_sessions_marked) * 100, 1)
            if total_sessions_marked > 0
            else 0.0
        )

        employee_titles = context_titles_by_employee.get(submission.employee_id, {})

        summary_by_employee[employee.id] = CompanyAttendanceEmployeeOut(
            employee_id=employee.id,
            employee_name=employee.user.fullname,
            employee_email=employee.user.email,
            company_name=company.name,
            present_count=present_count,
            late_count=late_count,
            absent_count=absent_count,
            total_sessions_marked=total_sessions_marked,
            presence_percentage=presence_percentage,
            course_titles=sorted(employee_titles.get("course_titles", set())),
            cohort_titles=sorted(employee_titles.get("cohort_titles", set())),
            session_titles=sorted(employee_titles.get("session_titles", set())),
        )

    summary = list(summary_by_employee.values())
    summary.sort(key=lambda item: item.presence_percentage, reverse=True)
    return CompanyAttendanceSummaryResponse(attendance=summary, total=len(summary))


# =============================================================================
# COORDINATOR ENDPOINTS
# =============================================================================

@applications_router.get("/call/{call_id}", response_model=ApplicationListResponse)
async def get_call_applications(
    call_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all applications for a call.
    Coordinator only.
    """
    call = await CallService.get_call_by_id(call_id, session)
    if not call:
        raise CallNotFound()
    
    # Check ownership (unless admin)
    if current_user.role != UserRole.ADMIN and call.created_by_id != current_user.id:
        raise InsufficientPermission()
    
    apps, total = await ApplicationService.get_call_applications(
        call_id=call_id,
        status_filter=[ApplicationStatus(status_filter)] if status_filter else None,
        session=session,
        page=page,
        per_page=per_page,
    )
    
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    
    applications_out = []
    for app in apps:
        app_status = app.status.value if hasattr(app.status, 'value') else app.status
        company_info = None
        if app.company:
            company_info = {
                'id': app.company.id,
                'name': app.company.name,
                'industry_sector': app.company.industry_sector,
                'email': app.company.user.email if app.company.user else None,
                'phone': None,
            }

        applications_out.append({
            'id': app.id,
            'call_id': app.call_id,
            'company_id': app.company_id,
            'status': app_status,
            'proposed_employee_count': app.proposed_employee_count,
            'submitted_at': app.submitted_at,
            'company': company_info,
            'documents_count': len(app.documents) if hasattr(app, 'documents') and app.documents else 0,
        })

    return ApplicationListResponse(
        applications=applications_out,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@applications_router.get("/{application_id}", response_model=ApplicationWithCallOut)
async def get_application_details(
    application_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get detailed application info for review.
    Coordinator only.
    """
    app = await ApplicationService.get_application_by_id(
        application_id=application_id,
        session=session,
        include_documents=True,
        include_call=True,
        include_company=True,
    )
    
    if not app:
        raise ApplicationNotFound()
    
    # Check ownership of the call
    if current_user.role != UserRole.ADMIN:
        call = await CallService.get_call_by_id(app.call_id, session)
        if call and call.created_by_id != current_user.id:
            raise InsufficientPermission()
    
    app_out = build_application_out(app)
    return ApplicationWithCallOut(**app_out.model_dump())


@applications_router.post("/{application_id}/documents/{document_id}/review", response_model=DocumentActionResponse)
async def review_document(
    application_id: int,
    document_id: int,
    review_data: DocumentReviewRequest,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Review a document (approve/reject).
    Coordinator only.
    """
    app = await ApplicationService.get_application_by_id(
        application_id, session, include_documents=True, include_call=True
    )
    
    if not app:
        raise ApplicationNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        call = await CallService.get_call_by_id(app.call_id, session)
        if call and call.created_by_id != current_user.id:
            raise InsufficientPermission()

    if app.status in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette candidature a déjà une décision finale",
        )
    
    # Find document
    document = None
    for doc in app.documents:
        if doc.id == document_id:
            document = doc
            break
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )
    
    document = await ApplicationService.review_document(
        document=document,
        status=review_data.status,
        rejection_reason=review_data.rejection_reason,
        session=session,
    )
    
    return DocumentActionResponse(
        message="Document examiné avec succès",
        document=build_document_out(document),
    )


@applications_router.post("/{application_id}/approve", response_model=ApplicationActionResponse)
async def approve_application(
    application_id: int,
    approval_data: ApplicationApprove,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Approve an application.
    Coordinator only.
    """
    app = await ApplicationService.get_application_by_id(
        application_id, session, include_documents=True, include_call=True
    )
    
    if not app:
        raise ApplicationNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        call = await CallService.get_call_by_id(app.call_id, session)
        if call and call.created_by_id != current_user.id:
            raise InsufficientPermission()

    if app.status in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette candidature a déjà une décision finale",
        )
    
    old_status = app.status.value if hasattr(app.status, 'value') else app.status
    
    app = await ApplicationService.approve_application(
        application=app,
        coordinator_id=current_user.id,
        decision_notes=approval_data.decision_notes,
        session=session,
    )
    
    # Create company invitation and send email
    try:
        invitation = await InvitationService.create_company_invitation(
            application=app,
            session=session,
        )
        # Get company email
        company_email = app.company.user.email if app.company and app.company.user else None
        company_name = app.company.name if app.company else "Entreprise"
        call_title = app.call.title if app.call else "Appel"
        if company_email:
            InvitationService.send_company_approval_email(
                company_email=company_email,
                company_name=company_name,
                call_title=call_title,
                invitation_token=invitation.token,
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to create invitation: {e}")
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="approve",
        application_id=app.id,
        old_status=old_status,
        new_status="approved",
        notes=approval_data.decision_notes,
        session=session,
    )
    await session.commit()
    
    return ApplicationActionResponse(
        message="Candidature approuvée",
        application=build_application_out(app),
    )


@applications_router.post("/{application_id}/reject", response_model=ApplicationActionResponse)
async def reject_application(
    application_id: int,
    rejection_data: ApplicationReject,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Reject an application.
    Coordinator only.
    """
    app = await ApplicationService.get_application_by_id(
        application_id, session, include_documents=True, include_call=True
    )
    
    if not app:
        raise ApplicationNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        call = await CallService.get_call_by_id(app.call_id, session)
        if call and call.created_by_id != current_user.id:
            raise InsufficientPermission()
    
    old_status = app.status.value if hasattr(app.status, 'value') else app.status
    
    app = await ApplicationService.reject_application(
        application=app,
        coordinator_id=current_user.id,
        rejection_reason=rejection_data.rejection_reason,
        decision_notes=rejection_data.decision_notes,
        session=session,
    )
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="reject",
        application_id=app.id,
        old_status=old_status,
        new_status="rejected",
        notes=rejection_data.decision_notes,
        session=session,
    )
    await session.commit()
    
    return ApplicationActionResponse(
        message="Candidature rejetée",
        application=build_application_out(app),
    )


@applications_router.post("/{application_id}/request-info", response_model=ApplicationActionResponse)
async def request_additional_info(
    application_id: int,
    request_data: ApplicationRequestAdditionalInfo,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Request additional information from company.
    Coordinator only.
    """
    app = await ApplicationService.get_application_by_id(
        application_id, session, include_documents=True, include_call=True
    )
    
    if not app:
        raise ApplicationNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        call = await CallService.get_call_by_id(app.call_id, session)
        if call and call.created_by_id != current_user.id:
            raise InsufficientPermission()
    
    old_status = app.status.value if hasattr(app.status, 'value') else app.status
    
    app = await ApplicationService.request_additional_info(
        application=app,
        coordinator_id=current_user.id,
        decision_notes=request_data.message,
        session=session,
    )
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="request_info",
        application_id=app.id,
        old_status=old_status,
        new_status="additional_info_required",
        notes=request_data.message,
        session=session,
    )
    await session.commit()
    
    return ApplicationActionResponse(
        message="Demande d'informations supplémentaires envoyée",
        application=build_application_out(app),
    )
