from typing import Any, Callable
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from fastapi import FastAPI, status
from sqlalchemy.exc import SQLAlchemyError

class CustomException(Exception):
    """This is the base class for all bookly errors"""

    pass


class InvalidToken(CustomException):
    """User has provided an invalid or expired token"""

    pass


class RevokedToken(CustomException):
    """User has provided a token that has been revoked"""

    pass


class AccessTokenRequired(CustomException):
    """User has provided a refresh token when an access token is needed"""

    pass


class RefreshTokenRequired(CustomException):
    """User has provided an access token when a refresh token is needed"""

    pass


class UserAlreadyExists(CustomException):
    """User has provided an email for a user who exists during sign up."""

    pass


class InvalidCredentials(CustomException):
    """User has provided wrong email or password during log in."""

    pass


class InsufficientPermission(CustomException):
    """User does not have the neccessary permissions to perform an action."""

    pass

class UserNotFound(CustomException):
    """User Not found"""

    pass

class AccountNotVerified(CustomException):
    """Account not yet verified"""
    pass

class RegistrationFailed(CustomException):
    """Registration failed. Make sure all fields are valid and try again."""

class PasswordsDoNotMatch(CustomException):
    """Mismatch between new and confirm password."""
    pass


class InvalidResetCode(CustomException):
    """User has provided an invalid or expired reset code"""
    pass


class InvalidVerificationCode(CustomException):
    """User has provided an invalid or expired email verification code"""
    pass


class DoctorNotVerified(CustomException):
    """Doctor account is pending approval or has been rejected"""
    pass


class CourseNotFound(CustomException):
    """Requested course was not found"""
    pass


class ImageUploadError(CustomException):
    """Error occurred while uploading image"""
    pass


class InvalidCourseDates(CustomException):
    """Course dates are invalid (start_date in past or end_date before start_date)"""
    pass


class StaffSignupNotAllowed(CustomException):
    """Staff accounts cannot be created via public signup"""
    pass


class DuplicateSubscription(CustomException):
    """Email is already subscribed to the newsletter"""
    pass


class InvalidSector(CustomException):
    """Invalid or unsupported industry sector"""
    pass


# ==================== Availability & Booking Errors ====================

class AvailabilitySlotNotFound(CustomException):
    """Requested availability slot was not found"""
    pass


class InvalidAvailabilityDates(CustomException):
    """Availability dates are invalid (start_date in past, end_date before start_date, or deadline issues)"""
    pass


class BookingDeadlinePassed(CustomException):
    """The booking deadline for this slot has passed"""
    pass


class InsufficientSeats(CustomException):
    """Not enough seats available for the requested booking"""
    pass


class BookingNotFound(CustomException):
    """Requested booking was not found"""
    pass


class DuplicateBooking(CustomException):
    """Company has already booked this availability slot"""
    pass


class SlotHasBookings(CustomException):
    """Cannot modify/delete slot because it has existing bookings"""
    pass


class InvalidSlotStatus(CustomException):
    """Operation not allowed for the current slot status"""
    pass


class InvalidBookingStatus(CustomException):
    """Operation not allowed for the current booking status"""
    pass


class DeadlineNotReached(CustomException):
    """Cannot confirm/cancel session before the booking deadline day"""
    pass


class DeadlinePassed(CustomException):
    """Cannot edit session dates after the booking deadline has passed"""
    pass


class CourseHasBookings(CustomException):
    """Cannot modify course price/seats because there are existing bookings"""
    pass


class OverlappingSessionDates(CustomException):
    """Cannot create session with dates that overlap an existing session for the same course"""
    pass


# ==================== Enrollment Errors ====================

class InvalidEnrollmentCode(CustomException):
    """The provided enrollment code is invalid"""
    pass


class EnrollmentCodeExpired(CustomException):
    """The enrollment code has expired"""
    pass


class EnrollmentCodeMaxUsage(CustomException):
    """The enrollment code has reached its maximum usage"""
    pass


class AlreadyEnrolled(CustomException):
    """Employee is already enrolled in this session"""
    pass


class EnrollmentNotFound(CustomException):
    """Enrollment not found"""
    pass


class DocumentNotFound(CustomException):
    """Document not found"""
    pass


# ==================== Call for Applicants Errors ====================

