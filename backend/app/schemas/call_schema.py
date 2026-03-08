"""
Pydantic schemas for Call for Applicants.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class CallStatus(str, Enum):
    """Call status enum for API"""
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    UNDER_REVIEW = "under_review"
    RESULTS_PUBLISHED = "results_published"


class RequiredDocumentSpec(BaseModel):
    """Specification for a required document"""
    type: str = Field(..., description="Document type identifier (e.g., 'convention')")
    label: str = Field(..., description="Human-readable label")
    required: bool = Field(default=True, description="Whether this document is mandatory")
    description: Optional[str] = Field(None, description="Additional instructions")


# =============================================================================
# CREATE / UPDATE SCHEMAS
# =============================================================================

class CallCreate(BaseModel):
    """Schema for creating a new call"""
    title: str = Field(..., min_length=5, max_length=200)
    reference_number: Optional[str] = Field(None, max_length=50, description="Unique reference number")
    department: str = Field(..., description="Department enum value")
    description: Optional[str] = Field(None, description="Description (optional for drafts)")
    eligibility_criteria: Optional[str] = None
    required_documents: List[RequiredDocumentSpec] = Field(default_factory=list)
    employee_required_documents: List[RequiredDocumentSpec] = Field(default_factory=list)
    application_start_date: datetime
    application_deadline: datetime
    results_publication_date: Optional[datetime] = None
    
    @field_validator('application_start_date')
    @classmethod
    def start_date_in_future(cls, v):
        from datetime import date
        # Compare by date only to avoid timezone midnight issues
        today = date.today()
        v_date = v.date() if hasattr(v, 'date') else v
        if v_date <= today:
            raise ValueError("La date de début doit être dans le futur (après aujourd'hui)")
        return v
    
    @field_validator('application_deadline')
    @classmethod
    def deadline_after_start(cls, v, info):
        start = info.data.get('application_start_date')
        if start:
            v_date = v.date() if hasattr(v, 'date') else v
            s_date = start.date() if hasattr(start, 'date') else start
            if v_date <= s_date:
                raise ValueError('La date limite doit être après la date de début')
        return v
    
    @field_validator('results_publication_date')
    @classmethod
    def results_after_deadline(cls, v, info):
        if v is None:
            return v
        deadline = info.data.get('application_deadline')
        if deadline:
            v_date = v.date() if hasattr(v, 'date') else v
            d_date = deadline.date() if hasattr(deadline, 'date') else deadline
            if v_date <= d_date:
                raise ValueError('La date de publication des résultats doit être après la date limite')
        return v


class CallUpdate(BaseModel):
    """Schema for updating a call (only in DRAFT status)"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=20)
    eligibility_criteria: Optional[str] = None
    required_documents: Optional[List[RequiredDocumentSpec]] = None
    employee_required_documents: Optional[List[RequiredDocumentSpec]] = None
    application_start_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    results_publication_date: Optional[datetime] = None


class CallPublish(BaseModel):
    """Schema for publishing a call"""
    publish: bool = True


class CallPublishResults(BaseModel):
    """Schema for publishing call results"""
    results_publication_date: Optional[datetime] = None
    notes: Optional[str] = None


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class CallCoordinatorInfo(BaseModel):
    """Coordinator info for call responses"""
    id: int
    fullname: str
    email: str

    class Config:
        from_attributes = True


class CallOut(BaseModel):
    """Full call response schema"""
    id: int
    title: str
    reference_number: str
    department: str
    description: str
    eligibility_criteria: Optional[str]
    required_documents: List[dict]
    employee_required_documents: List[dict]
    application_start_date: datetime
    application_deadline: datetime
    results_publication_date: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]
    created_by: Optional[CallCoordinatorInfo] = None
    application_count: Optional[int] = None
    
    class Config:
        from_attributes = True


class CallListOut(BaseModel):
    """Call list item (minimal info)"""
    id: int
    title: str
    reference_number: str
    department: str
    application_deadline: datetime
    status: str
    published_at: Optional[datetime]
    application_count: int = 0
    
    class Config:
        from_attributes = True


class CallPublicOut(BaseModel):
    """Public call info (for landing page)"""
    id: int
    title: str
    reference_number: str
    department: str
    department_display: str
    description: str
    eligibility_criteria: Optional[str]
    required_documents: List[dict]
    application_start_date: datetime
    application_deadline: datetime
    is_open: bool
    is_upcoming: bool = False
    days_remaining: Optional[int]
    days_until_open: Optional[int] = None
    
    class Config:
        from_attributes = True


class CallResultsOut(BaseModel):
    """Published results for a call"""
    id: int
    title: str
    reference_number: str
    department: str
    department_display: str
    results_publication_date: datetime
    admitted_companies: List[dict]
    total_admitted: int
    
    class Config:
        from_attributes = True


# =============================================================================
# LIST RESPONSES
# =============================================================================

class CallListResponse(BaseModel):
    """Paginated call list response"""
    calls: List[CallListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class CallPublicListResponse(BaseModel):
    """Public calls list response"""
    calls: List[CallPublicOut]
    total: int


class CallResultsListResponse(BaseModel):
    """Published results list response"""
    results: List[CallResultsOut]
    total: int


# =============================================================================
# ACTION RESPONSES
# =============================================================================

class CallCreateResponse(BaseModel):
    """Response after creating a call"""
    message: str
    call: CallOut


class CallActionResponse(BaseModel):
    """Generic action response"""
    message: str
    call: CallOut
