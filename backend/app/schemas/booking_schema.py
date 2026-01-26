"""
Schemas for company bookings.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


BookingStatusType = Literal["reserved", "confirmed", "cancelled"]


class BookingCreate(BaseModel):
    """Schema for creating a booking"""
    availability_slot_id: int = Field(..., ge=1)
    employee_count: int = Field(..., ge=1, description="Number of employees to enroll")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes from company")


class BookingUpdate(BaseModel):
    """Schema for updating a booking (company can only update notes before confirmation)"""
    notes: Optional[str] = Field(None, max_length=1000)


class BookingStaffUpdate(BaseModel):
    """Schema for staff to update booking"""
    staff_notes: Optional[str] = Field(None, max_length=1000)
    employee_count: Optional[int] = Field(None, ge=1)


class BookingCompanyInfo(BaseModel):
    """Company info for booking response"""
    id: int
    company_name: str = Field(alias="name")
    email: Optional[str] = None
    phone: Optional[str] = None
    industry_sector: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class BookingSlotInfo(BaseModel):
    """Availability slot info for booking response"""
    id: int
    start_date: datetime
    end_date: datetime
    schedule: Optional[str] = None
    status: str
    
    model_config = ConfigDict(from_attributes=True)


class BookingCourseInfo(BaseModel):
    """Course info for booking response"""
    id: int
    title: str
    price: float
    
    model_config = ConfigDict(from_attributes=True)


class BookingOut(BaseModel):
    """Schema for booking response"""
    id: int
    company_id: int
    availability_slot_id: int
    employee_count: int
    status: BookingStatusType
    notes: Optional[str] = None
    staff_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    company: Optional[BookingCompanyInfo] = None
    availability_slot: Optional[BookingSlotInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


class BookingWithCourseOut(BookingOut):
    """Booking response including course info (for company dashboard)"""
    course: Optional[BookingCourseInfo] = None


class BookingListOut(BaseModel):
    """Schema for booking in list view"""
    id: int
    company_id: int
    availability_slot_id: int
    employee_count: int
    status: BookingStatusType
    created_at: datetime
    company: Optional[BookingCompanyInfo] = None
    
    model_config = ConfigDict(from_attributes=True)


class BookingListResponse(BaseModel):
    """Schema for paginated booking list response"""
    bookings: list[BookingListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


class BookingCreateResponse(BaseModel):
    """Response for successful booking creation"""
    message: str
    booking: BookingOut


class BookingCancelResponse(BaseModel):
    """Response for booking cancellation"""
    message: str
    booking_id: int
    seats_released: int


class SlotBookingSummary(BaseModel):
    """Summary of bookings for a specific slot (staff view)"""
    slot_id: int
    slot_status: str
    start_date: datetime
    end_date: datetime
    booking_deadline: datetime
    total_reserved: int
    max_seats: int
    min_seats: int
    remaining_seats: int
    booking_count: int
    bookings: list[BookingOut]
    is_above_minimum: bool
    deadline_passed: bool
