from datetime import datetime, timedelta
import random
import logging
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
import httpx
from itsdangerous import BadSignature, SignatureExpired
from starlette import status
from sqlalchemy.ext.asyncio.session import AsyncSession

from ..celery_tasks import send_email
from ..core.config import settings
from ..db.redis import add_jti_to_blocklist, store_reset_code, get_reset_code, delete_reset_code, store_email_verification_code, get_email_verification_code, delete_email_verification_code
from ..db.models import User, UserRole
from ..dependencies import AccessTokenBearer, get_current_user, RefreshTokenBearer

from ..schemas.email_schema import Email, PasswordResetConfirmModel, PasswordResetRequestModel, PasswordResetCodeConfirmModel, PasswordResetCodeVerifyModel, EmailVerificationCodeVerifyModel, ResendEmailVerificationCodeModel
from ..schemas.user_schema import SignupResponse, UserCreate, UserLogin, UserOut, UserUpdate
from ..schemas.auth_schema import SignupRequest, SignupResponse as AuthSignupResponse, LoginRequest, LoginResponse, VerifyEmailCodeRequest, ResendVerificationCodeRequest, VerifyEmailResponse, RefreshTokenResponse, LogoutResponse
from ..db.database import get_session
from ..services.user_service import UserService
from ..utils import create_access_token, create_url_safe_token, decode_url_safe_token, send_verification_email, verify, hash, decode_token, send_verification_code_email
from ..error import AccountNotVerified, InvalidCredentials, InvalidToken, InvalidResetCode, PasswordsDoNotMatch, UserNotFound, RegistrationFailed, InvalidVerificationCode, StaffSignupNotAllowed

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)

auth_router = APIRouter()

REFRESH_TOKEN_EXPIRY = settings.REFRESH_TOKEN_EXPIRY_DAYS
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"
FACEBOOK_TOKEN_ENDPOINT = "https://graph.facebook.com/v17.0/oauth/access_token"
FACEBOOK_USERINFO_ENDPOINT = "https://graph.facebook.com/me?fields=id,name,email,picture"


def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return str(random.randint(100000, 999999))


def build_user_response(user: User) -> dict:
    """Build a consistent user response object"""
    role_value = user.role.value if isinstance(user.role, UserRole) else user.role
    
    user_response = {
        "email": user.email,
        "uid": str(user.id),
        "role": role_value,
        "fullname": user.fullname,
        "username": user.username,
        "is_verified": user.is_verified
    }
    
    # Add company info if applicable
    if user.company:
        user_response["company"] = {
            "id": user.company.id,
            "name": user.company.name,
            "industry_sector": user.company.industry_sector
        }
    
    # Add professor info if applicable
    if user.professor:
        user_response["professor"] = {
            "id": user.professor.id,
            "specialization": user.professor.specialization
        }
    
    return user_response


def create_auth_response(user: User, message: str = "Login successful") -> JSONResponse:
    """Create response with access token in body and refresh token in HTTP-only cookie"""
    role_value = user.role.value if isinstance(user.role, UserRole) else user.role
    
    user_data = {
        "email": user.email,
        "user_uid": str(user.id),
        "role": role_value,
    }
    
    # Create tokens
    access_token = create_access_token(user_data=user_data)
    refresh_token = create_access_token(
        user_data={"email": user.email, "user_uid": str(user.id)},
        refresh=True,
        expiry=timedelta(days=REFRESH_TOKEN_EXPIRY)
    )
    
    response = JSONResponse(
        content={
            "message": message,
            "access_token": access_token,
            "user": build_user_response(user),
        }
    )
    
    # Clear any existing refresh_token cookie first
    response.delete_cookie(key="refresh_token", path="/", samesite="lax")
    
    # Store refresh token in HttpOnly secure cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRY * 24 * 3600,
        path="/",
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
    )
    
    return response


# ==================== ROLE-BASED SIGNUP ====================

