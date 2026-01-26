"""
Service layer for company booking management.
"""

from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    CourseAvailability, 
    CompanyBooking, 
    Company,
    AvailabilitySlotStatus,
    BookingStatus
)
from ..schemas.booking_schema import BookingCreate, BookingUpdate, BookingStaffUpdate
from ..error import (
    AvailabilitySlotNotFound,
    BookingDeadlinePassed,
    InsufficientSeats,
    BookingNotFound,
    DuplicateBooking,
    InvalidSlotStatus,
    InvalidBookingStatus
)


class BookingService:
    """Service for managing company bookings"""
    
    @staticmethod
    async def get_booking_by_id(
        booking_id: int,
        session: AsyncSession,
        include_relations: bool = True
    ) -> Optional[CompanyBooking]:
        """Get booking by ID"""
        query = select(CompanyBooking).where(CompanyBooking.id == booking_id)
        
        if include_relations:
            query = query.options(
                selectinload(CompanyBooking.company).selectinload(Company.user),
                selectinload(CompanyBooking.availability_slot).selectinload(CourseAvailability.course)
            )
        
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_company_bookings(
        company_id: int,
        session: AsyncSession,
        status_filter: Optional[List[BookingStatus]] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[CompanyBooking], int]:
        """Get all bookings for a company"""
        query = (
            select(CompanyBooking)
            .where(CompanyBooking.company_id == company_id)
            .options(
                selectinload(CompanyBooking.availability_slot).selectinload(CourseAvailability.course)
            )
        )
        
        if status_filter:
            query = query.where(CompanyBooking.status.in_(status_filter))
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(CompanyBooking.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await session.execute(query)
        bookings = list(result.scalars().all())
        
        return bookings, total
    
    @staticmethod
    async def get_slot_bookings(
        slot_id: int,
        session: AsyncSession,
        status_filter: Optional[List[BookingStatus]] = None
    ) -> List[CompanyBooking]:
        """Get all bookings for a specific availability slot"""
        query = (
            select(CompanyBooking)
            .where(CompanyBooking.availability_slot_id == slot_id)
            .options(selectinload(CompanyBooking.company).selectinload(Company.user))
        )
        
        if status_filter:
            query = query.where(CompanyBooking.status.in_(status_filter))
        
        query = query.order_by(CompanyBooking.created_at.asc())
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def check_duplicate_booking(
        company_id: int,
        slot_id: int,
        session: AsyncSession
    ) -> bool:
        """Check if company has already booked this slot"""
        query = select(CompanyBooking).where(
            and_(
                CompanyBooking.company_id == company_id,
                CompanyBooking.availability_slot_id == slot_id,
                CompanyBooking.status != BookingStatus.CANCELLED  # Exclude cancelled
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def create_booking(
        company_id: int,
        booking_data: BookingCreate,
        session: AsyncSession
    ) -> CompanyBooking:
        """
        Create a new booking for a company.
        
        Validates:
        - Slot exists and is open
        - Booking deadline not passed
        - Sufficient seats available
        - No duplicate booking
        
        Reserves seats atomically.
        """
        # Get slot with lock for atomic seat update
        slot_query = select(CourseAvailability).where(
            CourseAvailability.id == booking_data.availability_slot_id
        ).with_for_update()
        
        slot_result = await session.execute(slot_query)
        slot = slot_result.scalar_one_or_none()
        
        if not slot:
            raise AvailabilitySlotNotFound()
        
        # Validate slot status
        if slot.status != AvailabilitySlotStatus.OPEN:
            raise InvalidSlotStatus()
        
        # Check booking deadline
        now = datetime.now(timezone.utc)
        deadline = slot.booking_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        if now >= deadline:
            raise BookingDeadlinePassed()
        
        # Check for duplicate booking
        has_booking = await BookingService.check_duplicate_booking(
            company_id, booking_data.availability_slot_id, session
        )
        if has_booking:
            raise DuplicateBooking()
        
        # Check seat availability
        remaining_seats = slot.max_seats - slot.reserved_seats
        if booking_data.employee_count > remaining_seats:
            raise InsufficientSeats()
        
        # Create booking
        booking = CompanyBooking(
            company_id=company_id,
            availability_slot_id=booking_data.availability_slot_id,
            employee_count=booking_data.employee_count,
            status=BookingStatus.RESERVED,
            notes=booking_data.notes
        )
        
        # Reserve seats
        slot.reserved_seats += booking_data.employee_count
        
        session.add(booking)
        await session.commit()
        
        # Reload with all relations
        booking = await BookingService.get_booking_by_id(booking.id, session, include_relations=True)
        
        return booking
    
    @staticmethod
    async def update_booking(
        booking: CompanyBooking,
        update_data: BookingUpdate,
        session: AsyncSession
    ) -> CompanyBooking:
        """
        Update booking (company can only update notes before confirmation).
        """
        if booking.status != BookingStatus.RESERVED:
            raise InvalidBookingStatus()
        
        if update_data.notes is not None:
            booking.notes = update_data.notes
        
        await session.commit()
        await session.refresh(booking)
        
        return booking
    
    @staticmethod
    async def staff_update_booking(
        booking: CompanyBooking,
        update_data: BookingStaffUpdate,
        session: AsyncSession
    ) -> CompanyBooking:
        """
        Staff update booking (can modify employee_count and add notes).
        """
        if booking.status == BookingStatus.CANCELLED:
            raise InvalidBookingStatus()
        
        # If changing employee count, need to update slot seats
        if update_data.employee_count is not None and update_data.employee_count != booking.employee_count:
            # Get slot with lock
            slot_query = select(CourseAvailability).where(
                CourseAvailability.id == booking.availability_slot_id
            ).with_for_update()
            
            slot_result = await session.execute(slot_query)
            slot = slot_result.scalar_one_or_none()
            
            if not slot:
                raise AvailabilitySlotNotFound()
            
            # Calculate seat difference
            seat_diff = update_data.employee_count - booking.employee_count
            
            # Check if increase is possible
            if seat_diff > 0:
                remaining = slot.max_seats - slot.reserved_seats
                if seat_diff > remaining:
                    raise InsufficientSeats()
            
            # Update seats
            slot.reserved_seats += seat_diff
            booking.employee_count = update_data.employee_count
        
        if update_data.staff_notes is not None:
            booking.staff_notes = update_data.staff_notes
        
        await session.commit()
        await session.refresh(booking)
        
        return booking
    
    @staticmethod
    async def cancel_booking(
        booking: CompanyBooking,
        session: AsyncSession
    ) -> int:
        """
        Cancel a booking and release seats.
        Returns number of seats released.
        """
        if booking.status == BookingStatus.CANCELLED:
            raise InvalidBookingStatus()
        
        # Cannot cancel confirmed bookings
        if booking.status == BookingStatus.CONFIRMED:
            raise InvalidBookingStatus()
        
        # Get slot with lock
        slot_query = select(CourseAvailability).where(
            CourseAvailability.id == booking.availability_slot_id
        ).with_for_update()
        
        slot_result = await session.execute(slot_query)
        slot = slot_result.scalar_one_or_none()
        
        if not slot:
            raise AvailabilitySlotNotFound()
        
        seats_released = booking.employee_count
        
        # Release seats
        slot.reserved_seats = max(0, slot.reserved_seats - booking.employee_count)
        
        # Cancel booking
        booking.status = BookingStatus.CANCELLED
        
        await session.commit()
        
        return seats_released
    
    @staticmethod
    async def get_booking_summary_for_slot(
        slot_id: int,
        session: AsyncSession
    ) -> dict:
        """Get booking summary for a slot (for staff view)"""
        # Get slot
        slot_query = select(CourseAvailability).where(
            CourseAvailability.id == slot_id
        )
        slot_result = await session.execute(slot_query)
        slot = slot_result.scalar_one_or_none()
        
        if not slot:
            raise AvailabilitySlotNotFound()
        
        # Get all bookings (including cancelled for transparency)
        bookings = await BookingService.get_slot_bookings(
            slot_id, session, 
            status_filter=None  # Get all
        )
        
        now = datetime.now(timezone.utc)
        deadline = slot.booking_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        slot_status = slot.status.value if hasattr(slot.status, 'value') else slot.status
        
        return {
            "slot_id": slot.id,
            "slot_status": slot_status,
            "start_date": slot.start_date,
            "end_date": slot.end_date,
            "booking_deadline": slot.booking_deadline,
            "total_reserved": slot.reserved_seats,
            "max_seats": slot.max_seats,
            "min_seats": slot.min_seats,
            "remaining_seats": slot.max_seats - slot.reserved_seats,
            "booking_count": len([b for b in bookings if b.status != BookingStatus.CANCELLED]),
            "bookings": bookings,
            "is_above_minimum": slot.reserved_seats >= slot.min_seats,
            "deadline_passed": now >= deadline
        }
