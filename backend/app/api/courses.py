import math
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole
from ..dependencies import get_current_user, get_staff_user, RoleChecker
from ..schemas.course_schema import (
    CourseCreate,
    CourseUpdate,
    CourseOut,
    CourseListOut,
    CourseListResponse,
    CourseDeleteResponse,
    CourseEditabilityOut,
)
from ..services.course_service import CourseService
from ..error import CourseHasBookings

course_router = APIRouter()


# ========================
# PUBLIC ENDPOINTS
# ========================

@course_router.get("/public", response_model=CourseListResponse)
async def get_public_courses(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page"),
    course_type: Optional[str] = Query(None, description="Filter by course type (public/private)"),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all published courses for the public landing page.
    No authentication required.
    """
    courses, total = await CourseService.get_public_courses(
        session=session,
        page=page,
        per_page=per_page,
        course_type=course_type
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return CourseListResponse(
        courses=[CourseListOut.model_validate(course) for course in courses],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@course_router.get("/{course_id}", response_model=CourseOut)
async def get_course_details(
    course_id: int,
    session: AsyncSession = Depends(get_session)
):
    """
    Get detailed information about a specific course.
    Public endpoint for course details page.
    """
    course = await CourseService.get_course_by_id(course_id, session)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Only return published courses for public access
    # Staff/admin can see unpublished via staff endpoints
    if not course.is_published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    return CourseOut.model_validate(course)


# ========================
# STAFF ENDPOINTS (Protected)
# ========================

@course_router.get("/staff/my-courses", response_model=CourseListResponse)
async def get_my_courses(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all courses created by the current staff user.
    Staff only.
    """
    courses, total = await CourseService.get_staff_courses(
        session=session,
        user_id=current_user.id,
        page=page,
        per_page=per_page
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return CourseListResponse(
        courses=[CourseListOut.model_validate(course) for course in courses],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@course_router.get("/staff/course/{course_id}", response_model=CourseOut)
async def get_staff_course_details(
    course_id: int,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get detailed information about a course (staff view - includes unpublished).
    Staff can only view their own courses, admin can view all.
    """
    course = await CourseService.get_course_by_id(course_id, session)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Staff can only see their own courses, admin can see all
    if current_user.role != UserRole.ADMIN.value and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this course"
        )
    
    return CourseOut.model_validate(course)


@course_router.get("/staff/course/{course_id}/editability", response_model=CourseEditabilityOut)
async def get_course_editability(
    course_id: int,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Check if a course's price and seats can be edited.
    Returns editability status and reason if not editable.
    Staff only.
    """
    course = await CourseService.get_course_by_id(course_id, session, include_relations=False)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check permissions
    if current_user.role != UserRole.ADMIN.value and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this course"
        )
    
    editability = await CourseService.get_course_editability(course_id, session)
    
    return CourseEditabilityOut(**editability)


@course_router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    max_seats: int = Form(...),
    type: str = Form("public"),
    short_description: Optional[str] = Form(None),
    duration_hours: Optional[int] = Form(None),
    sector: Optional[str] = Form(None),
    professor_id: Optional[int] = Form(None),
    is_published: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new course (template) with optional image upload.
    Course dates are managed via availability slots, not on the course itself.
    Staff only.
    """
    course_data = CourseCreate(
        title=title,
        description=description,
        short_description=short_description,
        type=type,
        price=price,
        max_seats=max_seats,
        duration_hours=duration_hours,
        sector=sector,
        professor_id=professor_id,
        is_published=is_published
    )
    
    course = await CourseService.create_course(
        course_data=course_data,
        user=current_user,
        session=session,
        image=image
    )
    
    return CourseOut.model_validate(course)


@course_router.put("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    max_seats: Optional[int] = Form(None),
    type: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    duration_hours: Optional[int] = Form(None),
    sector: Optional[str] = Form(None),
    professor_id: Optional[int] = Form(None),
    is_published: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Update an existing course (template). Only the course creator or admin can update.
    Course dates are managed via availability slots.
    Staff only.
    
    BUSINESS RULE: Price and max_seats cannot be modified if there are existing bookings.
    """
    course = await CourseService.get_course_by_id(course_id, session, include_relations=False)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check permissions: only creator or admin can update
    if current_user.role != UserRole.ADMIN.value and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this course"
        )
    
    # BUSINESS RULE: Check if price or seats are being modified when bookings exist
    if price is not None or max_seats is not None:
        has_bookings = await CourseService.course_has_bookings(course_id, session)
        if has_bookings:
            if (price is not None and price != course.price) or \
               (max_seats is not None and max_seats != course.max_seats):
                raise CourseHasBookings()
    
    course_data = CourseUpdate(
        title=title,
        description=description,
        short_description=short_description,
        type=type,
        price=price,
        max_seats=max_seats,
        duration_hours=duration_hours,
        sector=sector,
        professor_id=professor_id,
        is_published=is_published
    )
    
    updated_course = await CourseService.update_course(
        course=course,
        course_data=course_data,
        session=session,
        image=image
    )
    
    return CourseOut.model_validate(updated_course)


@course_router.delete("/{course_id}", response_model=CourseDeleteResponse)
async def delete_course(
    course_id: int,
    current_user: User = Depends(get_staff_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a course. Only the course creator or admin can delete.
    Staff only.
    """
    course = await CourseService.get_course_by_id(course_id, session, include_relations=False)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check permissions: only creator or admin can delete
    if current_user.role != UserRole.ADMIN.value and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this course"
        )
    
    await CourseService.delete_course(course, session)
    
    return CourseDeleteResponse(
        message="Course deleted successfully",
        course_id=course_id
    )


# ========================
# ADMIN ENDPOINTS
# ========================

@course_router.get("/admin/all", response_model=CourseListResponse)
async def get_all_courses_admin(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(RoleChecker([UserRole.ADMIN])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all courses (admin view).
    Admin only.
    """
    courses, total = await CourseService.get_all_courses_admin(
        session=session,
        page=page,
        per_page=per_page
    )
    
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return CourseListResponse(
        courses=[CourseListOut.model_validate(course) for course in courses],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )
