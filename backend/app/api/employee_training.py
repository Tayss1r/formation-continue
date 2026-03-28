"""Employee training API for cohort calendar and materials views."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole
from ..dependencies import RoleChecker
from ..schemas.employee_training_schema import (
    EmployeeTrainingCalendarResponse,
    EmployeeTrainingMaterialsResponse,
    EmployeeAttendanceHistoryResponse,
)
from ..services.cohort_service import CohortService


employee_training_router = APIRouter()


@employee_training_router.get("/calendar", response_model=EmployeeTrainingCalendarResponse)
async def get_employee_training_calendar(
    current_user: User = Depends(RoleChecker([UserRole.EMPLOYEE])),
    session: AsyncSession = Depends(get_session),
):
    cohorts = await CohortService.list_training_cohorts_for_employee(
        user_id=current_user.id,
        session=session,
    )

    sessions_payload = []
    for cohort in cohorts:
        for item in cohort.sessions:
            sessions_payload.append(
                {
                    "id": item.id,
                    "cohort_id": cohort.id,
                    "cohort_name": cohort.name,
                    "call_title": cohort.call.title if cohort.call else "",
                    "course_title": cohort.course.title if cohort.course else "",
                    "title": item.title,
                    "session_date": item.session_date,
                    "start_time": item.start_time.strftime("%H:%M"),
                    "end_time": item.end_time.strftime("%H:%M"),
                    "location": item.location,
                    "professor_name": (
                        item.professor.user.fullname
                        if item.professor and item.professor.user
                        else ""
                    ),
                }
            )

    sessions_payload.sort(key=lambda s: (s["session_date"], s["start_time"]))
    return {"sessions": sessions_payload, "total": len(sessions_payload)}


@employee_training_router.get("/materials", response_model=EmployeeTrainingMaterialsResponse)
async def get_employee_training_materials(
    current_user: User = Depends(RoleChecker([UserRole.EMPLOYEE])),
    session: AsyncSession = Depends(get_session),
):
    materials = await CohortService.list_training_materials_for_employee(
        user_id=current_user.id,
        session=session,
    )
    return {"materials": materials, "total": len(materials)}


@employee_training_router.get("/attendance", response_model=EmployeeAttendanceHistoryResponse)
async def get_employee_attendance_history(
    current_user: User = Depends(RoleChecker([UserRole.EMPLOYEE])),
    session: AsyncSession = Depends(get_session),
):
    history = await CohortService.list_attendance_history_for_employee(
        user_id=current_user.id,
        session=session,
    )
    return {"attendance": history, "total": len(history)}
