"""
Enrollment API endpoints for:
- Code validation
- Employee enrollment
- Document upload/management
- Staff review of documents
"""
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.dependencies import (
    get_current_user,
    RoleChecker,
)
from app.db.models import User, UserRole
from app.services.enrollment_service import EnrollmentService
from app.schemas.enrollment_schema import (
    EnrollmentCodeValidation,
    EnrollmentCodeInfo,
    SessionEnrollmentCreate,
    SessionEnrollmentOut,
    MyEnrollmentOut,
    DocumentUploadResponse,
    DocumentOut,
    DocumentReviewRequest,
    SessionEnrolleeInfo,
)


enrollment_router = APIRouter()


# ==================== Code Validation (Public for logged-in users) ====================

@enrollment_router.post("/validate-code", response_model=EnrollmentCodeInfo)
async def validate_enrollment_code(
    data: EnrollmentCodeValidation,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Validate an enrollment code and return session info.
    Returns course name, dates, and remaining spots for the code.
    """
    return await EnrollmentService.get_code_info(data.code, session)


@enrollment_router.get("/code-info/{code}", response_model=EnrollmentCodeInfo)
async def get_code_info(
    code: str,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get information about an enrollment code without consuming it.
    """
    return await EnrollmentService.get_code_info(code, session)


# ==================== Employee Enrollment ====================

@enrollment_router.post("/enroll")
async def enroll_with_code(
    data: SessionEnrollmentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Enroll in a session using an enrollment code.
    Employee must be logged in and verified.
    """
    enrollment = await EnrollmentService.enroll_employee(
        employee_id=current_user.id,
        code=data.code,
        session=session,
    )
    
    # Transform to response format
    slot = enrollment.availability_slot
    course = slot.course if slot else None
    code_obj = enrollment.enrollment_code
    company = code_obj.company if code_obj else None
    
    return {
        "id": enrollment.id,
        "employee_id": enrollment.employee_id,
        "availability_slot_id": enrollment.availability_slot_id,
        "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
        "session_info": {
            "course_title": course.title if course else "Formation",
            "start_date": slot.start_date.isoformat() if slot else None,
            "end_date": slot.end_date.isoformat() if slot else None,
            "schedule": slot.schedule if slot else None,
        } if slot else None,
        "company_name": company.name if company else None,
        "document_status": None,
    }


@enrollment_router.get("/my-enrollments")
async def get_my_enrollments(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get all enrollments for the current employee.
    Includes course info, session dates, and document status.
    """
    enrollments = await EnrollmentService.get_employee_enrollments(current_user.id, session)
    
    result = []
    for enrollment in enrollments:
        slot = enrollment.availability_slot
        course = slot.course if slot else None
        code_obj = enrollment.enrollment_code
        company = code_obj.company if code_obj else None
        doc = enrollment.document
        
        result.append({
            "id": enrollment.id,
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "session": {
                "course_title": course.title if course else "Formation",
                "start_date": slot.start_date.isoformat() if slot else None,
                "end_date": slot.end_date.isoformat() if slot else None,
                "schedule": slot.schedule if slot else None,
                "slot_id": slot.id if slot else None,
            } if slot else {},
            "company_name": company.name if company else "N/A",
            "document_status": doc.status.value if doc and hasattr(doc.status, 'value') else (doc.status if doc else None),
            "document_id": doc.id if doc else None,
        })
    
    return result


# ==================== Document Upload ====================

@enrollment_router.post("/enrollments/{enrollment_id}/document")
async def upload_document(
    enrollment_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an identity document for an enrollment.
    Accepted types: id_card, passport, driver_license
    """
    document = await EnrollmentService.upload_document(
        enrollment_id=enrollment_id,
        employee_id=current_user.id,
        document_type=document_type,
        file=file,
        session=session,
    )
    
    return {
        "id": document.id,
        "document_type": document.document_type,
        "original_filename": document.original_filename,
        "status": document.status.value if hasattr(document.status, 'value') else document.status,
        "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
    }


@enrollment_router.get("/enrollments/{enrollment_id}/documents")
async def get_enrollment_documents(
    enrollment_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Get all documents for an enrollment.
    """
    documents = await EnrollmentService.get_enrollment_documents(enrollment_id, current_user.id, session)
    
    return [
        {
            "id": doc.id,
            "enrollment_id": doc.enrollment_id,
            "document_type": doc.document_type,
            "original_filename": doc.original_filename,
            "status": doc.status.value if hasattr(doc.status, 'value') else doc.status,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "reviewed_at": doc.reviewed_at.isoformat() if doc.reviewed_at else None,
            "rejection_reason": doc.rejection_reason,
        }
        for doc in documents
    ]


# ==================== Staff Endpoints ====================

@enrollment_router.get(
    "/staff/sessions/{slot_id}/enrollees",
    dependencies=[Depends(RoleChecker([UserRole.STAFF]))],
)
async def get_session_enrollees(
    slot_id: int,
    session: AsyncSession = Depends(get_session),
):
    """
    Get all enrollees for a session (staff only).
    Includes employee info and document review status.
    """
    enrollments = await EnrollmentService.get_session_enrollees(slot_id, session)
    
    result = []
    for enrollment in enrollments:
        employee = enrollment.employee
        user = employee.user if employee else None
        code_obj = enrollment.enrollment_code
        company = code_obj.company if code_obj else None
        doc = enrollment.document
        
        doc_out = None
        if doc:
            doc_out = {
                "id": doc.id,
                "enrollment_id": doc.enrollment_id,
                "document_type": doc.document_type,
                "original_filename": doc.original_filename,
                "file_path": doc.file_path,
                "status": doc.status.value if hasattr(doc.status, 'value') else doc.status,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                "reviewed_at": doc.reviewed_at.isoformat() if doc.reviewed_at else None,
                "rejection_reason": doc.rejection_reason,
            }
        
        result.append({
            "enrollment_id": enrollment.id,
            "employee_name": user.fullname if user else "N/A",
            "employee_email": user.email if user else "N/A",
            "company_name": company.name if company else "N/A",
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "document": doc_out,
        })
    
    return result


@enrollment_router.post(
    "/staff/documents/{document_id}/review",
    dependencies=[Depends(RoleChecker([UserRole.STAFF]))],
)
async def review_document(
    document_id: int,
    data: DocumentReviewRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Review (verify/reject) a document (staff only).
    """
    document = await EnrollmentService.review_document(
        document_id=document_id,
        status=data.status,
        reviewer_id=current_user.id,
        reviewer_notes=data.reviewer_notes,
        session=session,
    )
    
    return {
        "id": document.id,
        "enrollment_id": document.enrollment_id,
        "document_type": document.document_type,
        "original_filename": document.original_filename,
        "status": document.status.value if hasattr(document.status, 'value') else document.status,
        "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
        "reviewed_at": document.reviewed_at.isoformat() if document.reviewed_at else None,
        "rejection_reason": document.rejection_reason,
    }


@enrollment_router.get(
    "/staff/sessions/{slot_id}/codes",
    dependencies=[Depends(RoleChecker([UserRole.STAFF]))],
)
async def get_session_enrollment_codes(
    slot_id: int,
    session: AsyncSession = Depends(get_session),
):
    """
    Get all enrollment codes for a session (staff only).
    """
    return await EnrollmentService.get_session_codes(slot_id, session)
