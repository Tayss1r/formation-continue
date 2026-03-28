import os
import uuid
import shutil
from typing import Optional, List
from datetime import datetime
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from ..db.models import Course, User, UserRole, CourseType, Professor, Department
from ..schemas.course_schema import CourseCreate, CourseUpdate
from ..core.config import settings


class CourseService:
    """Service class for course-related operations"""

    @staticmethod
    async def get_professors_list(
        session: AsyncSession,
        department: Optional[str] = None
    ) -> List[dict]:
        """
        Get list of professors, optionally filtered and ranked by department relevance.
        
        Ranking logic:
        1. Professors from the same department appear first
        2. Within same department, professors with more courses in that department rank higher
        3. Professors from other departments appear after
        
        Returns a list of dicts with professor info + user details + relevance score.
        """
        query = select(Professor).options(
            selectinload(Professor.user),
            selectinload(Professor.courses)
        ).join(User, Professor.user_id == User.id).where(User.role == UserRole.PROFESSOR)
        
        result = await session.execute(query)
        professors = result.scalars().all()
        
        # Transform to include user details and calculate relevance
        professor_list = []
        dept_enum = None
        if department:
            try:
                dept_enum = Department(department)
            except ValueError:
                pass
        
        for prof in professors:
            dept_display = None
            if prof.department:
                dept_display = {
                    'informatique': 'Technologie de l\'informatique',
                    'mecanique': 'Génie mécanique',
                    'electrique': 'Génie électrique',
                    'civil': 'Génie civil',
                    'gestion': 'Sciences Économiques et Sciences de Gestion'
                }.get(prof.department.value, prof.department.value)
            
            # Calculate relevance score
            relevance_score = 0
            courses_in_department = 0
            total_courses = len(prof.courses) if prof.courses else 0
            
            # If filtering by department
            if dept_enum:
                # Same department = highest relevance
                if prof.department == dept_enum:
                    relevance_score = 100
                
                # Count courses taught in the target department
                if prof.courses:
                    for course in prof.courses:
                        if course.department == dept_enum:
                            courses_in_department += 1
                
                # Add bonus for courses in target department
                relevance_score += courses_in_department * 10
                
                # Small bonus for total teaching experience
                relevance_score += min(total_courses, 10)
            else:
                # No filter - rank by total courses taught
                relevance_score = total_courses
            
            professor_list.append({
                'id': prof.id,
                'user_id': prof.user_id,
                'fullname': prof.user.fullname if prof.user else 'Unknown',
                'email': prof.user.email if prof.user else '',
                'specialization': prof.specialization,
                'department': prof.department.value if prof.department else None,
                'department_display': dept_display,
                'courses_taught': total_courses,
                'courses_in_department': courses_in_department,
                'relevance_score': relevance_score,
                'is_recommended': relevance_score >= 100 if dept_enum else total_courses > 0
            })
        
        # Sort by relevance score (descending), then by fullname (ascending)
        professor_list.sort(key=lambda x: (-x['relevance_score'], x['fullname'].lower()))
        
        return professor_list

    @staticmethod
    async def get_course_by_id(
        course_id: int, 
        session: AsyncSession,
        include_relations: bool = True
    ) -> Optional[Course]:
        """Get a course by its ID"""
        query = select(Course).where(Course.id == course_id)
        
        if include_relations:
            query = query.options(
                selectinload(Course.created_by),
                selectinload(Course.professor)
            )
        
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_public_courses(
        session: AsyncSession,
        page: int = 1,
        per_page: int = 12,
        course_type: Optional[str] = None,
        department: Optional[str] = None
    ) -> tuple[list[Course], int]:
        """Get all public/published courses for the landing page"""
        # Build base query for published courses
        base_query = select(Course).where(
            Course.is_published == True
        )
        
        # Filter by course type if specified
        if course_type:
            base_query = base_query.where(Course.type == CourseType(course_type))
        
        # Filter by department if specified
        if department:
            try:
                dept_enum = Department(department)
                base_query = base_query.where(Course.department == dept_enum)
            except ValueError:
                pass  # Invalid department, ignore filter
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar()
        
        # Get paginated results
        offset = (page - 1) * per_page
        query = base_query.order_by(Course.created_at.desc()).offset(offset).limit(per_page)
        
        result = await session.execute(query)
        courses = result.scalars().all()
        
        return list(courses), total

    @staticmethod
    async def get_staff_courses(
        session: AsyncSession,
        user_id: int,
        page: int = 1,
        per_page: int = 10
    ) -> tuple[list[Course], int]:
        """Get all courses created by a specific staff member"""
        base_query = select(Course).where(Course.created_by_id == user_id)
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar()
        
        # Get paginated results with relations
        offset = (page - 1) * per_page
        query = base_query.options(
            selectinload(Course.created_by),
            selectinload(Course.professor)
        ).order_by(Course.created_at.desc()).offset(offset).limit(per_page)
        
        result = await session.execute(query)
        courses = result.scalars().all()
        
        return list(courses), total

    @staticmethod
    async def get_all_courses_admin(
        session: AsyncSession,
        page: int = 1,
        per_page: int = 10
    ) -> tuple[list[Course], int]:
        """Get all courses (admin view)"""
        base_query = select(Course)
        
        # Get total count
        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await session.execute(count_query)
        total = total_result.scalar()
        
        # Get paginated results with relations
        offset = (page - 1) * per_page
        query = base_query.options(
            selectinload(Course.created_by),
            selectinload(Course.professor)
        ).order_by(Course.created_at.desc()).offset(offset).limit(per_page)
        
        result = await session.execute(query)
        courses = result.scalars().all()
        
        return list(courses), total

    @staticmethod
    async def create_course(
        course_data: CourseCreate,
        user: User,
        session: AsyncSession,
        image: Optional[UploadFile] = None
    ) -> Course:
        """
        Create a new course (template).
        Dates/scheduling are handled separately via availability slots.
        """
        # Handle image upload if provided
        image_path = None
        if image:
            image_path = await CourseService.save_course_image(image)
        
        # Parse department enum if provided
        department_enum = None
        if course_data.department:
            try:
                department_enum = Department(course_data.department)
            except ValueError:
                pass  # Invalid department, leave as None
        
        # Create course instance
        course = Course(
            title=course_data.title,
            description=course_data.description,
            short_description=course_data.short_description,
            type=CourseType(course_data.type),
            price=course_data.price,
            max_seats=course_data.max_seats,
            duration_hours=course_data.duration_hours,
            sector=course_data.sector,
            professor_id=course_data.professor_id,
            department=department_enum,
            learning_outcomes=course_data.learning_outcomes,
            is_published=course_data.is_published,
            image_path=image_path,
            created_by_id=user.id
        )
        
        session.add(course)
        await session.commit()
        await session.refresh(course)
        
        # Load relationships
        course = await CourseService.get_course_by_id(course.id, session)
        
        return course

    @staticmethod
    async def update_course(
        course: Course,
        course_data: CourseUpdate,
        session: AsyncSession,
        image: Optional[UploadFile] = None
    ) -> Course:
        """Update an existing course"""
        # Handle image update if provided
        if image:
            # Delete old image if exists
            if course.image_path:
                await CourseService.delete_course_image(course.image_path)
            
            # Save new image
            course.image_path = await CourseService.save_course_image(image)
        
        # Update fields that were provided
        update_data = course_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "type" and value:
                setattr(course, field, CourseType(value))
            elif field == "department" and value:
                try:
                    setattr(course, field, Department(value))
                except ValueError:
                    pass  # Invalid department, skip
            else:
                setattr(course, field, value)
        
        course.updated_at = datetime.now()
        
        await session.commit()
        await session.refresh(course)
        
        # Load relationships
        course = await CourseService.get_course_by_id(course.id, session)
        
        return course

    @staticmethod
    async def delete_course(course: Course, session: AsyncSession) -> bool:
        """Delete a course and its associated image"""
        # Delete image if exists
        if course.image_path:
            await CourseService.delete_course_image(course.image_path)
        
        await session.delete(course)
        await session.commit()
        
        return True

    @staticmethod
    async def save_course_image(image: UploadFile) -> str:
        """
        Save uploaded image to local filesystem.
        Returns the relative path to the saved image.
        """
        # Validate file type
        if image.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image type. Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
            )
        
        # Read file to check size
        content = await image.read()
        if len(content) > settings.MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image too large. Maximum size: {settings.MAX_IMAGE_SIZE // (1024*1024)}MB"
            )
        
        # Reset file pointer
        await image.seek(0)
        
        # Create upload directory if it doesn't exist
        os.makedirs(settings.COURSES_UPLOAD_DIR, exist_ok=True)
        
        # Generate unique filename
        file_extension = image.filename.split(".")[-1] if image.filename else "jpg"
        unique_filename = f"course_{uuid.uuid4().hex}.{file_extension}"
        file_path = os.path.join(settings.COURSES_UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        
        # Return relative path for database storage
        return file_path

    @staticmethod
    async def delete_course_image(image_path: str) -> bool:
        """Delete an image from the filesystem"""
        try:
            if os.path.exists(image_path):
                os.remove(image_path)
                return True
        except Exception:
            pass  # Log error in production
        return False

    @staticmethod
    async def course_exists(course_id: int, session: AsyncSession) -> bool:
        """Check if a course exists"""
        query = select(Course.id).where(Course.id == course_id)
        result = await session.execute(query)
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def course_has_applications(course_id: int, session: AsyncSession) -> bool:
        """
        Check if a course has any applications through its calls for applicants.
        Returns True if any approved or pending application exists.
        """
        from ..db.models import Cohort, CompanyApplication, ApplicationStatus
        from sqlalchemy import exists, and_
        
        # Check if any application exists for any call of this course
        # that is not rejected
        subquery = (
            select(CompanyApplication.id)
            .join(Cohort, Cohort.call_id == CompanyApplication.call_id)
            .where(
                and_(
                    Cohort.course_id == course_id,
                    CompanyApplication.status != ApplicationStatus.REJECTED
                )
            )
        )
        
        query = select(exists(subquery))
        result = await session.execute(query)
        return result.scalar() or False
    
    @staticmethod
    async def get_course_editability(course_id: int, session: AsyncSession) -> dict:
        """
        Check if a course's price and seats can be edited.
        Returns info about editability and reason if not editable.
        """
        has_applications = await CourseService.course_has_applications(course_id, session)
        has_bookings = has_applications
        
        return {
            "can_edit_price": not has_bookings,
            "can_edit_seats": not has_bookings,
            "has_bookings": has_bookings,
            "reason": "Impossible de modifier après des candidatures" if has_bookings else None
        }