class CallNotFound(CustomException):
    """Call for applicants not found"""
    pass


class InvalidCallStatus(CustomException):
    """Operation not allowed for the current call status"""
    def __init__(self, message: str = "Operation not allowed for the current call status"):
        self.message = message
        super().__init__(self.message)


class CallAlreadyPublished(CustomException):
    """Call has already been published"""
    pass


class CallHasApplications(CustomException):
    """Cannot delete call because it has applications"""
    pass


class InvalidDepartment(CustomException):
    """Invalid department value"""
    pass


class CallNotOpenForApplications(CustomException):
    """Call is not open for applications"""
    pass


# ==================== Application Errors ====================

class ApplicationNotFound(CustomException):
    """Application not found"""
    pass


class InvalidApplicationStatus(CustomException):
    """Operation not allowed for the current application status"""
    def __init__(self, message: str = "Operation not allowed for the current application status"):
        self.message = message
        super().__init__(self.message)


class DuplicateApplication(CustomException):
    """Company has already applied to this call"""
    pass


class InvalidDocument(CustomException):
    """Invalid document type or format"""
    pass


# ==================== Submission Errors ====================

class SubmissionNotFound(CustomException):
    """Submission not found"""
    pass


class InvalidSubmissionStatus(CustomException):
    """Operation not allowed for the current submission status"""
    def __init__(self, message: str = "Operation not allowed for the current submission status"):
        self.message = message
        super().__init__(self.message)


class DuplicateSubmission(CustomException):
    """Employee has already submitted for this application"""
    pass


class ApplicationNotApproved(CustomException):
    """Company application is not approved"""
    pass


class EmployeeNotInCompany(CustomException):
    """Employee does not belong to this company"""
    pass


def create_exception_handler(
    status_code: int, initial_detail: Any
) -> Callable[[Request, Exception], JSONResponse]:

    async def exception_handler(request: Request, exc: CustomException):

        return JSONResponse(content=initial_detail, status_code=status_code)

    return exception_handler