@auth_router.post('/signup', status_code=status.HTTP_201_CREATED, response_model=AuthSignupResponse)
async def signup(signup_data: SignupRequest, session: AsyncSession = Depends(get_session)):
    """
    Role-based user registration.
    
    Supported roles:
    - company: Requires email, password, fullname, company_name, industry_sector, billing_info
    - professor: Requires username, email, password, fullname, specialization
    
    NOTE: Staff accounts CANNOT be created via public signup.
    Staff must be created manually by an admin or via internal admin tooling.
    
    On success:
    - Creates user record (and Company/Professor if applicable)
    - Sends 6-digit verification code via email using Celery
    - Returns success message with email
    """
    # SECURITY CRITICAL: Block staff signup via public endpoint
    if signup_data.role == "staff":
        raise StaffSignupNotAllowed()
    
    email = signup_data.email
    
    # Check if user already exists
    if await UserService.user_exists(email, session):
        raise RegistrationFailed()
    
    # Check username uniqueness (if provided)
    if signup_data.username and await UserService.username_exists(signup_data.username, session):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Username already taken", "error_code": "username_taken"}
        )
    
    new_user = None
    
    try:
        if signup_data.role == "company":
            # Company signup - generate username from company name
            user_data = signup_data.get_user_data()
            if not user_data.get("username") and signup_data.company_name:
                user_data["username"] = await UserService.generate_unique_username(
                    signup_data.company_name, session
                )
            
            company_data = signup_data.get_company_data()
            new_user = await UserService.create_company_user(user_data, company_data, session)
            
        elif signup_data.role == "professor":
            # Professor signup
            user_data = signup_data.get_user_data()
            professor_data = signup_data.get_professor_data()
            new_user = await UserService.create_professor_user(user_data, professor_data, session)
            
        elif signup_data.role == "employee":
            # Employee signup - simple user with employee profile
            user_data = signup_data.get_user_data()
            new_user = await UserService.create_employee_user(user_data, session)
            
        else:
            # This should not happen since staff is blocked above
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": "Invalid role", "error_code": "invalid_role"}
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Registration failed. Please try again.", "error_code": "registration_error"}
        )
    
    # Generate and send verification code using existing Celery system
    code = generate_verification_code()
    hashed_code = hash(code)
    
    # Store hashed code in Redis with expiry
    await store_email_verification_code(email, hashed_code)
    
    # Send verification code via email using Celery (existing utility)
    send_verification_code_email(new_user, code)
    
    return AuthSignupResponse(
        message="Account created! A 6-digit verification code has been sent to your email.",
        email=email,
        requires_verification=True
    )


# ==================== LOGIN ====================

@auth_router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, session: AsyncSession = Depends(get_session)):
    """
    User authentication.
    
    - Validates email and password
    - Rejects if email not verified
    - Returns access token in body
    - Sets refresh token in HttpOnly cookie
    """
    email = login_data.email
    password = login_data.password

    user = await UserService.get_user_by_email(email, session)

    if not user or not user.password:
        raise InvalidCredentials()
    
    if not verify(password, user.password):
        raise InvalidCredentials()
    
    if not user.is_verified:
        raise AccountNotVerified()
    
    return create_auth_response(user, "Login successful")


