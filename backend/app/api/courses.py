import math
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole, Department
from ..dependencies import get_current_user, get_course_manager_user, RoleChecker
from ..schemas.course_schema import (
    CourseCreate,
    CourseUpdate,
    CourseOut,
    CourseListOut,
    CourseListResponse,
    CourseDeleteResponse,
    CourseEditabilityOut,
    DepartmentOut,
    DepartmentListOut,
    ProfessorListItemOut,
    ProfessorListResponse,
    DEPARTMENT_DISPLAY_NAMES,
)
from ..services.course_service import CourseService
from ..error import CourseHasBookings

course_router = APIRouter()


# ========================
# PUBLIC ENDPOINTS
# ========================

@course_router.get("/departments", response_model=DepartmentListOut)
async def get_departments():
    """
    Get list of available departments.
    Public endpoint for dropdowns.
    """
    departments = [
        DepartmentOut(value=dept.value, label=DEPARTMENT_DISPLAY_NAMES[dept.value])
        for dept in Department
    ]
    return DepartmentListOut(departments=departments)


@course_router.get("/professors", response_model=ProfessorListResponse)
async def get_professors(
    department: Optional[str] = Query(None, description="Filter by department"),
    current_user: User = Depends(get_course_manager_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get list of professors for course assignment.
    Can filter by department.
    Staff only.
    """
    professors = await CourseService.get_professors_list(session, department)
    return ProfessorListResponse(
        professors=professors,
        total=len(professors)
    )


@course_router.get("/public", response_model=CourseListResponse)
async def get_public_courses(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page"),
    course_type: Optional[str] = Query(None, description="Filter by course type (public/private)"),
    department: Optional[str] = Query(None, description="Filter by department"),
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
        course_type=course_type,
        department=department
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
    current_user: User = Depends(get_course_manager_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get courses for course managers.
    - Staff: only their own courses.
    - Coordinator/Admin: all courses.
    """
    if current_user.role in [UserRole.COORDINATOR.value, UserRole.ADMIN.value]:
        courses, total = await CourseService.get_all_courses_admin(
            session=session,
            page=page,
            per_page=per_page
        )
    else:
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
    current_user: User = Depends(get_course_manager_user),
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
    
    # Staff can only see their own courses, coordinator/admin can see all
    if current_user.role not in [UserRole.ADMIN.value, UserRole.COORDINATOR.value] and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this course"
        )
    
    return CourseOut.model_validate(course)


@course_router.get("/staff/course/{course_id}/editability", response_model=CourseEditabilityOut)
async def get_course_editability(
    course_id: int,
    current_user: User = Depends(get_course_manager_user),
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
    if current_user.role not in [UserRole.ADMIN.value, UserRole.COORDINATOR.value] and course.created_by_id != current_user.id:
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
    department: Optional[str] = Form(None),
    learning_outcomes: Optional[str] = Form(None),  # JSON string array
    is_published: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_course_manager_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Create a new course (template) with optional image upload.
    Course dates are managed via availability slots, not on the course itself.
    Staff/coordinator/admin only.
    
    learning_outcomes should be a JSON string array, e.g.: '["item1", "item2"]'
    """
    # Parse learning_outcomes from JSON string
    parsed_outcomes = None
    if learning_outcomes:
        try:
            parsed_outcomes = json.loads(learning_outcomes)
            if not isinstance(parsed_outcomes, list):
                parsed_outcomes = [parsed_outcomes]
        except json.JSONDecodeError:
            # If not JSON, treat as single item
            parsed_outcomes = [learning_outcomes]
    
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
        department=department,
        learning_outcomes=parsed_outcomes,
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
    department: Optional[str] = Form(None),
    learning_outcomes: Optional[str] = Form(None),  # JSON string array
    is_published: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_course_manager_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Update an existing course (template). Only the course creator or admin can update.
    Course dates are managed via availability slots.
    Staff/coordinator/admin only.
    
    BUSINESS RULE: Price and max_seats cannot be modified if there are existing bookings.
    learning_outcomes should be a JSON string array, e.g.: '["item1", "item2"]'
    """
    course = await CourseService.get_course_by_id(course_id, session, include_relations=False)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check permissions: staff can only update own courses, coordinator/admin can update all
    if current_user.role not in [UserRole.ADMIN.value, UserRole.COORDINATOR.value] and course.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this course"
        )
    
    # BUSINESS RULE: Check if price or seats are being modified when applications exist
    if price is not None or max_seats is not None:
        has_applications = await CourseService.course_has_applications(course_id, session)
        if has_applications:
            if (price is not None and price != course.price) or \
               (max_seats is not None and max_seats != course.max_seats):
                raise CourseHasBookings()
    
    # Parse learning_outcomes from JSON string
    parsed_outcomes = None
    if learning_outcomes:
        try:
            parsed_outcomes = json.loads(learning_outcomes)
            if not isinstance(parsed_outcomes, list):
                parsed_outcomes = [parsed_outcomes]
        except json.JSONDecodeError:
            parsed_outcomes = [learning_outcomes]
    
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
        department=department,
        learning_outcomes=parsed_outcomes,
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
    current_user: User = Depends(get_course_manager_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a course.
    - Staff can delete only their own courses.
    - Coordinator/Admin can delete all courses.
    """
    course = await CourseService.get_course_by_id(course_id, session, include_relations=False)
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check permissions
    if current_user.role not in [UserRole.ADMIN.value, UserRole.COORDINATOR.value] and course.created_by_id != current_user.id:
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
