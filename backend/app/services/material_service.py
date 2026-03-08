"""
Material Service - Access control and retrieval for course materials.

Provides material access for employees and professors with proper authorization.
In the new Call for Applicants workflow, employees access materials via approved 
EmployeeSubmissions linked to CompanyApplications.
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from ..db.models import (
    User, CourseMaterial, Course, EmployeeProfile, Professor,
    EmployeeSubmission, CompanyApplication, CallForApplicants,
    EmployeeSubmissionStatus, ApplicationStatus
)


class MaterialService:
    """Service class for material access operations"""
    
    @staticmethod
    async def get_material_by_id(
        material_id: int,
        session: AsyncSession
    ) -> Optional[CourseMaterial]:
        """Get a material by its ID"""
        query = select(CourseMaterial).where(CourseMaterial.id == material_id)
        result = await session.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def is_employee_enrolled_in_course(
        user_id: int,
        course_id: int,
        session: AsyncSession
    ) -> bool:
        """
        Check if an employee user has access to a course via approved submission.
        In the new workflow, an employee has access if they have an approved submission
        to an approved company application for a call related to the course.
        """
        # Get employee profile
        profile_query = select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
        profile_result = await session.execute(profile_query)
        employee = profile_result.scalar_one_or_none()
        
        if not employee:
            return False
        
        # Check for approved submission linked to the course
        enrollment_query = (
            select(EmployeeSubmission.id)
            .join(CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id)
            .join(CallForApplicants, CompanyApplication.call_id == CallForApplicants.id)
            .where(
                and_(
                    EmployeeSubmission.employee_id == employee.id,
                    EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED,
                    CompanyApplication.status == ApplicationStatus.APPROVED,
                    CallForApplicants.course_id == course_id
                )
            )
        )
        result = await session.execute(enrollment_query)
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def get_employee_enrolled_course_ids(
        user_id: int,
        session: AsyncSession
    ) -> List[int]:
        """
        Get list of course IDs the employee has access to via approved submissions.
        """
        # Get employee profile
        profile_query = select(EmployeeProfile).where(EmployeeProfile.user_id == user_id)
        profile_result = await session.execute(profile_query)
        employee = profile_result.scalar_one_or_none()
        
        if not employee:
            return []
        
        # Get course IDs via approved submissions
        query = (
            select(CallForApplicants.course_id)
            .join(CompanyApplication, CompanyApplication.call_id == CallForApplicants.id)
            .join(EmployeeSubmission, EmployeeSubmission.company_application_id == CompanyApplication.id)
            .where(
                and_(
                    EmployeeSubmission.employee_id == employee.id,
                    EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED,
                    CompanyApplication.status == ApplicationStatus.APPROVED
                )
            )
            .distinct()
        )
        result = await session.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_employee_materials(
        user_id: int,
        session: AsyncSession
    ) -> List[dict]:
        """Get all materials available to an employee (from enrolled courses)"""
        course_ids = await MaterialService.get_employee_enrolled_course_ids(user_id, session)
        
        if not course_ids:
            return []
        
        query = (
            select(CourseMaterial)
            .options(selectinload(CourseMaterial.course))
            .where(CourseMaterial.course_id.in_(course_ids))
            .order_by(CourseMaterial.created_at.desc())
        )
        
        result = await session.execute(query)
        materials = result.scalars().all()
        
        return [
            {
                "id": m.id,
                "course_id": m.course_id,
                "course_title": m.course.title if m.course else None,
                "title": m.title,
                "description": m.description,
                "file_name": m.file_name,
                "file_size": m.file_size,
                "file_type": m.file_type,
                "created_at": m.created_at,
            }
            for m in materials
        ]
    
    @staticmethod
    async def get_course_materials_for_employee(
        course_id: int,
        session: AsyncSession
    ) -> List[dict]:
        """Get materials for a specific course"""
        query = (
            select(CourseMaterial)
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
                "file_size": m.file_size,
                "file_type": m.file_type,
                "created_at": m.created_at,
            }
            for m in materials
        ]
    
    @staticmethod
    async def employee_has_material_access(
        user_id: int,
        material_id: int,
        session: AsyncSession
    ) -> bool:
        """Check if an employee can access a specific material"""
        # Get the material
        material = await MaterialService.get_material_by_id(material_id, session)
        if not material:
            return False
        
        # Check enrollment in the course
        return await MaterialService.is_employee_enrolled_in_course(
            user_id=user_id,
            course_id=material.course_id,
            session=session
        )
    
    @staticmethod
    async def professor_has_material_access(
        user_id: int,
        material_id: int,
        session: AsyncSession
    ) -> bool:
        """Check if a professor can access a specific material"""
        # Get professor profile
        prof_query = select(Professor).where(Professor.user_id == user_id)
        prof_result = await session.execute(prof_query)
        professor = prof_result.scalar_one_or_none()
        
        if not professor:
            return False
        
        # Get the material
        material = await MaterialService.get_material_by_id(material_id, session)
        if not material:
            return False
        
        # Check if professor is assigned to the course
        course_query = select(Course.id).where(
            and_(
                Course.id == material.course_id,
                Course.professor_id == professor.id
            )
        )
        result = await session.execute(course_query)
        return result.scalar_one_or_none() is not None
