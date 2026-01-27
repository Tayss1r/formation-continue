"""
Schemas for course availability slots.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


AvailabilityStatus = Literal["open", "pending_review", "confirmed", "cancelled"]

# Business rule constants
MIN_START_DATE_DAYS = 3  # Session cannot start earlier than today + 3 days
MIN_BOOKING_DEADLINE_DAYS = 2  # Booking deadline cannot be earlier than today + 2 days


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
        Validate availability dates with STRICT business rules:
        
        Rule 1: Session start date >= today + 3 days
        Rule 2: Booking deadline >= today + 2 days
        Rule 3: Booking deadline < start_date (strictly before)
        Rule 4: end_date > start_date
        Rule 5: min_seats <= max_seats
        """
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
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
        
        # Rule 1: Session start date >= today + 3 days
        min_start_date = today_start + timedelta(days=MIN_START_DATE_DAYS)
        if start < min_start_date:
            raise ValueError(
                f"La date de début doit être au moins {MIN_START_DATE_DAYS} jours dans le futur "
                f"(minimum: {min_start_date.strftime('%d/%m/%Y')})"
            )
        
        # Rule 2: Booking deadline >= today + 2 days
        min_deadline = today_start + timedelta(days=MIN_BOOKING_DEADLINE_DAYS)
        if deadline < min_deadline:
            raise ValueError(
                f"La date limite de réservation doit être au moins {MIN_BOOKING_DEADLINE_DAYS} jours dans le futur "
                f"(minimum: {min_deadline.strftime('%d/%m/%Y')})"
            )
        
        # Rule 3: Booking deadline must be STRICTLY before start_date
        if deadline >= start:
            raise ValueError(
                "La date limite de réservation doit être strictement avant la date de début de session"
            )
        
        # Rule 4: end_date must be after start_date
        if end <= start:
            raise ValueError("La date de fin doit être après la date de début")
        
        # Rule 5: min_seats <= max_seats
        if self.min_seats > self.max_seats:
            raise ValueError("Le nombre minimum de places ne peut pas dépasser le maximum")
        
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
        """
        Validate dates if provided - same strict rules as creation.
        Note: Additional checks (bookings exist, deadline passed) are done in the service layer.
        """
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Validate start_date if provided
        if self.start_date:
            start = self.start_date
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            
            # Rule 1: start_date >= today + 3 days
            min_start_date = today_start + timedelta(days=MIN_START_DATE_DAYS)
            if start < min_start_date:
                raise ValueError(
                    f"La date de début doit être au moins {MIN_START_DATE_DAYS} jours dans le futur "
                    f"(minimum: {min_start_date.strftime('%d/%m/%Y')})"
                )
        
        # Validate booking_deadline if provided
        if self.booking_deadline:
            deadline = self.booking_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            
            # Rule 2: booking_deadline >= today + 2 days
            min_deadline = today_start + timedelta(days=MIN_BOOKING_DEADLINE_DAYS)
            if deadline < min_deadline:
                raise ValueError(
                    f"La date limite de réservation doit être au moins {MIN_BOOKING_DEADLINE_DAYS} jours dans le futur "
                    f"(minimum: {min_deadline.strftime('%d/%m/%Y')})"
                )
        
        # Validate end_date > start_date if both provided
        if self.start_date and self.end_date:
            start = self.start_date
            end = self.end_date
            
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            
            if end <= start:
                raise ValueError("La date de fin doit être après la date de début")
        
        # Validate deadline < start_date if both provided
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
