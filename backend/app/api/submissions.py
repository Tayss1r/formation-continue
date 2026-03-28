"""
API endpoints for Employee Submissions.
"""

from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..db.database import get_session
from ..db.models import User, UserRole, EmployeeSubmissionStatus, EmployeeProfile, DocumentReviewStatus
from ..dependencies import get_current_user, RoleChecker
from ..services.submission_service import SubmissionService
from ..services.application_service import ApplicationService
from ..services.call_service import CallService
from ..services.audit_service import AuditService
from ..celery_tasks import send_email
from ..core.config import settings
from ..schemas.submission_schema import (
    SubmissionCreate,
    SubmissionOut,
    SubmissionListResponse,
    SubmissionApprove,
    SubmissionReject,
    SubmissionActionResponse,
    SubmissionDocumentOut,
    SubmissionDocumentReviewRequest,
    SubmissionDocumentActionResponse,
    AvailableSubmissionOut,
    AvailableSubmissionsResponse,
)
from ..error import (
    ApplicationNotFound,
    SubmissionNotFound,
    InsufficientPermission,
)

submissions_router = APIRouter()

# Role checkers
require_employee = RoleChecker([UserRole.EMPLOYEE])
require_coordinator = RoleChecker([UserRole.COORDINATOR, UserRole.ADMIN])


async def get_employee_profile_by_user_id(user_id: int, session: AsyncSession) -> Optional[EmployeeProfile]:
    query = select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
    result = await session.execute(query)
    return result.scalar_one_or_none()


def build_doc_out(doc) -> dict:
    """Build SubmissionDocumentOut from model"""
    review_status = doc.review_status.value if hasattr(doc.review_status, 'value') else doc.review_status
    return {
        "id": doc.id,
        "document_type": doc.document_type,
        "document_label": doc.document_label,
        "file_path": doc.file_path,
        "original_filename": doc.original_filename,
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "review_status": review_status,
        "review_notes": doc.review_notes,
        "uploaded_at": doc.uploaded_at,
        "reviewed_at": doc.reviewed_at,
    }


def build_submission_out(sub, include_documents: bool = True) -> dict:
    """Build SubmissionOut from model"""
    sub_status = sub.status.value if hasattr(sub.status, 'value') else sub.status
    
    employee_info = None
    if sub.employee:
        employee_info = {
            'id': sub.employee.id,
            'user_id': sub.employee.user_id,
            'fullname': sub.employee.user.fullname if sub.employee.user else None,
            'email': sub.employee.user.email if sub.employee.user else None,
        }
    
    call_info = None
    application_info = None
    if sub.company_application and sub.company_application.call:
        call = sub.company_application.call
        dept = call.department.value if hasattr(call.department, 'value') else call.department
        call_info = {
            'id': call.id,
            'title': call.title,
            'reference_number': call.reference_number,
            'department': dept,
            'employee_required_documents': call.employee_required_documents or [],
        }

    if sub.company_application:
        app_status = sub.company_application.status.value if hasattr(sub.company_application.status, 'value') else sub.company_application.status
        company_info = None
        if sub.company_application.company:
            company_info = {
                'id': sub.company_application.company.id,
                'name': sub.company_application.company.name,
            }
        application_info = {
            'id': sub.company_application.id,
            'status': app_status,
            'company': company_info,
            'call': call_info,
        }
    
    documents = []
    if include_documents and hasattr(sub, 'documents') and sub.documents:
        documents = [build_doc_out(doc) for doc in sub.documents]
    
    required_types = set()
    if call_info:
        required_types = {
            doc.get('type') for doc in (call_info.get('employee_required_documents') or [])
            if isinstance(doc, dict) and doc.get('required', True)
        }
    uploaded_types = {doc['document_type'] for doc in documents}
    documents_complete = required_types.issubset(uploaded_types) if required_types else True

    return {
        'id': sub.id,
        'company_application_id': sub.company_application_id,
        'employee_id': sub.employee_id,
        'status': sub_status,
        'created_at': sub.created_at,
        'updated_at': sub.updated_at,
        'reviewed_at': sub.reviewed_at,
        'review_notes': sub.review_notes,
        'application': application_info,
        'employee': employee_info,
        'documents': documents,
        'documents_complete': documents_complete,
        'can_submit': sub_status == 'pending' and documents_complete,
    }


