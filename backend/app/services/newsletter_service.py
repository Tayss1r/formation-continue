"""
Newsletter service for subscription management and campaign sending.
Uses existing Celery infrastructure for async email delivery.
"""

from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from ..db.models import NewsletterSubscription, Company
from ..constants import VALID_SECTORS, validate_sector


class NewsletterService:
    """Service class for newsletter-related operations"""

    @staticmethod
    async def subscribe(
        email: str,
        sector: str,
        session: AsyncSession,
        company_id: Optional[int] = None
    ) -> NewsletterSubscription:
        """
        Subscribe an email to the newsletter with a specific sector.
        Returns existing subscription if email already subscribed.
        """
        # Check for existing subscription
        existing = await NewsletterService.get_subscription_by_email(email, session)
        
        if existing:
            # If was unsubscribed, reactivate
            if not existing.is_active:
                existing.is_active = True
                existing.sector = sector  # Update sector if changed
                existing.unsubscribed_at = None
                existing.company_id = company_id
                await session.commit()
                await session.refresh(existing)
            return existing
        
        # Create new subscription
        subscription = NewsletterSubscription(
            email=email,
            sector=sector,
            company_id=company_id,
            is_active=True
        )
        
        session.add(subscription)
        await session.commit()
        await session.refresh(subscription)
        
        return subscription

    @staticmethod
    async def unsubscribe(email: str, session: AsyncSession) -> bool:
        """
        Unsubscribe an email from the newsletter.
        Returns True if unsubscribed, False if email not found.
        """
        subscription = await NewsletterService.get_subscription_by_email(email, session)
        
        if not subscription:
            return False
        
        subscription.is_active = False
        subscription.unsubscribed_at = datetime.utcnow()
        
        await session.commit()
        return True

    @staticmethod
    async def get_subscription_by_email(
        email: str, 
        session: AsyncSession
    ) -> Optional[NewsletterSubscription]:
        """Get subscription by email"""
        query = select(NewsletterSubscription).where(
            NewsletterSubscription.email == email
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def email_is_subscribed(email: str, session: AsyncSession) -> bool:
        """Check if email is already subscribed (active)"""
        subscription = await NewsletterService.get_subscription_by_email(email, session)
        return subscription is not None and subscription.is_active

    @staticmethod
    async def get_active_subscribers(
        session: AsyncSession,
        sectors: Optional[List[str]] = None
    ) -> List[NewsletterSubscription]:
        """
        Get all active subscribers, optionally filtered by sectors.
        If sectors is None, returns all active subscribers.
        """
        query = select(NewsletterSubscription).where(
            NewsletterSubscription.is_active == True
        )
        
        if sectors:
            query = query.where(NewsletterSubscription.sector.in_(sectors))
        
        result = await session.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_subscriber_emails_by_sector(
        session: AsyncSession,
        sectors: Optional[List[str]] = None
    ) -> List[str]:
        """
        Get email addresses of active subscribers, optionally filtered by sectors.
        """
        query = select(NewsletterSubscription.email).where(
            NewsletterSubscription.is_active == True
        )
        
        if sectors:
            query = query.where(NewsletterSubscription.sector.in_(sectors))
        
        result = await session.execute(query)
        return [row[0] for row in result.fetchall()]

    @staticmethod
    async def count_subscribers(
        session: AsyncSession,
        sectors: Optional[List[str]] = None,
        active_only: bool = True
    ) -> int:
        """Count subscribers, optionally filtered by sectors"""
        query = select(func.count(NewsletterSubscription.id))
        
        if active_only:
            query = query.where(NewsletterSubscription.is_active == True)
        
        if sectors:
            query = query.where(NewsletterSubscription.sector.in_(sectors))
        
        result = await session.execute(query)
        return result.scalar() or 0

    @staticmethod
    async def get_subscribers_stats(
        session: AsyncSession
    ) -> dict:
        """Get subscription statistics by sector"""
        # Get count per sector
        query = select(
            NewsletterSubscription.sector,
            func.count(NewsletterSubscription.id).label('count')
        ).where(
            NewsletterSubscription.is_active == True
        ).group_by(NewsletterSubscription.sector)
        
        result = await session.execute(query)
        stats = {row[0]: row[1] for row in result.fetchall()}
        
        # Add total
        stats['total'] = sum(stats.values())
        
        return stats

    @staticmethod
    def get_available_sectors() -> List[str]:
        """Get list of all available sectors"""
        return VALID_SECTORS
