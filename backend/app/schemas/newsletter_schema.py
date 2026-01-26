"""
Newsletter subscription schemas.
Uses Pydantic v2 with model_dump() for ORM conversion.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, model_validator

from ..constants import VALID_SECTORS, validate_sector


class NewsletterSubscribeRequest(BaseModel):
    """Schema for subscribing to the newsletter"""
    email: EmailStr
    sector: str = Field(..., min_length=2, max_length=100)
    
    @model_validator(mode='after')
    def validate_sector(self):
        """Validate that sector is in the controlled list"""
        if not validate_sector(self.sector):
            raise ValueError(f"Invalid sector. Must be one of: {', '.join(VALID_SECTORS)}")
        return self


class NewsletterUnsubscribeRequest(BaseModel):
    """Schema for unsubscribing from the newsletter"""
    email: EmailStr


class NewsletterSubscriptionOut(BaseModel):
    """Output schema for newsletter subscription"""
    id: int
    email: str
    sector: str
    is_active: bool
    subscribed_at: datetime
    unsubscribed_at: Optional[datetime] = None
    company_id: Optional[int] = None

    class Config:
        from_attributes = True


class NewsletterSubscribeResponse(BaseModel):
    """Response after successful subscription"""
    message: str
    subscription: NewsletterSubscriptionOut


class NewsletterUnsubscribeResponse(BaseModel):
    """Response after successful unsubscription"""
    message: str


class NewsletterSendRequest(BaseModel):
    """Schema for sending newsletter (admin only)"""
    subject: str = Field(..., min_length=5, max_length=200)
    body: str = Field(..., min_length=20)
    sectors: Optional[List[str]] = None  # None means all sectors
    
    @model_validator(mode='after')
    def validate_sectors(self):
        """Validate that all sectors are valid"""
        if self.sectors:
            for sector in self.sectors:
                if not validate_sector(sector):
                    raise ValueError(f"Invalid sector: {sector}. Must be one of: {', '.join(VALID_SECTORS)}")
        return self


class NewsletterSendResponse(BaseModel):
    """Response after newsletter is queued for sending"""
    message: str
    recipients_count: int
    sectors_targeted: List[str]


class SectorListResponse(BaseModel):
    """Response with list of available sectors"""
    sectors: List[str]
