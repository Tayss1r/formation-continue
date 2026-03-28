"""Schemas for cohort creation and professor assignment workflow."""

from datetime import date, time, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CohortCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    call_id: int = Field(..., gt=0)
    course_id: int = Field(..., gt=0)
    training_start_date: date
    training_end_date: date
    daily_start_hour: time
    daily_end_hour: time

    @field_validator("training_end_date")
    @classmethod
    def validate_training_range(cls, value: date, info):
        start = info.data.get("training_start_date")
        if start and value <= start:
            raise ValueError("La date de fin doit etre apres la date de debut")
        return value

    @field_validator("daily_end_hour")
    @classmethod
    def validate_daily_range(cls, value: time, info):
        start = info.data.get("daily_start_hour")
        if start and value <= start:
            raise ValueError("L'heure de fin doit etre apres l'heure de debut")
        return value


class CohortProfessorAssignIn(BaseModel):
    professor_ids: List[int] = Field(default_factory=list)


class CohortProfessorOut(BaseModel):
    id: int
    user_id: int
    fullname: str
    email: str
    specialization: str
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CohortOut(BaseModel):
    id: int
    name: str
    call_id: int
    call_title: str
    call_reference_number: str
    course_id: int
    course_title: str
    training_start_date: date
    training_end_date: date
    daily_start_hour: time
    daily_end_hour: time
    created_at: datetime
    professors: List[CohortProfessorOut] = Field(default_factory=list)


class CohortListResponse(BaseModel):
    cohorts: List[CohortOut]
    total: int


class CohortFormCallOption(BaseModel):
    id: int
    title: str
    reference_number: str
    results_publication_date: Optional[date] = None


class CohortFormCourseOption(BaseModel):
    id: int
    title: str


class CohortFormOptionsResponse(BaseModel):
    calls: List[CohortFormCallOption]
    courses: List[CohortFormCourseOption]


class CohortAssignmentResponse(BaseModel):
    message: str
    cohort_id: int
    assigned_professors: int
    professors: List[CohortProfessorOut]
