"""
Service layer for the Employee Admission Invitation Workflow.

Handles:
- Company invitation generation on application approval
- Employee invitation generation when company invites employees
- Token validation for both company and employee invitations
- Email sending for invitations
"""

import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import (
    CompanyInvitation,
    EmployeeInvitation,
    CompanyApplication,
    ApplicationStatus,
    Company,
    User,
    UserRole,
    EmployeeProfile,
    EmployeeSubmission,
    EmployeeSubmissionStatus,
    CallForApplicants,
)
from ..celery_tasks import send_email
from ..core.config import settings


# Token expiry durations
COMPANY_TOKEN_EXPIRY_DAYS = 30
EMPLOYEE_TOKEN_EXPIRY_DAYS = 14


def _generate_secure_token() -> str:
    """Generate a cryptographically secure token."""
    return secrets.token_urlsafe(48)


class InvitationService:
    """Service for managing invitation workflow."""

    # =========================================================================
    # COMPANY INVITATION
    # =========================================================================

    @staticmethod
    async def create_company_invitation(
        application: CompanyApplication,
        session: AsyncSession,
    ) -> CompanyInvitation:
        """
        Create a company invitation token after an application is approved.
        """
        token = _generate_secure_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=COMPANY_TOKEN_EXPIRY_DAYS)

        invitation = CompanyInvitation(
            application_id=application.id,
            token=token,
            expires_at=expires_at,
        )
        session.add(invitation)
        await session.flush()
        return invitation

    @staticmethod
    async def get_company_invitation_by_token(
        token: str,
        session: AsyncSession,
    ) -> Optional[CompanyInvitation]:
        """Get a company invitation by its token."""
        query = (
            select(CompanyInvitation)
            .options(
                selectinload(CompanyInvitation.application)
                .selectinload(CompanyApplication.call),
                selectinload(CompanyInvitation.application)
                .selectinload(CompanyApplication.company)
                .selectinload(Company.user),
            )
            .where(CompanyInvitation.token == token)
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_company_invitation_by_application(
        application_id: int,
        session: AsyncSession,
    ) -> Optional[CompanyInvitation]:
        """Get a company invitation by application ID."""
        query = (
            select(CompanyInvitation)
            .options(
                selectinload(CompanyInvitation.application)
                .selectinload(CompanyApplication.call),
                selectinload(CompanyInvitation.application)
                .selectinload(CompanyApplication.company)
                .selectinload(Company.user),
                selectinload(CompanyInvitation.employee_invitations),
            )
            .where(CompanyInvitation.application_id == application_id)
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    def validate_company_invitation(invitation: CompanyInvitation) -> Tuple[bool, str]:
        """Validate a company invitation token."""
        if not invitation:
            return False, "Invitation non trouvée"

        now = datetime.now(timezone.utc)
        exp = invitation.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if now > exp:
            return False, "L'invitation a expiré"

        if invitation.application.status != ApplicationStatus.APPROVED:
            return False, "La candidature de l'entreprise n'est plus approuvée"

        return True, "OK"

    # =========================================================================
    # EMPLOYEE INVITATION
    # =========================================================================

    @staticmethod
    async def create_employee_invitations(
        company_invitation: CompanyInvitation,
        employees: List[dict],
        session: AsyncSession,
    ) -> List[EmployeeInvitation]:
        """
        Create employee invitations and send emails.
        employees: List of {'name': ..., 'email': ...}
        """
        created = []
        for emp in employees:
            token = _generate_secure_token()
            expires_at = datetime.now(timezone.utc) + timedelta(days=EMPLOYEE_TOKEN_EXPIRY_DAYS)

            inv = EmployeeInvitation(
                company_invitation_id=company_invitation.id,
                employee_name=emp["name"],
                employee_email=emp["email"],
                token=token,
                expires_at=expires_at,
            )
            session.add(inv)
            created.append(inv)

        await session.flush()
        return created

    @staticmethod
    async def get_employee_invitation_by_token(
        token: str,
        session: AsyncSession,
    ) -> Optional[EmployeeInvitation]:
        """Get an employee invitation by its token."""
        query = (
            select(EmployeeInvitation)
            .options(
                selectinload(EmployeeInvitation.company_invitation)
                .selectinload(CompanyInvitation.application)
                .selectinload(CompanyApplication.call),
                selectinload(EmployeeInvitation.company_invitation)
                .selectinload(CompanyInvitation.application)
                .selectinload(CompanyApplication.company)
                .selectinload(Company.user),
            )
            .where(EmployeeInvitation.token == token)
        )
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    def validate_employee_invitation(invitation: EmployeeInvitation) -> Tuple[bool, str]:
        """Validate an employee invitation."""
        if not invitation:
            return False, "Invitation non trouvée"

        if invitation.is_used:
            return False, "Cette invitation a déjà été utilisée"

        now = datetime.now(timezone.utc)
        exp = invitation.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if now > exp:
            return False, "L'invitation a expiré"

        return True, "OK"

    @staticmethod
    async def get_employee_invitations_for_company(
        company_invitation_id: int,
        session: AsyncSession,
    ) -> List[EmployeeInvitation]:
        """Get all employee invitations for a company invitation."""
        query = (
            select(EmployeeInvitation)
            .where(EmployeeInvitation.company_invitation_id == company_invitation_id)
            .order_by(EmployeeInvitation.created_at.desc())
        )
        result = await session.execute(query)
        return list(result.scalars().all())

    # =========================================================================
    # EMAIL SENDING
    # =========================================================================

    @staticmethod
    def send_company_approval_email(
        company_email: str,
        company_name: str,
        call_title: str,
        invitation_token: str,
    ):
        """Send approval email to company with invitation link."""
        invite_url = f"{settings.FRONTEND_URL}/dashboard/invite?token={invitation_token}"

        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Candidature Approuvée</title></head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0"
               style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 8px;
                      overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981, #059669);
                          border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center;
                          justify-content: center;">
                <span style="color: white; font-size: 28px;">✓</span>
              </div>
              <h2 style="color: #333333; margin-bottom: 10px;">Félicitations, {company_name} !</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                Votre candidature pour l'appel <strong>« {call_title} »</strong>
                a été <span style="color: #10b981; font-weight: bold;">approuvée</span>.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                La prochaine étape consiste à inviter vos employés afin qu'ils puissent
                créer leur compte et soumettre les documents requis.
              </p>
              <a href="{invite_url}"
                 style="display: inline-block; margin-top: 25px; padding: 14px 32px;
                        background: linear-gradient(135deg, #2563eb, #1d4ed8);
                        color: #ffffff; text-decoration: none; font-weight: bold;
                        border-radius: 8px; font-size: 16px;">
                Inviter mes employés
              </a>
              <p style="margin-top: 30px; color: #888888; font-size: 13px;">
                Ce lien est valide pendant {COMPANY_TOKEN_EXPIRY_DAYS} jours.<br>
                Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
              </p>
            </td>
          </tr>
        </table>
        </body>
        </html>
        """

        send_email.delay(
            [company_email],
            f"Candidature approuvée – {call_title}",
            html,
        )

    @staticmethod
    def send_employee_invitation_email(
        employee_email: str,
        employee_name: str,
        company_name: str,
        call_title: str,
        invitation_token: str,
    ):
        """Send invitation email to an employee."""
        register_url = f"{settings.FRONTEND_URL}/signup?token={invitation_token}"

        html = f"""
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Invitation à la formation</title></head>
        <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0"
               style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 8px;
                      overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h2 style="color: #333333;">Bonjour {employee_name},</h2>
              <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                L'entreprise <strong>{company_name}</strong> vous invite à participer
                à la formation dans le cadre de l'appel <strong>« {call_title} »</strong>.
              </p>
              <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                Cliquez sur le bouton ci-dessous pour créer votre compte et soumettre
                vos documents.
              </p>
              <a href="{register_url}"
                 style="display: inline-block; margin-top: 25px; padding: 14px 32px;
                        background: linear-gradient(135deg, #2563eb, #1d4ed8);
                        color: #ffffff; text-decoration: none; font-weight: bold;
                        border-radius: 8px; font-size: 16px;">
                Créer mon compte
              </a>
              <p style="margin-top: 30px; color: #888888; font-size: 13px;">
                Ce lien est valide pendant {EMPLOYEE_TOKEN_EXPIRY_DAYS} jours.<br>
                Si vous n'êtes pas concerné par cette invitation, ignorez cet email.
              </p>
            </td>
          </tr>
        </table>
        </body>
        </html>
        """

        send_email.delay(
            [employee_email],
            f"Invitation Formation – {call_title}",
            html,
        )
