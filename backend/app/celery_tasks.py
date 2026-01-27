from celery import Celery
from .mail import create_message, mail
from typing import List
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

celery_app = Celery()

celery_app.config_from_object('app.core.config')


@celery_app.task(name='app.celery_tasks.send_email')
def send_email(recipients: List[str], subject: str, body: str):
    message = create_message(
        recipients=recipients,
        subject=subject,
        body=body
    )
    async_to_sync(mail.send_message)(message)


@celery_app.task(name='app.celery_tasks.send_newsletter')
def send_newsletter(recipients: List[str], subject: str, body: str, sector: str = None):
    """
    Send newsletter to a list of recipients.
    Used for sector-targeted newsletter campaigns.
    
    Args:
        recipients: List of email addresses
        body: HTML body content
        subject: Email subject
        sector: Optional sector for logging/tracking
    """
    if not recipients:
        return {"status": "skipped", "reason": "no_recipients"}
    
    # Send in batches to avoid overwhelming the email server
    batch_size = 50
    sent_count = 0
    
    for i in range(0, len(recipients), batch_size):
        batch = recipients[i:i + batch_size]
        message = create_message(
            recipients=batch,
            subject=subject,
            body=body
        )
        async_to_sync(mail.send_message)(message)
        sent_count += len(batch)
    
    return {
        "status": "sent",
        "recipients_count": sent_count,
        "sector": sector
    }


@celery_app.task(name='app.celery_tasks.send_newsletter_batch')
def send_newsletter_batch(
    subject: str,
    body: str,
    sectors: List[str] = None,
    recipients: List[str] = None
):
    """
    Send newsletter to multiple sectors.
    If sectors is None, sends to all subscribers.
    If recipients is provided directly, uses those instead of fetching from DB.
    """
    from .db.database import async_session
    from .services.newsletter_service import NewsletterService
    
    async def get_recipients():
        async with async_session() as session:
            if recipients:
                return recipients
            return await NewsletterService.get_subscriber_emails_by_sector(
                session=session,
                sectors=sectors
            )
    
    email_list = async_to_sync(get_recipients)()
    
    if not email_list:
        return {
            "status": "skipped",
            "reason": "no_recipients",
            "sectors": sectors
        }
    
    # Send the newsletter
    result = send_newsletter(
        recipients=email_list,
        subject=subject,
        body=body,
        sector=",".join(sectors) if sectors else "all"
    )
    
    return result 