"""Business logic for cohort management (creation and professor assignment)."""

from typing import List, Optional
from datetime import date

from sqlalchemy import select, func
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    Cohort,
    CohortSession,
    CohortProfessorAssignment,
    CourseMaterial,
    EmployeeProfile,
    EmployeeSubmission,
    CompanyApplication,
    CohortSessionAttendance,
    AttendanceStatus,
    Professor,
    User,
    UserRole,
    AccountStatus,
    ApplicationStatus,
    EmployeeSubmissionStatus,
    CallForApplicants,
    CallStatus,
    Course,
)
from ..schemas.cohort_schema import CohortCreate


class CohortService:
    @staticmethod
    async def _get_professor_by_user_id(user_id: int, session: AsyncSession) -> Optional[Professor]:
        return (
            await session.execute(select(Professor).where(Professor.user_id == user_id))
        ).scalar_one_or_none()

    @staticmethod
    async def get_assigned_cohort_for_professor(
        cohort_id: int,
        user_id: int,
        session: AsyncSession,
    ) -> Optional[Cohort]:
        professor = await CohortService._get_professor_by_user_id(user_id, session)
        if not professor:
            return None

        query = (
            select(Cohort)
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(
                Cohort.id == cohort_id,
                CohortProfessorAssignment.professor_id == professor.id,
            )
            .options(selectinload(Cohort.sessions), selectinload(Cohort.course))
        )
        return (await session.execute(query)).scalar_one_or_none()

    @staticmethod
    def _validate_session_inside_margin(
        cohort: Cohort,
        session_date,
        start_time,
        end_time,
    ) -> None:
        if session_date < cohort.training_start_date or session_date > cohort.training_end_date:
            raise ValueError(
                "La date de session doit etre comprise entre les dates de formation du cohort"
            )

        if start_time >= end_time:
            raise ValueError("L'heure de debut doit etre avant l'heure de fin")

        if start_time < cohort.daily_start_hour or end_time > cohort.daily_end_hour:
            raise ValueError(
                "Les heures de session doivent rester dans la marge horaire du cohort"
            )

    @staticmethod
    async def list_sessions_for_professor_cohort(
        cohort: Cohort,
        user_id: int,
        session: AsyncSession,
    ) -> List[CohortSession]:
        professor = await CohortService._get_professor_by_user_id(user_id, session)
        if not professor:
            return []

        query = (
            select(CohortSession)
            .where(
                CohortSession.cohort_id == cohort.id,
                CohortSession.professor_id == professor.id,
            )
            .options(selectinload(CohortSession.professor).selectinload(Professor.user))
            .order_by(CohortSession.session_date.asc(), CohortSession.start_time.asc())
        )
        return list((await session.execute(query)).scalars().all())

    @staticmethod
    async def create_cohort_session(
        cohort: Cohort,
        user_id: int,
        title,
        session_date,
        start_time,
        end_time,
        location,
        session: AsyncSession,
    ) -> CohortSession:
        professor = await CohortService._get_professor_by_user_id(user_id, session)
        if not professor:
            raise ValueError("Profil professeur introuvable")

        if cohort.training_end_date < date.today():
            raise ValueError("Ce cohort est termine. Creation de session indisponible")

        CohortService._validate_session_inside_margin(cohort, session_date, start_time, end_time)

        new_session = CohortSession(
            cohort_id=cohort.id,
            professor_id=professor.id,
            title=title.strip(),
            session_date=session_date,
            start_time=start_time,
            end_time=end_time,
            location=location.strip() if location else None,
        )
        session.add(new_session)
        await session.commit()

        return (
            await session.execute(
                select(CohortSession)
                .where(CohortSession.id == new_session.id)
                .options(selectinload(CohortSession.professor).selectinload(Professor.user))
            )
        ).scalar_one()

    @staticmethod
    async def update_cohort_session(
        cohort: Cohort,
        session_id: int,
        user_id: int,
        title,
        session_date,
        start_time,
        end_time,
        location,
        session: AsyncSession,
    ) -> Optional[CohortSession]:
        professor = await CohortService._get_professor_by_user_id(user_id, session)
        if not professor:
            return None

        existing = (
            await session.execute(
                select(CohortSession)
                .where(
                    CohortSession.id == session_id,
                    CohortSession.cohort_id == cohort.id,
                    CohortSession.professor_id == professor.id,
                )
                .options(selectinload(CohortSession.professor).selectinload(Professor.user))
            )
        ).scalar_one_or_none()
        if not existing:
            return None

        if cohort.training_end_date < date.today():
            raise ValueError("Ce cohort est termine. Modification de session indisponible")

        CohortService._validate_session_inside_margin(cohort, session_date, start_time, end_time)

        existing.title = title.strip()
        existing.session_date = session_date
        existing.start_time = start_time
        existing.end_time = end_time
        existing.location = location.strip() if location else None

        await session.commit()
        await session.refresh(existing)
        return existing

    @staticmethod
    async def delete_cohort_session(
        cohort: Cohort,
        session_id: int,
        user_id: int,
        session: AsyncSession,
    ) -> bool:
        professor = await CohortService._get_professor_by_user_id(user_id, session)
        if not professor:
            return False

        target = (
            await session.execute(
                select(CohortSession).where(
                    CohortSession.id == session_id,
                    CohortSession.cohort_id == cohort.id,
                    CohortSession.professor_id == professor.id,
                )
            )
        ).scalar_one_or_none()
        if not target:
            return False

        await session.delete(target)
        await session.commit()
        return True

    @staticmethod
    def to_session_out_payload(item: CohortSession) -> dict:
        return {
            "id": item.id,
            "cohort_id": item.cohort_id,
            "professor_id": item.professor_id,
            "professor_name": item.professor.user.fullname if item.professor and item.professor.user else "",
            "title": item.title,
            "session_date": item.session_date,
            "start_time": item.start_time.strftime("%H:%M"),
            "end_time": item.end_time.strftime("%H:%M"),
            "location": item.location,
            "created_at": item.created_at,
        }

    @staticmethod
    async def get_form_options_for_coordinator(
        coordinator_id: int,
        session: AsyncSession,
        is_admin: bool = False,
    ) -> dict:
        call_query = select(CallForApplicants).where(
            CallForApplicants.status == CallStatus.RESULTS_PUBLISHED
        )
        if not is_admin:
            call_query = call_query.where(CallForApplicants.created_by_id == coordinator_id)
        call_query = call_query.order_by(CallForApplicants.results_publication_date.desc())

        calls = (await session.execute(call_query)).scalars().all()
        courses = (await session.execute(select(Course).order_by(Course.title.asc()))).scalars().all()

        return {
            "calls": [
                {
                    "id": call.id,
                    "title": call.title,
                    "reference_number": call.reference_number,
                    "results_publication_date": call.results_publication_date.date()
                    if call.results_publication_date
                    else None,
                }
                for call in calls
            ],
            "courses": [{"id": course.id, "title": course.title} for course in courses],
        }

    @staticmethod
    async def list_cohorts_for_coordinator(
        coordinator_id: int,
        session: AsyncSession,
        is_admin: bool = False,
    ) -> List[Cohort]:
        query = (
            select(Cohort)
            .options(
                selectinload(Cohort.call),
                selectinload(Cohort.course),
                selectinload(Cohort.professors).selectinload(Professor.user),
            )
            .order_by(Cohort.created_at.desc())
        )

        if not is_admin:
            query = query.join(CallForApplicants, Cohort.call_id == CallForApplicants.id).where(
                CallForApplicants.created_by_id == coordinator_id
            )

        return list((await session.execute(query)).scalars().all())

    @staticmethod
    async def create_cohort(
        payload: CohortCreate,
        coordinator_id: int,
        session: AsyncSession,
        is_admin: bool = False,
    ) -> Cohort:
        cohort_name = payload.name.strip()
        if not cohort_name:
            raise ValueError("Le nom du cohort est requis")

        existing_name = (
            await session.execute(
                select(Cohort.id).where(func.lower(Cohort.name) == cohort_name.lower())
            )
        ).scalars().first()
        if existing_name is not None:
            raise ValueError("Le nom du cohort existe deja. Veuillez choisir un autre nom")

        call = (
            await session.execute(
                select(CallForApplicants).where(CallForApplicants.id == payload.call_id)
            )
        ).scalar_one_or_none()
        if not call:
            raise ValueError("Appel introuvable")

        if call.status != CallStatus.RESULTS_PUBLISHED:
            raise ValueError("Un cohort ne peut etre cree que pour un appel avec resultats publies")

        if not call.results_publication_date:
            raise ValueError("La date de publication des resultats de l'appel est introuvable")

        results_publication_date = call.results_publication_date.date()

        if payload.training_start_date <= results_publication_date:
            raise ValueError(
                "La date de debut doit etre apres la date de publication des resultats"
            )

        if payload.training_end_date <= results_publication_date:
            raise ValueError(
                "La date de fin doit etre apres la date de publication des resultats"
            )

        if payload.training_end_date <= payload.training_start_date:
            raise ValueError("La date de fin doit etre apres la date de debut")

        overlapping = (
            await session.execute(
                select(Cohort.id).where(
                    Cohort.call_id == payload.call_id,
                    Cohort.training_start_date <= payload.training_end_date,
                    Cohort.training_end_date >= payload.training_start_date,
                )
            )
        ).scalars().first()
        if overlapping is not None:
            raise ValueError(
                "Ce cohort chevauche les dates d'un autre cohort pour le meme appel"
            )

        if not is_admin and call.created_by_id != coordinator_id:
            raise ValueError("Vous ne pouvez pas creer de cohort pour cet appel")

        course = (
            await session.execute(select(Course).where(Course.id == payload.course_id))
        ).scalar_one_or_none()
        if not course:
            raise ValueError("Formation introuvable")

        cohort = Cohort(
            name=cohort_name,
            call_id=payload.call_id,
            course_id=payload.course_id,
            training_start_date=payload.training_start_date,
            training_end_date=payload.training_end_date,
            daily_start_hour=payload.daily_start_hour,
            daily_end_hour=payload.daily_end_hour,
            created_by_id=coordinator_id,
        )
        session.add(cohort)
        await session.commit()

        return await CohortService.get_cohort_by_id(cohort.id, session)

    @staticmethod
    async def get_cohort_by_id(cohort_id: int, session: AsyncSession) -> Optional[Cohort]:
        query = select(Cohort).where(Cohort.id == cohort_id).options(
            selectinload(Cohort.call),
            selectinload(Cohort.course),
            selectinload(Cohort.professors).selectinload(Professor.user),
        )
        return (await session.execute(query)).scalar_one_or_none()

    @staticmethod
    async def get_coordinator_cohort_by_id(
        cohort_id: int,
        coordinator_id: int,
        session: AsyncSession,
        is_admin: bool = False,
    ) -> Optional[Cohort]:
        query = (
            select(Cohort)
            .join(CallForApplicants, Cohort.call_id == CallForApplicants.id)
            .where(Cohort.id == cohort_id)
            .options(
                selectinload(Cohort.call),
                selectinload(Cohort.course),
                selectinload(Cohort.professors).selectinload(Professor.user),
            )
        )
        if not is_admin:
            query = query.where(CallForApplicants.created_by_id == coordinator_id)

        return (await session.execute(query)).scalar_one_or_none()

    @staticmethod
    async def list_available_professors(session: AsyncSession) -> List[Professor]:
        query = (
            select(Professor)
            .join(User, Professor.user_id == User.id)
            .where(
                User.role == UserRole.PROFESSOR,
                User.account_status == AccountStatus.ACTIVE,
            )
            .options(selectinload(Professor.user))
            .order_by(User.fullname.asc())
        )
        return list((await session.execute(query)).scalars().all())

    @staticmethod
    async def assign_professors_to_cohort(
        cohort: Cohort,
        professor_ids: List[int],
        assigned_by_id: int,
        session: AsyncSession,
    ) -> Cohort:
        unique_professor_ids = list(set(professor_ids))

        if unique_professor_ids:
            valid_ids = {
                pid
                for (pid,) in (
                    await session.execute(
                        select(Professor.id)
                        .join(User, Professor.user_id == User.id)
                        .where(
                            Professor.id.in_(unique_professor_ids),
                            User.role == UserRole.PROFESSOR,
                            User.account_status == AccountStatus.ACTIVE,
                        )
                    )
                ).all()
            }
            missing = set(unique_professor_ids) - valid_ids
            if missing:
                raise ValueError("Un ou plusieurs professeurs selectionnes sont invalides")

        await session.execute(
            CohortProfessorAssignment.__table__.delete().where(
                CohortProfessorAssignment.cohort_id == cohort.id
            )
        )

        for professor_id in unique_professor_ids:
            session.add(
                CohortProfessorAssignment(
                    cohort_id=cohort.id,
                    professor_id=professor_id,
                    assigned_by_id=assigned_by_id,
                )
            )

        await session.commit()
        return await CohortService.get_cohort_by_id(cohort.id, session)

    @staticmethod
    def to_cohort_out_payload(cohort: Cohort) -> dict:
        return {
            "id": cohort.id,
            "name": cohort.name,
            "call_id": cohort.call_id,
            "call_title": cohort.call.title if cohort.call else "",
            "call_reference_number": cohort.call.reference_number if cohort.call else "",
            "course_id": cohort.course_id,
            "course_title": cohort.course.title if cohort.course else "",
            "training_start_date": cohort.training_start_date,
            "training_end_date": cohort.training_end_date,
            "daily_start_hour": cohort.daily_start_hour,
            "daily_end_hour": cohort.daily_end_hour,
            "created_at": cohort.created_at,
            "professors": [
                {
                    "id": professor.id,
                    "user_id": professor.user_id,
                    "fullname": professor.user.fullname if professor.user else "",
                    "email": professor.user.email if professor.user else "",
                    "specialization": professor.specialization,
                    "department": professor.department.value if professor.department else None,
                }
                for professor in cohort.professors
            ],
        }

    @staticmethod
    def to_professor_option_payload(professor: Professor) -> dict:
        return {
            "id": professor.id,
            "user_id": professor.user_id,
            "fullname": professor.user.fullname if professor.user else "",
            "email": professor.user.email if professor.user else "",
            "specialization": professor.specialization,
            "department": professor.department.value if professor.department else None,
        }

    @staticmethod
    async def list_cohorts_for_professor(user_id: int, session: AsyncSession) -> List[Cohort]:
        professor = (
            await session.execute(select(Professor).where(Professor.user_id == user_id))
        ).scalar_one_or_none()
        if not professor:
            return []

        query = (
            select(Cohort)
            .join(CohortProfessorAssignment, CohortProfessorAssignment.cohort_id == Cohort.id)
            .where(CohortProfessorAssignment.professor_id == professor.id)
            .options(selectinload(Cohort.call), selectinload(Cohort.course))
            .order_by(Cohort.training_start_date.asc())
        )
        return list((await session.execute(query)).scalars().all())

    @staticmethod
    async def _get_employee_profile_by_user_id(
        user_id: int,
        session: AsyncSession,
    ) -> Optional[EmployeeProfile]:
        return (
            await session.execute(select(EmployeeProfile).where(EmployeeProfile.user_id == user_id))
        ).scalar_one_or_none()

    @staticmethod
    async def _get_employee_approved_call_ids(
        user_id: int,
        session: AsyncSession,
    ) -> List[int]:
        employee = await CohortService._get_employee_profile_by_user_id(user_id, session)
        if not employee:
            return []

        query = (
            select(CompanyApplication.call_id)
            .join(
                EmployeeSubmission,
                EmployeeSubmission.company_application_id == CompanyApplication.id,
            )
            .where(
                EmployeeSubmission.employee_id == employee.id,
                EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED,
                CompanyApplication.status == ApplicationStatus.APPROVED,
            )
            .distinct()
        )
        return list((await session.execute(query)).scalars().all())

    @staticmethod
    async def list_training_cohorts_for_employee(
        user_id: int,
        session: AsyncSession,
    ) -> List[Cohort]:
        call_ids = await CohortService._get_employee_approved_call_ids(user_id, session)
        if not call_ids:
            return []

        query = (
            select(Cohort)
            .where(Cohort.call_id.in_(call_ids))
            .options(
                selectinload(Cohort.call),
                selectinload(Cohort.course),
                selectinload(Cohort.sessions)
                .selectinload(CohortSession.professor)
                .selectinload(Professor.user),
            )
            .order_by(Cohort.training_start_date.asc())
        )

        return list((await session.execute(query)).scalars().all())

    @staticmethod
    async def list_training_materials_for_employee(
        user_id: int,
        session: AsyncSession,
    ) -> List[dict]:
        cohorts = await CohortService.list_training_cohorts_for_employee(user_id, session)
        if not cohorts:
            return []

        seen_material_ids: set[int] = set()
        payload: List[dict] = []

        for cohort in cohorts:
            query = (
                select(CourseMaterial)
                .where(CourseMaterial.course_id == cohort.course_id)
                .order_by(CourseMaterial.created_at.desc())
            )
            materials = list((await session.execute(query)).scalars().all())

            for item in materials:
                if item.id in seen_material_ids:
                    continue
                seen_material_ids.add(item.id)

                payload.append(
                    {
                        "id": item.id,
                        "cohort_id": cohort.id,
                        "cohort_name": cohort.name,
                        "course_id": item.course_id,
                        "course_title": cohort.course.title if cohort.course else "",
                        "title": item.title,
                        "description": item.description,
                        "file_name": item.file_name,
                        "file_size": item.file_size,
                        "file_type": item.file_type,
                        "created_at": item.created_at,
                    }
                )

        payload.sort(key=lambda m: m["created_at"], reverse=True)
        return payload

    @staticmethod
    async def list_enrolled_employees_for_cohort(
        cohort_id: int,
        session: AsyncSession,
    ) -> List[EmployeeProfile]:
        cohort = (
            await session.execute(select(Cohort).where(Cohort.id == cohort_id))
        ).scalar_one_or_none()
        if not cohort:
            return []

        query = (
            select(EmployeeProfile)
            .join(EmployeeSubmission, EmployeeSubmission.employee_id == EmployeeProfile.id)
            .join(
                CompanyApplication,
                CompanyApplication.id == EmployeeSubmission.company_application_id,
            )
            .where(
                CompanyApplication.call_id == cohort.call_id,
                CompanyApplication.status == ApplicationStatus.APPROVED,
                EmployeeSubmission.status == EmployeeSubmissionStatus.APPROVED,
            )
            .options(selectinload(EmployeeProfile.user), selectinload(EmployeeProfile.company))
            .order_by(EmployeeProfile.id.asc())
        )

        return list((await session.execute(query)).scalars().unique().all())

    @staticmethod
    async def get_professor_session_in_cohort(
        cohort_id: int,
        session_id: int,
        user_id: int,
        session: AsyncSession,
    ) -> Optional[CohortSession]:
        professor = await CohortService._get_professor_by_user_id(user_id, session)
        if not professor:
            return None

        query = (
            select(CohortSession)
            .where(
                CohortSession.id == session_id,
                CohortSession.cohort_id == cohort_id,
                CohortSession.professor_id == professor.id,
            )
            .options(selectinload(CohortSession.cohort), selectinload(CohortSession.professor).selectinload(Professor.user))
        )
        return (await session.execute(query)).scalar_one_or_none()

    @staticmethod
    async def list_attendance_for_professor_session(
        cohort_id: int,
        session_id: int,
        user_id: int,
        session: AsyncSession,
    ) -> List[dict]:
        target_session = await CohortService.get_professor_session_in_cohort(
            cohort_id=cohort_id,
            session_id=session_id,
            user_id=user_id,
            session=session,
        )
        if not target_session:
            return []

        employees = await CohortService.list_enrolled_employees_for_cohort(cohort_id, session)
        if not employees:
            return []

        employee_ids = [item.id for item in employees]
        existing_rows = (
            await session.execute(
                select(CohortSessionAttendance)
                .where(
                    CohortSessionAttendance.session_id == session_id,
                    CohortSessionAttendance.employee_id.in_(employee_ids),
                )
            )
        ).scalars().all()
        existing_by_employee = {row.employee_id: row for row in existing_rows}

        payload: List[dict] = []
        for employee in employees:
            attendance = existing_by_employee.get(employee.id)
            payload.append(
                {
                    "employee_id": employee.id,
                    "employee_name": employee.user.fullname if employee.user else "",
                    "employee_email": employee.user.email if employee.user else "",
                    "company_name": employee.company.name if employee.company else None,
                    "status": attendance.status.value if attendance else None,
                    "notes": attendance.notes if attendance else None,
                    "marked_at": attendance.marked_at if attendance else None,
                }
            )

        return payload

    @staticmethod
    async def mark_attendance_for_session(
        cohort_id: int,
        session_id: int,
        user_id: int,
        rows: List[dict],
        session: AsyncSession,
    ) -> List[dict]:
        target_session = await CohortService.get_professor_session_in_cohort(
            cohort_id=cohort_id,
            session_id=session_id,
            user_id=user_id,
            session=session,
        )
        if not target_session:
            raise ValueError("Session introuvable")

        enrolled_employees = await CohortService.list_enrolled_employees_for_cohort(cohort_id, session)
        enrolled_ids = {item.id for item in enrolled_employees}

        for row in rows:
            if row["employee_id"] not in enrolled_ids:
                raise ValueError("Un employe ne fait pas partie de ce cohort")

        requested_ids = [row["employee_id"] for row in rows]
        existing_rows = (
            await session.execute(
                select(CohortSessionAttendance)
                .where(
                    CohortSessionAttendance.session_id == session_id,
                    CohortSessionAttendance.employee_id.in_(requested_ids),
                )
            )
        ).scalars().all()
        existing_by_employee = {row.employee_id: row for row in existing_rows}

        for row in rows:
            existing = existing_by_employee.get(row["employee_id"])
            if existing:
                existing.status = AttendanceStatus(row["status"])
                existing.notes = row.get("notes")
                existing.marked_by_id = user_id
            else:
                session.add(
                    CohortSessionAttendance(
                        session_id=session_id,
                        employee_id=row["employee_id"],
                        status=AttendanceStatus(row["status"]),
                        notes=row.get("notes"),
                        marked_by_id=user_id,
                    )
                )

        await session.commit()
        return await CohortService.list_attendance_for_professor_session(
            cohort_id=cohort_id,
            session_id=session_id,
            user_id=user_id,
            session=session,
        )

    @staticmethod
    async def list_attendance_history_for_employee(
        user_id: int,
        session: AsyncSession,
    ) -> List[dict]:
        employee = await CohortService._get_employee_profile_by_user_id(user_id, session)
        if not employee:
            return []

        attendance_rows = (
            await session.execute(
                select(CohortSessionAttendance)
                .where(CohortSessionAttendance.employee_id == employee.id)
                .options(
                    selectinload(CohortSessionAttendance.session)
                    .selectinload(CohortSession.cohort)
                    .selectinload(Cohort.course),
                    selectinload(CohortSessionAttendance.session)
                    .selectinload(CohortSession.professor)
                    .selectinload(Professor.user),
                )
                .order_by(CohortSessionAttendance.marked_at.desc())
            )
        ).scalars().all()

        payload: List[dict] = []
        for row in attendance_rows:
            session_item = row.session
            cohort = session_item.cohort if session_item else None
            payload.append(
                {
                    "session_id": session_item.id if session_item else 0,
                    "session_title": session_item.title if session_item else "",
                    "session_date": session_item.session_date if session_item else None,
                    "start_time": session_item.start_time.strftime("%H:%M") if session_item else "",
                    "end_time": session_item.end_time.strftime("%H:%M") if session_item else "",
                    "location": session_item.location if session_item else None,
                    "cohort_id": cohort.id if cohort else 0,
                    "cohort_name": cohort.name if cohort else "",
                    "course_title": cohort.course.title if cohort and cohort.course else "",
                    "professor_name": (
                        session_item.professor.user.fullname
                        if session_item and session_item.professor and session_item.professor.user
                        else ""
                    ),
                    "status": row.status.value,
                    "notes": row.notes,
                    "marked_at": row.marked_at,
                }
            )

        return payload
