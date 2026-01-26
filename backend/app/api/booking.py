"""
API endpoints for company bookings.
"""

import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole, BookingStatus, Company
from ..dependencies import get_current_user, get_staff_user, RoleChecker
from ..services.booking_service import BookingService
from ..schemas.booking_schema import (
    BookingCreate,
    BookingUpdate,
    BookingStaffUpdate,
    BookingOut,
    BookingWithCourseOut,
    BookingListOut,
    BookingListResponse,
    BookingCreateResponse,
    BookingCancelResponse,
    SlotBookingSummary,
    BookingCompanyInfo,
    BookingSlotInfo,
    BookingCourseInfo,
)
from ..error import BookingNotFound, InsufficientPermission

booking_router = APIRouter()


def build_company_info(company: Optional[Company]) -> Optional[BookingCompanyInfo]:
    """Build BookingCompanyInfo from Company model with related User data"""
    if not company:
        return None
    return BookingCompanyInfo(
        id=company.id,
        company_name=company.name,
        email=company.user.email if company.user else None,
        phone=company.user.phone if company.user else None,
        industry_sector=company.industry_sector
    )


# ========================
# COMPANY ENDPOINTS
# ========================

@booking_router.post("", response_model=BookingCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new booking for a course availability slot.
    Company only.
    
    - Validates slot is open and deadline not passed
    - Checks sufficient seats available
    - Reserves seats atomically
    - No partial bookings allowed
    """
    # Verify user is a company
    if current_user.role != UserRole.COMPANY.value or not current_user.company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can create bookings"
        )
    
    company_id = current_user.company.id
    
    booking = await BookingService.create_booking(
        company_id=company_id,
        booking_data=booking_data,
        session=session
    )
    
    # Build response
    booking_out = BookingOut(
        id=booking.id,
        company_id=booking.company_id,
        availability_slot_id=booking.availability_slot_id,
        employee_count=booking.employee_count,
        status=booking.status.value if hasattr(booking.status, 'value') else booking.status,
        notes=booking.notes,
        staff_notes=booking.staff_notes,
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        company=build_company_info(booking.company),
        availability_slot=BookingSlotInfo(
            id=booking.availability_slot.id,
            start_date=booking.availability_slot.start_date,
            end_date=booking.availability_slot.end_date,
            schedule=booking.availability_slot.schedule,
            status=booking.availability_slot.status.value if hasattr(booking.availability_slot.status, 'value') else booking.availability_slot.status
        ) if booking.availability_slot else None
    )
    
    return BookingCreateResponse(
        message="Booking created successfully. Your seats have been reserved pending session confirmation.",
        booking=booking_out
    )


@booking_router.get("/my-bookings", response_model=BookingListResponse)
async def get_my_bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    status_filter: Optional[str] = Query(None, description="Filter by status: reserved, confirmed, cancelled"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all bookings for the current company.
    Company only.
    """
    if current_user.role != UserRole.COMPANY.value or not current_user.company:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company accounts can view bookings"
        )
    
    company_id = current_user.company.id
    
    booking_status_filter = None
    if status_filter:
        try:
            booking_status_filter = [BookingStatus(status_filter)]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    bookings, total = await BookingService.get_company_bookings(
        company_id=company_id,
        session=session,
        status_filter=booking_status_filter,
        page=page,
        per_page=per_page
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return BookingListResponse(
        bookings=[
            BookingListOut(
                id=b.id,
                company_id=b.company_id,
                availability_slot_id=b.availability_slot_id,
                employee_count=b.employee_count,
                status=b.status.value if hasattr(b.status, 'value') else b.status,
                created_at=b.created_at,
                company=None  # Don't need company info for own bookings
            )
            for b in bookings
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@booking_router.get("/{booking_id}", response_model=BookingWithCourseOut)
async def get_booking_details(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get details of a specific booking.
    Company can only view their own bookings.
    """
    booking = await BookingService.get_booking_by_id(booking_id, session)
    
    if not booking:
        raise BookingNotFound()
    
    # Check ownership (company) or staff access
    is_company_owner = (
        current_user.role == UserRole.COMPANY.value and
        current_user.company and
        current_user.company.id == booking.company_id
    )
    is_staff = current_user.role in [UserRole.STAFF.value, UserRole.ADMIN.value]
    
    if not is_company_owner and not is_staff:
        raise InsufficientPermission()
    
    return BookingWithCourseOut(
        id=booking.id,
        company_id=booking.company_id,
        availability_slot_id=booking.availability_slot_id,
        employee_count=booking.employee_count,
        status=booking.status.value if hasattr(booking.status, 'value') else booking.status,
        notes=booking.notes,
        staff_notes=booking.staff_notes if is_staff else None,  # Only staff sees staff_notes
        created_at=booking.created_at,
        updated_at=booking.updated_at,
        company=build_company_info(booking.company),
        availability_slot=BookingSlotInfo(
            id=booking.availability_slot.id,
            start_date=booking.availability_slot.start_date,
            end_date=booking.availability_slot.end_date,
            schedule=booking.availability_slot.schedule,
            status=booking.availability_slot.status.value if hasattr(booking.availability_slot.status, 'value') else booking.availability_slot.status
        ) if booking.availability_slot else None,
        course=BookingCourseInfo.model_validate(booking.availability_slot.course) if booking.availability_slot and booking.availability_slot.course else None
    )


@booking_router.put("/{booking_id}", response_model=BookingOut)
async def update_booking(
    booking_id: int,
    update_data: BookingUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Update a booking (company can only update notes before confirmation).
    Company only.
    """
    booking = await BookingService.get_booking_by_id(booking_id, session)
    
    if not booking:
        raise BookingNotFound()
    
    # Check ownership
    if (current_user.role != UserRole.COMPANY.value or
        not current_user.company or
        current_user.company.id != booking.company_id):
        raise InsufficientPermission()
    
    updated_booking = await BookingService.update_booking(booking, update_data, session)
    
    return BookingOut(
        id=updated_booking.id,
        company_id=updated_booking.company_id,
        availability_slot_id=updated_booking.availability_slot_id,
        employee_count=updated_booking.employee_count,
        status=updated_booking.status.value if hasattr(updated_booking.status, 'value') else updated_booking.status,
        notes=updated_booking.notes,
        staff_notes=None,  # Don't expose to company
        created_at=updated_booking.created_at,
        updated_at=updated_booking.updated_at,
        company=None,
        availability_slot=None
    )


@booking_router.delete("/{booking_id}", response_model=BookingCancelResponse)
async def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Cancel a booking and release seats.
    Company can only cancel their own bookings before confirmation.
    """
    booking = await BookingService.get_booking_by_id(booking_id, session)
    
    if not booking:
        raise BookingNotFound()
    
    # Check ownership
    if (current_user.role != UserRole.COMPANY.value or
        not current_user.company or
        current_user.company.id != booking.company_id):
        raise InsufficientPermission()
    
    seats_released = await BookingService.cancel_booking(booking, session)
    
    return BookingCancelResponse(
        message="Booking cancelled successfully. Seats have been released.",
        booking_id=booking_id,
        seats_released=seats_released
    )


# ========================
# STAFF ENDPOINTS
# ========================

@booking_router.get("/slot/{slot_id}/bookings", response_model=SlotBookingSummary)
async def get_slot_bookings(
    slot_id: int,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all bookings for a specific availability slot.
    Staff only.
    """
    summary = await BookingService.get_booking_summary_for_slot(slot_id, session)
    
    return SlotBookingSummary(
        slot_id=summary["slot_id"],
        slot_status=summary["slot_status"],
        start_date=summary["start_date"],
        end_date=summary["end_date"],
        booking_deadline=summary["booking_deadline"],
        total_reserved=summary["total_reserved"],
        max_seats=summary["max_seats"],
        min_seats=summary["min_seats"],
        remaining_seats=summary["remaining_seats"],
        booking_count=summary["booking_count"],
        bookings=[
            BookingOut(
                id=b.id,
                company_id=b.company_id,
                availability_slot_id=b.availability_slot_id,
                employee_count=b.employee_count,
                status=b.status.value if hasattr(b.status, 'value') else b.status,
                notes=b.notes,
                staff_notes=b.staff_notes,
                created_at=b.created_at,
                updated_at=b.updated_at,
                company=build_company_info(b.company),
                availability_slot=None
            )
            for b in summary["bookings"]
        ],
        is_above_minimum=summary["is_above_minimum"],
        deadline_passed=summary["deadline_passed"]
    )


@booking_router.put("/staff/{booking_id}", response_model=BookingOut)
async def staff_update_booking(
    booking_id: int,
    update_data: BookingStaffUpdate,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Staff update a booking (can modify employee count and add notes).
    Staff only.
    """
    booking = await BookingService.get_booking_by_id(booking_id, session)
    
    if not booking:
        raise BookingNotFound()
    
    updated_booking = await BookingService.staff_update_booking(booking, update_data, session)
    
    return BookingOut(
        id=updated_booking.id,
        company_id=updated_booking.company_id,
        availability_slot_id=updated_booking.availability_slot_id,
        employee_count=updated_booking.employee_count,
        status=updated_booking.status.value if hasattr(updated_booking.status, 'value') else updated_booking.status,
        notes=updated_booking.notes,
        staff_notes=updated_booking.staff_notes,
        created_at=updated_booking.created_at,
        updated_at=updated_booking.updated_at,
        company=build_company_info(updated_booking.company),
        availability_slot=None
    )