@auth_router.get('/verify/{token}', response_model=SignupResponse, status_code=status.HTTP_201_CREATED)                                                                                                                                                                                                                                                                                                            
async def verify_user_account(token: str, session: AsyncSession = Depends(get_session)):
    try:                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
        token_data = decode_url_safe_token(token, max_age=60)
        user_email = token_data.get("email")
        if not user_email:
            return JSONResponse(
                {"message": "Invalid token data."},                                                                 
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Fetch user
        user = await UserService.get_user_by_email(user_email, session)
        if not user:
            return JSONResponse(
                {"message": "User not found."},
                status_code=status.HTTP_404_NOT_FOUND
            )

        # Already verified
        if user.is_verified:
            return RedirectResponse(url="http://localhost:4200/login?verify=already")

        # Update verification
        await UserService.update_user(user, {"is_verified": True}, session)
        return RedirectResponse(url="http://localhost:4200/login?verify=success")

    except SignatureExpired:
        return RedirectResponse(url="http://localhost:4200/login?verify=expired")
    except BadSignature:
        return JSONResponse(
            {"message": "Invalid verification link."},
            status_code=status.HTTP_400_BAD_REQUEST
        )

@auth_router.post('/resend-verification-email')
async def resend_verif_email(request: Email, session: AsyncSession = Depends(get_session)):
    user = await UserService.get_user_by_email(request.email, session)
    if user is not None and not user.is_verified:
        send_verification_email(user)
    # returned a generic message fo r securty purposes
    return JSONResponse(
        {"message": "If the email is registered, a verification link will be sent"},
        status_code=status.HTTP_200_OK
    )

@auth_router.post('/send-verification-code')
async def send_verification_code(request: ResendEmailVerificationCodeModel, session: AsyncSession = Depends(get_session)):
    """Send a 6-digit verification code to the user's email"""
    user = await UserService.get_user_by_email(request.email, session)
    if user is not None and not user.is_verified:
        # Generate 6-digit verification code
        code = str(random.randint(100000, 999999))
        hashed_code = hash(code)
        
        # Store hashed code in Redis with expiry
        await store_email_verification_code(request.email, hashed_code)
        
        # Send verification code via email
        send_verification_code_email(user, code)
    
    # Return generic message for security purposes
    return JSONResponse(
        {"message": "If the email is registered and not verified, a verification code will be sent"},
        status_code=status.HTTP_200_OK
    )


@auth_router.post('/verify-email-code', response_model=VerifyEmailResponse)
async def verify_email_with_code(data: VerifyEmailCodeRequest, session: AsyncSession = Depends(get_session)):
    """
    Verify email using 6-digit code.
    
    - Validates code against stored hash in Redis
    - Marks user as verified on success
    - Code is single-use (deleted after verification)
    """
    email = data.email
    code = data.code

    # Get stored hashed code
    stored_hashed_code = await get_email_verification_code(email)
    if not stored_hashed_code:
        raise InvalidVerificationCode()

    # Verify code
    if not verify(code, stored_hashed_code):
        raise InvalidVerificationCode()

    # Get user
    user = await UserService.get_user_by_email(email, session)
    if not user:
        raise UserNotFound()

    # Already verified
    if user.is_verified:
        return VerifyEmailResponse(
            message="Email already verified",
            verified=True
        )

    # Update verification status
    await UserService.update_user(user, {"is_verified": True}, session)

    # Invalidate code (single-use)
    await delete_email_verification_code(email)

    return VerifyEmailResponse(
        message="Email verified successfully! You can now log in.",
        verified=True
    )


# ==================== TOKEN REFRESH & LOGOUT ====================

@auth_router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_access_token(token_details: dict = Depends(RefreshTokenBearer)):
    """
    Refresh the access token.
    
    - Reads refresh token from HttpOnly cookie
    - Validates token and checks expiry
    - Issues new access token
    """
    expiry_timestamp = token_details.get("exp")

    if not expiry_timestamp or datetime.fromtimestamp(expiry_timestamp) <= datetime.now():
        raise InvalidToken()
    
    user_data = token_details.get("user", {})
    new_access_token = create_access_token(user_data=user_data)
    
    return RefreshTokenResponse(access_token=new_access_token)


# Keep old endpoint for backward compatibility
@auth_router.get("/refresh_token")
async def get_new_access_token_legacy(token_details: dict = Depends(RefreshTokenBearer)):
    """Legacy refresh endpoint - use POST /refresh instead"""
    expiry_timestamp = token_details["exp"]

    if datetime.fromtimestamp(expiry_timestamp) > datetime.now():
        new_access_token = create_access_token(user_data=token_details["user"])
        return JSONResponse(content={"access_token": new_access_token})

    raise InvalidToken()


@auth_router.post('/logout', response_model=LogoutResponse)
async def logout(token_data: dict = Depends(AccessTokenBearer())):
    """
    Logout user.
    
    - Revokes access token by adding JTI to blocklist
    - Clears refresh token cookie
    """
    jti = token_data.get('jti')
    if jti:
        await add_jti_to_blocklist(jti)
    
    response = JSONResponse(
        content={"message": "Logged out successfully"},
        status_code=status.HTTP_200_OK
    )
    
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return response


# Keep old endpoint for backward compatibility
@auth_router.get('/logout-legacy')
async def revoke_token_legacy(token_data = Depends(AccessTokenBearer())):
    """Legacy logout endpoint - use POST /logout instead"""
    jti = token_data['jti']
    await add_jti_to_blocklist(jti)
    response = JSONResponse(
        content={
            "message":"Logged out Successfully"
        }, status_code=status.HTTP_200_OK
    )
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        secure=False,
        samesite="lax"
    )
    return response


