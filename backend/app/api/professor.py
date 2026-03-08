"""
Professor API endpoints for professor dashboard functionality.

Provides:
- Professor-specific dashboard data
- Assigned courses management
- Course materials/documents upload
- Access to enrolled employees
"""

import os
import uuid
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole, Course, CourseMaterial, Professor
from ..dependencies import get_current_user, RoleChecker
from ..schemas.professor_schema import (
    ProfessorDashboardOut,
    ProfessorCourseOut,
    ProfessorCourseListResponse,
    CourseMaterialOut,
    CourseMaterialCreate,
    CourseMaterialListResponse,
    EnrolledEmployeeOut,
    EnrolledEmployeeListResponse,
)
from ..services.professor_service import ProfessorService
from ..core.config import settings

professor_router = APIRouter()


# ========================
# PROFESSOR DASHBOARD
# ========================

@professor_router.get("/dashboard", response_model=ProfessorDashboardOut)
async def get_professor_dashboard(
    current_user: User = Depends(RoleChecker([UserRole.PROFESSOR])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get professor dashboard overview.
    Returns stats and recent activity for the professor.
    Professor only.
    """
    dashboard_data = await ProfessorService.get_dashboard_data(current_user.id, session)
    return dashboard_data


@professor_router.get("/my-courses", response_model=ProfessorCourseListResponse)
async def get_professor_courses(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(RoleChecker([UserRole.PROFESSOR])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all courses assigned to the current professor.
    Professor only.
    """
    courses, total = await ProfessorService.get_professor_courses(
        user_id=current_user.id,
        session=session,
        page=page,
        per_page=per_page
    )
    
    import math
    total_pages = math.ceil(total / per_page) if total > 0 else 1
    
    return ProfessorCourseListResponse(
        courses=courses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@professor_router.get("/course/{course_id}", response_model=ProfessorCourseOut)
async def get_professor_course_details(
    course_id: int,
    current_user: User = Depends(RoleChecker([UserRole.PROFESSOR])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get detailed information about a course assigned to the professor.
    Professor only.
    """
    course = await ProfessorService.get_course_for_professor(
        course_id=course_id,
        user_id=current_user.id,
        session=session
    )
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or not assigned to you"
        )
    
    return course


# ========================
# COURSE MATERIALS/DOCUMENTS
# ========================

@professor_router.get("/course/{course_id}/materials", response_model=CourseMaterialListResponse)
async def get_course_materials(
    course_id: int,
    current_user: User = Depends(RoleChecker([UserRole.PROFESSOR])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all materials for a course assigned to the professor.
    Professor only.
    """
    # Verify professor is assigned to this course
    is_assigned = await ProfessorService.is_professor_assigned_to_course(
        user_id=current_user.id,
        course_id=course_id,
        session=session
    )
    
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this course"
        )
    
    materials = await ProfessorService.get_course_materials(course_id, session)
    
    return CourseMaterialListResponse(
        materials=materials,
        total=len(materials)
    )


@professor_router.post("/course/{course_id}/materials", response_model=CourseMaterialOut, status_code=status.HTTP_201_CREATED)
async def upload_course_material(
    course_id: int,
    title: str = Query(..., min_length=1, max_length=200),
    description: Optional[str] = Query(None, max_length=500),
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker([UserRole.PROFESSOR])),
    session: AsyncSession = Depends(get_session)
):
    """
    Upload a new material/document for a course.
    Professor only.
    
    Supported file types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX
    Max file size: 25MB
    """
    # Verify professor is assigned to this course
    is_assigned = await ProfessorService.is_professor_assigned_to_course(
        user_id=current_user.id,
        course_id=course_id,
        session=session
    )
    
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this course"
        )
    
    # Validate file
    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX"
        )
    
    # Check file size (25MB)
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size: 25MB"
        )
    await file.seek(0)
    
    # Save file
    material = await ProfessorService.upload_material(
        course_id=course_id,
        user_id=current_user.id,
        title=title,
        description=description,
        file=file,
        file_size=len(content),
        session=session
    )
    
    return material


@professor_router.delete("/materials/{material_id}")
async def delete_course_material(
    material_id: int,
    current_user: User = Depends(RoleChecker([UserRole.PROFESSOR])),
    session: AsyncSession = Depends(get_session)
):
    """
    Delete a course material.
    Only the professor who uploaded it can delete.
    Professor only.
    """
    deleted = await ProfessorService.delete_material(
        material_id=material_id,
        user_id=current_user.id,
        session=session
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found or you don't have permission to delete it"
        )
    
    return {"message": "Material deleted successfully", "material_id": material_id}


# ========================
# ENROLLED EMPLOYEES
# ========================

@professor_router.get("/course/{course_id}/employees", response_model=EnrolledEmployeeListResponse)
async def get_enrolled_employees(
    course_id: int,
    session_id: Optional[int] = Query(None, description="Filter by specific session"),
    current_user: User = Depends(RoleChecker([UserRole.PROFESSOR])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get employees enrolled in a course assigned to the professor.
    Can filter by specific session/availability slot.
    Professor only.
    """
    # Verify professor is assigned to this course
    is_assigned = await ProfessorService.is_professor_assigned_to_course(
        user_id=current_user.id,
        course_id=course_id,
        session=session
    )
    
    if not is_assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this course"
        )
    
    employees = await ProfessorService.get_enrolled_employees(
        course_id=course_id,
        session_id=session_id,
        session=session
    )
    
    return EnrolledEmployeeListResponse(
        employees=employees,
        total=len(employees)
    )
