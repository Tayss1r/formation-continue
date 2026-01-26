"""
Authentication Schemas - Role-based signup and auth flows

Uses Pydantic v2 with model_dump() for ORM conversion.
"""

from typing import Annotated, Literal, Optional
from pydantic import BaseModel, EmailStr, StringConstraints, Field, model_validator


# ==================== SIGNUP SCHEMAS ====================

class StaffSignupRequest(BaseModel):
    """Schema for staff user registration"""
    role: Literal["staff"] = "staff"
    username: Annotated[str, StringConstraints(min_length=3, max_length=30)]
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=8, max_length=100)]
    fullname: Annotated[str, StringConstraints(min_length=2, max_length=100)]
    phone: Optional[str] = None


class CompanySignupRequest(BaseModel):
    """Schema for company user registration"""
    role: Literal["company"] = "company"
    # User fields
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=8, max_length=100)]
    fullname: Annotated[str, StringConstraints(min_length=2, max_length=100)]  # Contact person
    phone: Optional[str] = None
    
    # Company fields
    company_name: Annotated[str, StringConstraints(min_length=2, max_length=200)]
    industry_sector: Annotated[str, StringConstraints(min_length=2, max_length=100)]
    billing_info: Annotated[str, StringConstraints(min_length=5, max_length=500)]


class ProfessorSignupRequest(BaseModel):
    """Schema for professor user registration"""
    role: Literal["professor"] = "professor"
    username: Annotated[str, StringConstraints(min_length=3, max_length=30)]
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=8, max_length=100)]
    fullname: Annotated[str, StringConstraints(min_length=2, max_length=100)]
    phone: Optional[str] = None
    
    # Professor-specific fields
    specialization: Annotated[str, StringConstraints(min_length=2, max_length=200)]
    hourly_rate: float = Field(default=0.0, ge=0)


class SignupRequest(BaseModel):
    """
    Unified signup request that handles all role types.
    Validates required fields based on the selected role.
    
    NOTE: Staff role is NOT allowed for public signup.
    Staff accounts must be created by admin only.
    """
    role: Literal["company", "professor"]  # Staff excluded from public signup
    
    # Common fields
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=8, max_length=100)]
    fullname: Annotated[str, StringConstraints(min_length=2, max_length=100)]
    phone: Optional[str] = None
    
    # Staff/Professor fields
    username: Optional[Annotated[str, StringConstraints(min_length=3, max_length=30)]] = None
    
    # Company-specific fields
    company_name: Optional[Annotated[str, StringConstraints(min_length=2, max_length=200)]] = None
    industry_sector: Optional[Annotated[str, StringConstraints(min_length=2, max_length=100)]] = None
    billing_info: Optional[Annotated[str, StringConstraints(min_length=5, max_length=500)]] = None
    
    # Professor-specific fields
    specialization: Optional[Annotated[str, StringConstraints(min_length=2, max_length=200)]] = None
    hourly_rate: Optional[float] = Field(default=None, ge=0)
    
    @model_validator(mode='after')
    def validate_role_fields(self):
        """Validate required fields based on role"""
        # Staff is not allowed via public signup
        if self.role == "staff":
            raise ValueError("Staff accounts cannot be created via public signup")
                
        if self.role == "company":
            if not self.company_name:
                raise ValueError("Company name is required for company signup")
            if not self.industry_sector:
                raise ValueError("Industry sector is required for company signup")
            if not self.billing_info:
                raise ValueError("Billing info is required for company signup")
                
        elif self.role == "professor":
            if not self.username:
                raise ValueError("Username is required for professor signup")
            if not self.specialization:
                raise ValueError("Specialization is required for professor signup")
        
        return self
    
    def get_user_data(self) -> dict:
        """Extract user-related fields for User model creation"""
        return {
            "email": self.email,
            "password": self.password,
            "fullname": self.fullname,
            "phone": self.phone,
            "username": self.username,
        }
    
    def get_company_data(self) -> dict:
        """Extract company-related fields for Company model creation"""
        return {
            "name": self.company_name,
            "industry_sector": self.industry_sector,
            "billing_info": self.billing_info,
        }
    
    def get_professor_data(self) -> dict:
        """Extract professor-related fields for Professor model creation"""
        return {
            "specialization": self.specialization,
            "hourly_rate": self.hourly_rate or 0.0,
        }


class SignupResponse(BaseModel):
    """Response after successful signup"""
    message: str
    email: str
    requires_verification: bool = True


# ==================== LOGIN SCHEMAS ====================

class LoginRequest(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Response after successful login"""
    message: str
    access_token: str
    user: dict


# ==================== EMAIL VERIFICATION SCHEMAS ====================

class VerifyEmailCodeRequest(BaseModel):
    """Schema for verifying email with 6-digit code"""
    email: EmailStr
    code: Annotated[str, StringConstraints(min_length=6, max_length=6)]


class ResendVerificationCodeRequest(BaseModel):
    """Schema for resending verification code"""
    email: EmailStr


class VerifyEmailResponse(BaseModel):
    """Response after email verification"""
    message: str
    verified: bool


# ==================== TOKEN SCHEMAS ====================

class RefreshTokenResponse(BaseModel):
    """Response for token refresh"""
    access_token: str


class LogoutResponse(BaseModel):
    """Response after logout"""
    message: str


# ==================== USER OUTPUT SCHEMAS ====================

class UserResponse(BaseModel):
    """User output schema for API responses"""
    id: int
    email: EmailStr
    username: str
    fullname: str
    phone: Optional[str] = None
    is_verified: bool
    role: str
    company: Optional[dict] = None
    professor: Optional[dict] = None

    class Config:
        from_attributes = True


class CompanyResponse(BaseModel):
    """Company output schema"""
    id: int
    name: str
    industry_sector: str
    billing_info: str

    class Config:
        from_attributes = True


class ProfessorResponse(BaseModel):
    """Professor output schema"""
    id: int
    specialization: str
    hourly_rate: float

    class Config:
        from_attributes = True