@auth_router.post('/reset_password')
async def reset_pasword(email_data: PasswordResetRequestModel):
    email = email_data.email
    client = email_data.client or "web"

    if client == "mobile":
        # Generate 6-digit code for mobile
        code = str(random.randint(100000, 999999))
        hashed_code = hash(code)
        
        # Store hashed code in Redis with expiry
        await store_reset_code(email, hashed_code)
        
        # Send code via email
        html = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <title>Password Reset Code</title>
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
            <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                <td style="padding: 40px; text-align: center;">
                    <h2 style="color: #333333;">Password Reset Code</h2>
                    <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                    Use the following code to reset your password:
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">{code}</span>
                    </div>
                    <p style="color: #888888; font-size: 14px;">
                    This code will expire in 10 minutes.
                    </p>
                    <p style="margin-top: 30px; color: #888888; font-size: 14px;">
                    If you didn't request a password reset, you can safely ignore this email.
                    </p>
                </td>
                </tr>
            </table>
            </body>
            </html>
            """
        emails = [email]
        subject = "Your Password Reset Code"
        send_email.delay(emails, subject, html)

        return JSONResponse(content={
            "message": "A 6-digit reset code has been sent to your email"
        }, status_code=status.HTTP_200_OK)

    # Existing web flow with link
    token = create_url_safe_token({"email": email})

    link = f"http://localhost:4200//reset-password/{token}"
    html = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <title>Reset Your Password</title>
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
            <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                <td style="padding: 40px; text-align: center;">
                    <h2 style="color: #333333;">Reset Your Password</h2>
                    <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                    We received a request to reset your password. Click the button below to choose a new password.
                    </p>
                    <a href="{link}" 
                    style="display: inline-block; margin-top: 25px; padding: 12px 25px; background-color: #4CAF50; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 5px; transition: background 0.3s;">
                    Reset Password
                    </a>
                    <p style="margin-top: 30px; color: #888888; font-size: 14px;">
                    If you didn’t request a password reset, you can safely ignore this email.
                    </p>
                </td>
                </tr>
            </table>
            </body>
            </html>
            """
    emails = [email]
    subject = "Reset you password"
    send_email.delay(emails, subject, html)

    return JSONResponse(content={
        "message": "Please check your email inbox to reset you password"
    }, status_code=status.HTTP_200_OK)


@auth_router.post('/verify_reset_code')
async def verify_reset_code(data: PasswordResetCodeVerifyModel):
    """Verify 6-digit reset code without resetting password (for mobile clients)"""
    email = data.email
    code = data.code

    # Get stored hashed code
    stored_hashed_code = await get_reset_code(email)
    if not stored_hashed_code:
        raise InvalidResetCode()

    # Verify code
    if not verify(code, stored_hashed_code):
        raise InvalidResetCode()

    return JSONResponse(content={
        "message": "Code verified successfully"
    }, status_code=status.HTTP_200_OK)


