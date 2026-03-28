"""
Feedback API endpoints for course feedback system.
- Employees can submit/update feedback for courses they attended
- Staff can view all feedback
- Professors can view feedback for their courses
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.database import get_session
from ..db.models import (
    User, UserRole, CourseFeedback, Course, 
    EmployeeProfile, EmployeeSubmission, CompanyApplication, 
    Cohort, EmployeeSubmissionStatus, ApplicationStatus
)
from ..dependencies import get_current_user
from ..schemas.feedback_schema import (
    FeedbackCreate,
    FeedbackUpdate,
    FeedbackOut,
    FeedbackListResponse,
    FeedbackEmployeeOut,
    MyFeedbackOut,
)

feedback_router = APIRouter()


async def get_employee_profile(user: User, session: AsyncSession) -> EmployeeProfile:
    """Get employee profile for current user"""
    if user.role != UserRole.EMPLOYEE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employees can submit feedback"
        )
    
    result = await session.execute(
        select(EmployeeProfile).where(EmployeeProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found"
        )
    
    return profile


async def check_employee_enrolled(
    employee_id: int, 
    course_id: int, 
    session: AsyncSession
) -> bool:
    """
    Check if employee is enrolled in the course via approved submission.
    Updated for Call for Applicants workflow.
    """
    result = await session.execute(
        select(EmployeeSubmission)
        .join(CompanyApplication, EmployeeSubmission.company_application_id == CompanyApplication.id)
        .join(Cohort, Cohort.call_id == CompanyApplication.call_id)
        .where(
            and_(
                EmployeeSubmission.employee_id == employee_id,
                EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED,
                CompanyApplication.status == ApplicationStatus.APPROVED,
                Cohort.course_id == course_id
            )
        )
    )
    return result.scalar_one_or_none() is not None


def build_feedback_response(feedback: CourseFeedback, hide_identity: bool = False) -> FeedbackOut:
    """Build feedback response, optionally hiding identity"""
    employee_info = None
    if not feedback.is_anonymous and not hide_identity and feedback.employee:
        employee_info = FeedbackEmployeeOut(
            id=feedback.employee.id,
            fullname=feedback.employee.user.fullname if feedback.employee.user else "Inconnu"
        )
    
    return FeedbackOut(
        id=feedback.id,
        course_id=feedback.course_id,
        rating=feedback.rating,
        comment=feedback.comment,
        is_anonymous=feedback.is_anonymous,
        created_at=feedback.created_at,
        updated_at=feedback.updated_at,
        employee=employee_info
    )


@feedback_router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Submit feedback for a course.
    - Only employees enrolled in the course can submit
    - One feedback per employee per course (update if exists)
    """
    employee = await get_employee_profile(current_user, session)
    
    # Check if enrolled
    is_enrolled = await check_employee_enrolled(employee.id, data.course_id, session)
    if not is_enrolled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous devez être inscrit à cette formation pour donner un avis"
        )
    
    # Check for existing feedback
    existing = await session.execute(
        select(CourseFeedback)
        .where(
            CourseFeedback.course_id == data.course_id,
            CourseFeedback.employee_id == employee.id
        )
    )
    existing_feedback = existing.scalar_one_or_none()
    
    if existing_feedback:
        # Update existing feedback
        existing_feedback.rating = data.rating
        existing_feedback.comment = data.comment
        existing_feedback.is_anonymous = data.is_anonymous
        await session.commit()
        await session.refresh(existing_feedback)
        return build_feedback_response(existing_feedback)
    
    # Create new feedback
    feedback = CourseFeedback(
        course_id=data.course_id,
        employee_id=employee.id if not data.is_anonymous else None,
        is_anonymous=data.is_anonymous,
        rating=data.rating,
        comment=data.comment
    )
    
    # For non-anonymous, we still store employee_id for the unique constraint
    if not data.is_anonymous:
        feedback.employee_id = employee.id
    else:
        # For anonymous, we need to track who submitted to enforce one per employee
        # Store in employee_id but mark as anonymous
        feedback.employee_id = employee.id
    
    session.add(feedback)
    await session.commit()
    await session.refresh(feedback)
    
    return build_feedback_response(feedback)


