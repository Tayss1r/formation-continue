import os
import uuid
import shutil
from typing import Optional
from datetime import datetime
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from ..db.models import Course, User, CourseType
from ..schemas.course_schema import CourseCreate, CourseUpdate
from ..core.config import settings


class CourseService:
    """Service class for course-related operations"""

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
        course_type: Optional[str] = None
    ) -> tuple[list[Course], int]:
        """Get all public/published courses for the landing page"""
        # Build base query for published courses
        base_query = select(Course).where(
            Course.is_published == True
        )
        
        # Filter by course type if specified
        if course_type:
            base_query = base_query.where(Course.type == CourseType(course_type))
        
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
        """Create a new course"""
        # Handle image upload if provided
        image_path = None
        if image:
            image_path = await CourseService.save_course_image(image)
        
        # Create course instance
        course = Course(
            title=course_data.title,
            description=course_data.description,
            short_description=course_data.short_description,
            type=CourseType(course_data.type),
            price=course_data.price,
            max_seats=course_data.max_seats,
            duration_hours=course_data.duration_hours,
            schedule=course_data.schedule,
            start_date=course_data.start_date,
            end_date=course_data.end_date,
            professor_id=course_data.professor_id,
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