@auth_router.post('/reset_password_code')
async def reset_password_with_code(
    data: PasswordResetCodeConfirmModel,
    session: AsyncSession = Depends(get_session)
):
    """Reset password using 6-digit code (for mobile clients)"""
    email = data.email
    code = data.code
    new_password = data.new_password

    # Get stored hashed code
    stored_hashed_code = await get_reset_code(email)
    if not stored_hashed_code:
        raise InvalidResetCode()

    # Verify code
    if not verify(code, stored_hashed_code):
        raise InvalidResetCode()

    # Get user
    user = await UserService.get_user_by_email(email, session)
    if not user:
        raise UserNotFound()

    # Update password
    await UserService.update_user(user, {'password': hash(new_password)}, session)

    # Invalidate code (single-use)
    await delete_reset_code(email)

    return JSONResponse(content={
        "message": "Password has been updated successfully"
    }, status_code=status.HTTP_200_OK)


@auth_router.post('/reset_password_confirm/{token}')
async def reset_account_pasword(token: str, passwords: PasswordResetConfirmModel, session: AsyncSession = Depends(get_session)):
    if passwords.new_password != passwords.confirm_new_password:
        raise PasswordsDoNotMatch()
    token_data = decode_url_safe_token(token)

    user_email = token_data.get('email')
    if user_email:
        user = await UserService.get_user_by_email(user_email, session)
        if not user:
            raise UserNotFound()
        await UserService.update_user(user, {'password': hash(passwords.new_password)}, session)
        return JSONResponse(content={
            "message": "Password has been updated successfully"
        }, status_code=status.HTTP_200_OK)
    return JSONResponse(content={
        "message": "Error occured during password reset"
    }, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

@auth_router.get('/me', response_model=UserOut)
async def get_curr_user(user = Depends(get_current_user)):
    return user

@auth_router.get('/verify-email-change/{token}')
async def verify_email_change(token: str, session: AsyncSession = Depends(get_session)):
    """Verify and confirm email change"""
    try:
        token_data = decode_url_safe_token(token)
        new_email = token_data.get('email')
        user_id = token_data.get('user_id')
        
        if not new_email or not user_id:
            raise InvalidToken()
        
        # Get user
        from sqlalchemy import select
        from ..db.models import User
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFound()
        
        # Check if email is still available
        existing_user = await UserService.get_user_by_email(new_email, session)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        
        # Update email
        user.email = new_email
        user.is_verified = True  # Mark as verified
        await session.commit()
        await session.refresh(user)
        
        return JSONResponse(
            content={
                "message": "Email changé avec succès! Vous pouvez maintenant vous connecter avec votre nouvel email.",
                "email": new_email
            },
            status_code=status.HTTP_200_OK
        )
        
    except SignatureExpired:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le lien de vérification a expiré"
        )
    except BadSignature:
        raise InvalidToken()


