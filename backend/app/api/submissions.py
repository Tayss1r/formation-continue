"""
API endpoints for Employee Submissions.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole, EmployeeSubmissionStatus
from ..dependencies import get_current_user, RoleChecker
from ..services.submission_service import SubmissionService
from ..services.application_service import ApplicationService
from ..services.call_service import CallService
from ..services.audit_service import AuditService
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


def build_doc_out(doc) -> SubmissionDocumentOut:
    """Build SubmissionDocumentOut from model"""
    review_status = doc.review_status.value if hasattr(doc.review_status, 'value') else doc.review_status
    return SubmissionDocumentOut(
        id=doc.id,
        document_type=doc.document_type,
        file_path=doc.file_path,
        original_filename=doc.original_filename,
        review_status=review_status,
        rejection_reason=doc.rejection_reason,
        uploaded_at=doc.uploaded_at,
        reviewed_at=doc.reviewed_at,
    )


def build_submission_out(sub, include_documents: bool = True) -> SubmissionOut:
    """Build SubmissionOut from model"""
    sub_status = sub.status.value if hasattr(sub.status, 'value') else sub.status
    
    employee_info = None
    if sub.employee:
        employee_info = {
            'id': sub.employee.id,
            'user_id': sub.employee.user_id,
            'fullname': sub.employee.user.fullname if sub.employee.user else None,
            'email': sub.employee.user.email if sub.employee.user else None,
            'position': sub.employee.position,
        }
    
    call_info = None
    if sub.application and sub.application.call:
        call = sub.application.call
        dept = call.department.value if hasattr(call.department, 'value') else call.department
        call_info = {
            'id': call.id,
            'title': call.title,
            'reference_number': call.reference_number,
            'department': dept,
        }
    
    documents = []
    if include_documents and hasattr(sub, 'documents') and sub.documents:
        documents = [build_doc_out(doc) for doc in sub.documents]
    
    return SubmissionOut(
        id=sub.id,
        application_id=sub.application_id,
        employee_id=sub.employee_id,
        status=sub_status,
        submitted_at=sub.submitted_at,
        reviewed_at=sub.reviewed_at,
        coordinator_notes=sub.coordinator_notes,
        created_at=sub.created_at,
        employee=employee_info,
        call=call_info,
        documents=documents,
    )


# =============================================================================
# EMPLOYEE ENDPOINTS
# =============================================================================

@submissions_router.get("/available", response_model=AvailableSubmissionsResponse)
async def get_available_submissions(
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Get available submissions (approved applications from employee's company).
    Employee only.
    """
    employee = current_user.employee_profile
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    available = await SubmissionService.get_available_submissions(
        employee_id=employee.id,
        session=session,
    )
    
    results = []
    for app in available:
        call = app.call
        if call:
            dept = call.department.value if hasattr(call.department, 'value') else call.department
            
            # Check if employee already submitted
            has_submission = any(
                sub.employee_id == employee.id 
                for sub in app.employee_submissions
            ) if hasattr(app, 'employee_submissions') else False
            
            results.append(AvailableSubmissionOut(
                application_id=app.id,
                call_id=call.id,
                call_title=call.title,
                call_reference=call.reference_number,
                department=dept,
                application_deadline=call.application_deadline,
                employee_required_documents=call.employee_required_documents,
                has_submitted=has_submission,
            ))
    
    return AvailableSubmissionsResponse(
        available=results,
        total=len(results),
    )


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
    employee = current_user.employee_profile
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    # Verify application exists and belongs to employee's company
    app = await ApplicationService.get_application_by_id(
        submission_data.application_id, session, include_call=True
    )
    if not app:
        raise ApplicationNotFound()
    
    submission = await SubmissionService.create_submission(
        application_id=submission_data.application_id,
        employee_id=employee.id,
        session=session,
    )
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="create",
        submission_id=submission.id,
        application_id=submission_data.application_id,
        new_status="pending",
        session=session,
    )
    await session.commit()
    
    return SubmissionActionResponse(
        message="Soumission créée avec succès",
        submission=build_submission_out(submission),
    )


