"""Professor Schemas for API requests and responses."""

from datetime import datetime, date, time
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
    cohort_names: List[str] = []
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


class CohortMaterialOut(BaseModel):
    id: int
    cohort_id: int
    cohort_name: str
    course_id: int
    course_title: str
    title: str
    description: Optional[str] = None
    file_name: str
    file_path: str
    file_size: int
    file_type: str
    uploaded_by_id: int
    uploaded_by_name: Optional[str] = None
    created_at: datetime


class CohortMaterialListResponse(BaseModel):
    materials: List[CohortMaterialOut]
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


class ProfessorCohortOut(BaseModel):
    """Cohort visible to assigned professor."""
    id: int
    name: str
    call_id: int
    call_title: str
    course_id: int
    course_title: str
    training_start_date: date
    training_end_date: date
    daily_start_hour: str
    daily_end_hour: str


class ProfessorCohortListResponse(BaseModel):
    cohorts: List[ProfessorCohortOut]
    total: int


class CohortSessionCreateIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    session_date: date
    start_time: time
    end_time: time
    location: Optional[str] = Field(default=None, max_length=255)


class CohortSessionUpdateIn(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    session_date: date
    start_time: time
    end_time: time
    location: Optional[str] = Field(default=None, max_length=255)


class CohortSessionOut(BaseModel):
    id: int
    cohort_id: int
    professor_id: int
    professor_name: str
    title: str
    session_date: date
    start_time: str
    end_time: str
    location: Optional[str] = None
    created_at: datetime


class CohortSessionListResponse(BaseModel):
    sessions: List[CohortSessionOut]
    total: int


class AttendanceRecordUpsertIn(BaseModel):
    employee_id: int
    status: str = Field(..., pattern="^(present|absent|late)$")
    notes: Optional[str] = Field(default=None, max_length=500)


class AttendanceBulkUpsertIn(BaseModel):
    records: List[AttendanceRecordUpsertIn]


class SessionAttendanceOut(BaseModel):
    employee_id: int
    employee_name: str
    employee_email: str
    company_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    marked_at: Optional[datetime] = None


class SessionAttendanceListResponse(BaseModel):
    attendance: List[SessionAttendanceOut]
    total: int
