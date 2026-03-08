"""
Pydantic schemas for Employee Submissions.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class EmployeeSubmissionStatus(str, Enum):
    """Submission status enum"""
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class DocumentReviewStatus(str, Enum):
    """Document review status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUIRED = "revision_required"


# =============================================================================
# CREATE / UPDATE SCHEMAS
# =============================================================================

class SubmissionCreate(BaseModel):
    """Schema for creating a new submission"""
    company_application_id: int = Field(..., description="ID of the approved company application")


class SubmissionSubmit(BaseModel):
    """Schema for submitting for review"""
    confirm: bool = Field(True, description="Confirmation flag")


class SubmissionReview(BaseModel):
    """Schema for coordinator review action"""
    review_notes: Optional[str] = Field(None, max_length=2000)


class SubmissionApprove(BaseModel):
    """Schema for approving a submission"""
    review_notes: Optional[str] = Field(None, max_length=2000)


class SubmissionReject(BaseModel):
    """Schema for rejecting a submission"""
    review_notes: str = Field(..., min_length=10, max_length=2000)


# =============================================================================
# DOCUMENT SCHEMAS
# =============================================================================

class SubmissionDocumentOut(BaseModel):
    """Submission document response schema"""
    id: int
    document_type: str
    document_label: str
    file_path: str
    original_filename: str
    file_size: int
    mime_type: str
    review_status: str
    review_notes: Optional[str]
    reviewed_at: Optional[datetime]
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class SubmissionDocumentUploadResponse(BaseModel):
    """Response after uploading a document"""
    message: str
    document: SubmissionDocumentOut


class SubmissionDocumentReviewRequest(BaseModel):
    """Schema for reviewing a document"""
    review_status: DocumentReviewStatus
    review_notes: Optional[str] = Field(None, max_length=1000)


# =============================================================================
# NESTED INFO SCHEMAS
# =============================================================================

class SubmissionEmployeeInfo(BaseModel):
    """Employee info for submission responses"""
    id: int
    user_id: int
    fullname: str
    email: str
    
    class Config:
        from_attributes = True


class SubmissionCompanyInfo(BaseModel):
    """Company info for submission responses"""
    id: int
    name: str
    
    class Config:
        from_attributes = True


class SubmissionCallInfo(BaseModel):
    """Call info for submission responses"""
    id: int
    title: str
    reference_number: str
    department: str
    employee_required_documents: List[dict]
    
    class Config:
        from_attributes = True


class SubmissionApplicationInfo(BaseModel):
    """Application info for submission responses"""
    id: int
    status: str
    company: Optional[SubmissionCompanyInfo] = None
    call: Optional[SubmissionCallInfo] = None
    
    class Config:
        from_attributes = True


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class SubmissionOut(BaseModel):
    """Full submission response schema"""
    id: int
    company_application_id: int
    employee_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    reviewed_at: Optional[datetime]
    review_notes: Optional[str]
    application: Optional[SubmissionApplicationInfo] = None
    employee: Optional[SubmissionEmployeeInfo] = None
    documents: List[SubmissionDocumentOut] = []
    documents_complete: bool = False
    can_submit: bool = False
    
    class Config:
        from_attributes = True


class SubmissionListOut(BaseModel):
    """Submission list item"""
    id: int
    company_application_id: int
    employee_id: int
    status: str
    created_at: datetime
    application: Optional[SubmissionApplicationInfo] = None
    employee: Optional[SubmissionEmployeeInfo] = None
    documents_count: int = 0
    
    class Config:
        from_attributes = True


class AvailableSubmissionOut(BaseModel):
    """Available submission opportunity for employee"""
    company_application_id: int
    call_id: int
    call_title: str
    call_reference: str
    department: str
    company_name: str
    required_documents: List[dict]
    has_submission: bool
    submission_id: Optional[int] = None
    submission_status: Optional[str] = None
    
    class Config:
        from_attributes = True


# =============================================================================
# LIST RESPONSES
# =============================================================================

class SubmissionListResponse(BaseModel):
    """Paginated submission list response"""
    submissions: List[SubmissionListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class AvailableSubmissionListResponse(BaseModel):
    """Available submissions for employee"""
    submissions: List[AvailableSubmissionOut]
    total: int


class EmployeeSubmissionListResponse(BaseModel):
    """Employee's submissions list"""
    submissions: List[SubmissionOut]
    total: int


# =============================================================================
# ACTION RESPONSES
# =============================================================================

class SubmissionCreateResponse(BaseModel):
    """Response after creating a submission"""
    message: str
    submission: SubmissionOut


class SubmissionActionResponse(BaseModel):
    """Generic action response"""
    message: str
    submission: SubmissionOut


class SubmissionDocumentActionResponse(BaseModel):
    """Response after document action"""
    message: str
    document: SubmissionDocumentOut


# Alias for API compatibility
AvailableSubmissionsResponse = AvailableSubmissionListResponse
