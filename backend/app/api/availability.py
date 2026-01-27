"""
API endpoints for course availability management.
"""

import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole, AvailabilitySlotStatus
from ..dependencies import get_current_user, get_staff_user, RoleChecker
from ..services.availability_service import AvailabilityService
from ..schemas.availability_schema import (
    AvailabilityCreate,
    AvailabilityUpdate,
    AvailabilityOut,
    AvailabilityListOut,
    AvailabilityListResponse,
    AvailabilityWithBookingStatus,
    AvailabilityWithBookingStatusResponse,
    SlotStatusUpdate,
    SlotConfirmResponse,
    AvailabilityCourseInfo,
)
from ..error import AvailabilitySlotNotFound, CourseNotFound, DeadlineNotReached

availability_router = APIRouter()


# ========================
# PUBLIC ENDPOINTS
# ========================

@availability_router.get("/course/{course_id}", response_model=AvailabilityListResponse)
async def get_course_availability(
    course_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    only_bookable: bool = Query(True, description="Only show slots that can be booked"),
    session: AsyncSession = Depends(get_session)
):
    """
    Get available date slots for a course.
    Public endpoint - shows only open slots with booking deadline not passed by default.
    """
    slots, total = await AvailabilityService.get_slots_for_course(
        course_id=course_id,
        session=session,
        page=page,
        per_page=per_page,
        only_bookable=only_bookable
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return AvailabilityListResponse(
        slots=[
            AvailabilityListOut(
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
                status=slot.status.value if hasattr(slot.status, 'value') else slot.status
            )
            for slot in slots
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@availability_router.get("/slot/{slot_id}", response_model=AvailabilityOut)
async def get_availability_slot(
    slot_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Get details of a specific availability slot.
    Public endpoint.
    """
    slot = await AvailabilityService.get_slot_by_id(slot_id, session, include_course=True)
    
    if not slot:
        raise AvailabilitySlotNotFound()
    
    return AvailabilityOut.from_orm_with_remaining(slot)


@availability_router.get("/course/{course_id}/with-booking-status", response_model=AvailabilityWithBookingStatusResponse)
async def get_course_availability_with_booking_status(
    course_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    only_bookable: bool = Query(True, description="Only show slots that can be booked"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get available date slots for a course with the current company's booking status.
    Authenticated endpoint - returns whether the logged-in company has already booked each slot.
    """
    # Get company_id if user is a company
    company_id = None
    if current_user.role == UserRole.COMPANY.value and current_user.company:
        company_id = current_user.company.id
    
    slots, total = await AvailabilityService.get_slots_for_course(
        course_id=course_id,
        session=session,
        page=page,
        per_page=per_page,
        only_bookable=only_bookable
    )
    
    # Get booking status for each slot if company
    slots_with_status = []
    for slot in slots:
        user_booking = None
        user_booking_status = None
        if company_id:
            booking = await AvailabilityService.get_company_booking_for_slot(
                company_id=company_id,
                slot_id=slot.id,
                session=session
            )
            if booking:
                user_booking = booking.id
                user_booking_status = booking.status.value if hasattr(booking.status, 'value') else booking.status
        
        slots_with_status.append(
            AvailabilityWithBookingStatus(
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
                user_booking_id=user_booking,
                user_booking_status=user_booking_status
            )
        )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return AvailabilityWithBookingStatusResponse(
        slots=slots_with_status,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


# ========================
# STAFF ENDPOINTS
# ========================

@availability_router.get("/staff/my-slots", response_model=AvailabilityListResponse)
async def get_my_availability_slots(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    status: Optional[str] = Query(None, description="Filter by status: open, pending_review, confirmed, cancelled"),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all availability slots for courses created by the current staff user.
    Staff only.
    """
    status_filter = None
    if status:
        try:
            status_filter = [AvailabilitySlotStatus(status)]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}"
            )
    
    slots, total = await AvailabilityService.get_all_slots_for_staff(
        session=session,
        user_id=current_user.id,
        status_filter=status_filter,
        page=page,
        per_page=per_page
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return AvailabilityListResponse(
        slots=[
            AvailabilityListOut(
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
                course=AvailabilityCourseInfo(
                    id=slot.course.id,
                    title=slot.course.title,
                    price=slot.course.price,
                    duration_hours=slot.course.duration_hours
                ) if slot.course else None
            )
            for slot in slots
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@availability_router.get("/staff/course/{course_id}", response_model=AvailabilityListResponse)
async def get_staff_course_availability(
    course_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    status: Optional[str] = Query(None, description="Filter by status: open, pending_review, confirmed, cancelled"),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all availability slots for a specific course (all statuses).
    Staff only. Shows all slots regardless of deadline or status.
    """
    # Verify course ownership
    from ..services.course_service import CourseService
    course = await CourseService.get_course_by_id(course_id, session)
    
    if not course:
        raise CourseNotFound()
    
    # Check ownership (unless admin)
    if current_user.role != UserRole.ADMIN.value and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view availability slots for your own courses"
        )
    
    status_filter = None
    if status:
        try:
            status_filter = [AvailabilitySlotStatus(status)]
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status}"
            )
    
    # Get ALL slots for this course (no filtering by deadline or open status)
    slots, total = await AvailabilityService.get_slots_for_course(
        course_id=course_id,
        session=session,
        status_filter=status_filter,
        page=page,
        per_page=per_page,
        only_bookable=False,
        include_all_statuses=True  # New parameter to show all statuses
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return AvailabilityListResponse(
        slots=[
            AvailabilityListOut(
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
                status=slot.status.value if hasattr(slot.status, 'value') else slot.status
            )
            for slot in slots
        ],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@availability_router.post("", response_model=AvailabilityOut, status_code=status.HTTP_201_CREATED)
async def create_availability_slot(
    slot_data: AvailabilityCreate,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new availability slot for a course.
    Staff only. Can only create slots for courses they created.
    """
    # Verify the course belongs to this staff user
    from ..services.course_service import CourseService
    course = await CourseService.get_course_by_id(slot_data.course_id, session)
    
    if not course:
        raise CourseNotFound()
    
    # Check ownership (unless admin)
    if current_user.role != UserRole.ADMIN.value and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create availability slots for your own courses"
        )
    
    slot = await AvailabilityService.create_slot(slot_data, session)
    
    return AvailabilityOut.from_orm_with_remaining(slot)


@availability_router.put("/slot/{slot_id}", response_model=AvailabilityOut)
async def update_availability_slot(
    slot_id: int,
    update_data: AvailabilityUpdate,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Update an availability slot.
    Staff only. Cannot modify if slot has bookings.
    """
    slot = await AvailabilityService.get_slot_by_id(slot_id, session)
    
    if not slot:
        raise AvailabilitySlotNotFound()
    
    # Check ownership (unless admin)
    if current_user.role != UserRole.ADMIN.value and slot.course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update availability slots for your own courses"
        )
    
    updated_slot = await AvailabilityService.update_slot(slot, update_data, session)
    
    return AvailabilityOut.from_orm_with_remaining(updated_slot)


@availability_router.delete("/slot/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_slot(
    slot_id: int,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete an availability slot.
    Staff only. Cannot delete if slot has bookings.
    """
    slot = await AvailabilityService.get_slot_by_id(slot_id, session)
    
    if not slot:
        raise AvailabilitySlotNotFound()
    
    # Check ownership (unless admin)
    if current_user.role != UserRole.ADMIN.value and slot.course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete availability slots for your own courses"
        )
    
    await AvailabilityService.delete_slot(slot, session)


@availability_router.post("/slot/{slot_id}/confirm", response_model=SlotConfirmResponse)
async def confirm_availability_slot(
    slot_id: int,
    status_data: SlotStatusUpdate,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Confirm or cancel an availability slot.
    Staff manual decision - ONLY allowed on the booking deadline day.
    
    - confirm: Session will run, all bookings are confirmed
    - cancelled: Session cancelled, all bookings are cancelled
    
    Business rule: This action can only be performed on the deadline day.
    """
    slot = await AvailabilityService.get_slot_by_id(slot_id, session)
    
    if not slot:
        raise AvailabilitySlotNotFound()
    
    # Check ownership (unless admin)
    if current_user.role != UserRole.ADMIN.value and slot.course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage availability slots for your own courses"
        )
    
    # Check if slot is already finalized
    if slot.status in [AvailabilitySlotStatus.CONFIRMED, AvailabilitySlotStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session has already been confirmed or cancelled and cannot be changed"
        )
    
    # BUSINESS RULE: Only allow confirm/cancel on the deadline day
    if not AvailabilityService.is_deadline_day(slot.booking_deadline):
        # Check if deadline hasn't been reached yet
        if not AvailabilityService.is_deadline_passed(slot.booking_deadline):
            raise DeadlineNotReached()
        # If deadline passed but not today, allow (admin override for late decisions)
    
    if status_data.status == "confirmed":
        updated_slot, affected, enrollment_codes = await AvailabilityService.confirm_slot(
            slot, session, status_data.staff_notes
        )
        message = f"Session confirmed. {affected} booking(s) have been confirmed. {len(enrollment_codes)} enrollment code(s) generated and sent."
    else:  # cancelled
        updated_slot, affected = await AvailabilityService.cancel_slot(
            slot, session, status_data.staff_notes
        )
        message = f"Session cancelled. {affected} booking(s) have been cancelled."
    
    return SlotConfirmResponse(
        message=message,
        slot_id=updated_slot.id,
        status=updated_slot.status.value if hasattr(updated_slot.status, 'value') else updated_slot.status,
        affected_bookings=affected
    )


@availability_router.get("/staff/pending-review", response_model=AvailabilityListResponse)
async def get_pending_review_slots(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all slots that are past their booking deadline and need staff review.
    Staff only.
    """
    slots, total = await AvailabilityService.get_all_slots_for_staff(
        session=session,
        user_id=current_user.id,
        status_filter=[AvailabilitySlotStatus.PENDING_REVIEW, AvailabilitySlotStatus.OPEN],
        page=page,
        per_page=per_page
    )
    
    # Filter to only include those past deadline (for OPEN status)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    filtered_slots = [
        slot for slot in slots
        if slot.status == AvailabilitySlotStatus.PENDING_REVIEW or 
           (slot.status == AvailabilitySlotStatus.OPEN and slot.booking_deadline <= now)
    ]
    
    total_pages = math.ceil(len(filtered_slots) / per_page) if filtered_slots else 1
    
    return AvailabilityListResponse(
        slots=[
            AvailabilityListOut(
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
                course=AvailabilityCourseInfo(
                    id=slot.course.id,
                    title=slot.course.title,
                    price=slot.course.price,
                    duration_hours=slot.course.duration_hours
                ) if slot.course else None
            )
            for slot in filtered_slots
        ],
        total=len(filtered_slots),
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )
