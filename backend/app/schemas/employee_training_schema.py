"""Schemas for employee training calendar and materials views."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class EmployeeTrainingSessionOut(BaseModel):
    id: int
    cohort_id: int
    cohort_name: str
    call_title: str
    course_title: str
    title: str
    session_date: date
    start_time: str
    end_time: str
    location: Optional[str] = None
    professor_name: str


class EmployeeTrainingCalendarResponse(BaseModel):
    sessions: List[EmployeeTrainingSessionOut]
    total: int


class EmployeeTrainingMaterialOut(BaseModel):
    id: int
    cohort_id: int
    cohort_name: str
    course_id: int
    course_title: str
    title: str
    description: Optional[str] = None
    file_name: str
    file_size: int
    file_type: str
    created_at: datetime


class EmployeeTrainingMaterialsResponse(BaseModel):
    materials: List[EmployeeTrainingMaterialOut]
    total: int


class EmployeeAttendanceHistoryOut(BaseModel):
    session_id: int
    session_title: str
    session_date: Optional[date] = None
    start_time: str
    end_time: str
    location: Optional[str] = None
    cohort_id: int
    cohort_name: str
    course_title: str
    professor_name: str
    status: str
    notes: Optional[str] = None
    marked_at: datetime


class EmployeeAttendanceHistoryResponse(BaseModel):
    attendance: List[EmployeeAttendanceHistoryOut]
    total: int
