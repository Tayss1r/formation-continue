"""
Newsletter API endpoints for subscription management and campaign sending.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_session
from ..db.models import User, UserRole
from ..dependencies import get_current_user, RoleChecker
from ..services.newsletter_service import NewsletterService
from ..schemas.newsletter_schema import (
    NewsletterSubscribeRequest,
    NewsletterUnsubscribeRequest,
    NewsletterSubscribeResponse,
    NewsletterUnsubscribeResponse,
    NewsletterSendRequest,
    NewsletterSendResponse,
    NewsletterSubscriptionOut,
    SectorListResponse,
)
from ..constants import VALID_SECTORS
from ..error import DuplicateSubscription, InvalidSector
from ..celery_tasks import send_newsletter_batch

newsletter_router = APIRouter()


# ========================
# PUBLIC ENDPOINTS
# ========================

@newsletter_router.get("/sectors", response_model=SectorListResponse)
async def get_available_sectors():
    """
    Get list of available industry sectors for newsletter subscription.
    Public endpoint.
    """
    return SectorListResponse(sectors=VALID_SECTORS)


@newsletter_router.post("/subscribe", response_model=NewsletterSubscribeResponse)
async def subscribe_to_newsletter(
    subscribe_data: NewsletterSubscribeRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Subscribe to the newsletter with a specific industry sector.
    Public endpoint - no authentication required.
    
    Returns existing subscription if email is already subscribed.
    Reactivates subscription if previously unsubscribed.
    """
    # Check if already subscribed and active
    is_subscribed = await NewsletterService.email_is_subscribed(
        subscribe_data.email, session
    )
    
    if is_subscribed:
        raise DuplicateSubscription()
    
    subscription = await NewsletterService.subscribe(
        email=subscribe_data.email,
        sector=subscribe_data.sector,
        session=session
    )
    
    return NewsletterSubscribeResponse(
        message="Successfully subscribed to newsletter. You will receive training and consulting offers tailored to your industry.",
        subscription=NewsletterSubscriptionOut.model_validate(subscription)
    )


@newsletter_router.post("/subscribe/authenticated", response_model=NewsletterSubscribeResponse)
async def subscribe_authenticated(
    subscribe_data: Optional[NewsletterSubscribeRequest] = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Subscribe to newsletter as an authenticated user.
    For company users, sector is auto-filled from company profile.
    
    If subscribe_data is provided, it can override the sector (if allowed).
    """
    email = current_user.email
    sector = None
    company_id = None
    
    # If user is a company, use their profile data
    if current_user.role == UserRole.COMPANY.value and current_user.company:
        sector = current_user.company.industry_sector
        company_id = current_user.company.id
    
    # Allow override from request if provided
    if subscribe_data:
        if subscribe_data.email and subscribe_data.email != email:
            email = subscribe_data.email  # Allow different email if provided
        if subscribe_data.sector:
            sector = subscribe_data.sector
    
    if not sector:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sector is required for newsletter subscription"
        )
    
    # Check if already subscribed and active
    is_subscribed = await NewsletterService.email_is_subscribed(email, session)
    if is_subscribed:
        raise DuplicateSubscription()
    
    subscription = await NewsletterService.subscribe(
        email=email,
        sector=sector,
        session=session,
        company_id=company_id
    )
    
    return NewsletterSubscribeResponse(
        message="Successfully subscribed to newsletter.",
        subscription=NewsletterSubscriptionOut.model_validate(subscription)
    )


@newsletter_router.post("/unsubscribe", response_model=NewsletterUnsubscribeResponse)
async def unsubscribe_from_newsletter(
    unsubscribe_data: NewsletterUnsubscribeRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Unsubscribe from the newsletter.
    Public endpoint - only requires the email address.
    """
    success = await NewsletterService.unsubscribe(unsubscribe_data.email, session)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found in newsletter subscriptions"
        )
    
    return NewsletterUnsubscribeResponse(
        message="Successfully unsubscribed from newsletter."
    )


# ========================
# ADMIN/STAFF ENDPOINTS
# ========================

@newsletter_router.post("/send", response_model=NewsletterSendResponse)
async def send_newsletter_campaign(
    send_data: NewsletterSendRequest,
    current_user: User = Depends(RoleChecker([UserRole.STAFF, UserRole.ADMIN])),
    session: AsyncSession = Depends(get_session)
):
    """
    Send newsletter to subscribers.
    Staff/Admin only.
    
    - If sectors is None or empty, sends to ALL active subscribers.
    - If sectors is provided, sends only to subscribers in those sectors.
    
    Uses Celery for async sending to avoid blocking.
    """
    sectors = send_data.sectors
    
    # Get recipient count for response
    recipients_count = await NewsletterService.count_subscribers(
        session=session,
        sectors=sectors,
        active_only=True
    )
    
    if recipients_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscribers found for the selected sectors"
        )
    
    # Get recipient emails
    recipient_emails = await NewsletterService.get_subscriber_emails_by_sector(
        session=session,
        sectors=sectors
    )
    
    # Queue newsletter for async sending via Celery
    send_newsletter_batch.delay(
        subject=send_data.subject,
        body=send_data.body,
        sectors=sectors,
        recipients=recipient_emails
    )
    
    targeted_sectors = sectors if sectors else ["all"]
    
    return NewsletterSendResponse(
        message=f"Newsletter queued for sending to {recipients_count} recipients.",
        recipients_count=recipients_count,
        sectors_targeted=targeted_sectors
    )


@newsletter_router.get("/stats")
async def get_newsletter_stats(
    current_user: User = Depends(RoleChecker([UserRole.STAFF, UserRole.ADMIN])),
    session: AsyncSession = Depends(get_session)
):
    """
    Get newsletter subscription statistics.
    Staff/Admin only.
    """
    stats = await NewsletterService.get_subscribers_stats(session)
    
    return {
        "total_subscribers": stats.get('total', 0),
        "by_sector": {k: v for k, v in stats.items() if k != 'total'}
    }