@submissions_router.get("/my-submissions", response_model=SubmissionListResponse)
async def get_my_submissions(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all submissions for the current employee.
    Employee only.
    """
    employee = current_user.employee_profile
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    submissions = await SubmissionService.get_employee_submissions(
        employee_id=employee.id,
        status=status_filter,
        session=session,
    )
    
    return SubmissionListResponse(
        submissions=[build_submission_out(sub) for sub in submissions],
        total=len(submissions),
    )


@submissions_router.get("/my-submissions/{submission_id}", response_model=SubmissionOut)
async def get_my_submission(
    submission_id: int,
    current_user: User = Depends(require_employee),
    session: AsyncSession = Depends(get_session)
):
    """
    Get details of a specific submission.
    Employee only.
    """
    employee = current_user.employee_profile
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    sub = await SubmissionService.get_submission_by_id(
        submission_id=submission_id,
        session=session,
        include_documents=True,
        include_application=True,
    )
    
    if not sub or sub.employee_id != employee.id:
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
    employee = current_user.employee_profile
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    sub = await SubmissionService.get_submission_by_id(submission_id, session)
    
    if not sub or sub.employee_id != employee.id:
        raise SubmissionNotFound()
    
    document = await SubmissionService.upload_document(
        submission=sub,
        document_type=document_type,
        file=file,
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
    employee = current_user.employee_profile
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    sub = await SubmissionService.get_submission_by_id(
        submission_id, session, include_documents=True
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
    
    await SubmissionService.delete_document(document, session)
    
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
    employee = current_user.employee_profile
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez avoir un profil employé"
        )
    
    sub = await SubmissionService.get_submission_by_id(
        submission_id, session, include_documents=True, include_application=True
    )
    
    if not sub or sub.employee_id != employee.id:
        raise SubmissionNotFound()
    
    sub = await SubmissionService.submit_for_review(sub, session)
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="submit",
        submission_id=sub.id,
        application_id=sub.application_id,
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
    
    submissions = await SubmissionService.get_application_submissions(
        application_id=application_id,
        status=status_filter,
        session=session,
    )
    
    return SubmissionListResponse(
        submissions=[build_submission_out(sub) for sub in submissions],
        total=len(submissions),
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
        include_documents=True,
        include_application=True,
        include_employee=True,
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.application and sub.application.call:
            if sub.application.call.created_by_id != current_user.id:
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
        submission_id, session, include_documents=True, include_application=True
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.application and sub.application.call:
            if sub.application.call.created_by_id != current_user.id:
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
        document=document,
        status=review_data.status,
        rejection_reason=review_data.rejection_reason,
        session=session,
    )
    
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
        submission_id, session, include_documents=True, include_application=True
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.application and sub.application.call:
            if sub.application.call.created_by_id != current_user.id:
                raise InsufficientPermission()
    
    old_status = sub.status.value if hasattr(sub.status, 'value') else sub.status
    
    sub = await SubmissionService.approve_submission(
        submission=sub,
        notes=approval_data.notes,
        session=session,
    )
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="approve",
        submission_id=sub.id,
        application_id=sub.application_id,
        old_status=old_status,
        new_status="approved",
        notes=approval_data.notes,
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
        submission_id, session, include_documents=True, include_application=True
    )
    
    if not sub:
        raise SubmissionNotFound()
    
    # Check ownership
    if current_user.role != UserRole.ADMIN:
        if sub.application and sub.application.call:
            if sub.application.call.created_by_id != current_user.id:
                raise InsufficientPermission()
    
    old_status = sub.status.value if hasattr(sub.status, 'value') else sub.status
    
    sub = await SubmissionService.reject_submission(
        submission=sub,
        notes=rejection_data.notes,
        session=session,
    )
    
    # Audit log
    await AuditService.log_submission_action(
        user=current_user,
        action="reject",
        submission_id=sub.id,
        application_id=sub.application_id,
        old_status=old_status,
        new_status="rejected",
        notes=rejection_data.notes,
        session=session,
    )
    await session.commit()
    
    return SubmissionActionResponse(
        message="Soumission rejetée",
        submission=build_submission_out(sub),
    )
