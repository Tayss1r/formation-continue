from datetime import datetime
from typing import Optional, List
from enum import Enum
from .database import Base

from sqlalchemy import (
    TIMESTAMP,
    text,
    ForeignKey,
    UniqueConstraint,
    Enum as SQLEnum,
    JSON,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)
from sqlalchemy.dialects.postgresql import JSONB


class UserRole(str, Enum):
    COMPANY = "company"
    EMPLOYEE = "employee"
    STAFF = "staff"
    PROFESSOR = "professor"
    ADMIN = "admin"


class CourseType(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class Department(str, Enum):
    """Department/field for courses and professors"""
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


class DocumentStatus(str, Enum):
    """Status of an employee identity document"""
    PENDING_REVIEW = "pending_review"
    VERIFIED = "verified"
    REJECTED = "rejected"


class AccountStatus(str, Enum):
    """Account approval status for professors and companies"""
    PENDING = "pending"      # Awaiting staff approval (documents submitted)
    ACTIVE = "active"        # Account approved and active
    REJECTED = "rejected"    # Account rejected by staff
    BLOCKED = "blocked"      # Account blocked by admin


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

    # Account status for approval workflow (companies & professors)
    account_status: Mapped[AccountStatus] = mapped_column(
        SQLEnum(
            AccountStatus,
            name="account_status_type",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        server_default="active",  # Default active for employees/staff
        nullable=False,
    )

    # Verification document path (for companies & professors)
    verification_document: Mapped[Optional[str]] = mapped_column(nullable=True)

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

    # Employee profile for employee users
    employee_profile = relationship(
        "EmployeeProfile",
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
    
    # Department the professor belongs to
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


class EmployeeProfile(Base):
    """
    Profile for employee users.
    Employees are users who enroll in training sessions using codes from their company.
    """
    __tablename__ = "employee_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    user = relationship("User", back_populates="employee_profile")

    # Session enrollments
    session_enrollments = relationship(
        "SessionEnrollment",
        back_populates="employee",
        cascade="all, delete-orphan",
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
    
    # Department the course belongs to (MANDATORY)
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
    
    # Learning outcomes - what students will learn (for "Ce que vous apprendrez" section)
    learning_outcomes: Mapped[Optional[List[str]]] = mapped_column(
        JSONB,
        nullable=True,
        server_default="[]",
    )

    professor = relationship("Professor", back_populates="courses")
    created_by = relationship("User", back_populates="created_courses")
    
    # Course materials uploaded by professors
    materials = relationship(
        "CourseMaterial",
        back_populates="course",
        cascade="all, delete-orphan",
    )

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


class SessionEnrollmentCode(Base):
    """
    Enrollment code for a specific session, generated when staff confirms the session.
    One code per company per session.
    """
    __tablename__ = "session_enrollment_codes"
    __table_args__ = (
        UniqueConstraint("availability_slot_id", "company_id", name="uq_session_company_code"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    code: Mapped[str] = mapped_column(unique=True, nullable=False, index=True)

    availability_slot_id: Mapped[int] = mapped_column(
        ForeignKey("course_availability.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    company_id: Mapped[int] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Linked booking
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("company_bookings.id", ondelete="CASCADE"),
        nullable=False,
    )

    max_usage: Mapped[int] = mapped_column(nullable=False)
    used_count: Mapped[int] = mapped_column(server_default="0", nullable=False)

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
    availability_slot = relationship("CourseAvailability", backref="enrollment_codes")
    company = relationship("Company", backref="session_enrollment_codes")
    booking = relationship("CompanyBooking", backref="enrollment_code")


class SessionEnrollment(Base):
    """
    Employee enrollment for a specific session.
    Created when an employee uses an enrollment code.
    """
    __tablename__ = "session_enrollments"
    __table_args__ = (
        UniqueConstraint("employee_id", "availability_slot_id", name="uq_employee_session_enrollment"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employee_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    availability_slot_id: Mapped[int] = mapped_column(
        ForeignKey("course_availability.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Link to the company via enrollment code
    enrollment_code_id: Mapped[int] = mapped_column(
        ForeignKey("session_enrollment_codes.id", ondelete="CASCADE"),
        nullable=False,
    )

    enrolled_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    employee = relationship("EmployeeProfile", back_populates="session_enrollments")
    availability_slot = relationship("CourseAvailability", backref="session_enrollments")
    enrollment_code = relationship("SessionEnrollmentCode", backref="enrollments")

    # Document
    document = relationship(
        "EmployeeDocument",
        back_populates="enrollment",
        uselist=False,
        cascade="all, delete-orphan",
    )


class EmployeeDocument(Base):
    """
    Identity document uploaded by an employee for a specific enrollment.
    Required for attendance verification.
    """
    __tablename__ = "employee_documents"

    id: Mapped[int] = mapped_column(primary_key=True)

    enrollment_id: Mapped[int] = mapped_column(
        ForeignKey("session_enrollments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    # Document info
    document_type: Mapped[str] = mapped_column(nullable=False)  # 'cin' or 'passport'
    file_path: Mapped[str] = mapped_column(nullable=False)
    original_filename: Mapped[str] = mapped_column(nullable=False)

    # Review status
    status: Mapped[DocumentStatus] = mapped_column(
        SQLEnum(
            DocumentStatus,
            name="document_status",
            validate_strings=True,
            create_constraint=True,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False,
        server_default=DocumentStatus.PENDING_REVIEW.value,
    )

    # Staff review info
    reviewed_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    # Relationships
    enrollment = relationship("SessionEnrollment", back_populates="document")
    reviewed_by = relationship("User", backref="reviewed_documents")


# Keep legacy EnrollmentCode for backwards compatibility but mark as deprecated
class EnrollmentCode(Base):
    """DEPRECATED: Use SessionEnrollmentCode instead"""
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


class CourseMaterial(Base):
    """
    Learning materials uploaded by professors for a course.
    Employees can view and download these documents.
    """
    __tablename__ = "course_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Who uploaded the material (professor or staff)
    uploaded_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # File information
    file_path: Mapped[str] = mapped_column(nullable=False)
    file_name: Mapped[str] = mapped_column(nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False)  # Size in bytes
    file_type: Mapped[str] = mapped_column(nullable=False)  # MIME type
    
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
    course = relationship("Course", back_populates="materials")
    uploaded_by = relationship("User")


class News(Base):
    """
    News/Announcement model for the landing page.
    Displays announcements, updates, and news about training programs.
    """
    __tablename__ = "news"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    title: Mapped[str] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(nullable=False)
    excerpt: Mapped[Optional[str]] = mapped_column(nullable=True)  # Short summary for cards
    
    # Optional image for the news item
    image_path: Mapped[Optional[str]] = mapped_column(nullable=True)
    
    # Who created the news
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    # Publishing status
    is_published: Mapped[bool] = mapped_column(
        server_default="true",
        nullable=False,
    )
    
    # Featured news shows prominently
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
    
    # Relationships
    created_by = relationship("User", backref="created_news")


class CourseFeedback(Base):
    """
    Feedback submitted by employees for courses they've attended.
    Supports anonymous and identified feedback.
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
    
    # Nullable for anonymous feedback - stores employee_profile.id
    employee_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("employee_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    
    is_anonymous: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False,
    )
    
    # Rating from 1 to 5
    rating: Mapped[int] = mapped_column(nullable=False)
    
    # Optional comment
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
    
    # Relationships
    course = relationship("Course", backref="feedback")
    employee = relationship("EmployeeProfile", backref="feedback")


class SessionAttendance(Base):
    """
    Attendance record for each employee in a session.
    Professors mark presence for enrolled employees.
    """
    __tablename__ = "session_attendance"
    __table_args__ = (
        UniqueConstraint("session_id", "employee_id", name="uq_session_employee_attendance"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    
    # Links to course_availability (the session)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("course_availability.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Links to employee_profile
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employee_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    is_present: Mapped[bool] = mapped_column(
        server_default="false",
        nullable=False,
    )
    
    # Who marked the attendance (professor)
    marked_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    marked_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True,
    )
    
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    
    # Relationships
    session = relationship("CourseAvailability", backref="attendance_records")
    employee = relationship("EmployeeProfile", backref="attendance_records")
    marked_by = relationship("User", backref="marked_attendance")
