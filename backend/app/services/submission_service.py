"""
Service layer for Employee Submission management.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    EmployeeSubmission,
    EmployeeSubmissionDocument,
    CompanyApplication,
    CallForApplicants,
    EmployeeProfile,
    Company,
    User,
    ApplicationStatus,
    EmployeeSubmissionStatus,
    DocumentReviewStatus,
)
from ..schemas.submission_schema import SubmissionCreate
from ..error import (
    SubmissionNotFound,
    ApplicationNotFound,
    InvalidSubmissionStatus,
    DuplicateSubmission,
    ApplicationNotApproved,
    DocumentNotFound,
    EmployeeNotInCompany,
)


class SubmissionService:
    """Service for managing Employee Submissions"""
    
    @staticmethod
    async def get_submission_by_id(
        submission_id: int,
        session: AsyncSession,
        include_relations: bool = True
    ) -> Optional[EmployeeSubmission]:
        """Get submission by ID with optional relations"""
        query = select(EmployeeSubmission).where(EmployeeSubmission.id == submission_id)
        
        if include_relations:
            query = query.options(
                selectinload(EmployeeSubmission.company_application)
                .selectinload(CompanyApplication.call),
                selectinload(EmployeeSubmission.company_application)
                .selectinload(CompanyApplication.company),
                selectinload(EmployeeSubmission.employee)
                .selectinload(EmployeeProfile.user),
                selectinload(EmployeeSubmission.documents),
            )
        
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
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
    async def check_duplicate_submission(
        application_id: int,
        employee_id: int,
        session: AsyncSession
    ) -> bool:
        """Check if employee has already submitted for this application"""
        query = select(EmployeeSubmission).where(
            and_(
                EmployeeSubmission.company_application_id == application_id,
                EmployeeSubmission.employee_id == employee_id,
            )
        )
        result = await session.execute(query)
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def create_submission(
        user_id: int,
        submission_data: SubmissionCreate,
        session: AsyncSession
    ) -> EmployeeSubmission:
        """Create a new submission"""
        # Get the application
        app_query = select(CompanyApplication).where(
            CompanyApplication.id == submission_data.company_application_id
        ).options(
            selectinload(CompanyApplication.company),
        )
        app_result = await session.execute(app_query)
        application = app_result.scalar_one_or_none()
        
        if not application:
            raise ApplicationNotFound()
        
        # Check if application is approved
        if application.status != ApplicationStatus.APPROVED:
            raise ApplicationNotApproved()
        
        # Get or create employee profile
        employee = await SubmissionService.get_or_create_employee_profile(user_id, session)
        
        # Check if employee belongs to the company
        if employee.company_id and employee.company_id != application.company_id:
            raise EmployeeNotInCompany()
        
        # Link employee to company if not already
        if not employee.company_id:
            employee.company_id = application.company_id
        
        # Check for duplicate
        if await SubmissionService.check_duplicate_submission(
            application.id, employee.id, session
        ):
            raise DuplicateSubmission()
        
        # Create submission
        submission = EmployeeSubmission(
            company_application_id=application.id,
            employee_id=employee.id,
            status=EmployeeSubmissionStatus.PENDING,
        )
        
        session.add(submission)
        await session.commit()
        
        return await SubmissionService.get_submission_by_id(submission.id, session)
    
    @staticmethod
    async def upload_document(
        submission: EmployeeSubmission,
        document_type: str,
        document_label: str,
        file_path: str,
        original_filename: str,
        file_size: int,
        mime_type: str,
        session: AsyncSession
    ) -> EmployeeSubmissionDocument:
        """Upload a document for a submission"""
        editable_statuses = [
            EmployeeSubmissionStatus.PENDING,
            EmployeeSubmissionStatus.SUBMITTED,  # Allow resubmission
        ]
        
        if submission.status not in editable_statuses:
            raise InvalidSubmissionStatus(
                "Cannot upload documents for submissions in this status"
            )
        
        # Check if document of this type already exists
        existing_query = select(EmployeeSubmissionDocument).where(
            and_(
                EmployeeSubmissionDocument.submission_id == submission.id,
                EmployeeSubmissionDocument.document_type == document_type,
            )
        )
        existing_result = await session.execute(existing_query)
        existing_doc = existing_result.scalar_one_or_none()
        
        if existing_doc:
            # Delete old file
            if os.path.exists(existing_doc.file_path):
                os.remove(existing_doc.file_path)
            
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
            document = EmployeeSubmissionDocument(
                submission_id=submission.id,
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
        submission: EmployeeSubmission,
        session: AsyncSession
    ) -> None:
        """Delete a document from a submission"""
        editable_statuses = [
            EmployeeSubmissionStatus.PENDING,
        ]
        
        if submission.status not in editable_statuses:
            raise InvalidSubmissionStatus(
                "Cannot delete documents for submissions in this status"
            )
        
        doc_query = select(EmployeeSubmissionDocument).where(
            and_(
                EmployeeSubmissionDocument.id == document_id,
                EmployeeSubmissionDocument.submission_id == submission.id,
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
    async def submit_for_review(
        submission: EmployeeSubmission,
        session: AsyncSession
    ) -> EmployeeSubmission:
        """Submit for coordinator review"""
        if submission.status != EmployeeSubmissionStatus.PENDING:
            raise InvalidSubmissionStatus(
                "Can only submit PENDING submissions for review"
            )
        
        # Check if all required documents are uploaded
        documents_complete = await SubmissionService.check_documents_complete(
            submission, session
        )
        
        if not documents_complete:
            raise InvalidSubmissionStatus(
                "All required documents must be uploaded before submitting"
            )
        
        submission.status = EmployeeSubmissionStatus.SUBMITTED
        
        await session.commit()
        
        return await SubmissionService.get_submission_by_id(submission.id, session)
    
    @staticmethod
    async def start_review(
        submission: EmployeeSubmission,
        reviewer_id: int,
        session: AsyncSession
    ) -> EmployeeSubmission:
        """Mark submission as under review"""
        if submission.status != EmployeeSubmissionStatus.SUBMITTED:
            raise InvalidSubmissionStatus(
                "Can only start review for SUBMITTED submissions"
            )
        
        submission.status = EmployeeSubmissionStatus.UNDER_REVIEW
        submission.reviewed_by_id = reviewer_id
        
        await session.commit()
        
        return await SubmissionService.get_submission_by_id(submission.id, session)
    
    @staticmethod
    async def approve_submission(
        submission: EmployeeSubmission,
        reviewer_id: int,
        review_notes: Optional[str],
        session: AsyncSession
    ) -> EmployeeSubmission:
        """Approve a submission"""
        if submission.status != EmployeeSubmissionStatus.UNDER_REVIEW:
            raise InvalidSubmissionStatus(
                "Can only approve submissions in UNDER_REVIEW status"
            )
        
        now = datetime.now(timezone.utc)
        
        submission.status = EmployeeSubmissionStatus.APPROVED
        submission.reviewed_by_id = reviewer_id
        submission.reviewed_at = now
        submission.review_notes = review_notes
        
        await session.commit()
        
        return await SubmissionService.get_submission_by_id(submission.id, session)
    
    @staticmethod
    async def reject_submission(
        submission: EmployeeSubmission,
        reviewer_id: int,
        review_notes: str,
        session: AsyncSession
    ) -> EmployeeSubmission:
        """Reject a submission"""
        if submission.status != EmployeeSubmissionStatus.UNDER_REVIEW:
            raise InvalidSubmissionStatus(
                "Can only reject submissions in UNDER_REVIEW status"
            )
        
        now = datetime.now(timezone.utc)
        
        submission.status = EmployeeSubmissionStatus.REJECTED
        submission.reviewed_by_id = reviewer_id
        submission.reviewed_at = now
        submission.review_notes = review_notes
        
        await session.commit()
        
        return await SubmissionService.get_submission_by_id(submission.id, session)
    
    @staticmethod
    async def review_document(
        document_id: int,
        reviewer_id: int,
        review_status: DocumentReviewStatus,
        review_notes: Optional[str],
        session: AsyncSession
    ) -> EmployeeSubmissionDocument:
        """Review a document"""
        doc_query = select(EmployeeSubmissionDocument).where(
            EmployeeSubmissionDocument.id == document_id
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
    async def get_employee_submissions(
        user_id: int,
        session: AsyncSession
    ) -> List[EmployeeSubmission]:
        """Get all submissions for an employee"""
        # Get employee profile
        profile_query = select(EmployeeProfile).where(
            EmployeeProfile.user_id == user_id
        )
        profile_result = await session.execute(profile_query)
        profile = profile_result.scalar_one_or_none()
        
        if not profile:
            return []
        
        query = select(EmployeeSubmission).where(
            EmployeeSubmission.employee_id == profile.id
        ).options(
            selectinload(EmployeeSubmission.company_application)
            .selectinload(CompanyApplication.call),
            selectinload(EmployeeSubmission.company_application)
            .selectinload(CompanyApplication.company),
            selectinload(EmployeeSubmission.documents),
        ).order_by(EmployeeSubmission.created_at.desc())
        
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_available_submissions(
        user_id: int,
        session: AsyncSession
    ) -> List[dict]:
        """Get available submission opportunities for an employee"""
        # Get employee profile
        profile_query = select(EmployeeProfile).where(
            EmployeeProfile.user_id == user_id
        )
        profile_result = await session.execute(profile_query)
        profile = profile_result.scalar_one_or_none()
        
        # Get approved applications for companies the employee belongs to
        if profile and profile.company_id:
            company_id = profile.company_id
        else:
            return []
        
        # Get approved applications
        app_query = select(CompanyApplication).where(
            and_(
                CompanyApplication.company_id == company_id,
                CompanyApplication.status == ApplicationStatus.APPROVED,
            )
        ).options(
            selectinload(CompanyApplication.call),
            selectinload(CompanyApplication.company),
        )
        
        app_result = await session.execute(app_query)
        applications = app_result.scalars().all()
        
        # Check existing submissions
        result = []
        for app in applications:
            submission_query = select(EmployeeSubmission).where(
                and_(
                    EmployeeSubmission.company_application_id == app.id,
                    EmployeeSubmission.employee_id == profile.id,
                )
            )
            submission_result = await session.execute(submission_query)
            existing_submission = submission_result.scalar_one_or_none()
            
            result.append({
                'company_application_id': app.id,
                'call_id': app.call.id,
                'call_title': app.call.title,
                'call_reference': app.call.reference_number,
                'department': app.call.department.value if hasattr(app.call.department, 'value') else app.call.department,
                'company_name': app.company.name,
                'required_documents': app.call.employee_required_documents,
                'has_submission': existing_submission is not None,
                'submission_id': existing_submission.id if existing_submission else None,
                'submission_status': (
                    existing_submission.status.value 
                    if existing_submission and hasattr(existing_submission.status, 'value') 
                    else (existing_submission.status if existing_submission else None)
                ),
            })
        
        return result
    
    @staticmethod
    async def get_application_submissions(
        application_id: int,
        session: AsyncSession,
        status_filter: Optional[List[EmployeeSubmissionStatus]] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[EmployeeSubmission], int]:
        """Get all submissions for an application"""
        query = select(EmployeeSubmission).where(
            EmployeeSubmission.company_application_id == application_id
        ).options(
            selectinload(EmployeeSubmission.employee)
            .selectinload(EmployeeProfile.user),
            selectinload(EmployeeSubmission.documents),
        )
        
        if status_filter:
            query = query.where(EmployeeSubmission.status.in_(status_filter))
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination and ordering
        query = query.order_by(EmployeeSubmission.created_at.asc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        result = await session.execute(query)
        submissions = list(result.scalars().all())
        
        return submissions, total
    
    @staticmethod
    async def check_documents_complete(
        submission: EmployeeSubmission,
        session: AsyncSession
    ) -> bool:
        """Check if all required documents are uploaded"""
        # Get the application and call
        app_query = select(CompanyApplication).where(
            CompanyApplication.id == submission.company_application_id
        ).options(
            selectinload(CompanyApplication.call)
        )
        app_result = await session.execute(app_query)
        application = app_result.scalar_one_or_none()
        
        if not application or not application.call:
            return False
        
        required_types = {
            doc['type'] for doc in application.call.employee_required_documents 
            if doc.get('required', True)
        }
        
        # Get uploaded documents
        docs_query = select(EmployeeSubmissionDocument).where(
            EmployeeSubmissionDocument.submission_id == submission.id
        )
        docs_result = await session.execute(docs_query)
        documents = docs_result.scalars().all()
        
        uploaded_types = {doc.document_type for doc in documents}
        
        return required_types.issubset(uploaded_types)
    
    @staticmethod
    def get_upload_path(submission_id: int, document_type: str, filename: str) -> str:
        """Generate upload path for submission document"""
        ext = os.path.splitext(filename)[1]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        new_filename = f"{document_type}_{timestamp}_{unique_id}{ext}"
        
        # Create directory if needed
        dir_path = os.path.join("uploads", "submissions", str(submission_id))
        os.makedirs(dir_path, exist_ok=True)
        
        return os.path.join(dir_path, new_filename)
