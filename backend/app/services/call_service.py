"""
Service layer for Call for Applicants management.
"""

import secrets
import string
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    CallForApplicants,
    CompanyApplication,
    User,
    Department,
    CallStatus,
    ApplicationStatus,
)
from ..schemas.call_schema import CallCreate, CallUpdate
from ..error import (
    CallNotFound,
    InvalidCallStatus,
    CallAlreadyPublished,
    CallHasApplications,
    InvalidDepartment,
)


def generate_reference_number() -> str:
    """Generate a unique reference number for a call"""
    year = datetime.now().year
    random_part = ''.join(secrets.choice(string.digits) for _ in range(4))
    return f"CALL-{year}-{random_part}"


class CallService:
    """Service for managing Calls for Applicants"""
    
    @staticmethod
    async def get_call_by_id(
        call_id: int,
        session: AsyncSession,
        include_creator: bool = True,
        include_applications: bool = False
    ) -> Optional[CallForApplicants]:
        """Get call by ID with optional relations"""
        query = select(CallForApplicants).where(CallForApplicants.id == call_id)
        
        if include_creator:
            query = query.options(selectinload(CallForApplicants.created_by))
        if include_applications:
            query = query.options(
                selectinload(CallForApplicants.applications)
                .selectinload(CompanyApplication.company)
            )
        
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_call_by_reference(
        reference_number: str,
        session: AsyncSession
    ) -> Optional[CallForApplicants]:
        """Get call by reference number"""
        query = select(CallForApplicants).where(
            CallForApplicants.reference_number == reference_number
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_call(
        call_data: CallCreate,
        coordinator_id: int,
        session: AsyncSession
    ) -> CallForApplicants:
        """Create a new call (in DRAFT status)"""
        # Validate department
        try:
            Department(call_data.department)
        except ValueError:
            raise InvalidDepartment()
        
        # Use provided reference number or generate one
        if call_data.reference_number:
            reference = call_data.reference_number
            # Check if reference already exists
            existing = await CallService.get_call_by_reference(reference, session)
            if existing:
                raise ValueError(f"Le numéro de référence '{reference}' existe déjà")
        else:
            # Generate unique reference number
            reference = generate_reference_number()
            while await CallService.get_call_by_reference(reference, session):
                reference = generate_reference_number()
        
        call = CallForApplicants(
            title=call_data.title,
            reference_number=reference,
            department=Department(call_data.department),
            description=call_data.description,
            eligibility_criteria=call_data.eligibility_criteria,
            required_documents=[doc.model_dump() for doc in call_data.required_documents],
            employee_required_documents=[doc.model_dump() for doc in call_data.employee_required_documents],
            application_start_date=call_data.application_start_date,
            application_deadline=call_data.application_deadline,
            results_publication_date=call_data.results_publication_date,
            status=CallStatus.DRAFT,
            created_by_id=coordinator_id,
        )
        
        session.add(call)
        await session.commit()
        await session.refresh(call)
        
        # Reload with creator
        return await CallService.get_call_by_id(call.id, session)
    
    @staticmethod
    async def update_call(
        call: CallForApplicants,
        update_data: CallUpdate,
        session: AsyncSession
    ) -> CallForApplicants:
        """Update a call (only in DRAFT status)"""
        if call.status != CallStatus.DRAFT:
            raise InvalidCallStatus("Can only update calls in DRAFT status")
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        if 'required_documents' in update_dict and update_dict['required_documents']:
            update_dict['required_documents'] = [
                doc.model_dump() if hasattr(doc, 'model_dump') else doc 
                for doc in update_dict['required_documents']
            ]
        
        if 'employee_required_documents' in update_dict and update_dict['employee_required_documents']:
            update_dict['employee_required_documents'] = [
                doc.model_dump() if hasattr(doc, 'model_dump') else doc 
                for doc in update_dict['employee_required_documents']
            ]
        
        for key, value in update_dict.items():
            setattr(call, key, value)
        
        await session.commit()
        await session.refresh(call)
        
        return await CallService.get_call_by_id(call.id, session)
    
    @staticmethod
    async def publish_call(
        call: CallForApplicants,
        session: AsyncSession
    ) -> CallForApplicants:
        """Publish a call (DRAFT -> PUBLISHED)"""
        if call.status != CallStatus.DRAFT:
            raise InvalidCallStatus("Can only publish calls in DRAFT status")
        
        now = datetime.now(timezone.utc)
        
        call.status = CallStatus.PUBLISHED
        call.published_at = now
        
        await session.commit()
        await session.refresh(call)
        
        return await CallService.get_call_by_id(call.id, session)
    
    @staticmethod
    async def close_call(
        call: CallForApplicants,
        session: AsyncSession
    ) -> CallForApplicants:
        """Close a call for applications (PUBLISHED -> CLOSED)"""
        if call.status != CallStatus.PUBLISHED:
            raise InvalidCallStatus("Can only close calls in PUBLISHED status")
        
        call.status = CallStatus.CLOSED
        
        await session.commit()
        await session.refresh(call)
        
        return await CallService.get_call_by_id(call.id, session)
    
    @staticmethod
    async def start_review(
        call: CallForApplicants,
        session: AsyncSession
    ) -> CallForApplicants:
        """Start reviewing applications (CLOSED -> UNDER_REVIEW)"""
        if call.status != CallStatus.CLOSED:
            raise InvalidCallStatus("Can only start review for calls in CLOSED status")
        
        call.status = CallStatus.UNDER_REVIEW
        
        await session.commit()
        await session.refresh(call)
        
        return await CallService.get_call_by_id(call.id, session)
    
    @staticmethod
    async def publish_results(
        call: CallForApplicants,
        results_date: Optional[datetime],
        session: AsyncSession
    ) -> CallForApplicants:
        """Publish results (UNDER_REVIEW -> RESULTS_PUBLISHED)"""
        if call.status != CallStatus.UNDER_REVIEW:
            raise InvalidCallStatus("Can only publish results for calls in UNDER_REVIEW status")
        
        now = datetime.now(timezone.utc)
        
        call.status = CallStatus.RESULTS_PUBLISHED
        call.results_publication_date = results_date or now
        
        await session.commit()
        await session.refresh(call)
        
        return await CallService.get_call_by_id(call.id, session, include_applications=True)
    
    @staticmethod
    async def reopen_call(
        call: CallForApplicants,
        session: AsyncSession
    ) -> CallForApplicants:
        """Reopen a call (CLOSED/RESULTS_PUBLISHED -> PUBLISHED)"""
        if call.status not in [CallStatus.CLOSED, CallStatus.RESULTS_PUBLISHED]:
            raise InvalidCallStatus("Can only reopen calls in CLOSED or RESULTS_PUBLISHED status")
        
        call.status = CallStatus.PUBLISHED
        
        await session.commit()
        await session.refresh(call)
        
        return await CallService.get_call_by_id(call.id, session)
    
    @staticmethod
    async def delete_call(
        call: CallForApplicants,
        session: AsyncSession
    ) -> None:
        """Delete a call (only in DRAFT status with no applications)"""
        if call.status != CallStatus.DRAFT:
            raise InvalidCallStatus("Can only delete calls in DRAFT status")
        
        # Check for applications
        app_count = await session.scalar(
            select(func.count()).select_from(CompanyApplication)
            .where(CompanyApplication.call_id == call.id)
        )
        
        if app_count > 0:
            raise CallHasApplications()
        
        await session.delete(call)
        await session.commit()
    
    @staticmethod
    async def get_public_calls(
        session: AsyncSession,
        department: Optional[str] = None,
        active_only: bool = False
    ) -> List[CallForApplicants]:
        """Get published calls (for landing page)"""
        query = select(CallForApplicants).where(
            CallForApplicants.status.in_([
                CallStatus.PUBLISHED,
                CallStatus.CLOSED,
                CallStatus.UNDER_REVIEW,
                CallStatus.RESULTS_PUBLISHED,
            ])
        )
        
        if department:
            query = query.where(CallForApplicants.department == Department(department))
        
        if active_only:
            now = datetime.now(timezone.utc)
            # Show calls that are either:
            # 1. Currently open (started and not expired)
            # 2. Upcoming (published but not started yet)
            query = query.where(
                and_(
                    CallForApplicants.status == CallStatus.PUBLISHED,
                    CallForApplicants.application_deadline > now,
                )
            )
        
        query = query.order_by(CallForApplicants.published_at.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_calls_with_results(
        session: AsyncSession,
        department: Optional[str] = None
    ) -> List[CallForApplicants]:
        """Get calls with published results"""
        query = select(CallForApplicants).where(
            CallForApplicants.status == CallStatus.RESULTS_PUBLISHED
        ).options(
            selectinload(CallForApplicants.applications)
            .selectinload(CompanyApplication.company)
        )
        
        if department:
            query = query.where(CallForApplicants.department == Department(department))
        
        query = query.order_by(CallForApplicants.results_publication_date.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_coordinator_calls(
        coordinator_id: int,
        session: AsyncSession,
        status_filter: Optional[List[CallStatus]] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[CallForApplicants], int]:
        """Get calls created by a coordinator"""
        query = select(CallForApplicants).where(
            CallForApplicants.created_by_id == coordinator_id
        )
        
        if status_filter:
            query = query.where(CallForApplicants.status.in_(status_filter))
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(CallForApplicants.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await session.execute(query)
        calls = list(result.scalars().all())
        
        return calls, total
    
    @staticmethod
    async def get_application_count(
        call_id: int,
        session: AsyncSession,
        status_filter: Optional[List[ApplicationStatus]] = None
    ) -> int:
        """Get application count for a call"""
        query = select(func.count()).select_from(CompanyApplication).where(
            CompanyApplication.call_id == call_id
        )
        
        if status_filter:
            query = query.where(CompanyApplication.status.in_(status_filter))
        
        result = await session.execute(query)
        return result.scalar() or 0
    
    @staticmethod
    async def check_call_deadline_passed(call: CallForApplicants) -> bool:
        """Check if application deadline has passed"""
        now = datetime.now(timezone.utc)
        deadline = call.application_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        return now > deadline
    
    @staticmethod
    async def check_call_open_for_applications(call: CallForApplicants) -> bool:
        """Check if call is open for applications"""
        if call.status != CallStatus.PUBLISHED:
            return False
        
        now = datetime.now(timezone.utc)
        start = call.application_start_date
        deadline = call.application_deadline
        
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        return start <= now < deadline
