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


class AvailabilitySlotStatus(str, Enum):
    """Status of a course availability slot"""
    OPEN = "open"                    # Accepting bookings
    PENDING_REVIEW = "pending_review"  # Booking deadline reached, awaiting staff decision
    CONFIRMED = "confirmed"          # Session confirmed by staff
    CANCELLED = "cancelled"          # Session cancelled by staff


class BookingStatus(str, Enum):
    """Status of a company booking"""
    RESERVED = "reserved"            # Seats reserved, awaiting session confirmation
    CONFIRMED = "confirmed"          # Session confirmed, booking is final
    CANCELLED = "cancelled"          # Booking cancelled (by company or due to session cancellation)


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
    """
    Course represents a training template/offering.
    Dates and scheduling are handled via CourseAvailability slots.
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
    
    # Image storage (local filesystem path)
    image_path: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Duration information (template info, not fixed dates)
    duration_hours: Mapped[Optional[int]] = mapped_column(nullable=True)
    
    # Industry sector for targeting
    sector: Mapped[Optional[str]] = mapped_column(nullable=True, index=True)
    
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
    
    # Availability slots for this course
    availability_slots = relationship(
        "CourseAvailability",
        back_populates="course",
        cascade="all, delete-orphan",
    )


class CourseAvailability(Base):
    """
    Represents a specific date slot when a course is available.
    Companies book these slots, not courses directly.
    """
    __tablename__ = "course_availability"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Schedule information
    start_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
    )
    end_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
    )
    schedule: Mapped[Optional[str]] = mapped_column(nullable=True)  # e.g., "Mon-Fri 9:00-17:00"
    
    # Seat management
    max_seats: Mapped[int] = mapped_column(nullable=False)
    min_seats: Mapped[int] = mapped_column(default=1, nullable=False)  # Recommended threshold
    reserved_seats: Mapped[int] = mapped_column(default=0, nullable=False)  # Calculated from bookings
    
    # Booking deadline - after this, slot moves to pending_review
    booking_deadline: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
    )
    
    # Status management
    status: Mapped[AvailabilitySlotStatus] = mapped_column(
        SQLEnum(
            AvailabilitySlotStatus,
            name="availability_slot_status",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=AvailabilitySlotStatus.OPEN.value,
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
    
    # Relationships
    course = relationship("Course", back_populates="availability_slots")
    bookings = relationship(
        "CompanyBooking",
        back_populates="availability_slot",
        cascade="all, delete-orphan",
    )
    
    @property
    def remaining_seats(self) -> int:
        """Calculate remaining available seats"""
        return self.max_seats - self.reserved_seats


class CompanyBooking(Base):
    """
    Represents a company's booking for a specific course availability slot.
    Bookings are atomic - all employees or none.
    """
    __tablename__ = "company_bookings"
    __table_args__ = (
        UniqueConstraint("company_id", "availability_slot_id", name="uq_company_slot_booking"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    availability_slot_id: Mapped[int] = mapped_column(
        ForeignKey("course_availability.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Number of employees for this booking
    employee_count: Mapped[int] = mapped_column(nullable=False)
    
    # Booking status
    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(
            BookingStatus,
            name="booking_status",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=BookingStatus.RESERVED.value,
    )
    
    # Notes from company (optional)
    notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Staff notes (for internal use)
    staff_notes: Mapped[Optional[str]] = mapped_column(nullable=True)
    
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
    company = relationship("Company", backref="bookings")
    availability_slot = relationship("CourseAvailability", back_populates="bookings")


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


class NewsletterSubscription(Base):
    """
    Newsletter subscription model for sector-targeted campaigns.
    Allows both authenticated company users and public users to subscribe.
    """
    __tablename__ = "newsletter_subscriptions"
    __table_args__ = (
        UniqueConstraint("email", name="uq_newsletter_email"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    email: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)
    sector: Mapped[str] = mapped_column(nullable=False, index=True)
    
    # Optional link to company (if authenticated user)
    company_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Subscription status
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
