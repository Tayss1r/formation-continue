"""
Service layer for Audit Logging.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.models import AuditLog, User


class AuditService:
    """Service for audit logging"""
    
    @staticmethod
    async def log_action(
        user: User,
        action: str,
        entity_type: str,
        entity_id: int,
        session: AsyncSession,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """
        Log an auditable action.
        
        Args:
            user: The user performing the action
            action: Action identifier (e.g., "application.approve", "call.publish")
            entity_type: Type of entity (e.g., "CompanyApplication", "CallForApplicants")
            entity_id: ID of the entity
            session: Database session
            old_values: Previous values (for updates)
            new_values: New values (for creates/updates)
            notes: Additional notes
            ip_address: Client IP address
        """
        role = user.role.value if hasattr(user.role, 'value') else user.role
        
        log = AuditLog(
            user_id=user.id,
            user_role=role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            notes=notes,
            ip_address=ip_address,
        )
        
        session.add(log)
        await session.flush()
        
        return log
    
    @staticmethod
    async def log_call_action(
        user: User,
        action: str,
        call_id: int,
        session: AsyncSession,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Log a call-related action"""
        old_values = {"status": old_status} if old_status else None
        new_values = {"status": new_status} if new_status else None
        
        return await AuditService.log_action(
            user=user,
            action=f"call.{action}",
            entity_type="CallForApplicants",
            entity_id=call_id,
            session=session,
            old_values=old_values,
            new_values=new_values,
            notes=notes,
            ip_address=ip_address,
        )
    
    @staticmethod
    async def log_application_action(
        user: User,
        action: str,
        application_id: int,
        session: AsyncSession,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Log an application-related action"""
        old_values = {"status": old_status} if old_status else None
        new_values = {"status": new_status} if new_status else None
        
        return await AuditService.log_action(
            user=user,
            action=f"application.{action}",
            entity_type="CompanyApplication",
            entity_id=application_id,
            session=session,
            old_values=old_values,
            new_values=new_values,
            notes=notes,
            ip_address=ip_address,
        )
    
    @staticmethod
    async def log_submission_action(
        user: User,
        action: str,
        submission_id: int,
        session: AsyncSession,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Log a submission-related action"""
        old_values = {"status": old_status} if old_status else None
        new_values = {"status": new_status} if new_status else None
        
        return await AuditService.log_action(
            user=user,
            action=f"submission.{action}",
            entity_type="EmployeeSubmission",
            entity_id=submission_id,
            session=session,
            old_values=old_values,
            new_values=new_values,
            notes=notes,
            ip_address=ip_address,
        )
    
    @staticmethod
    async def log_document_action(
        user: User,
        action: str,
        document_id: int,
        entity_type: str,
        session: AsyncSession,
        review_status: Optional[str] = None,
        notes: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """Log a document-related action"""
        new_values = {"review_status": review_status} if review_status else None
        
        return await AuditService.log_action(
            user=user,
            action=f"document.{action}",
            entity_type=entity_type,
            entity_id=document_id,
            session=session,
            new_values=new_values,
            notes=notes,
            ip_address=ip_address,
        )
