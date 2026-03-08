from datetime import datetime, timezone
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, ConfigDict, model_validator


# Department enum values matching backend
DepartmentType = Literal["informatique", "mecanique", "electrique", "civil", "gestion"]

# Display names for departments (for frontend)
DEPARTMENT_DISPLAY_NAMES = {
    "informatique": "Technologie de l'informatique",
    "mecanique": "Génie mécanique",
    "electrique": "Génie électrique",
    "civil": "Génie civil",
    "gestion": "Sciences Économiques et Sciences de Gestion",
}


class CourseBase(BaseModel):
    """
    Base schema for course data.
    Course is a template - dates are managed via availability slots.
    """
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    short_description: Optional[str] = Field(None, max_length=300)
    type: Literal["public", "private"] = "public"
    price: float = Field(..., ge=0)
    max_seats: int = Field(..., ge=1, description="Default max seats per session")
    duration_hours: Optional[int] = Field(None, ge=1)
    sector: Optional[str] = Field(None, max_length=100, description="Target industry sector")
    professor_id: Optional[int] = None
    department: Optional[DepartmentType] = Field(None, description="Course department")
    learning_outcomes: Optional[List[str]] = Field(None, description="What students will learn")
    is_published: bool = True


class CourseCreate(BaseModel):
    """Schema for creating a course (used with form data)"""
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    short_description: Optional[str] = Field(None, max_length=300)
    type: Literal["public", "private"] = "public"
    price: float = Field(..., ge=0)
    max_seats: int = Field(..., ge=1)
    duration_hours: Optional[int] = Field(None, ge=1)
    sector: Optional[str] = Field(None, max_length=100)
    professor_id: Optional[int] = None
    department: Optional[DepartmentType] = Field(None, description="Course department (required)")
    learning_outcomes: Optional[List[str]] = Field(None, description="List of learning outcomes")
    is_published: bool = True


class CourseUpdate(BaseModel):
    """Schema for updating a course"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10)
    short_description: Optional[str] = Field(None, max_length=300)
    type: Optional[Literal["public", "private"]] = None
    price: Optional[float] = Field(None, ge=0)
    max_seats: Optional[int] = Field(None, ge=1)
    duration_hours: Optional[int] = Field(None, ge=1)
    sector: Optional[str] = Field(None, max_length=100)
    professor_id: Optional[int] = None
    department: Optional[DepartmentType] = None
    learning_outcomes: Optional[List[str]] = None
    is_published: Optional[bool] = None


class CourseCreatorOut(BaseModel):
    """Schema for course creator (staff) information"""
    id: int
    fullname: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class CourseProfessorOut(BaseModel):
    """Schema for professor information in course response"""
    id: int
    specialization: str
    hourly_rate: float
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CourseOut(BaseModel):
    """Schema for full course response"""
    id: int
    title: str
    description: str
    short_description: Optional[str] = None
    type: str
    price: float
    max_seats: int
    image_path: Optional[str] = None
    duration_hours: Optional[int] = None
    sector: Optional[str] = None
    department: Optional[str] = None
    learning_outcomes: Optional[List[str]] = None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[CourseCreatorOut] = None
    professor: Optional[CourseProfessorOut] = None

    model_config = ConfigDict(from_attributes=True)


class CourseListOut(BaseModel):
    """Schema for course list item (landing page)"""
    id: int
    title: str
    short_description: Optional[str] = None
    type: str
    price: float
    max_seats: int
    image_path: Optional[str] = None
    duration_hours: Optional[int] = None
    sector: Optional[str] = None
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CourseListResponse(BaseModel):
    """Schema for paginated course list response"""
    courses: list[CourseListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class CourseDeleteResponse(BaseModel):
    """Schema for course deletion response"""
    message: str
    course_id: int


class CourseEditabilityOut(BaseModel):
    """Schema for course editability status"""
    can_edit_price: bool
    can_edit_seats: bool
    has_bookings: bool
    reason: Optional[str] = None


# ========================
# DEPARTMENT ENDPOINTS
# ========================

class DepartmentOut(BaseModel):
    """Schema for department response"""
    value: str
    label: str


class DepartmentListOut(BaseModel):
    """Schema for list of departments"""
    departments: List[DepartmentOut]


# ========================
# PROFESSOR LIST ENDPOINTS
# ========================

class ProfessorListItemOut(BaseModel):
    """Schema for professor in selector dropdown with relevance ranking"""
    id: int
    user_id: int
    fullname: str
    email: str
    specialization: str
    department: Optional[str] = None
    department_display: Optional[str] = None
    courses_taught: int = 0
    courses_in_department: int = 0
    relevance_score: int = 0
    is_recommended: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class ProfessorListResponse(BaseModel):
    """Schema for professor list response"""
    professors: List[ProfessorListItemOut]
    total: int
