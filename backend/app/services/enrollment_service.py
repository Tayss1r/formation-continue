"""
Service layer for session enrollment management.
"""

import secrets
import string
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    SessionEnrollmentCode,
    SessionEnrollment,
    EmployeeDocument,
    EmployeeProfile,
    CourseAvailability,
    CompanyBooking,
    Company,
    User,
    DocumentStatus,
    BookingStatus,
)
from ..error import (
    InvalidEnrollmentCode,
    EnrollmentCodeExpired,
    EnrollmentCodeMaxUsage,
    AlreadyEnrolled,
    EnrollmentNotFound,
    DocumentNotFound,
)


def generate_enrollment_code(length: int = 8) -> str:
    """Generate a random alphanumeric enrollment code"""
    chars = string.ascii_uppercase + string.digits
    # Remove ambiguous characters (0, O, I, 1, L)
    chars = chars.replace('0', '').replace('O', '').replace('I', '').replace('1', '').replace('L', '')
    return ''.join(secrets.choice(chars) for _ in range(length))


class EnrollmentService:
    """Service for managing session enrollments"""
    
    @staticmethod
    async def generate_codes_for_session(
        slot: CourseAvailability,
        bookings: List[CompanyBooking],
        session: AsyncSession
    ) -> List[SessionEnrollmentCode]:
        """
        Generate enrollment codes for all bookings in a confirmed session.
        Called when staff confirms a session.
        """
        codes = []
        
        for booking in bookings:
            # Check if code already exists for this booking
            existing_query = select(SessionEnrollmentCode).where(
                and_(
                    SessionEnrollmentCode.availability_slot_id == slot.id,
                    SessionEnrollmentCode.company_id == booking.company_id
                )
            )
            existing_result = await session.execute(existing_query)
            if existing_result.scalar_one_or_none():
                continue  # Skip if code already exists
            
            # Generate unique code
            code = generate_enrollment_code()
            while True:
                check_query = select(SessionEnrollmentCode).where(
                    SessionEnrollmentCode.code == code
                )
                result = await session.execute(check_query)
                if not result.scalar_one_or_none():
                    break
                code = generate_enrollment_code()
            
            enrollment_code = SessionEnrollmentCode(
                code=code,
                availability_slot_id=slot.id,
                company_id=booking.company_id,
                booking_id=booking.id,
                max_usage=booking.employee_count,
                used_count=0,
                expires_at=slot.start_date,  # Expires when session starts
            )
            
            session.add(enrollment_code)
            codes.append(enrollment_code)
        
        await session.flush()
        return codes
    
    @staticmethod
    async def validate_code(
        code: str,
        session: AsyncSession
    ) -> Tuple[SessionEnrollmentCode, CourseAvailability, Company]:
        """
        Validate an enrollment code.
        Returns the code, slot, and company if valid.
        Raises appropriate exceptions if invalid.
        """
        query = select(SessionEnrollmentCode).where(
            SessionEnrollmentCode.code == code.upper()
        ).options(
            selectinload(SessionEnrollmentCode.availability_slot).selectinload(CourseAvailability.course),
            selectinload(SessionEnrollmentCode.company)
        )
        
        result = await session.execute(query)
        enrollment_code = result.scalar_one_or_none()
        
        if not enrollment_code:
            raise InvalidEnrollmentCode()
        
        # Check expiration
        now = datetime.now(timezone.utc)
        expires = enrollment_code.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        
        if now >= expires:
            raise EnrollmentCodeExpired()
        
        # Check usage
        if enrollment_code.used_count >= enrollment_code.max_usage:
            raise EnrollmentCodeMaxUsage()
        
        return enrollment_code, enrollment_code.availability_slot, enrollment_code.company
    
    @staticmethod
    async def get_or_create_employee_profile(
        user_id: int,
        session: AsyncSession
    ) -> EmployeeProfile:
        """Get or create an employee profile for a user"""
        query = select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
        result = await session.execute(query)
        profile = result.scalar_one_or_none()
        
        if not profile:
            profile = EmployeeProfile(user_id=user_id)
            session.add(profile)
            await session.flush()
            await session.refresh(profile)
        
        return profile
    
    @staticmethod
    async def enroll_employee(
        employee_id: int,
        code: str,
        session: AsyncSession
    ) -> SessionEnrollment:
        """
        Enroll an employee in a session using an enrollment code.
        """
        # Validate code
        enrollment_code, slot, company = await EnrollmentService.validate_code(code, session)
        
        # Get or create employee profile
        profile = await EnrollmentService.get_or_create_employee_profile(employee_id, session)
        
        # Check if already enrolled
        existing_query = select(SessionEnrollment).where(
            and_(
                SessionEnrollment.employee_id == profile.id,
                SessionEnrollment.availability_slot_id == slot.id
            )
        )
        existing_result = await session.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise AlreadyEnrolled()
        
        # Create enrollment
        enrollment = SessionEnrollment(
            employee_id=profile.id,
            availability_slot_id=slot.id,
            enrollment_code_id=enrollment_code.id,
        )
        
        session.add(enrollment)
        
        # Increment usage count
        enrollment_code.used_count += 1
        
        await session.commit()
        await session.refresh(enrollment)
        
        # Load relationships for response
        refreshed_enrollment = await EnrollmentService.get_enrollment_by_id(enrollment.id, session)
        return refreshed_enrollment
    
    @staticmethod
    async def get_employee_enrollments(
        user_id: int,
        session: AsyncSession
    ) -> List[SessionEnrollment]:
        """Get all enrollments for an employee"""
        profile_query = select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
        profile_result = await session.execute(profile_query)
        profile = profile_result.scalar_one_or_none()
        
        if not profile:
            return []
        
        query = select(SessionEnrollment).where(
            SessionEnrollment.employee_id == profile.id
        ).options(
            selectinload(SessionEnrollment.availability_slot).selectinload(CourseAvailability.course),
            selectinload(SessionEnrollment.enrollment_code).selectinload(SessionEnrollmentCode.company),
            selectinload(SessionEnrollment.document)
        ).order_by(SessionEnrollment.enrolled_at.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_enrollment_by_id(
        enrollment_id: int,
        session: AsyncSession
    ) -> Optional[SessionEnrollment]:
        """Get enrollment by ID with all related data"""
        query = select(SessionEnrollment).where(
            SessionEnrollment.id == enrollment_id
        ).options(
            selectinload(SessionEnrollment.availability_slot).selectinload(CourseAvailability.course),
            selectinload(SessionEnrollment.enrollment_code).selectinload(SessionEnrollmentCode.company),
            selectinload(SessionEnrollment.document),
            selectinload(SessionEnrollment.employee).selectinload(EmployeeProfile.user)
        )
        
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def upload_document(
        enrollment_id: int,
        employee_id: int,
        document_type: str,
        file,  # UploadFile
        session: AsyncSession
    ) -> EmployeeDocument:
        """Upload identity document for an enrollment"""
        import os
        import uuid
        from app.core.config import settings
        
        # Get enrollment and verify ownership
        enrollment = await EnrollmentService.get_enrollment_by_id(enrollment_id, session)
        
        if not enrollment:
            raise EnrollmentNotFound()
        
        if enrollment.employee.user_id != employee_id:
            raise EnrollmentNotFound()  # Don't reveal existence
        
        # Create upload directory
        upload_dir = os.path.join(settings.UPLOAD_DIR, "documents")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        unique_filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Store relative path
        relative_path = f"documents/{unique_filename}"
        
        # Check if document already exists
        if enrollment.document:
            # Delete old file if exists
            old_path = os.path.join(settings.UPLOAD_DIR, enrollment.document.file_path)
            if os.path.exists(old_path):
                os.remove(old_path)
            
            # Update existing document
            enrollment.document.document_type = document_type
            enrollment.document.file_path = relative_path
            enrollment.document.original_filename = file.filename or "document"
            enrollment.document.status = DocumentStatus.PENDING_REVIEW
            enrollment.document.reviewed_by_id = None
            enrollment.document.reviewed_at = None
            enrollment.document.rejection_reason = None
            
            await session.commit()
            await session.refresh(enrollment.document)
            return enrollment.document
        
        # Create new document
        document = EmployeeDocument(
            enrollment_id=enrollment_id,
            document_type=document_type,
            file_path=relative_path,
            original_filename=file.filename or "document",
            status=DocumentStatus.PENDING_REVIEW,
        )
        
        session.add(document)
        await session.commit()
        await session.refresh(document)
        
        return document
    
    @staticmethod
    async def get_enrollment_documents(
        enrollment_id: int,
        user_id: int,
        session: AsyncSession
    ) -> List[EmployeeDocument]:
        """Get documents for an enrollment"""
        enrollment = await EnrollmentService.get_enrollment_by_id(enrollment_id, session)
        
        if not enrollment:
            raise EnrollmentNotFound()
        
        if enrollment.employee.user_id != user_id:
            raise EnrollmentNotFound()
        
        if enrollment.document:
            return [enrollment.document]
        return []
    
    @staticmethod
    async def get_session_enrollees(
        slot_id: int,
        session: AsyncSession
    ) -> List[SessionEnrollment]:
        """Get all enrollees for a session (staff view)"""
        query = select(SessionEnrollment).where(
            SessionEnrollment.availability_slot_id == slot_id
        ).options(
            selectinload(SessionEnrollment.employee).selectinload(EmployeeProfile.user),
            selectinload(SessionEnrollment.enrollment_code).selectinload(SessionEnrollmentCode.company),
            selectinload(SessionEnrollment.document)
        ).order_by(SessionEnrollment.enrolled_at.asc())
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def review_document(
        document_id: int,
        status: str,
        reviewer_id: int,
        reviewer_notes: Optional[str],
        session: AsyncSession
    ) -> EmployeeDocument:
        """Review an employee document (staff action)"""
        query = select(EmployeeDocument).where(
            EmployeeDocument.id == document_id
        ).options(selectinload(EmployeeDocument.enrollment))
        
        result = await session.execute(query)
        document = result.scalar_one_or_none()
        
        if not document:
            raise DocumentNotFound()
        
        document.status = DocumentStatus(status)
        document.reviewed_by_id = reviewer_id
        document.reviewed_at = datetime.now(timezone.utc)
        
        if status == DocumentStatus.REJECTED.value and reviewer_notes:
            document.rejection_reason = reviewer_notes
        else:
            document.rejection_reason = None
        
        await session.commit()
        await session.refresh(document)
        
        return document
    
    @staticmethod
    async def get_session_codes(
        slot_id: int,
        session: AsyncSession
    ) -> List[dict]:
        """Get all enrollment codes for a session (staff view)"""
        query = select(SessionEnrollmentCode).where(
            SessionEnrollmentCode.availability_slot_id == slot_id
        ).options(
            selectinload(SessionEnrollmentCode.company),
            selectinload(SessionEnrollmentCode.booking)
        )
        
        result = await session.execute(query)
        codes = result.scalars().all()
        
        return [
            {
                "id": code.id,
                "code": code.code,
                "company_name": code.company.name if code.company else "N/A",
                "max_usage": code.max_usage,
                "used_count": code.used_count,
                "remaining": code.max_usage - code.used_count,
                "expires_at": code.expires_at.isoformat() if code.expires_at else None,
                "created_at": code.created_at.isoformat() if code.created_at else None,
            }
            for code in codes
        ]
    
    @staticmethod
    async def get_code_info(
        code: str,
        session: AsyncSession
    ) -> dict:
        """Get information about an enrollment code without enrolling"""
        try:
            enrollment_code, slot, company = await EnrollmentService.validate_code(code, session)
            
            return {
                "valid": True,
                "message": "Code valide",
                "session_info": {
                    "course_title": slot.course.title if slot.course else "Formation",
                    "start_date": slot.start_date.isoformat(),
                    "end_date": slot.end_date.isoformat(),
                    "schedule": slot.schedule,
                },
                "company_name": company.name,
                "remaining_spots": enrollment_code.max_usage - enrollment_code.used_count,
            }
        except InvalidEnrollmentCode:
            return {
                "valid": False,
                "message": "Code d'inscription invalide",
            }
        except EnrollmentCodeExpired:
            return {
                "valid": False,
                "message": "Ce code a expiré",
            }
        except EnrollmentCodeMaxUsage:
            return {
                "valid": False,
                "message": "Ce code a atteint son nombre maximum d'utilisations",
            }
