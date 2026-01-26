"""
Schemas for course availability slots.
"""

from datetime import datetime, timezone
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


AvailabilityStatus = Literal["open", "pending_review", "confirmed", "cancelled"]


class AvailabilityBase(BaseModel):
    """Base schema for availability slot data"""
    start_date: datetime
    end_date: datetime
    schedule: Optional[str] = Field(None, max_length=500, description="e.g., 'Mon-Fri 9:00-17:00'")
    max_seats: int = Field(..., ge=1)
    min_seats: int = Field(1, ge=1, description="Minimum recommended threshold")
    booking_deadline: datetime


class AvailabilityCreate(AvailabilityBase):
    """Schema for creating an availability slot"""
    course_id: int = Field(..., ge=1)
    
    @model_validator(mode='after')
    def validate_dates(self):
        """
        Validate availability dates:
        - start_date cannot be in the past
        - end_date must be after start_date
        - booking_deadline must be before start_date
        - min_seats cannot exceed max_seats
        """
        now = datetime.now(timezone.utc)
        
        # Make dates timezone-aware if they aren't
        start = self.start_date
        end = self.end_date
        deadline = self.booking_deadline
        
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        # Validate start_date is not in the past (allow today)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if start < today_start:
            raise ValueError("Start date cannot be in the past")
        
        # Validate end_date is after start_date
        if end <= start:
            raise ValueError("End date must be after start date")
        
        # Validate booking_deadline is before start_date
        if deadline >= start:
            raise ValueError("Booking deadline must be before the start date")
        
        # Validate min_seats <= max_seats
        if self.min_seats > self.max_seats:
            raise ValueError("Minimum seats cannot exceed maximum seats")
        
        return self


class AvailabilityUpdate(BaseModel):
    """Schema for updating an availability slot"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    schedule: Optional[str] = Field(None, max_length=500)
    max_seats: Optional[int] = Field(None, ge=1)
    min_seats: Optional[int] = Field(None, ge=1)
    booking_deadline: Optional[datetime] = None
    
    @model_validator(mode='after')
    def validate_dates(self):
        """Validate dates if provided together"""
        if self.start_date and self.end_date:
            start = self.start_date
            end = self.end_date
            
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            
            if end <= start:
                raise ValueError("End date must be after start date")
        
        if self.booking_deadline and self.start_date:
            deadline = self.booking_deadline
            start = self.start_date
            
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            
            if deadline >= start:
                raise ValueError("Booking deadline must be before the start date")
        
        if self.min_seats and self.max_seats:
            if self.min_seats > self.max_seats:
                raise ValueError("Minimum seats cannot exceed maximum seats")
        
        return self


class AvailabilityCourseInfo(BaseModel):
    """Minimal course info for availability response"""
    id: int
    title: str
    price: float
    duration_hours: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class AvailabilityOut(BaseModel):
    """Schema for availability slot response"""
    id: int
    course_id: int
    start_date: datetime
    end_date: datetime
    schedule: Optional[str] = None
    max_seats: int
    min_seats: int
    reserved_seats: int
    remaining_seats: int
    booking_deadline: datetime
    status: AvailabilityStatus
    created_at: datetime
    updated_at: datetime
    course: Optional[AvailabilityCourseInfo] = None
    
    model_config = ConfigDict(from_attributes=True)
    
    @classmethod
    def from_orm_with_remaining(cls, slot):
        """Create response with calculated remaining_seats"""
        return cls(
            id=slot.id,
            course_id=slot.course_id,
            start_date=slot.start_date,
            end_date=slot.end_date,
            schedule=slot.schedule,
            max_seats=slot.max_seats,
            min_seats=slot.min_seats,
            reserved_seats=slot.reserved_seats,
            remaining_seats=slot.max_seats - slot.reserved_seats,
            booking_deadline=slot.booking_deadline,
            status=slot.status.value if hasattr(slot.status, 'value') else slot.status,
            created_at=slot.created_at,
            updated_at=slot.updated_at,
            course=AvailabilityCourseInfo.model_validate(slot.course) if slot.course else None
        )


class AvailabilityListOut(BaseModel):
    """Schema for availability slot in list view"""
    id: int
    course_id: int
    start_date: datetime
    end_date: datetime
    schedule: Optional[str] = None
    max_seats: int
    min_seats: int
    reserved_seats: int
    remaining_seats: int
    booking_deadline: datetime
    status: AvailabilityStatus
    course: Optional[AvailabilityCourseInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


class AvailabilityListResponse(BaseModel):
    """Schema for paginated availability list response"""
    slots: list[AvailabilityListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class AvailabilityWithBookingStatus(BaseModel):
    """Schema for availability slot with user's booking status"""
    id: int
    course_id: int
    start_date: datetime
    end_date: datetime
    schedule: Optional[str] = None
    max_seats: int
    min_seats: int
    reserved_seats: int
    remaining_seats: int
    booking_deadline: datetime
    status: AvailabilityStatus
    # User's booking info (if company user)
    user_booking_id: Optional[int] = None
    user_booking_status: Optional[str] = None  # reserved, confirmed, cancelled
    
    model_config = ConfigDict(from_attributes=True)


class AvailabilityWithBookingStatusResponse(BaseModel):
    """Schema for paginated availability list with booking status"""
    slots: list[AvailabilityWithBookingStatus]
    total: int
    page: int
    per_page: int
    total_pages: int


class SlotStatusUpdate(BaseModel):
    """Schema for updating slot status (staff action)"""
    status: Literal["confirmed", "cancelled"]
    staff_notes: Optional[str] = Field(None, max_length=1000)


class SlotConfirmResponse(BaseModel):
    """Response for slot confirmation/cancellation"""
    message: str
    slot_id: int
    status: AvailabilityStatus
    affected_bookings: int
