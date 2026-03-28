"""
Domain Models for Formation Continue - Call for Applicants Workflow

This module defines the complete data model for the refactored system centered
around Calls for Applicants rather than session-based training.

Key Entities:
- CallForApplicants: Public calls published by Coordinators
- CompanyApplication: Company applications to calls
- ApplicationDocument: Documents uploaded by companies
- EmployeeSubmission: Employee document submissions (after company approval)
- EmployeeSubmissionDocument: Individual employee documents
- AuditLog: Traceability for all decisions
"""

from datetime import datetime, timezone, date, time
from typing import Optional, List
from enum import Enum
from .database import Base

from sqlalchemy import (
    TIMESTAMP,
    Date,
    Time,
    text,
    ForeignKey,
    UniqueConstraint,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)
from sqlalchemy.dialects.postgresql import JSONB


# =============================================================================
# ENUMS
# =============================================================================

class UserRole(str, Enum):
    """User roles in the system"""
    COMPANY = "company"
    EMPLOYEE = "employee"
    STAFF = "staff"
    PROFESSOR = "professor"
    ADMIN = "admin"
    COORDINATOR = "coordinator"


class CourseType(str, Enum):
    """Course visibility type"""
    PUBLIC = "public"
    PRIVATE = "private"


class Department(str, Enum):
    """Department/field for courses and calls"""
    INFORMATIQUE = "informatique"
    MECANIQUE = "mecanique"
    ELECTRIQUE = "electrique"
    CIVIL = "civil"
    GESTION = "gestion"
    
    @classmethod
    def get_display_name(cls, value: str) -> str:
        """Get the display name for a department value"""
        display_names = {
            "informatique": "Technologie de l'informatique",
            "mecanique": "Génie mécanique",
            "electrique": "Génie électrique",
            "civil": "Génie civil",
            "gestion": "Sciences Économiques et Sciences de Gestion",
        }
        return display_names.get(value, value)


class AccountStatus(str, Enum):
    """Account approval status for professors and companies"""
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class CallStatus(str, Enum):
    """Status of a Call for Applicants"""
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"
    UNDER_REVIEW = "under_review"
    RESULTS_PUBLISHED = "results_published"


class ApplicationStatus(str, Enum):
    """Status of a company application"""
    SUBMITTED = "submitted"
    DOCUMENTS_PENDING = "documents_pending"
    UNDER_REVIEW = "under_review"
    ADDITIONAL_INFO_REQUIRED = "additional_info_required"
    APPROVED = "approved"
    REJECTED = "rejected"


