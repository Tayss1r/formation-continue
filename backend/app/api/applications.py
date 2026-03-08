"""
API endpoints for Company Applications.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole, CallStatus, ApplicationStatus, DocumentReviewStatus
from ..dependencies import get_current_user, RoleChecker
from ..services.application_service import ApplicationService
from ..services.call_service import CallService
from ..services.audit_service import AuditService
from ..schemas.application_schema import (
    ApplicationCreate,
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
)
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
        file_path=doc.file_path,
        original_filename=doc.original_filename,
        review_status=review_status,
        rejection_reason=doc.rejection_reason,
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
            'trade_register_number': app.company.trade_register_number,
            'industry_sector': app.company.industry_sector,
        }
    
    documents = []
    if include_documents and hasattr(app, 'documents') and app.documents:
        documents = [build_document_out(doc) for doc in app.documents]
    
    return ApplicationOut(
        id=app.id,
        call_id=app.call_id,
        company_id=app.company_id,
        status=app_status,
        motivation_letter=app.motivation_letter,
        additional_notes=app.additional_notes,
        submitted_at=app.submitted_at,
        reviewed_at=app.reviewed_at,
        coordinator_decision=app.coordinator_decision,
        decision_notes=app.decision_notes,
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
        call_id=application_data.call_id,
        company_id=company.id,
        application_data=application_data,
        session=session,
    )
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="create",
        application_id=application.id,
        call_id=application_data.call_id,
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
        status=status_filter,
        session=session,
    )
    
    return ApplicationListResponse(
        applications=[build_application_out(app) for app in apps],
        total=len(apps),
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
    
    call_info = None
    if app.call:
        dept = app.call.department.value if hasattr(app.call.department, 'value') else app.call.department
        call_info = {
            'id': app.call.id,
            'title': app.call.title,
            'reference_number': app.call.reference_number,
            'department': dept,
            'required_documents': app.call.required_documents,
        }
    
    return ApplicationWithCallOut(
        **app_out.model_dump(),
        call=call_info,
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
    
    document = await ApplicationService.upload_document(
        application=app,
        document_type=document_type,
        file=file,
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
    
    # Find the document
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
    
    await ApplicationService.delete_document(document, session)
    
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
        call_id=app.call_id,
        old_status="pending",
        new_status="submitted",
        session=session,
    )
    await session.commit()
    
    return ApplicationActionResponse(
        message="Candidature soumise avec succès",
        application=build_application_out(app),
    )


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
    
    return ApplicationListResponse(
        applications=[build_application_out(app) for app in apps],
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
    
    call_info = None
    if app.call:
        dept = app.call.department.value if hasattr(app.call.department, 'value') else app.call.department
        call_info = {
            'id': app.call.id,
            'title': app.call.title,
            'reference_number': app.call.reference_number,
            'department': dept,
            'required_documents': app.call.required_documents,
        }
    
    return ApplicationWithCallOut(
        **app_out.model_dump(),
        call=call_info,
    )


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
    
    old_status = app.status.value if hasattr(app.status, 'value') else app.status
    
    app = await ApplicationService.approve_application(
        application=app,
        decision=approval_data.decision,
        notes=approval_data.notes,
        session=session,
    )
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="approve",
        application_id=app.id,
        call_id=app.call_id,
        old_status=old_status,
        new_status="approved",
        notes=approval_data.notes,
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
        decision=rejection_data.decision,
        notes=rejection_data.notes,
        session=session,
    )
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="reject",
        application_id=app.id,
        call_id=app.call_id,
        old_status=old_status,
        new_status="rejected",
        notes=rejection_data.notes,
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
        request_message=request_data.message,
        session=session,
    )
    
    # Audit log
    await AuditService.log_application_action(
        user=current_user,
        action="request_info",
        application_id=app.id,
        call_id=app.call_id,
        old_status=old_status,
        new_status="additional_info_requested",
        notes=request_data.message,
        session=session,
    )
    await session.commit()
    
    return ApplicationActionResponse(
        message="Demande d'informations supplémentaires envoyée",
        application=build_application_out(app),
    )
