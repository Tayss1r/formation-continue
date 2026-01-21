from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


class CourseBase(BaseModel):
    """Base schema for course data"""
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    short_description: Optional[str] = Field(None, max_length=300)
    type: Literal["public", "private"] = "public"
    price: float = Field(..., ge=0)
    max_seats: int = Field(..., ge=1)
    duration_hours: Optional[int] = Field(None, ge=1)
    schedule: Optional[str] = Field(None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    professor_id: Optional[int] = None
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
    schedule: Optional[str] = Field(None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    professor_id: Optional[int] = None
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
    schedule: Optional[str] = Field(None, max_length=500)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    professor_id: Optional[int] = None
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
    schedule: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
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
    schedule: Optional[str] = None
    start_date: Optional[datetime] = None

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
