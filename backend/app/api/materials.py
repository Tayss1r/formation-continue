"""
Materials API for employees to access course documents.

Employees can only access materials for courses they are enrolled in.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole
from ..dependencies import RoleChecker
from ..services.material_service import MaterialService

materials_router = APIRouter()


@materials_router.get("/my-materials")
async def get_employee_materials(
    current_user: User = Depends(RoleChecker([UserRole.EMPLOYEE])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all materials available to the employee (from enrolled courses).
    Employee only.
    """
    materials = await MaterialService.get_employee_materials(current_user.id, session)
    return {"materials": materials, "total": len(materials)}


@materials_router.get("/course/{course_id}/materials")
async def get_course_materials_employee(
    course_id: int,
    current_user: User = Depends(RoleChecker([UserRole.EMPLOYEE])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get materials for a specific course the employee is enrolled in.
    Employee only.
    """
    # Check enrollment
    is_enrolled = await MaterialService.is_employee_enrolled_in_course(
        user_id=current_user.id,
        course_id=course_id,
        session=session
    )
    
    if not is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not enrolled in this course"
        )
    
    materials = await MaterialService.get_course_materials_for_employee(course_id, session)
    return {"materials": materials, "total": len(materials)}


@materials_router.get("/download/{material_id}")
async def download_material(
    material_id: int,
    current_user: User = Depends(RoleChecker([UserRole.EMPLOYEE, UserRole.PROFESSOR, UserRole.STAFF, UserRole.ADMIN])),
    session: AsyncSession = Depends(get_session)
):
    """
    Download a course material.
    
    Access control:
    - Employees: Only materials from enrolled courses
    - Professors: Only materials from assigned courses
    - Staff/Admin: All materials
    """
    # Check access based on role
    if current_user.role == UserRole.EMPLOYEE.value:
        has_access = await MaterialService.employee_has_material_access(
            user_id=current_user.id,
            material_id=material_id,
            session=session
        )
    elif current_user.role == UserRole.PROFESSOR.value:
        has_access = await MaterialService.professor_has_material_access(
            user_id=current_user.id,
            material_id=material_id,
            session=session
        )
    else:
        has_access = True  # Staff and Admin have full access
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this material"
        )
    
    # Get material info
    material = await MaterialService.get_material_by_id(material_id, session)
    
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material not found"
        )
    
    import os
    if not os.path.exists(material.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Material file not found"
        )
    
    return FileResponse(
        path=material.file_path,
        filename=material.file_name,
        media_type=material.file_type
    )
