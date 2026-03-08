"""
Professor Schemas for API requests and responses.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ========================
# DASHBOARD SCHEMAS
# ========================

class ProfessorDashboardStats(BaseModel):
    """Statistics for professor dashboard"""
    total_courses: int
    total_sessions: int
    total_enrolled_employees: int
    upcoming_sessions: int


class ProfessorDashboardOut(BaseModel):
    """Professor dashboard overview"""
    professor_id: int
    fullname: str
    email: str
    specialization: str
    department: Optional[str] = None
    department_display: Optional[str] = None
    stats: ProfessorDashboardStats
    recent_courses: List["ProfessorCourseOut"] = []
    
    model_config = ConfigDict(from_attributes=True)


# ========================
# COURSE SCHEMAS
# ========================

class ProfessorCourseOut(BaseModel):
    """Course details for professor view"""
    id: int
    title: str
    description: str
    short_description: Optional[str] = None
    type: str
    department: Optional[str] = None
    department_display: Optional[str] = None
    duration_hours: Optional[int] = None
    max_seats: int
    image_path: Optional[str] = None
    is_published: bool
    enrolled_count: int = 0
    upcoming_sessions: int = 0
    materials_count: int = 0
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ProfessorCourseListResponse(BaseModel):
    """Paginated list of professor's courses"""
    courses: List[ProfessorCourseOut]
    total: int
    page: int
    per_page: int
    total_pages: int


# ========================
# COURSE MATERIALS SCHEMAS
# ========================

class CourseMaterialCreate(BaseModel):
    """Schema for creating a course material"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)


class CourseMaterialOut(BaseModel):
    """Course material details"""
    id: int
    course_id: int
    title: str
    description: Optional[str] = None
    file_name: str
    file_path: str
    file_size: int
    file_type: str
    uploaded_by_id: int
    uploaded_by_name: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CourseMaterialListResponse(BaseModel):
    """List of course materials"""
    materials: List[CourseMaterialOut]
    total: int


# ========================
# ENROLLED EMPLOYEES SCHEMAS
# ========================

class EnrolledEmployeeOut(BaseModel):
    """Enrolled employee details for professor view"""
    id: int
    fullname: str
    email: str
    company_name: Optional[str] = None
    session_date: Optional[datetime] = None
    enrolled_at: datetime
    document_status: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class EnrolledEmployeeListResponse(BaseModel):
    """List of enrolled employees"""
    employees: List[EnrolledEmployeeOut]
    total: int