@auth_router.patch('/me', response_model=UserOut)
async def update_curr_user(
    user_update: UserUpdate,
    user = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update current user's profile information"""
    update_data = user_update.model_dump(exclude_unset=True)
    
    if not update_data:
        return user
    
    # Handle email update separately - requires two-step verification
    if 'email' in update_data and update_data['email'] != user.email:
        new_email = update_data['email']
        
        # Check if email is already taken
        existing_user = await UserService.get_user_by_email(new_email, session)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        
        # Remove email from update_data to prevent immediate update
        update_data.pop('email')
        
        # Generate 6-digit code for OLD email verification
        from ..db.redis import store_email_change_old_code
        code = str(random.randint(100000, 999999))
        hashed_code = hash(code)
        
        # Store code and new email in Redis
        await store_email_change_old_code(user.id, hashed_code, new_email)
        
        # Send verification code to OLD email
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Vérification de changement d'email</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
            <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr>
                    <td style="padding: 40px; text-align: center;">
                        <h2 style="color: #333333;">Changement d'email demandé</h2>
                        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                            Une demande de changement d'email vers <strong>{new_email}</strong> a été effectuée.
                        </p>
                        <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                            Utilisez le code suivant pour confirmer cette demande:
                        </p>
                        <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">{code}</span>
                        </div>
                        <p style="color: #888888; font-size: 14px;">
                            Ce code expire dans 10 minutes.
                        </p>
                        <p style="margin-top: 30px; color: #888888; font-size: 14px;">
                            Si vous n'avez pas demandé ce changement, ignorez cet email et votre email actuel restera inchangé.
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        emails = [user.email]  # Send to OLD email
        subject = "Code de vérification - Changement d'email"
        send_email.delay(emails, subject, html)
        
        # Update other fields if any
        if update_data:
            await UserService.update_user(user, update_data, session)
            
        # Return response indicating code sent to old email
        return JSONResponse(
            content={
                "message": "Un code de vérification a été envoyé à votre email actuel.",
                "email_change_step": "verify_old_email",
                "pending_email": new_email
            },
            status_code=status.HTTP_200_OK
        )
    
    # Update user (non-email fields)
    updated_user = await UserService.update_user(user, update_data, session)
    return updated_user


# ==================== EMAIL CHANGE VERIFICATION ====================

from pydantic import BaseModel

class VerifyOldEmailCodeRequest(BaseModel):
    code: str

class VerifyNewEmailCodeRequest(BaseModel):
    code: str


@auth_router.post('/me/verify-old-email')
async def verify_old_email_for_change(
    data: VerifyOldEmailCodeRequest,
    user = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Step 1: Verify code sent to old email.
    If valid, send verification code to new email.
    """
    from ..db.redis import get_email_change_old_data, delete_email_change_old_data, store_email_change_new_code
    
    # Get stored data
    stored_data = await get_email_change_old_data(user.id)
    if not stored_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune demande de changement d'email en cours ou le code a expiré"
        )
    
    # Verify code
    if not verify(data.code, stored_data['hashed_code']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code invalide"
        )
    
    new_email = stored_data['new_email']
    
    # Delete old email verification data
    await delete_email_change_old_data(user.id)
    
    # Check if email is still available
    existing_user = await UserService.get_user_by_email(new_email, session)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'email est déjà utilisé par un autre compte"
        )
    
    # Generate code for NEW email
    code = str(random.randint(100000, 999999))
    hashed_code = hash(code)
    
    # Store code for new email verification
    await store_email_change_new_code(user.id, hashed_code, new_email)
    
    # Send verification code to NEW email
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Confirmez votre nouvel email</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <tr>
                <td style="padding: 40px; text-align: center;">
                    <h2 style="color: #333333;">Confirmez votre nouvel email</h2>
                    <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                        Utilisez le code suivant pour confirmer ce nouvel email:
                    </p>
                    <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4CAF50;">{code}</span>
                    </div>
                    <p style="color: #888888; font-size: 14px;">
                        Ce code expire dans 10 minutes.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    emails = [new_email]  # Send to NEW email
    subject = "Code de confirmation - Nouvel email"
    send_email.delay(emails, subject, html)
    
    return JSONResponse(
        content={
            "message": "Code vérifié! Un code de confirmation a été envoyé à votre nouvel email.",
            "email_change_step": "verify_new_email",
            "pending_email": new_email
        },
        status_code=status.HTTP_200_OK
    )


@auth_router.post('/me/verify-new-email')
async def verify_new_email_for_change(
    data: VerifyNewEmailCodeRequest,
    user = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Step 2: Verify code sent to new email.
    If valid, update the user's email.
    """
    from ..db.redis import get_email_change_new_data, delete_email_change_new_data
    
    # Get stored data
    stored_data = await get_email_change_new_data(user.id)
    if not stored_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune vérification en cours ou le code a expiré"
        )
    
    # Verify code
    if not verify(data.code, stored_data['hashed_code']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code invalide"
        )
    
    new_email = stored_data['new_email']
    
    # Final check if email is still available
    existing_user = await UserService.get_user_by_email(new_email, session)
    if existing_user and existing_user.id != user.id:
        await delete_email_change_new_data(user.id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'email est déjà utilisé par un autre compte"
        )
    
    # Update email
    user.email = new_email
    await session.commit()
    await session.refresh(user)
    
    # Delete verification data
    await delete_email_change_new_data(user.id)
    
    return JSONResponse(
        content={
            "message": "Email changé avec succès!",
            "email_change_step": "completed",
            "new_email": new_email
        },
        status_code=status.HTTP_200_OK
    )