class DocumentReviewStatus(str, Enum):
    """Status of document review"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVISION_REQUIRED = "revision_required"


class EmployeeSubmissionStatus(str, Enum):
    """Status of employee document submission"""
    PENDING = "pending"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class AttendanceStatus(str, Enum):
    """Attendance status for a cohort session."""
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"


# =============================================================================
# USER & AUTH MODELS
# =============================================================================

class User(Base):
    """
    Core user model. All authenticated users have a User record.
    Role determines which profile type they have (Company, Professor, EmployeeProfile).
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    username: Mapped[str] = mapped_column(unique=True, nullable=False)
    email: Mapped[str] = mapped_column(unique=True, nullable=False)
    password: Mapped[Optional[str]]
    phone: Mapped[Optional[str]]
    fullname: Mapped[str] = mapped_column(nullable=False)

    role: Mapped[UserRole] = mapped_column(
        SQLEnum(
            UserRole,
            name="user_roles",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
    )

    is_verified: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False,
    )

    account_status: Mapped[AccountStatus] = mapped_column(
        SQLEnum(
            AccountStatus,
            name="account_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        server_default="active",
        nullable=False,
    )

    verification_document: Mapped[Optional[str]] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    company = relationship(
        "Company",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    professor = relationship(
        "Professor",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    employee_profile = relationship(
        "EmployeeProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    created_courses = relationship(
        "Course",
        back_populates="created_by",
        cascade="all, delete-orphan",
    )
    
    created_calls = relationship(
        "CallForApplicants",
        back_populates="created_by",
        foreign_keys="CallForApplicants.created_by_id",
    )

    created_cohorts = relationship(
        "Cohort",
        back_populates="created_by",
        foreign_keys="Cohort.created_by_id",
    )

    cohort_professor_assignments = relationship(
        "CohortProfessorAssignment",
        back_populates="assigned_by",
        foreign_keys="CohortProfessorAssignment.assigned_by_id",
    )


class Company(Base):
    """
    Company profile. Companies can apply to calls and manage employees.
    """
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(nullable=False)
    industry_sector: Mapped[str] = mapped_column(nullable=False)
    billing_info: Mapped[str] = mapped_column(nullable=False)

    user = relationship("User", back_populates="company")

    # Applications to calls
    applications = relationship(
        "CompanyApplication",
        back_populates="company",
        cascade="all, delete-orphan",
    )


class Professor(Base):
    """
    Professor profile. Professors can be assigned to courses.
    """
    __tablename__ = "professors"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    specialization: Mapped[str] = mapped_column(nullable=False)
    hourly_rate: Mapped[float] = mapped_column(nullable=False)
    
    department: Mapped[Optional[Department]] = mapped_column(
        SQLEnum(
            Department,
            name="department_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=True,
    )

    user = relationship("User", back_populates="professor")

    courses = relationship(
        "Course",
        back_populates="professor",
    )

    cohorts = relationship(
        "Cohort",
        secondary="cohort_professor_assignments",
        back_populates="professors",
        viewonly=True,
    )

    cohort_sessions = relationship(
        "CohortSession",
        back_populates="professor",
        cascade="all, delete-orphan",
    )


class EmployeeProfile(Base):
    """
    Profile for employee users.
    Employees can submit documents for approved company applications.
    """
    __tablename__ = "employee_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    
    # Link to company (if assigned)
    company_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
    )

    user = relationship("User", back_populates="employee_profile")
    company = relationship("Company", backref="employees")

    # Document submissions
    submissions = relationship(
        "EmployeeSubmission",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    cohort_attendance_records = relationship(
        "CohortSessionAttendance",
        back_populates="employee",
        cascade="all, delete-orphan",
    )


# =============================================================================
# COURSE MODELS (Static/Display Only)
# =============================================================================

class Course(Base):
    """
    Course represents a static training offering displayed on the landing page.
    Courses are grouped by department and are purely informational.
    """
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)

    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str] = mapped_column(nullable=False)
    short_description: Mapped[Optional[str]] = mapped_column(nullable=True)

    type: Mapped[CourseType] = mapped_column(
        SQLEnum(
            CourseType,
            name="course_types",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
    )

    price: Mapped[float] = mapped_column(nullable=False)
    max_seats: Mapped[int] = mapped_column(nullable=False)
    
    image_path: Mapped[Optional[str]] = mapped_column(nullable=True)
    duration_hours: Mapped[Optional[int]] = mapped_column(nullable=True)
    sector: Mapped[Optional[str]] = mapped_column(nullable=True, index=True)
    
    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )
    
    is_published: Mapped[bool] = mapped_column(
        server_default="true",
        nullable=False,
    )

    professor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("professors.id", ondelete="SET NULL"),
    )
    
    department: Mapped[Optional[Department]] = mapped_column(
        SQLEnum(
            Department,
            name="department_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=True,
    )
    
    learning_outcomes: Mapped[Optional[List[str]]] = mapped_column(
        JSONB,
        nullable=True,
        server_default="[]",
    )

    professor = relationship("Professor", back_populates="courses")
    created_by = relationship("User", back_populates="created_courses")
    
    materials = relationship(
        "CourseMaterial",
        back_populates="course",
        cascade="all, delete-orphan",
    )
    
    feedback = relationship(
        "CourseFeedback",
        back_populates="course",
        cascade="all, delete-orphan",
    )

    cohorts = relationship(
        "Cohort",
        back_populates="course",
    )


class CourseMaterial(Base):
    """
    Learning materials uploaded by professors for a course.
    """
    __tablename__ = "course_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    uploaded_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    file_path: Mapped[str] = mapped_column(nullable=False)
    file_name: Mapped[str] = mapped_column(nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False)
    file_type: Mapped[str] = mapped_column(nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )
    
    course = relationship("Course", back_populates="materials")
    uploaded_by = relationship("User")


class CourseFeedback(Base):
    """
    Feedback submitted by employees for courses.
    """
    __tablename__ = "course_feedback"
    __table_args__ = (
        UniqueConstraint("course_id", "employee_id", name="uq_course_employee_feedback"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    employee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employee_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    is_anonymous: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False,
    )
    
    rating: Mapped[int] = mapped_column(nullable=False)
    comment: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )
    
    course = relationship("Course", back_populates="feedback")
    employee = relationship("EmployeeProfile", backref="feedback")


# =============================================================================
# CALL FOR APPLICANTS MODELS
# =============================================================================

class CallForApplicants(Base):
    """
    Represents a public call for companies to apply for training programs.
    Published by Coordinators, visible on landing page.
    """
    __tablename__ = "calls_for_applicants"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    # Call identification
    title: Mapped[str] = mapped_column(nullable=False)
    reference_number: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    
    # Department association
    department: Mapped[Department] = mapped_column(
        SQLEnum(
            Department,
            name="department_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        index=True,
    )
    
    # Call description and requirements
    description: Mapped[str] = mapped_column(nullable=False)
    eligibility_criteria: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Required documents specification (JSON array)
    # Example: [{"type": "convention", "label": "Convention signée", "required": true}]
    required_documents: Mapped[List[dict]] = mapped_column(
        JSONB,
        nullable=False,
    )
    
    # Employee required documents (for after admission)
    # Example: [{"type": "cin", "label": "Carte d'identité", "required": true}]
    employee_required_documents: Mapped[List[dict]] = mapped_column(
        JSONB,
        nullable=False,
        server_default="[]",
    )
    
    # Deadlines
    application_start_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
    )
    application_deadline: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
    )
    results_publication_date: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    
    # Status management
    status: Mapped[CallStatus] = mapped_column(
        SQLEnum(
            CallStatus,
            name="call_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=CallStatus.DRAFT.value,
        index=True,
    )
    
    # Creator tracking (Coordinator)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )
    
    published_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    
    # Relationships
    created_by = relationship(
        "User",
        back_populates="created_calls",
        foreign_keys=[created_by_id],
    )
    applications = relationship(
        "CompanyApplication",
        back_populates="call",
        cascade="all, delete-orphan",
    )

    cohorts = relationship(
        "Cohort",
        back_populates="call",
    )


class Cohort(Base):
    """
    Training cohort created after results publication.
    Defines the training date/hour boundaries for subsequent execution phase.
    """
    __tablename__ = "cohorts"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(nullable=False, index=True)

    call_id: Mapped[int] = mapped_column(
        ForeignKey("calls_for_applicants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    training_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    training_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    daily_start_hour: Mapped[time] = mapped_column(Time, nullable=False)
    daily_end_hour: Mapped[time] = mapped_column(Time, nullable=False)

    created_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )

    call = relationship("CallForApplicants", back_populates="cohorts")
    course = relationship("Course", back_populates="cohorts")
    created_by = relationship("User", back_populates="created_cohorts", foreign_keys=[created_by_id])

    professor_assignments = relationship(
        "CohortProfessorAssignment",
        back_populates="cohort",
        cascade="all, delete-orphan",
    )

    professors = relationship(
        "Professor",
        secondary="cohort_professor_assignments",
        back_populates="cohorts",
        viewonly=True,
    )

    sessions = relationship(
        "CohortSession",
        back_populates="cohort",
        cascade="all, delete-orphan",
    )


class CohortProfessorAssignment(Base):
    """Many-to-many assignment between cohorts and professors."""
    __tablename__ = "cohort_professor_assignments"
    __table_args__ = (
        UniqueConstraint("cohort_id", "professor_id", name="uq_cohort_professor_assignment"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    professor_id: Mapped[int] = mapped_column(
        ForeignKey("professors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    assigned_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    cohort = relationship("Cohort", back_populates="professor_assignments")
    professor = relationship("Professor", backref="cohort_assignments")
    assigned_by = relationship("User", back_populates="cohort_professor_assignments", foreign_keys=[assigned_by_id])


class CohortSession(Base):
    """Training session planned by an assigned professor inside cohort margins."""
    __tablename__ = "cohort_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)

    cohort_id: Mapped[int] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    professor_id: Mapped[int] = mapped_column(
        ForeignKey("professors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )

    cohort = relationship("Cohort", back_populates="sessions")
    professor = relationship("Professor", back_populates="cohort_sessions")
    attendance_records = relationship(
        "CohortSessionAttendance",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class CohortSessionAttendance(Base):
    """Attendance record for one employee in one cohort session."""
    __tablename__ = "cohort_session_attendance"
    __table_args__ = (
        UniqueConstraint("session_id", "employee_id", name="uq_cohort_session_employee_attendance"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    session_id: Mapped[int] = mapped_column(
        ForeignKey("cohort_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employee_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[AttendanceStatus] = mapped_column(
        SQLEnum(
            AttendanceStatus,
            name="attendance_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        server_default=AttendanceStatus.PRESENT.value,
    )

    notes: Mapped[Optional[str]] = mapped_column(nullable=True)

    marked_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    marked_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )

    session = relationship("CohortSession", back_populates="attendance_records")
    employee = relationship("EmployeeProfile", back_populates="cohort_attendance_records")
    marked_by = relationship("User", backref="marked_cohort_attendance", foreign_keys=[marked_by_id])


class CompanyApplication(Base):
    """
    Company application to a specific Call for Applicants.
    Tracks entire application lifecycle.
    """
    __tablename__ = "company_applications"
    __table_args__ = (
        UniqueConstraint("call_id", "company_id", name="uq_call_company_application"),
        Index("ix_company_applications_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    call_id: Mapped[int] = mapped_column(
        ForeignKey("calls_for_applicants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Application status
    status: Mapped[ApplicationStatus] = mapped_column(
        SQLEnum(
            ApplicationStatus,
            name="application_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=ApplicationStatus.SUBMITTED.value,
    )
    
    # Company notes/motivation
    motivation_letter: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Number of employees to be trained
    proposed_employee_count: Mapped[int] = mapped_column(nullable=False)
    
    # Coordinator decision fields
    coordinator_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    decision_date: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    decision_notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Timestamps
    submitted_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )
    
    # Relationships
    call = relationship("CallForApplicants", back_populates="applications")
    company = relationship("Company", back_populates="applications")
    coordinator = relationship(
        "User",
        foreign_keys=[coordinator_id],
        backref="reviewed_applications",
    )
    documents = relationship(
        "ApplicationDocument",
        back_populates="application",
        cascade="all, delete-orphan",
    )
    employee_submissions = relationship(
        "EmployeeSubmission",
        back_populates="company_application",
        cascade="all, delete-orphan",
    )


class ApplicationDocument(Base):
    """
    Document uploaded by a company as part of their application.
    """
    __tablename__ = "application_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    application_id: Mapped[int] = mapped_column(
        ForeignKey("company_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Document type (matches required_documents from Call)
    document_type: Mapped[str] = mapped_column(nullable=False)
    document_label: Mapped[str] = mapped_column(nullable=False)
    
    # File storage
    file_path: Mapped[str] = mapped_column(nullable=False)
    original_filename: Mapped[str] = mapped_column(nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(nullable=False)
    
    # Review status
    review_status: Mapped[DocumentReviewStatus] = mapped_column(
        SQLEnum(
            DocumentReviewStatus,
            name="document_review_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=DocumentReviewStatus.PENDING.value,
    )
    
    # Review details
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    review_notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    # Relationships
    application = relationship("CompanyApplication", back_populates="documents")
    reviewed_by = relationship("User", backref="reviewed_app_documents")


# =============================================================================
# EMPLOYEE SUBMISSION MODELS
# =============================================================================

class EmployeeSubmission(Base):
    """
    Employee document submission for an admitted company.
    Only available after company application is approved.
    """
    __tablename__ = "employee_submissions"
    __table_args__ = (
        UniqueConstraint(
            "company_application_id", "employee_id",
            name="uq_application_employee_submission"
        ),
        Index("ix_employee_submissions_status", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    company_application_id: Mapped[int] = mapped_column(
        ForeignKey("company_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employee_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Submission status
    status: Mapped[EmployeeSubmissionStatus] = mapped_column(
        SQLEnum(
            EmployeeSubmissionStatus,
            name="employee_submission_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=EmployeeSubmissionStatus.PENDING.value,
    )
    
    # Review details
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    review_notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )
    
    # Relationships
    company_application = relationship(
        "CompanyApplication",
        back_populates="employee_submissions",
    )
    employee = relationship("EmployeeProfile", back_populates="submissions")
    reviewed_by = relationship("User", backref="reviewed_employee_submissions")
    documents = relationship(
        "EmployeeSubmissionDocument",
        back_populates="submission",
        cascade="all, delete-orphan",
    )


class EmployeeSubmissionDocument(Base):
    """
    Document uploaded by an employee for their submission.
    """
    __tablename__ = "employee_submission_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("employee_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Document type (matches employee_required_documents from Call)
    document_type: Mapped[str] = mapped_column(nullable=False)
    document_label: Mapped[str] = mapped_column(nullable=False)
    
    # File storage
    file_path: Mapped[str] = mapped_column(nullable=False)
    original_filename: Mapped[str] = mapped_column(nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False)
    mime_type: Mapped[str] = mapped_column(nullable=False)
    
    # Review status
    review_status: Mapped[DocumentReviewStatus] = mapped_column(
        SQLEnum(
            DocumentReviewStatus,
            name="document_review_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=DocumentReviewStatus.PENDING.value,
    )
    
    # Review details
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    review_notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Timestamps
    uploaded_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    # Relationships
    submission = relationship("EmployeeSubmission", back_populates="documents")
    reviewed_by = relationship("User", backref="reviewed_emp_docs")


# =============================================================================
# NEWSLETTER & NEWS MODELS
# =============================================================================

class NewsletterSubscription(Base):
    """
    Newsletter subscription model for sector-targeted campaigns.
    """
    __tablename__ = "newsletter_subscriptions"
    __table_args__ = (
        UniqueConstraint("email", name="uq_newsletter_email"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    email: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    sector: Mapped[str] = mapped_column(nullable=False, index=True)
    
    company_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    is_active: Mapped[bool] = mapped_column(
        server_default="true",
        nullable=False,
    )
    
    subscribed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    unsubscribed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )

    company = relationship("Company", backref="newsletter_subscriptions")


class News(Base):
    """
    News/Announcement model for the landing page.
    """
    __tablename__ = "news"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    title: Mapped[str] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(nullable=False)
    excerpt: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    image_path: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    is_published: Mapped[bool] = mapped_column(
        server_default="true",
        nullable=False,
    )
    
    is_featured: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False,
    )
    
    published_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        onupdate=datetime.now,
        nullable=False,
    )
    
    created_by = relationship("User", backref="created_news")

    # Optional link to call (for result publication)
    call_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("calls_for_applicants.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Optional attached file for result publication
    attachment_path: Mapped[Optional[str]] = mapped_column(nullable=True)

    call = relationship("CallForApplicants", backref="news_items")


# =============================================================================
# INVITATION MODELS
# =============================================================================

class CompanyInvitation(Base):
    """
    Invitation token sent to a company after their application is approved.
    Allows the company to invite employees for the approved call.
    """
    __tablename__ = "company_invitations"

    id: Mapped[int] = mapped_column(primary_key=True)

    application_id: Mapped[int] = mapped_column(
        ForeignKey("company_applications.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    token: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)

    is_used: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    application = relationship("CompanyApplication", backref="invitation")


class EmployeeInvitation(Base):
    """
    Invitation token sent to an individual employee by a company.
    Links the employee to the company and the specific call/application.
    """
    __tablename__ = "employee_invitations"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_invitation_id: Mapped[int] = mapped_column(
        ForeignKey("company_invitations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    employee_name: Mapped[str] = mapped_column(nullable=False)
    employee_email: Mapped[str] = mapped_column(nullable=False, index=True)

    token: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)

    is_used: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    company_invitation = relationship("CompanyInvitation", backref="employee_invitations")


# =============================================================================
# AUDIT & TRACEABILITY
# =============================================================================

class AuditLog(Base):
    """
    Audit log for traceability of all critical actions.
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    # Actor
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_role: Mapped[str] = mapped_column(nullable=False)
    
    # Action
    action: Mapped[str] = mapped_column(nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(nullable=False)
    
    # Details
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Metadata
    ip_address: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
        index=True,
    )
    
    # Relationships
    user = relationship("User", backref="audit_logs")
