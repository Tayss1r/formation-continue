from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class FeedbackCreate(BaseModel):
    """Schema for submitting course feedback"""
    course_id: int = Field(..., description="Course ID to submit feedback for")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = Field(None, max_length=2000, description="Optional feedback comment")
    is_anonymous: bool = Field(False, description="Submit anonymously")


class FeedbackUpdate(BaseModel):
    """Schema for updating existing feedback"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)
    is_anonymous: Optional[bool] = None


class FeedbackEmployeeOut(BaseModel):
    """Employee info for non-anonymous feedback"""
    id: int
    fullname: str

    model_config = ConfigDict(from_attributes=True)


class FeedbackOut(BaseModel):
    """Schema for feedback response"""
    id: int
    course_id: int
    rating: int
    comment: Optional[str]
    is_anonymous: bool
    created_at: datetime
    updated_at: datetime
    # Only included if not anonymous
    employee: Optional[FeedbackEmployeeOut] = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackListResponse(BaseModel):
    """Schema for list of feedback with stats"""
    feedback: list[FeedbackOut]
    total: int
    average_rating: float
    rating_distribution: dict[int, int]  # {1: count, 2: count, ...}


class MyFeedbackOut(BaseModel):
    """Schema for employee's own feedback"""
    id: int
    course_id: int
    course_title: str
    rating: int
    comment: Optional[str]
    is_anonymous: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
