"""
Professor Service - Business logic for professor-related operations.

Handles:
- Professor dashboard data
- Assigned courses management
- Course materials upload/management
- Enrolled employees retrieval (via Call for Applicants workflow)
"""

import os
import uuid
import shutil
from typing import Optional, List
from datetime import datetime
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, distinct
from sqlalchemy.orm import selectinload

from ..db.models import (
    User, Professor, Course, CourseMaterial, 
    EmployeeProfile, Company, CompanyApplication, EmployeeSubmission,
    ApplicationStatus, EmployeeSubmissionStatus,
    Cohort, CohortProfessorAssignment, CohortSession
)
from ..core.config import settings


# Department display names
DEPARTMENT_DISPLAY_NAMES = {
    "informatique": "Technologie de l'informatique",
    "mecanique": "Génie mécanique",
    "electrique": "Génie électrique",
    "civil": "Génie civil",
    "gestion": "Sciences Économiques et Sciences de Gestion",
}


class ProfessorService:
    """Service class for professor-related operations"""
    
    @staticmethod
    async def get_professor_by_user_id(user_id: int, session: AsyncSession) -> Optional[Professor]:
        """Get professor profile by user ID"""
        query = select(Professor).options(
            selectinload(Professor.user)
        ).where(Professor.user_id == user_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_dashboard_data(user_id: int, session: AsyncSession) -> dict:
        """
        Get comprehensive dashboard data for a professor.
        Updated for Call for Applicants workflow.
        """
        # Get professor profile
        professor = await ProfessorService.get_professor_by_user_id(user_id, session)
        if not professor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professor profile not found"
            )
        
        # All stats are cohort-driven: professors are assigned to cohorts, not directly to courses.
        total_courses_query = (
            select(func.count(distinct(Cohort.course_id)))
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(CohortProfessorAssignment.professor_id == professor.id)
        )
        total_courses = (await session.execute(total_courses_query)).scalar() or 0

        total_sessions_query = (
            select(func.count(CohortSession.id))
            .where(CohortSession.professor_id == professor.id)
        )
        total_sessions = (await session.execute(total_sessions_query)).scalar() or 0

        from datetime import date
        upcoming_sessions_query = (
            select(func.count(CohortSession.id))
            .where(
                and_(
                    CohortSession.professor_id == professor.id,
                    CohortSession.session_date >= date.today(),
                )
            )
        )
        upcoming_sessions = (await session.execute(upcoming_sessions_query)).scalar() or 0

        approved_employees_query = (
            select(func.count(distinct(EmployeeSubmission.id)))
            .join(CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id)
            .join(Cohort, Cohort.call_id == CompanyApplication.call_id)
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(
                and_(
                    CohortProfessorAssignment.professor_id == professor.id,
                    CompanyApplication.status == ApplicationStatus.APPROVED,
                    EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED,
                )
            )
        )
        total_enrolled = (await session.execute(approved_employees_query)).scalar() or 0
        
        # Get recent courses (limit 5)
        recent_courses, _ = await ProfessorService.get_professor_courses(
            user_id=user_id,
            session=session,
            page=1,
            per_page=5
        )
        
        dept_display = DEPARTMENT_DISPLAY_NAMES.get(
            professor.department.value if professor.department else None, 
            None
        )
        
        return {
            "professor_id": professor.id,
            "fullname": professor.user.fullname,
            "email": professor.user.email,
            "specialization": professor.specialization,
            "department": professor.department.value if professor.department else None,
            "department_display": dept_display,
            "stats": {
                "total_courses": total_courses,
                "total_sessions": total_sessions,
                "total_enrolled_employees": total_enrolled,
                "upcoming_sessions": upcoming_sessions,
            },
            "recent_courses": recent_courses,
        }
    
    @staticmethod
    async def get_professor_courses(
        user_id: int,
        session: AsyncSession,
        page: int = 1,
        per_page: int = 10
    ) -> tuple[List[dict], int]:
        """
        Get all courses assigned to a professor with stats.
        Updated for Call for Applicants workflow.
        """
        professor = await ProfessorService.get_professor_by_user_id(user_id, session)
        if not professor:
            return [], 0
        
        # Get total count by distinct course ids across assigned cohorts
        count_query = (
            select(func.count(distinct(Cohort.course_id)))
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(CohortProfessorAssignment.professor_id == professor.id)
        )
        total = (await session.execute(count_query)).scalar() or 0

        # Get paginated course ids from assigned cohorts
        offset = (page - 1) * per_page
        course_ids_query = (
            select(distinct(Cohort.course_id))
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(CohortProfessorAssignment.professor_id == professor.id)
            .order_by(Cohort.course_id.asc())
            .offset(offset)
            .limit(per_page)
        )
        course_ids = list((await session.execute(course_ids_query)).scalars().all())

        if not course_ids:
            return [], total

        courses_query = select(Course).where(Course.id.in_(course_ids)).order_by(Course.created_at.desc())
        courses = list((await session.execute(courses_query)).scalars().all())
        
        # Enrich with stats
        course_list = []
        
        for course in courses:
            # Cohorts assigned to this professor for the current course
            cohort_rows = (
                await session.execute(
                    select(Cohort.id, Cohort.name, Cohort.call_id)
                    .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
                    .where(
                        and_(
                            CohortProfessorAssignment.professor_id == professor.id,
                            Cohort.course_id == course.id,
                        )
                    )
                    .order_by(Cohort.training_start_date.asc())
                )
            ).all()
            cohort_names = [row.name for row in cohort_rows]
            cohort_call_ids = [row.call_id for row in cohort_rows]

            # Count approved employees via submissions for calls mapped by assigned cohorts
            approved_query = (
                select(func.count(EmployeeSubmission.id))
                .join(CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id)
                .where(
                    and_(
                        CompanyApplication.call_id.in_(cohort_call_ids),
                        EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED
                    )
                )
            )
            approved_count = (await session.execute(approved_query)).scalar() or 0

            # Count upcoming sessions for this professor on assigned cohorts of this course
            from datetime import date
            upcoming_sessions_query = (
                select(func.count(CohortSession.id))
                .join(Cohort, Cohort.id == CohortSession.cohort_id)
                .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
                .where(
                    and_(
                        CohortProfessorAssignment.professor_id == professor.id,
                        Cohort.course_id == course.id,
                        CohortSession.professor_id == professor.id,
                        CohortSession.session_date >= date.today(),
                    )
                )
            )
            upcoming_sessions = (await session.execute(upcoming_sessions_query)).scalar() or 0

            # Count materials
            materials_query = select(func.count(CourseMaterial.id)).where(
                CourseMaterial.course_id == course.id
            )
            materials_count = (await session.execute(materials_query)).scalar() or 0
            
            dept_display = DEPARTMENT_DISPLAY_NAMES.get(
                course.department.value if course.department else None,
                None
            )
            
            course_list.append({
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "short_description": course.short_description,
                "type": course.type.value if course.type else "public",
                "department": course.department.value if course.department else None,
                "department_display": dept_display,
                "duration_hours": course.duration_hours,
                "max_seats": course.max_seats,
                "image_path": course.image_path,
                "is_published": course.is_published,
                "enrolled_count": approved_count,
                "upcoming_sessions": upcoming_sessions,
                "materials_count": materials_count,
                "cohort_names": cohort_names,
                "created_at": course.created_at,
            })
        
        return course_list, total
    
    @staticmethod
    async def get_course_for_professor(
        course_id: int,
        user_id: int,
        session: AsyncSession
    ) -> Optional[dict]:
        """Get course details if professor is assigned to it"""
        professor = await ProfessorService.get_professor_by_user_id(user_id, session)
        if not professor:
            return None
        
        assigned_to_course = (
            await session.execute(
                select(Cohort.id)
                .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
                .where(
                    and_(
                        CohortProfessorAssignment.professor_id == professor.id,
                        Cohort.course_id == course_id,
                    )
                )
                .limit(1)
            )
        ).scalar_one_or_none()

        if not assigned_to_course:
            return None

        query = select(Course).where(Course.id == course_id)
        result = await session.execute(query)
        course = result.scalar_one_or_none()
        
        if not course:
            return None
        
        # Get calls mapped from assigned cohorts for this course
        cohort_call_ids = list(
            (
                await session.execute(
                    select(distinct(Cohort.call_id))
                    .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
                    .where(
                        and_(
                            CohortProfessorAssignment.professor_id == professor.id,
                            Cohort.course_id == course.id,
                        )
                    )
                )
            ).scalars().all()
        )

        # Count approved employees
        approved_query = (
            select(func.count(EmployeeSubmission.id))
            .join(CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id)
            .where(
                and_(
                    CompanyApplication.call_id.in_(cohort_call_ids),
                    EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED
                )
            )
        )
        approved_count = (await session.execute(approved_query)).scalar() or 0

        # Count upcoming sessions
        from datetime import date
        upcoming_sessions_query = (
            select(func.count(CohortSession.id))
            .join(Cohort, Cohort.id == CohortSession.cohort_id)
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(
                and_(
                    CohortProfessorAssignment.professor_id == professor.id,
                    Cohort.course_id == course.id,
                    CohortSession.professor_id == professor.id,
                    CohortSession.session_date >= date.today(),
                )
            )
        )
        upcoming_sessions = (await session.execute(upcoming_sessions_query)).scalar() or 0
        
        materials_query = select(func.count(CourseMaterial.id)).where(
            CourseMaterial.course_id == course.id
        )
        materials_count = (await session.execute(materials_query)).scalar() or 0
        
        dept_display = DEPARTMENT_DISPLAY_NAMES.get(
            course.department.value if course.department else None,
            None
        )
        
        return {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "short_description": course.short_description,
            "type": course.type.value if course.type else "public",
            "department": course.department.value if course.department else None,
            "department_display": dept_display,
            "duration_hours": course.duration_hours,
            "max_seats": course.max_seats,
            "image_path": course.image_path,
            "is_published": course.is_published,
            "enrolled_count": approved_count,
            "upcoming_sessions": upcoming_sessions,
            "materials_count": materials_count,
            "created_at": course.created_at,
        }
    
    @staticmethod
    async def is_professor_assigned_to_course(
        user_id: int,
        course_id: int,
        session: AsyncSession
    ) -> bool:
        """Check if a professor is assigned to a specific course"""
        professor = await ProfessorService.get_professor_by_user_id(user_id, session)
        if not professor:
            return False
        
        query = (
            select(Cohort.id)
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(
                and_(
                    CohortProfessorAssignment.professor_id == professor.id,
                    Cohort.course_id == course_id,
                )
            )
            .limit(1)
        )
        result = await session.execute(query)
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def get_course_materials(
        course_id: int,
        session: AsyncSession
    ) -> List[dict]:
        """Get all materials for a course"""
        query = (
            select(CourseMaterial)
            .options(selectinload(CourseMaterial.uploaded_by))
            .where(CourseMaterial.course_id == course_id)
            .order_by(CourseMaterial.created_at.desc())
        )
        
        result = await session.execute(query)
        materials = result.scalars().all()
        
        return [
            {
                "id": m.id,
                "course_id": m.course_id,
                "title": m.title,
                "description": m.description,
                "file_name": m.file_name,
                "file_path": m.file_path,
                "file_size": m.file_size,
                "file_type": m.file_type,
                "uploaded_by_id": m.uploaded_by_id,
                "uploaded_by_name": m.uploaded_by.fullname if m.uploaded_by else None,
                "created_at": m.created_at,
            }
            for m in materials
        ]
    
    @staticmethod
    async def upload_material(
        course_id: int,
        user_id: int,
        title: str,
        description: Optional[str],
        file: UploadFile,
        file_size: int,
        session: AsyncSession
    ) -> dict:
        """Upload a new material for a course"""
        # Create upload directory
        upload_dir = os.path.join(settings.DOCUMENTS_UPLOAD_DIR)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = file.filename.split(".")[-1] if file.filename else "pdf"
        unique_filename = f"material_{course_id}_{uuid.uuid4().hex}.{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create database record
        material = CourseMaterial(
            course_id=course_id,
            uploaded_by_id=user_id,
            title=title,
            description=description,
            file_path=file_path,
            file_name=file.filename or unique_filename,
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream",
        )
        
        session.add(material)
        await session.commit()
        await session.refresh(material)
        
        # Get uploader name
        user_query = select(User).where(User.id == user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        return {
            "id": material.id,
            "course_id": material.course_id,
            "title": material.title,
            "description": material.description,
            "file_name": material.file_name,
            "file_path": material.file_path,
            "file_size": material.file_size,
            "file_type": material.file_type,
            "uploaded_by_id": material.uploaded_by_id,
            "uploaded_by_name": user.fullname if user else None,
            "created_at": material.created_at,
        }
    
    @staticmethod
    async def delete_material(
        material_id: int,
        user_id: int,
        session: AsyncSession
    ) -> bool:
        """Delete a course material"""
        query = select(CourseMaterial).where(
            and_(
                CourseMaterial.id == material_id,
                CourseMaterial.uploaded_by_id == user_id
            )
        )
        
        result = await session.execute(query)
        material = result.scalar_one_or_none()
        
        if not material:
            return False
        
        # Delete file
        if os.path.exists(material.file_path):
            try:
                os.remove(material.file_path)
            except Exception:
                pass  # Log in production
        
        # Delete database record
        await session.delete(material)
        await session.commit()
        
        return True
    
    @staticmethod
    async def get_enrolled_employees(
        course_id: int,
        session_id: Optional[int],
        session: AsyncSession
    ) -> List[dict]:
        """
        Get employees enrolled in a course via approved submissions.
        Updated for Call for Applicants workflow.
        """
        query = (
            select(EmployeeSubmission)
            .options(
                selectinload(EmployeeSubmission.employee).selectinload(EmployeeProfile.user),
                selectinload(EmployeeSubmission.company_application).selectinload(CompanyApplication.company),
                selectinload(EmployeeSubmission.company_application).selectinload(CompanyApplication.call),
            )
            .join(CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id)
            .join(Cohort, Cohort.call_id == CompanyApplication.call_id)
            .where(
                and_(
                    Cohort.course_id == course_id,
                    CompanyApplication.status == ApplicationStatus.APPROVED,
                    EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED
                )
            )
        )
        
        if session_id:
            query = query.where(CompanyApplication.call_id == session_id)
        
        query = query.order_by(EmployeeSubmission.created_at.desc())
        
        result = await session.execute(query)
        submissions = result.scalars().all()
        
        employees = []
        for submission in submissions:
            employee = submission.employee
            company_name = None
            if submission.company_application and submission.company_application.company:
                company_name = submission.company_application.company.name
            
            employees.append({
                "id": employee.id,
                "fullname": employee.user.fullname if employee.user else "Unknown",
                "email": employee.user.email if employee.user else "",
                "company_name": company_name,
                "enrolled_at": submission.created_at,
                "document_status": submission.status.value if submission.status else None,
            })
        
        return employees
