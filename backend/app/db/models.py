from datetime import datetime
from typing import Optional
from enum import Enum
from .database import Base

from sqlalchemy import (
    TIMESTAMP,
    text,
    ForeignKey,
    UniqueConstraint,
    Enum as SQLEnum
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)


class UserRole(str, Enum):
    COMPANY = "company"
    EMPLOYEE = "employee"
    STAFF = "staff"
    PROFESSOR = "professor"
    ADMIN = "admin"


class CourseType(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class RequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class User(Base):
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

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

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

    # Courses created by staff users
    created_courses = relationship(
        "Course",
        back_populates="created_by",
        cascade="all, delete-orphan",
    )


class Company(Base):
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

    employees = relationship(
        "Employee",
        back_populates="company",
        cascade="all, delete-orphan",
    )

    requests = relationship(
        "TrainingRequest",
        back_populates="company",
        cascade="all, delete-orphan",
    )

    enrollment_codes = relationship(
        "EnrollmentCode",
        back_populates="company",
        cascade="all, delete-orphan",
    )



class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    first_name: Mapped[str] = mapped_column(nullable=False)
    last_name: Mapped[str] = mapped_column(nullable=False)
    email: Mapped[str] = mapped_column(nullable=False)

    company = relationship("Company", back_populates="employees")

    enrollments = relationship(
        "Enrollment",
        back_populates="employee",
        cascade="all, delete-orphan",
    )


class Professor(Base):
    __tablename__ = "professors"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    specialization: Mapped[str] = mapped_column(nullable=False)
    hourly_rate: Mapped[float] = mapped_column(nullable=False)

    user = relationship("User", back_populates="professor")

    courses = relationship(
        "Course",
        back_populates="professor",
    )


class Course(Base):
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
    
    # Image storage (local filesystem path)
    image_path: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Schedule/duration information
    duration_hours: Mapped[Optional[int]] = mapped_column(nullable=True)
    schedule: Mapped[Optional[str]] = mapped_column(nullable=True)
    start_date: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    end_date: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    
    # Track who created the course (staff user)
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
    
    # Published status
    is_published: Mapped[bool] = mapped_column(
        server_default="true",
        nullable=False,
    )

    professor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("professors.id", ondelete="SET NULL"),
    )

    professor = relationship("Professor", back_populates="courses")
    created_by = relationship("User", back_populates="created_courses")

    requests = relationship(
        "TrainingRequest",
        back_populates="course",
    )

    enrollments = relationship(
        "Enrollment",
        back_populates="course",
    )

    enrollment_codes = relationship(
        "EnrollmentCode",
        back_populates="course",
    )


class TrainingRequest(Base):
    __tablename__ = "training_requests"

    id: Mapped[int] = mapped_column(primary_key=True)

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    course_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("courses.id", ondelete="SET NULL"),
    )

    requested_topic: Mapped[Optional[str]]
    employees_count: Mapped[int] = mapped_column(nullable=False)

    status: Mapped[RequestStatus] = mapped_column(
        SQLEnum(
            RequestStatus,
            name="request_status",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=RequestStatus.PENDING.value,
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    company = relationship("Company", back_populates="requests")
    course = relationship("Course", back_populates="requests")


class EnrollmentCode(Base):
    __tablename__ = "enrollment_codes"

    id: Mapped[int] = mapped_column(primary_key=True)

    code: Mapped[str] = mapped_column(unique=True, nullable=False)

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
    )

    max_usage: Mapped[int] = mapped_column(nullable=False)
    used_count: Mapped[int] = mapped_column(server_default="0", nullable=False)

    expires_at: Mapped[datetime] = mapped_column(nullable=False)

    course = relationship("Course", back_populates="enrollment_codes")
    company = relationship("Company", back_populates="enrollment_codes")

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("employee_id", "course_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
    )

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )

    enrolled_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    employee = relationship("Employee", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
