"""
Pydantic schemas for Company Applications.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class ApplicationStatus(str, Enum):
    """Application status enum"""
    SUBMITTED = "submitted"
    DOCUMENTS_PENDING = "documents_pending"
    UNDER_REVIEW = "under_review"
    ADDITIONAL_INFO_REQUIRED = "additional_info_required"
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

class ApplicationCreate(BaseModel):
    """Schema for creating a new application"""
    call_id: int = Field(..., description="ID of the call to apply to")
    motivation_letter: Optional[str] = Field(None, max_length=5000)
    proposed_employee_count: int = Field(..., ge=1, description="Number of employees")


class ApplicationUpdate(BaseModel):
    """Schema for updating an application (before review)"""
    motivation_letter: Optional[str] = Field(None, max_length=5000)
    proposed_employee_count: Optional[int] = Field(None, ge=1)


class ApplicationReview(BaseModel):
    """Schema for coordinator review action"""
    decision_notes: Optional[str] = Field(None, max_length=2000)


class ApplicationApprove(BaseModel):
    """Schema for approving an application"""
    decision_notes: Optional[str] = Field(None, max_length=2000)


class ApplicationReject(BaseModel):
    """Schema for rejecting an application"""
    rejection_reason: str = Field(..., min_length=10, max_length=2000)
    decision_notes: Optional[str] = Field(None, max_length=2000)


class ApplicationRequestInfo(BaseModel):
    """Schema for requesting additional info"""
    message: str = Field(..., min_length=10, max_length=2000)
    decision_notes: Optional[str] = Field(None, max_length=2000)


# Alias for backwards compatibility
ApplicationRequestAdditionalInfo = ApplicationRequestInfo


# =============================================================================
# DOCUMENT SCHEMAS
# =============================================================================

class DocumentOut(BaseModel):
    """Document response schema"""
    id: int
    document_type: str
    document_label: str
    original_filename: str
    file_size: int
    mime_type: str
    review_status: str
    review_notes: Optional[str]
    reviewed_at: Optional[datetime]
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    """Response after uploading a document"""
    message: str
    document: DocumentOut


class DocumentReviewRequest(BaseModel):
    """Schema for reviewing a document"""
    review_status: DocumentReviewStatus
    review_notes: Optional[str] = Field(None, max_length=1000)


# =============================================================================
# NESTED INFO SCHEMAS
# =============================================================================

class ApplicationCompanyInfo(BaseModel):
    """Company info for application responses"""
    id: int
    name: str
    industry_sector: str
    email: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True


class ApplicationCallInfo(BaseModel):
    """Call info for application responses"""
    id: int
    title: str
    reference_number: str
    department: str
    application_deadline: datetime
    status: str
    
    class Config:
        from_attributes = True


class ApplicationCoordinatorInfo(BaseModel):
    """Coordinator info for application responses"""
    id: int
    fullname: str
    
    class Config:
        from_attributes = True


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class ApplicationOut(BaseModel):
    """Full application response schema"""
    id: int
    call_id: int
    company_id: int
    status: str
    motivation_letter: Optional[str]
    proposed_employee_count: int
    submitted_at: datetime
    updated_at: datetime
    decision_date: Optional[datetime]
    decision_notes: Optional[str]
    rejection_reason: Optional[str]
    call: Optional[ApplicationCallInfo] = None
    company: Optional[ApplicationCompanyInfo] = None
    coordinator: Optional[ApplicationCoordinatorInfo] = None
    documents: List[DocumentOut] = []
    documents_complete: bool = False
    employee_submissions_count: int = 0
    
    class Config:
        from_attributes = True


class ApplicationListOut(BaseModel):
    """Application list item"""
    id: int
    call_id: int
    company_id: int
    status: str
    proposed_employee_count: int
    submitted_at: datetime
    call: Optional[ApplicationCallInfo] = None
    company: Optional[ApplicationCompanyInfo] = None
    documents_count: int = 0
    
    class Config:
        from_attributes = True


class ApplicationStatusOut(BaseModel):
    """Application status for company view"""
    id: int
    status: str
    submitted_at: datetime
    decision_date: Optional[datetime]
    rejection_reason: Optional[str]
    can_submit_documents: bool
    can_edit: bool
    employee_submissions_enabled: bool
    
    class Config:
        from_attributes = True


# =============================================================================
# LIST RESPONSES
# =============================================================================

class ApplicationListResponse(BaseModel):
    """Paginated application list response"""
    applications: List[ApplicationListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class CompanyApplicationListResponse(BaseModel):
    """Company's applications list response"""
    applications: List[ApplicationOut]
    total: int


# =============================================================================
# ACTION RESPONSES
# =============================================================================

class ApplicationCreateResponse(BaseModel):
    """Response after creating an application"""
    message: str
    application: ApplicationOut


class ApplicationActionResponse(BaseModel):
    """Generic action response"""
    message: str
    application: ApplicationOut


class ApplicationWithCallOut(BaseModel):
    """Application with full call info"""
    id: int
    call_id: int
    company_id: int
    status: str
    motivation_letter: Optional[str]
    proposed_employee_count: int
    submitted_at: datetime
    updated_at: datetime
    decision_date: Optional[datetime]
    decision_notes: Optional[str]
    rejection_reason: Optional[str]
    call: ApplicationCallInfo
    company: Optional[ApplicationCompanyInfo] = None
    documents: List[DocumentOut] = []
    
    class Config:
        from_attributes = True


class DocumentActionResponse(BaseModel):
    """Response after document action"""
    message: str
    document: DocumentOut
