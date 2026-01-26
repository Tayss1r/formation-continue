"""
Service layer for course availability management.
"""

from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    CourseAvailability, 
    CompanyBooking, 
    Course,
    AvailabilitySlotStatus,
    BookingStatus
)
from ..schemas.availability_schema import AvailabilityCreate, AvailabilityUpdate
from ..error import (
    AvailabilitySlotNotFound,
    InvalidAvailabilityDates,
    SlotHasBookings,
    InvalidSlotStatus,
    CourseNotFound,
    OverlappingSessionDates
)


class AvailabilityService:
    """Service for managing course availability slots"""
    
    @staticmethod
    async def check_overlapping_dates(
        course_id: int,
        start_date: datetime,
        end_date: datetime,
        session: AsyncSession,
        exclude_slot_id: Optional[int] = None
    ) -> bool:
        """
        Check if the given date range overlaps with any existing session for the same course.
        
        Two date ranges overlap if:
        - New session starts before existing ends AND new session ends after existing starts
        
        Args:
            course_id: The course ID
            start_date: New session start date
            end_date: New session end date
            session: Database session
            exclude_slot_id: Slot ID to exclude (for updates)
            
        Returns:
            True if there's an overlap, False otherwise
        """
        # Only check against non-cancelled slots
        query = select(CourseAvailability).where(
            and_(
                CourseAvailability.course_id == course_id,
                CourseAvailability.status != AvailabilitySlotStatus.CANCELLED,
                # Overlap condition: starts before other ends AND ends after other starts
                CourseAvailability.start_date < end_date,
                CourseAvailability.end_date > start_date
            )
        )
        
        # Exclude the current slot when updating
        if exclude_slot_id:
            query = query.where(CourseAvailability.id != exclude_slot_id)
        
        # Just check if any row exists (limit 1 for efficiency)
        query = query.limit(1)
        result = await session.execute(query)
        overlapping_slot = result.scalar_one_or_none()
        
        return overlapping_slot is not None
    
    @staticmethod
    async def get_slot_by_id(
        slot_id: int, 
        session: AsyncSession,
        include_course: bool = True,
        include_bookings: bool = False
    ) -> Optional[CourseAvailability]:
        """Get availability slot by ID"""
        query = select(CourseAvailability).where(CourseAvailability.id == slot_id)
        
        if include_course:
            query = query.options(selectinload(CourseAvailability.course))
        if include_bookings:
            query = query.options(
                selectinload(CourseAvailability.bookings).selectinload(CompanyBooking.company)
            )
        
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_slots_for_course(
        course_id: int,
        session: AsyncSession,
        status_filter: Optional[List[AvailabilitySlotStatus]] = None,
        page: int = 1,
        per_page: int = 20,
        only_bookable: bool = False
    ) -> Tuple[List[CourseAvailability], int]:
        """
        Get availability slots for a course.
        
        Args:
            course_id: Course ID
            session: Database session
            status_filter: Filter by status(es)
            page: Page number
            per_page: Items per page
            only_bookable: If True, only return slots that are open and deadline not passed
        """
        query = select(CourseAvailability).where(
            CourseAvailability.course_id == course_id
        )
        
        if status_filter:
            query = query.where(CourseAvailability.status.in_(status_filter))
        
        if only_bookable:
            now = datetime.now(timezone.utc)
            query = query.where(
                and_(
                    CourseAvailability.status == AvailabilitySlotStatus.OPEN,
                    CourseAvailability.booking_deadline > now
                )
            )
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(CourseAvailability.start_date.asc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await session.execute(query)
        slots = list(result.scalars().all())
        
        return slots, total
    
    @staticmethod
    async def get_all_slots_for_staff(
        session: AsyncSession,
        user_id: int,
        status_filter: Optional[List[AvailabilitySlotStatus]] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[CourseAvailability], int]:
        """Get all availability slots for courses created by a staff user"""
        query = (
            select(CourseAvailability)
            .join(Course, CourseAvailability.course_id == Course.id)
            .where(Course.created_by_id == user_id)
            .options(selectinload(CourseAvailability.course))
        )
        
        if status_filter:
            query = query.where(CourseAvailability.status.in_(status_filter))
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(CourseAvailability.start_date.asc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await session.execute(query)
        slots = list(result.scalars().all())
        
        return slots, total
    
    @staticmethod
    async def create_slot(
        slot_data: AvailabilityCreate,
        session: AsyncSession
    ) -> CourseAvailability:
        """Create a new availability slot"""
        # Verify course exists
        course_query = select(Course).where(Course.id == slot_data.course_id)
        course_result = await session.execute(course_query)
        course = course_result.scalar_one_or_none()
        
        if not course:
            raise CourseNotFound()
        
        # Check for overlapping sessions
        overlap = await AvailabilityService.check_overlapping_dates(
            course_id=slot_data.course_id,
            start_date=slot_data.start_date,
            end_date=slot_data.end_date,
            session=session
        )
        if overlap:
            raise OverlappingSessionDates()
        
        # Create slot
        slot = CourseAvailability(
            course_id=slot_data.course_id,
            start_date=slot_data.start_date,
            end_date=slot_data.end_date,
            schedule=slot_data.schedule,
            max_seats=slot_data.max_seats,
            min_seats=slot_data.min_seats,
            booking_deadline=slot_data.booking_deadline,
            status=AvailabilitySlotStatus.OPEN,
            reserved_seats=0
        )
        
        session.add(slot)
        await session.commit()
        await session.refresh(slot)
        
        # Load course relationship
        await session.refresh(slot, ['course'])
        
        return slot
    
    @staticmethod
    async def update_slot(
        slot: CourseAvailability,
        update_data: AvailabilityUpdate,
        session: AsyncSession
    ) -> CourseAvailability:
        """
        Update an availability slot.
        Cannot modify if slot has bookings (except staff_notes).
        """
        # Check if slot has bookings
        if slot.reserved_seats > 0:
            raise SlotHasBookings()
        
        # Check if slot is still in a modifiable state
        if slot.status not in [AvailabilitySlotStatus.OPEN]:
            raise InvalidSlotStatus()
        
        # Check for overlapping sessions if dates are being updated
        update_dict = update_data.model_dump(exclude_unset=True)
        new_start = update_dict.get('start_date', slot.start_date)
        new_end = update_dict.get('end_date', slot.end_date)
        
        if 'start_date' in update_dict or 'end_date' in update_dict:
            overlap = await AvailabilityService.check_overlapping_dates(
                course_id=slot.course_id,
                start_date=new_start,
                end_date=new_end,
                session=session,
                exclude_slot_id=slot.id
            )
            if overlap:
                raise OverlappingSessionDates()
        
        # Update fields
        for field, value in update_dict.items():
            if value is not None:
                setattr(slot, field, value)
        
        await session.commit()
        await session.refresh(slot)
        
        return slot
    
    @staticmethod
    async def delete_slot(
        slot: CourseAvailability,
        session: AsyncSession
    ) -> None:
        """
        Delete an availability slot.
        Cannot delete if slot has bookings.
        """
        if slot.reserved_seats > 0:
            raise SlotHasBookings()
        
        await session.delete(slot)
        await session.commit()
    
    @staticmethod
    async def confirm_slot(
        slot: CourseAvailability,
        session: AsyncSession,
        staff_notes: Optional[str] = None
    ) -> Tuple[CourseAvailability, int]:
        """
        Confirm a slot - staff decision to run the session.
        Updates all reservations to confirmed.
        """
        if slot.status != AvailabilitySlotStatus.PENDING_REVIEW:
            # Allow confirming from OPEN status too (early confirmation)
            if slot.status != AvailabilitySlotStatus.OPEN:
                raise InvalidSlotStatus()
        
        # Update slot status
        slot.status = AvailabilitySlotStatus.CONFIRMED
        
        # Update all bookings to confirmed
        booking_query = select(CompanyBooking).where(
            and_(
                CompanyBooking.availability_slot_id == slot.id,
                CompanyBooking.status == BookingStatus.RESERVED
            )
        )
        result = await session.execute(booking_query)
        bookings = list(result.scalars().all())
        
        for booking in bookings:
            booking.status = BookingStatus.CONFIRMED
            if staff_notes:
                booking.staff_notes = staff_notes
        
        await session.commit()
        await session.refresh(slot)
        
        return slot, len(bookings)
    
    @staticmethod
    async def cancel_slot(
        slot: CourseAvailability,
        session: AsyncSession,
        staff_notes: Optional[str] = None
    ) -> Tuple[CourseAvailability, int]:
        """
        Cancel a slot - staff decision to not run the session.
        Cancels all bookings and releases seats.
        """
        if slot.status in [AvailabilitySlotStatus.CONFIRMED, AvailabilitySlotStatus.CANCELLED]:
            raise InvalidSlotStatus()
        
        # Update slot status
        slot.status = AvailabilitySlotStatus.CANCELLED
        slot.reserved_seats = 0  # Release all seats
        
        # Cancel all bookings
        booking_query = select(CompanyBooking).where(
            and_(
                CompanyBooking.availability_slot_id == slot.id,
                CompanyBooking.status == BookingStatus.RESERVED
            )
        )
        result = await session.execute(booking_query)
        bookings = list(result.scalars().all())
        
        for booking in bookings:
            booking.status = BookingStatus.CANCELLED
            if staff_notes:
                booking.staff_notes = staff_notes
        
        await session.commit()
        await session.refresh(slot)
        
        return slot, len(bookings)
    
    @staticmethod
    async def move_to_pending_review(
        slot: CourseAvailability,
        session: AsyncSession
    ) -> CourseAvailability:
        """
        Move slot to pending_review status.
        Called when booking deadline is reached.
        """
        if slot.status != AvailabilitySlotStatus.OPEN:
            raise InvalidSlotStatus()
        
        slot.status = AvailabilitySlotStatus.PENDING_REVIEW
        
        await session.commit()
        await session.refresh(slot)
        
        return slot
    
    @staticmethod
    async def get_slots_past_deadline(session: AsyncSession) -> List[CourseAvailability]:
        """Get all open slots where booking deadline has passed"""
        now = datetime.now(timezone.utc)
        
        query = select(CourseAvailability).where(
            and_(
                CourseAvailability.status == AvailabilitySlotStatus.OPEN,
                CourseAvailability.booking_deadline <= now
            )
        ).options(selectinload(CourseAvailability.course))
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_company_booking_for_slot(
        company_id: int,
        slot_id: int,
        session: AsyncSession
    ) -> Optional[CompanyBooking]:
        """Get a company's booking for a specific slot (if exists)"""
        query = select(CompanyBooking).where(
            and_(
                CompanyBooking.company_id == company_id,
                CompanyBooking.availability_slot_id == slot_id
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    def is_deadline_day(booking_deadline: datetime) -> bool:
        """Check if today is the booking deadline day"""
        now = datetime.now(timezone.utc)
        deadline = booking_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        # Compare dates only (ignore time)
        return now.date() == deadline.date()
    
    @staticmethod
    def is_deadline_passed(booking_deadline: datetime) -> bool:
        """Check if the booking deadline has passed"""
        now = datetime.now(timezone.utc)
        deadline = booking_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        return now >= deadline