# =============================================================================
# EMPLOYEE ENDPOINTS
# =============================================================================

@submissions_router.get("/available")
async def get_available_submissions(
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Get available submissions (approved applications from employee's company).
    Employee only.
    """
    available = await SubmissionService.get_available_submissions(
        user_id=current_user.id,
        session=session,
    )
    
    results = []
    for item in available:
        results.append({
            "application_id": item["company_application_id"],
            "call_id": item["call_id"],
            "call_title": item["call_title"],
            "call_reference": item["call_reference"],
            "department": item["department"],
            "application_deadline": item.get("application_deadline"),
            "employee_required_documents": item.get("required_documents") or [],
            "has_submitted": item.get("has_submission", False),
            "submission_id": item.get("submission_id"),
            "submission_status": item.get("submission_status"),
        })
    
    return {"available": results, "total": len(results)}


@submissions_router.post("", response_model=SubmissionActionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission_data: SubmissionCreate,
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a submission for an approved application.
    Employee only.
    """
    submission = await SubmissionService.create_submission(
        user_id=current_user.id,
        submission_data=submission_data,
        session=session,
    )
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="create",
        submission_id=submission.id,
        new_status="pending",
        session=session,
    )
    await session.commit()
    
    return SubmissionActionResponse(
        message="Soumission créée avec succès",
        submission=build_submission_out(submission),
    )


@submissions_router.get("/my-submissions")
async def get_my_submissions(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all submissions for the current employee.
    Employee only.
    """
    submissions = await SubmissionService.get_employee_submissions(
        user_id=current_user.id,
        session=session,
    )

    if status_filter:
        submissions = [
            sub for sub in submissions
            if (sub.status.value if hasattr(sub.status, 'value') else sub.status) == status_filter
        ]
    
    return {
        "submissions": [build_submission_out(sub) for sub in submissions],
        "total": len(submissions),
    }


@submissions_router.get("/my-submissions/{submission_id}")
async def get_my_submission(
    submission_id: int,
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Get details of a specific submission.
    Employee only.
    """
    sub = await SubmissionService.get_submission_by_id(
        submission_id=submission_id,
        session=session,
        include_relations=True,
    )
    
    employee = await get_employee_profile_by_user_id(current_user.id, session)
    if not employee or not sub or sub.employee_id != employee.id:
        raise SubmissionNotFound()
    
    return build_submission_out(sub)


@submissions_router.post("/{submission_id}/documents", response_model=SubmissionDocumentActionResponse)
async def upload_submission_document(
    submission_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Upload a document for a submission.
    Employee only.
    """
    employee = await get_employee_profile_by_user_id(current_user.id, session)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    sub = await SubmissionService.get_submission_by_id(submission_id, session)
    
    if not sub or sub.employee_id != employee.id:
        raise SubmissionNotFound()
    
    full_sub = await SubmissionService.get_submission_by_id(submission_id, session, include_relations=True)

    document_label = document_type
    if full_sub and full_sub.company_application and full_sub.company_application.call:
        required = full_sub.company_application.call.employee_required_documents or []
        match = next((doc for doc in required if doc.get("type") == document_type), None)
        if match and match.get("label"):
            document_label = match.get("label")

    content = await file.read()
    file_path = SubmissionService.get_upload_path(submission_id, document_type, file.filename or "document")
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as output:
        output.write(content)

    document = await SubmissionService.upload_document(
        submission=sub,
        document_type=document_type,
        document_label=document_label,
        file_path=file_path,
        original_filename=file.filename or "document",
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        session=session,
    )
    
    return SubmissionDocumentActionResponse(
        message="Document téléchargé avec succès",
        document=build_doc_out(document),
    )


@submissions_router.delete("/{submission_id}/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_submission_document(
    submission_id: int,
    document_id: int,
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a document from a submission.
    Employee only.
    """
    employee = await get_employee_profile_by_user_id(current_user.id, session)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    sub = await SubmissionService.get_submission_by_id(
        submission_id, session, include_relations=True
    )
    
    if not sub or sub.employee_id != employee.id:
        raise SubmissionNotFound()
    
    # Find document
    document = None
    for doc in sub.documents:
        if doc.id == document_id:
            document = doc
            break
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )
    
    await SubmissionService.delete_document(document_id=document_id, submission=sub, session=session)
    
    return None


@submissions_router.post("/{submission_id}/submit", response_model=SubmissionActionResponse)
async def submit_for_review(
    submission_id: int,
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Submit for coordinator review (after all documents uploaded).
    Employee only.
    """
    employee = await get_employee_profile_by_user_id(current_user.id, session)
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    sub = await SubmissionService.get_submission_by_id(
        submission_id, session, include_relations=True
    )
    
    if not sub or sub.employee_id != employee.id:
        raise SubmissionNotFound()
    
    sub = await SubmissionService.submit_for_review(sub, session)
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="submit",
        submission_id=sub.id,
        old_status="pending",
        new_status="submitted",
        session=session,
    )
    await session.commit()
    
    return SubmissionActionResponse(
        message="Soumission envoyée pour examen",
        submission=build_submission_out(sub),
    )


# =============================================================================
# COORDINATOR ENDPOINTS
# =============================================================================

@submissions_router.get("/application/{application_id}", response_model=SubmissionListResponse)
async def get_application_submissions(
    application_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all submissions for an application.
    Coordinator only.
    """
    app = await ApplicationService.get_application_by_id(
        application_id, session, include_call=True
    )
    if not app:
        raise ApplicationNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        call = app.call
        if call and call.created_by_id != current_user.id:
            raise InsufficientPermission()
    
    parsed_status_filter = None
    if status_filter:
        try:
            parsed_status_filter = [EmployeeSubmissionStatus(status_filter)]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter: {status_filter}",
            )

    submissions, total = await SubmissionService.get_application_submissions(
        application_id=application_id,
        status_filter=parsed_status_filter,
        page=page,
        per_page=per_page,
        session=session,
    )

    total_pages = (total + per_page - 1) // per_page if total > 0 else 0
    
    return SubmissionListResponse(
        submissions=[build_submission_out(sub) for sub in submissions],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@submissions_router.get("/{submission_id}", response_model=SubmissionOut)
async def get_submission_details(
    submission_id: int,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Get detailed submission info for review.
    Coordinator only.
    """
    sub = await SubmissionService.get_submission_by_id(
        submission_id=submission_id,
        session=session,
        include_relations=True,
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.company_application and sub.company_application.call:
            if sub.company_application.call.created_by_id != current_user.id:
                raise InsufficientPermission()
    
    return build_submission_out(sub)


@submissions_router.post("/{submission_id}/documents/{document_id}/review", response_model=SubmissionDocumentActionResponse)
async def review_submission_document(
    submission_id: int,
    document_id: int,
    review_data: SubmissionDocumentReviewRequest,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Review a submission document (approve/reject).
    Coordinator only.
    """
    sub = await SubmissionService.get_submission_by_id(
        submission_id, session, include_relations=True
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.company_application and sub.company_application.call:
            if sub.company_application.call.created_by_id != current_user.id:
                raise InsufficientPermission()
    
    # Find document
    document = None
    for doc in sub.documents:
        if doc.id == document_id:
            document = doc
            break
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé"
        )
    
    document = await SubmissionService.review_document(
        document_id=document.id,
        reviewer_id=current_user.id,
        review_status=review_data.review_status,
        review_notes=review_data.review_notes,
        session=session,
    )

    if review_data.review_status == DocumentReviewStatus.REVISION_REQUIRED and sub.employee and sub.employee.user:
        employee_email = sub.employee.user.email
        employee_name = sub.employee.user.fullname or "Employé"
        call_title = "votre appel"
        if sub.company_application and sub.company_application.call:
            call_title = sub.company_application.call.title
        submission_url = f"{settings.FRONTEND_URL}/employee/submissions/{sub.id}"
        review_notes_html = review_data.review_notes or "Veuillez mettre à jour ce document selon les exigences de l'appel."

        subject = "Révision demandée pour votre document"
        body = f"""
        <p>Bonjour {employee_name},</p>
        <p>Une révision a été demandée pour l'un de vos documents dans le cadre de <strong>{call_title}</strong>.</p>
        <p><strong>Document :</strong> {document.document_label}</p>
        <p><strong>Commentaire du coordinateur :</strong><br>{review_notes_html}</p>
        <p>Vous pouvez téléverser une nouvelle version en cliquant ici :</p>
        <p><a href=\"{submission_url}\">Mettre à jour ma soumission</a></p>
        """
        send_email.delay([employee_email], subject, body)
    
    return SubmissionDocumentActionResponse(
        message="Document examiné avec succès",
        document=build_doc_out(document),
    )


@submissions_router.post("/{submission_id}/approve", response_model=SubmissionActionResponse)
async def approve_submission(
    submission_id: int,
    approval_data: SubmissionApprove,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Approve an employee submission.
    Coordinator only.
    """
    sub = await SubmissionService.get_submission_by_id(
        submission_id, session, include_relations=True
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.company_application and sub.company_application.call:
            if sub.company_application.call.created_by_id != current_user.id:
                raise InsufficientPermission()
    
    old_status = sub.status.value if hasattr(sub.status, 'value') else sub.status

    if sub.status == EmployeeSubmissionStatus.SUBMITTED:
        sub = await SubmissionService.start_review(
            submission=sub,
            reviewer_id=current_user.id,
            session=session,
        )
    
    sub = await SubmissionService.approve_submission(
        submission=sub,
        reviewer_id=current_user.id,
        review_notes=approval_data.review_notes,
        session=session,
    )
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="approve",
        submission_id=sub.id,
        old_status=old_status,
        new_status="approved",
        notes=approval_data.review_notes,
        session=session,
    )
    await session.commit()
    
    return SubmissionActionResponse(
        message="Soumission approuvée",
        submission=build_submission_out(sub),
    )


@submissions_router.post("/{submission_id}/reject", response_model=SubmissionActionResponse)
async def reject_submission(
    submission_id: int,
    rejection_data: SubmissionReject,
    current_user: User = Depends(require_coordinator),
    session: AsyncSession = Depends(get_session)
):
    """
    Reject an employee submission.
    Coordinator only.
    """
    sub = await SubmissionService.get_submission_by_id(
        submission_id, session, include_relations=True
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.company_application and sub.company_application.call:
            if sub.company_application.call.created_by_id != current_user.id:
                raise InsufficientPermission()
    
    old_status = sub.status.value if hasattr(sub.status, 'value') else sub.status

    if sub.status == EmployeeSubmissionStatus.SUBMITTED:
        sub = await SubmissionService.start_review(
            submission=sub,
            reviewer_id=current_user.id,
            session=session,
        )
    
    sub = await SubmissionService.reject_submission(
        submission=sub,
        reviewer_id=current_user.id,
        review_notes=rejection_data.review_notes,
        session=session,
    )
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="reject",
        submission_id=sub.id,
        old_status=old_status,
        new_status="rejected",
        notes=rejection_data.review_notes,
        session=session,
    )
    await session.commit()
    
    return SubmissionActionResponse(
        message="Soumission rejetée",
        submission=build_submission_out(sub),
    )