def register_all_errors(app: FastAPI):
    app.add_exception_handler(
        UserAlreadyExists,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "User with email already exists",
                "error_code": "user_exists",
            },
        ),
    )

    app.add_exception_handler(
        UserNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "User not found",
                "error_code": "user_not_found",
            },
        ),
    )
    app.add_exception_handler(
        InvalidCredentials,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid Email Or Password",
                "error_code": "invalid_email_or_password",
            },
        ),
    )
    app.add_exception_handler(
        InvalidToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Token is invalid Or expired",
                "resolution": "Please get new token",
                "error_code": "invalid_token",
            },
        ),
    )
    app.add_exception_handler(
        RevokedToken,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Token is invalid or has been revoked",
                "resolution": "Please get new token",
                "error_code": "token_revoked",
            },
        ),
    )
    app.add_exception_handler(
        AccessTokenRequired,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Please provide a valid access token",
                "resolution": "Please get an access token",
                "error_code": "access_token_required",
            },
        ),
    )
    app.add_exception_handler(
        RefreshTokenRequired,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_detail={
                "message": "Please provide a valid refresh token",
                "resolution": "Please get an refresh token",
                "error_code": "refresh_token_required",
            },
        ),
    )
    app.add_exception_handler(
        InsufficientPermission,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "You do not have enough permissions to perform this action",
                "error_code": "insufficient_permissions",
            },
        ),
    )

    app.add_exception_handler(
        AccountNotVerified,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Account Not verified",
                "error_code": "account_not_verified",
                "resolution":"Please check your email for verification details"
            },
        ),
    )

    app.add_exception_handler(
        CourseNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Course not found",
                "error_code": "course_not_found",
            },
        ),
    )

    app.add_exception_handler(
        ImageUploadError,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Error uploading image",
                "error_code": "image_upload_error",
            },
        ),
    )

    app.add_exception_handler(
        InvalidCourseDates,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid course dates. Start date cannot be in the past and end date must be after start date.",
                "error_code": "invalid_course_dates",
            },
        ),
    )

    app.add_exception_handler(
        StaffSignupNotAllowed,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Staff accounts cannot be created via public signup. Please contact an administrator.",
                "error_code": "staff_signup_not_allowed",
            },
        ),
    )

    app.add_exception_handler(
        DuplicateSubscription,
        create_exception_handler(
            status_code=status.HTTP_409_CONFLICT,
            initial_detail={
                "message": "This email is already subscribed to the newsletter.",
                "error_code": "duplicate_subscription",
            },
        ),
    )

    app.add_exception_handler(
        InvalidSector,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid industry sector. Please select a valid sector from the list.",
                "error_code": "invalid_sector",
            },
        ),
    )

    app.add_exception_handler(
        PasswordsDoNotMatch,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Passwords Do Not Match",
                "error_code": "passwords do not match",
                "resolution": "Ensure that both password fields are identical before submitting"
            },
        ),
    )
    app.add_exception_handler(
        RegistrationFailed,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Registration failed. Make sure all fields are valid and try again.",
                "error_code": "registration_failed",
            },
        ),
    )

    app.add_exception_handler(
        InvalidResetCode,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid or expired reset code",
                "error_code": "invalid_reset_code",
                "resolution": "Please request a new reset code"
            },
        ),
    )

    app.add_exception_handler(
        InvalidVerificationCode,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid or expired verification code",
                "error_code": "invalid_verification_code",
                "resolution": "Please request a new verification code"
            },
        ),
    )

    app.add_exception_handler(
        DoctorNotVerified,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Your account is under review",
                "error_code": "doctor_not_verified",
                "resolution": "Please wait for admin approval"
            },
        ),
    )

    # ==================== Availability & Booking Error Handlers ====================
    
    app.add_exception_handler(
        AvailabilitySlotNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Availability slot not found",
                "error_code": "availability_slot_not_found",
            },
        ),
    )

    app.add_exception_handler(
        InvalidAvailabilityDates,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Invalid availability dates. Ensure start date is not in the past, end date is after start date, and booking deadline is before start date.",
                "error_code": "invalid_availability_dates",
            },
        ),
    )

    app.add_exception_handler(
        BookingDeadlinePassed,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "The booking deadline for this slot has passed",
                "error_code": "booking_deadline_passed",
            },
        ),
    )

    app.add_exception_handler(
        InsufficientSeats,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Not enough seats available for the requested number of employees",
                "error_code": "insufficient_seats",
            },
        ),
    )

    app.add_exception_handler(
        BookingNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Booking not found",
                "error_code": "booking_not_found",
            },
        ),
    )

    app.add_exception_handler(
        DuplicateBooking,
        create_exception_handler(
            status_code=status.HTTP_409_CONFLICT,
            initial_detail={
                "message": "Your company has already booked this availability slot",
                "error_code": "duplicate_booking",
            },
        ),
    )

    app.add_exception_handler(
        SlotHasBookings,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cannot modify or delete this slot because it has existing bookings",
                "error_code": "slot_has_bookings",
            },
        ),
    )

    app.add_exception_handler(
        InvalidSlotStatus,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "This operation is not allowed for the current slot status",
                "error_code": "invalid_slot_status",
            },
        ),
    )

    app.add_exception_handler(
        InvalidBookingStatus,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "This operation is not allowed for the current booking status",
                "error_code": "invalid_booking_status",
            },
        ),
    )

    app.add_exception_handler(
        DeadlineNotReached,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cannot confirm or cancel session before the booking deadline day. Please wait until the deadline date.",
                "error_code": "deadline_not_reached",
            },
        ),
    )

    app.add_exception_handler(
        DeadlinePassed,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Impossible de modifier les dates d'une session après la date limite de réservation",
                "error_code": "deadline_passed",
            },
        ),
    )

    app.add_exception_handler(
        CourseHasBookings,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cannot modify course price or seats because there are existing bookings",
                "error_code": "course_has_bookings",
            },
        ),
    )

    app.add_exception_handler(
        OverlappingSessionDates,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Les dates de cette session chevauchent une session existante pour ce cours",
                "error_code": "overlapping_session_dates",
            },
        ),
    )

    # ==================== Enrollment Error Handlers ====================

    app.add_exception_handler(
        InvalidEnrollmentCode,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Code d'inscription invalide",
                "error_code": "invalid_enrollment_code",
            },
        ),
    )

    app.add_exception_handler(
        EnrollmentCodeExpired,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Ce code d'inscription a expiré",
                "error_code": "enrollment_code_expired",
            },
        ),
    )

    app.add_exception_handler(
        EnrollmentCodeMaxUsage,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Ce code a atteint son nombre maximum d'utilisations",
                "error_code": "enrollment_code_max_usage",
            },
        ),
    )

    app.add_exception_handler(
        AlreadyEnrolled,
        create_exception_handler(
            status_code=status.HTTP_409_CONFLICT,
            initial_detail={
                "message": "Vous êtes déjà inscrit à cette session",
                "error_code": "already_enrolled",
            },
        ),
    )

    app.add_exception_handler(
        EnrollmentNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Inscription non trouvée",
                "error_code": "enrollment_not_found",
            },
        ),
    )

    app.add_exception_handler(
        DocumentNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Document non trouvé",
                "error_code": "document_not_found",
            },
        ),
    )

    # ==================== Call for Applicants Error Handlers ====================

    app.add_exception_handler(
        CallNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Appel à candidatures non trouvé",
                "error_code": "call_not_found",
            },
        ),
    )

    app.add_exception_handler(
        InvalidCallStatus,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cette opération n'est pas autorisée pour le statut actuel de l'appel",
                "error_code": "invalid_call_status",
            },
        ),
    )

    app.add_exception_handler(
        CallAlreadyPublished,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cet appel a déjà été publié",
                "error_code": "call_already_published",
            },
        ),
    )

    app.add_exception_handler(
        CallHasApplications,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Impossible de supprimer cet appel car il contient des candidatures",
                "error_code": "call_has_applications",
            },
        ),
    )

    app.add_exception_handler(
        InvalidDepartment,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Département invalide",
                "error_code": "invalid_department",
            },
        ),
    )

    app.add_exception_handler(
        CallNotOpenForApplications,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cet appel n'est pas ouvert aux candidatures",
                "error_code": "call_not_open",
            },
        ),
    )

    # ==================== Application Error Handlers ====================

    app.add_exception_handler(
        ApplicationNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Candidature non trouvée",
                "error_code": "application_not_found",
            },
        ),
    )

    app.add_exception_handler(
        InvalidApplicationStatus,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cette opération n'est pas autorisée pour le statut actuel de la candidature",
                "error_code": "invalid_application_status",
            },
        ),
    )

    app.add_exception_handler(
        DuplicateApplication,
        create_exception_handler(
            status_code=status.HTTP_409_CONFLICT,
            initial_detail={
                "message": "Votre entreprise a déjà soumis une candidature pour cet appel",
                "error_code": "duplicate_application",
            },
        ),
    )

    app.add_exception_handler(
        InvalidDocument,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Type ou format de document invalide",
                "error_code": "invalid_document",
            },
        ),
    )

    # ==================== Submission Error Handlers ====================

    app.add_exception_handler(
        SubmissionNotFound,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_detail={
                "message": "Soumission non trouvée",
                "error_code": "submission_not_found",
            },
        ),
    )

    app.add_exception_handler(
        InvalidSubmissionStatus,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "Cette opération n'est pas autorisée pour le statut actuel de la soumission",
                "error_code": "invalid_submission_status",
            },
        ),
    )

    app.add_exception_handler(
        DuplicateSubmission,
        create_exception_handler(
            status_code=status.HTTP_409_CONFLICT,
            initial_detail={
                "message": "Vous avez déjà soumis vos documents pour cette candidature",
                "error_code": "duplicate_submission",
            },
        ),
    )

    app.add_exception_handler(
        ApplicationNotApproved,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_detail={
                "message": "La candidature de l'entreprise n'est pas approuvée",
                "error_code": "application_not_approved",
            },
        ),
    )

    app.add_exception_handler(
        EmployeeNotInCompany,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_detail={
                "message": "Vous n'appartenez pas à cette entreprise",
                "error_code": "employee_not_in_company",
            },
        ),
    )

    @app.exception_handler(500)
    async def internal_server_error(request, exc):

        return JSONResponse(
            content={
                "message": "Oops! Something went wrong",
                "error_code": "server_error",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


    @app.exception_handler(SQLAlchemyError)
    async def database__error(request, exc):
        print(str(exc))
        return JSONResponse(
            content={
                "message": "Oops! Something went wrong",
                "error_code": "server_error",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )