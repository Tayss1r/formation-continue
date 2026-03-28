"""
Service layer for Company Application management.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    CompanyApplication,
    ApplicationDocument,
    CallForApplicants,
    Company,
    User,
    CallStatus,
    ApplicationStatus,
    DocumentReviewStatus,
)
from ..schemas.application_schema import (
    ApplicationCreate,
    ApplicationUpdate,
    ApplicationReview,
)
from ..error import (
    ApplicationNotFound,
    CallNotFound,
    InvalidApplicationStatus,
    DuplicateApplication,
    CallNotOpenForApplications,
    DocumentNotFound,
    InvalidDocument,
)
from ..core.config import settings


class ApplicationService:
    """Service for managing Company Applications"""
    
    @staticmethod
    async def get_application_by_id(
        application_id: int,
        session: AsyncSession,
        include_relations: bool = True,
        include_documents: bool = False,
        include_call: bool = False,
        include_company: bool = False,
        include_coordinator: bool = False,
    ) -> Optional[CompanyApplication]:
        """Get application by ID with optional relations"""
        query = select(CompanyApplication).where(CompanyApplication.id == application_id)

        load_all = include_relations

        options = []
        if load_all or include_call:
            options.append(selectinload(CompanyApplication.call))
        if load_all or include_company:
            options.append(selectinload(CompanyApplication.company).selectinload(Company.user))
        if load_all or include_coordinator:
            options.append(selectinload(CompanyApplication.coordinator))
        if load_all or include_documents:
            options.append(selectinload(CompanyApplication.documents))

        if options:
            query = query.options(*options)
        
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def check_duplicate_application(
        call_id: int,
        company_id: int,
        session: AsyncSession
    ) -> bool:
        """Check if company has already applied to this call"""
        query = select(CompanyApplication).where(
            and_(
                CompanyApplication.call_id == call_id,
                CompanyApplication.company_id == company_id,
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def create_application(
        company_id: int,
        application_data: ApplicationCreate,
        session: AsyncSession
    ) -> CompanyApplication:
        """Create a new application"""
        # Get the call
        call_query = select(CallForApplicants).where(
            CallForApplicants.id == application_data.call_id
        )
        call_result = await session.execute(call_query)
        call = call_result.scalar_one_or_none()
        
        if not call:
            raise CallNotFound()
        
        # Check if call is open for applications
        if call.status != CallStatus.PUBLISHED:
            raise CallNotOpenForApplications()
        
        now = datetime.now(timezone.utc)
        start = call.application_start_date
        deadline = call.application_deadline
        
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        
        if now < start or now >= deadline:
            raise CallNotOpenForApplications()
        
        # Check for duplicate
        if await ApplicationService.check_duplicate_application(
            application_data.call_id, company_id, session
        ):
            raise DuplicateApplication()
        
        # Create application
        application = CompanyApplication(
            call_id=application_data.call_id,
            company_id=company_id,
            status=ApplicationStatus.SUBMITTED,
            motivation_letter=application_data.motivation_letter,
            proposed_employee_count=application_data.proposed_employee_count,
        )
        
        session.add(application)
        await session.commit()
        
        return await ApplicationService.get_application_by_id(application.id, session)
    
    @staticmethod
    async def update_application(
        application: CompanyApplication,
        update_data: ApplicationUpdate,
        session: AsyncSession
    ) -> CompanyApplication:
        """Update an application (allowed until final decision)"""
        if application.status in [
            ApplicationStatus.APPROVED,
            ApplicationStatus.REJECTED,
        ]:
            raise InvalidApplicationStatus(
                "Cannot update applications that are approved or rejected"
            )
        
        update_dict = update_data.model_dump(exclude_unset=True)
        
        for key, value in update_dict.items():
            setattr(application, key, value)
        
        await session.commit()
        
        return await ApplicationService.get_application_by_id(application.id, session)
    
    @staticmethod
    async def upload_document(
        application: CompanyApplication,
        document_type: str,
        document_label: str,
        file_path: str,
        original_filename: str,
        file_size: int,
        mime_type: str,
        session: AsyncSession
    ) -> ApplicationDocument:
        """Upload a document for an application"""
        editable_statuses = [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.DOCUMENTS_PENDING,
            ApplicationStatus.ADDITIONAL_INFO_REQUIRED,
        ]
        
        if application.status not in editable_statuses:
            raise InvalidApplicationStatus(
                "Cannot upload documents for applications in this status"
            )
        
        # Check if document of this type already exists
        existing_query = select(ApplicationDocument).where(
            and_(
                ApplicationDocument.application_id == application.id,
                ApplicationDocument.document_type == document_type,
            )
        )
        existing_result = await session.execute(existing_query)
        existing_doc = existing_result.scalar_one_or_none()
        
        if existing_doc:
            # Update existing document
            existing_doc.file_path = file_path
            existing_doc.original_filename = original_filename
            existing_doc.file_size = file_size
            existing_doc.mime_type = mime_type
            existing_doc.review_status = DocumentReviewStatus.PENDING
            existing_doc.reviewed_by_id = None
            existing_doc.reviewed_at = None
            existing_doc.review_notes = None
            existing_doc.uploaded_at = datetime.now(timezone.utc)
            
            document = existing_doc
        else:
            # Create new document
            document = ApplicationDocument(
                application_id=application.id,
                document_type=document_type,
                document_label=document_label,
                file_path=file_path,
                original_filename=original_filename,
                file_size=file_size,
                mime_type=mime_type,
                review_status=DocumentReviewStatus.PENDING,
            )
            session.add(document)
        
        await session.commit()
        await session.refresh(document)
        
        return document
    
    @staticmethod
    async def delete_document(
        document_id: int,
        application: CompanyApplication,
        session: AsyncSession
    ) -> None:
        """Delete a document from an application"""
        editable_statuses = [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.DOCUMENTS_PENDING,
            ApplicationStatus.ADDITIONAL_INFO_REQUIRED,
        ]
        
        if application.status not in editable_statuses:
            raise InvalidApplicationStatus(
                "Cannot delete documents for applications in this status"
            )
        
        doc_query = select(ApplicationDocument).where(
            and_(
                ApplicationDocument.id == document_id,
                ApplicationDocument.application_id == application.id,
            )
        )
        doc_result = await session.execute(doc_query)
        document = doc_result.scalar_one_or_none()
        
        if not document:
            raise DocumentNotFound()
        
        # Delete file from filesystem
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        await session.delete(document)
        await session.commit()
    
    @staticmethod
    async def start_review(
        application: CompanyApplication,
        coordinator_id: int,
        session: AsyncSession
    ) -> CompanyApplication:
        """Mark application as under review"""
        if application.status not in [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.DOCUMENTS_PENDING,
            ApplicationStatus.ADDITIONAL_INFO_REQUIRED,
        ]:
            raise InvalidApplicationStatus(
                "Can only start review for SUBMITTED, DOCUMENTS_PENDING, or ADDITIONAL_INFO_REQUIRED applications"
            )
        
        application.status = ApplicationStatus.UNDER_REVIEW
        application.coordinator_id = coordinator_id
        
        await session.commit()
        
        return await ApplicationService.get_application_by_id(application.id, session)
    
    @staticmethod
    async def approve_application(
        application: CompanyApplication,
        coordinator_id: int,
        decision_notes: Optional[str],
        session: AsyncSession
    ) -> CompanyApplication:
        """Approve an application"""
        if application.status not in [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
        ]:
            raise InvalidApplicationStatus(
                "Can only approve applications in SUBMITTED or UNDER_REVIEW status"
            )
        
        now = datetime.now(timezone.utc)
        
        application.status = ApplicationStatus.APPROVED
        application.coordinator_id = coordinator_id
        application.decision_date = now
        application.decision_notes = decision_notes
        
        await session.commit()
        
        return await ApplicationService.get_application_by_id(application.id, session)
    
    @staticmethod
    async def reject_application(
        application: CompanyApplication,
        coordinator_id: int,
        rejection_reason: str,
        decision_notes: Optional[str],
        session: AsyncSession
    ) -> CompanyApplication:
        """Reject an application"""
        if application.status not in [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
        ]:
            raise InvalidApplicationStatus(
                "Can only reject applications in SUBMITTED or UNDER_REVIEW status"
            )
        
        now = datetime.now(timezone.utc)
        
        application.status = ApplicationStatus.REJECTED
        application.coordinator_id = coordinator_id
        application.decision_date = now
        application.decision_notes = decision_notes
        application.rejection_reason = rejection_reason
        
        await session.commit()
        
        return await ApplicationService.get_application_by_id(application.id, session)
    
    @staticmethod
    async def request_additional_info(
        application: CompanyApplication,
        coordinator_id: int,
        decision_notes: str,
        session: AsyncSession
    ) -> CompanyApplication:
        """Request additional information from company"""
        if application.status not in [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
        ]:
            raise InvalidApplicationStatus(
                "Can only request info for SUBMITTED or UNDER_REVIEW applications"
            )
        
        application.status = ApplicationStatus.ADDITIONAL_INFO_REQUIRED
        application.coordinator_id = coordinator_id
        application.decision_notes = decision_notes
        
        await session.commit()
        
        return await ApplicationService.get_application_by_id(application.id, session)
    
    @staticmethod
    async def mark_documents_pending(
        application: CompanyApplication,
        coordinator_id: int,
        session: AsyncSession
    ) -> CompanyApplication:
        """Mark application as documents pending"""
        application.status = ApplicationStatus.DOCUMENTS_PENDING
        application.coordinator_id = coordinator_id
        
        await session.commit()
        
        return await ApplicationService.get_application_by_id(application.id, session)
    
    @staticmethod
    async def review_document(
        document_id: int,
        reviewer_id: int,
        review_status: DocumentReviewStatus,
        review_notes: Optional[str],
        session: AsyncSession
    ) -> ApplicationDocument:
        """Review a document"""
        doc_query = select(ApplicationDocument).where(
            ApplicationDocument.id == document_id
        )
        doc_result = await session.execute(doc_query)
        document = doc_result.scalar_one_or_none()
        
        if not document:
            raise DocumentNotFound()
        
        now = datetime.now(timezone.utc)
        
        document.review_status = review_status
        document.reviewed_by_id = reviewer_id
        document.reviewed_at = now
        document.review_notes = review_notes
        
        await session.commit()
        await session.refresh(document)
        
        return document
    
    @staticmethod
    async def get_company_applications(
        company_id: int,
        session: AsyncSession
    ) -> List[CompanyApplication]:
        """Get all applications for a company"""
        query = select(CompanyApplication).where(
            CompanyApplication.company_id == company_id
        ).options(
            selectinload(CompanyApplication.call),
            selectinload(CompanyApplication.documents),
        ).order_by(CompanyApplication.submitted_at.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def delete_company_application(
        application: CompanyApplication,
        session: AsyncSession
    ) -> None:
        """Delete a company application if it has not been approved yet"""
        if application.status == ApplicationStatus.APPROVED:
            raise InvalidApplicationStatus(
                "Cannot delete an approved application"
            )

        await session.delete(application)
        await session.commit()
    
    @staticmethod
    async def get_call_applications(
        call_id: int,
        session: AsyncSession,
        status_filter: Optional[List[ApplicationStatus]] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[CompanyApplication], int]:
        """Get all applications for a call"""
        query = select(CompanyApplication).where(
            CompanyApplication.call_id == call_id
        ).options(
            selectinload(CompanyApplication.company).selectinload(Company.user),
            selectinload(CompanyApplication.documents),
        )
        
        if status_filter:
            query = query.where(CompanyApplication.status.in_(status_filter))
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(CompanyApplication.submitted_at.asc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await session.execute(query)
        applications = list(result.scalars().all())
        
        return applications, total
    
    @staticmethod
    async def get_approved_applications_for_call(
        call_id: int,
        session: AsyncSession
    ) -> List[CompanyApplication]:
        """Get approved applications for a call (for results)"""
        query = select(CompanyApplication).where(
            and_(
                CompanyApplication.call_id == call_id,
                CompanyApplication.status == ApplicationStatus.APPROVED,
            )
        ).options(
            selectinload(CompanyApplication.company).selectinload(Company.user),
        ).order_by(CompanyApplication.decision_date.asc())
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def check_documents_complete(
        application: CompanyApplication,
        session: AsyncSession
    ) -> bool:
        """Check if all required documents are uploaded"""
        # Get the call to check required documents
        call_query = select(CallForApplicants).where(
            CallForApplicants.id == application.call_id
        )
        call_result = await session.execute(call_query)
        call = call_result.scalar_one_or_none()
        
        if not call:
            return False
        
        required_types = {
            doc['type'] for doc in call.required_documents 
            if doc.get('required', True)
        }
        
        # Get uploaded documents
        docs_query = select(ApplicationDocument).where(
            ApplicationDocument.application_id == application.id
        )
        docs_result = await session.execute(docs_query)
        documents = docs_result.scalars().all()
        
        uploaded_types = {doc.document_type for doc in documents}
        
        return required_types.issubset(uploaded_types)
    
    @staticmethod
    def get_upload_path(application_id: int, document_type: str, filename: str) -> str:
        """Generate upload path for application document"""
        ext = os.path.splitext(filename)[1]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        new_filename = f"{document_type}_{timestamp}_{unique_id}{ext}"
        
        # Create directory if needed
        dir_path = os.path.join("uploads", "applications", str(application_id))
        os.makedirs(dir_path, exist_ok=True)
        
        return os.path.join(dir_path, new_filename)
