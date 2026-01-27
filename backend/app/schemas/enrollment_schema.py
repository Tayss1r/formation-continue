"""
Schemas for session enrollment system.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


DocumentStatusType = Literal["pending_review", "verified", "rejected"]


# ==================== Enrollment Code Schemas ====================

class EnrollmentCodeOut(BaseModel):
    """Schema for enrollment code response"""
    id: int
    code: str
    availability_slot_id: int
    company_id: int
    max_usage: int
    used_count: int
    expires_at: datetime
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class EnrollmentCodeValidation(BaseModel):
    """Schema for code validation request"""
    code: str = Field(..., min_length=8, max_length=12)


class EnrollmentCodeInfo(BaseModel):
    """Schema for code validation response (before enrollment)"""
    valid: bool
    message: str
    session_info: Optional[dict] = None
    company_name: Optional[str] = None
    remaining_spots: Optional[int] = None


# ==================== Session Enrollment Schemas ====================

class SessionEnrollmentCreate(BaseModel):
    """Schema for enrolling with a code"""
    code: str = Field(..., min_length=8, max_length=12)


class SessionEnrollmentOut(BaseModel):
    """Schema for enrollment response"""
    id: int
    employee_id: int
    availability_slot_id: int
    enrolled_at: datetime
    session_info: Optional[dict] = None
    document_status: Optional[DocumentStatusType] = None
    
    model_config = ConfigDict(from_attributes=True)


class MyEnrollmentOut(BaseModel):
    """Schema for employee's enrollment list"""
    id: int
    enrolled_at: datetime
    session: dict  # Course title, dates, etc.
    company_name: str
    document_status: Optional[DocumentStatusType] = None
    document_id: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==================== Employee Document Schemas ====================

class DocumentUploadResponse(BaseModel):
    """Schema for document upload response"""
    id: int
    document_type: str
    original_filename: str
    status: DocumentStatusType
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DocumentOut(BaseModel):
    """Schema for document details"""
    id: int
    enrollment_id: int
    document_type: str
    original_filename: str
    status: DocumentStatusType
    uploaded_at: datetime
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class DocumentReviewRequest(BaseModel):
    """Schema for staff document review"""
    status: Literal["verified", "rejected"]
    reviewer_notes: Optional[str] = None


class DocumentReviewOut(BaseModel):
    """Schema for document review response"""
    id: int
    status: DocumentStatusType
    reviewed_at: datetime
    rejection_reason: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


# ==================== Staff View Schemas ====================

class SessionEnrolleeInfo(BaseModel):
    """Schema for enrolled employee info (staff view)"""
    enrollment_id: int
    employee_name: str
    employee_email: str
    company_name: str
    enrolled_at: datetime
    document: Optional[DocumentOut] = None
    
    model_config = ConfigDict(from_attributes=True)


class SessionEnrolleesResponse(BaseModel):
    """Schema for session enrollees list"""
    session_id: int
    course_title: str
    start_date: datetime
    end_date: datetime
    enrollees: list[SessionEnrolleeInfo]
    total: int


# ==================== Employee Signup Schema ====================

class EmployeeSignupRequest(BaseModel):
    """Schema for employee account creation"""
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=100)
    fullname: str = Field(..., min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)


class EmployeeSignupResponse(BaseModel):
    """Schema for employee signup response"""
    message: str
    email: str
    requires_verification: bool = True