@feedback_router.get("/my-feedback", response_model=list[MyFeedbackOut])
async def get_my_feedback(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get all feedback submitted by the current employee"""
    employee = await get_employee_profile(current_user, session)
    
    result = await session.execute(
        select(CourseFeedback)
        .options(selectinload(CourseFeedback.course))
        .where(CourseFeedback.employee_id == employee.id)
        .order_by(CourseFeedback.created_at.desc())
    )
    feedback_list = result.scalars().all()
    
    return [
        MyFeedbackOut(
            id=f.id,
            course_id=f.course_id,
            course_title=f.course.title if f.course else "Formation supprimée",
            rating=f.rating,
            comment=f.comment,
            is_anonymous=f.is_anonymous,
            created_at=f.created_at
        )
        for f in feedback_list
    ]


@feedback_router.get("/course/{course_id}/my-feedback", response_model=FeedbackOut | None)
async def get_my_course_feedback(
    course_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get current employee's feedback for a specific course"""
    employee = await get_employee_profile(current_user, session)
    
    result = await session.execute(
        select(CourseFeedback)
        .options(selectinload(CourseFeedback.employee).selectinload(EmployeeProfile.user))
        .where(
            CourseFeedback.course_id == course_id,
            CourseFeedback.employee_id == employee.id
        )
    )
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        return None
    
    return build_feedback_response(feedback)


@feedback_router.delete("/course/{course_id}")
async def delete_my_feedback(
    course_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Delete current employee's feedback for a course"""
    employee = await get_employee_profile(current_user, session)
    
    result = await session.execute(
        select(CourseFeedback)
        .where(
            CourseFeedback.course_id == course_id,
            CourseFeedback.employee_id == employee.id
        )
    )
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found"
        )
    
    await session.delete(feedback)
    await session.commit()
    
    return {"message": "Avis supprimé avec succès"}


# =====================
# Staff endpoints
# =====================

@feedback_router.get("/staff/courses/{course_id}", response_model=FeedbackListResponse)
async def get_course_feedback_staff(
    course_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all feedback for a course (staff only).
    Anonymous feedback identity is completely hidden.
    """
    if current_user.role != UserRole.STAFF:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required"
        )
    
    # Verify course exists
    course_result = await session.execute(
        select(Course).where(Course.id == course_id)
    )
    if not course_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Get all feedback
    result = await session.execute(
        select(CourseFeedback)
        .options(selectinload(CourseFeedback.employee).selectinload(EmployeeProfile.user))
        .where(CourseFeedback.course_id == course_id)
        .order_by(CourseFeedback.created_at.desc())
    )
    feedback_list = result.scalars().all()
    
    # Calculate stats
    total = len(feedback_list)
    ratings = [f.rating for f in feedback_list]
    average_rating = sum(ratings) / total if total > 0 else 0.0
    
    rating_distribution = {i: 0 for i in range(1, 6)}
    for r in ratings:
        rating_distribution[r] += 1
    
    return FeedbackListResponse(
        feedback=[build_feedback_response(f) for f in feedback_list],
        total=total,
        average_rating=round(average_rating, 2),
        rating_distribution=rating_distribution
    )


# =====================
# Professor endpoints
# =====================

@feedback_router.get("/professor/courses/{course_id}", response_model=FeedbackListResponse)
async def get_course_feedback_professor(
    course_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get all feedback for a course the professor teaches.
    Anonymous feedback identity is completely hidden.
    """
    if current_user.role != UserRole.PROFESSOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professor access required"
        )
    
    # Verify course exists and belongs to this professor
    course_result = await session.execute(
        select(Course)
        .options(selectinload(Course.professor))
        .where(Course.id == course_id)
    )
    course = course_result.scalar_one_or_none()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if not course.professor or course.professor.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas le professeur de cette formation"
        )
    
    # Get all feedback
    result = await session.execute(
        select(CourseFeedback)
        .options(selectinload(CourseFeedback.employee).selectinload(EmployeeProfile.user))
        .where(CourseFeedback.course_id == course_id)
        .order_by(CourseFeedback.created_at.desc())
    )
    feedback_list = result.scalars().all()
    
    # Calculate stats
    total = len(feedback_list)
    ratings = [f.rating for f in feedback_list]
    average_rating = sum(ratings) / total if total > 0 else 0.0
    
    rating_distribution = {i: 0 for i in range(1, 6)}
    for r in ratings:
        rating_distribution[r] += 1
    
    return FeedbackListResponse(
        feedback=[build_feedback_response(f) for f in feedback_list],
        total=total,
        average_rating=round(average_rating, 2),
        rating_distribution=rating_distribution
    )
