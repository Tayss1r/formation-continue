import logging

from fastapi import APIRouter

from ..schemas.contact_schema import ContactMessageCreate, ContactMessageResponse
from ..mail import create_message, mail
from ..core.config import settings

logger = logging.getLogger(__name__)

contact_router = APIRouter()


@contact_router.post("", response_model=ContactMessageResponse)
async def submit_contact_message(payload: ContactMessageCreate):
    """Receive a public contact message from the landing page."""
    subject = f"Nouveau message de contact - {payload.name}"
    body = f"""
    <h3>Nouveau message de contact</h3>
    <p><strong>Nom:</strong> {payload.name}</p>
    <p><strong>Email:</strong> {payload.email}</p>
    <p><strong>Message:</strong><br>{payload.message}</p>
    """

    try:
        message = create_message([settings.MAIL_FROM], subject, body)
        await mail.send_message(message)
    except Exception:
        # Do not expose mail provider failures to end users; log for operators.
        logger.exception("Failed to send contact email")

    return ContactMessageResponse(
        message="Votre message a bien ete envoye. Notre equipe vous repondra rapidement."
    )
