"""
Database seeding script for testing Coordinator Dashboard functionality

This script creates test data including:
- Coordinator users
- Calls for applicants
- Company applications in various statuses
- Application documents
- Employee submissions
- Audit logs

Run this script after running migrations.
Usage: python seed_coordinator_data.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.db.database import get_session
from app.db.models import (
    User, UserRole, Company, EmployeeProfile,
    CallForApplicants, CallStatus, CompanyApplication, ApplicationStatus,
    ApplicationDocument, DocumentReviewStatus,
    EmployeeSubmission, EmployeeSubmissionStatus,
    AuditLog, Department, AccountStatus
)
from app.utils import hash


async def clear_test_data(session: AsyncSession):
    """Clear existing test data"""
    print("🧹 Clearing existing test data...")
    
    # Delete in reverse dependency order
    await session.execute("DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%')")
    await session.execute("DELETE FROM employee_submission_documents")
    await session.execute("DELETE FROM employee_submissions")
    await session.execute("DELETE FROM application_documents")
    await session.execute("DELETE FROM company_applications")
    await session.execute("DELETE FROM calls_for_applicants WHERE created_by_id IN (SELECT id FROM users WHERE email LIKE 'test_%')")
    await session.execute("DELETE FROM employee_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%')")
    await session.execute("DELETE FROM companies WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test_%')")
    await session.execute("DELETE FROM users WHERE email LIKE 'test_%'")
    
    await session.commit()
    print("✅ Test data cleared")


async def create_users(session: AsyncSession):
    """Create test users"""
    print("\n👥 Creating test users...")
    
    users = {}
    
    # Create coordinator
    coordinator = User(
        username="test_coordinator",
        email="test_coordinator@example.com",
        password=hash("password123"),
        phone="0612345678",
        fullname="Test Coordinator",
        role=UserRole.COORDINATOR
    )
    session.add(coordinator)
    users['coordinator'] = coordinator
    
    # Create companies
    for i in range(1, 6):
        company_user = User(
            username=f"test_company_{i}",
            email=f"test_company{i}@example.com",
            password=hash("password123"),
            phone=f"061234567{i}",
            fullname=f"Company {i} Admin",
            role=UserRole.COMPANY
        )
        session.add(company_user)
        
        company = Company(
            user=company_user,
            company_name=f"Test Company {i}",
            registration_number=f"RC{1000+i}",
            address=f"{i} Test Street, Test City",
            business_sector="Technology",
            employee_count=50 + (i * 10),
            status=AccountStatus.ACTIVE
        )
        session.add(company)
        users[f'company_{i}'] = company_user
        users[f'company_obj_{i}'] = company
    
    # Create employees for companies
    for i in range(1, 11):
        company_idx = ((i - 1) % 5) + 1
        employee_user = User(
            username=f"test_employee_{i}",
            email=f"test_employee{i}@example.com",
            password=hash("password123"),
            phone=f"062234567{i}",
            fullname=f"Employee {i}",
            role=UserRole.EMPLOYEE
        )
        session.add(employee_user)
        
        employee = EmployeeProfile(
            user=employee_user,
            company_id=None,  # Will be set after companies are flushed
            date_of_birth=datetime(1990 + i % 10, 1 + i % 12, 1),
            position=f"Position {i}",
            hire_date=datetime.now() - timedelta(days=365 * (i % 5))
        )
        session.add(employee)
        users[f'employee_{i}'] = employee_user
        users[f'employee_obj_{i}'] = employee
    
    await session.flush()
    
    # Link employees to companies
    for i in range(1, 11):
        company_idx = ((i - 1) % 5) + 1
        users[f'employee_obj_{i}'].company_id = users[f'company_obj_{company_idx}'].id
    
    await session.commit()
    print(f"✅ Created {len([k for k in users if k.startswith('company_obj')])} companies")
    print(f"✅ Created {len([k for k in users if k.startswith('employee_obj')])} employees")
    print(f"✅ Created 1 coordinator")
    
    return users


async def create_calls(session: AsyncSession, users: dict):
    """Create test calls for applicants"""
    print("\n📢 Creating calls for applicants...")
    
    coordinator = users['coordinator']
    calls = {}
    
    departments = [Department.INFORMATIQUE, Department.MECANIQUE, Department.ELECTRIQUE]
    statuses = [CallStatus.PUBLISHED, CallStatus.PUBLISHED, CallStatus.CLOSED]
    
    for i in range(1, 4):
        call = CallForApplicants(
            title=f"Formation Continue - {departments[i-1].value.title()} 2026-{i}",
            reference_number=f"FC-2026-{i:03d}",
            department=departments[i-1],
            description=f"Formation professionnelle en {departments[i-1].value} - Session {i}",
            eligibility_criteria="Entreprises de la région avec minimum 5 employés",
            required_documents=['registre_commerce', 'attestation_fiscale', 'liste_employes'],
            employee_required_documents=['cin', 'cv', 'attestation_travail'],
            application_start_date=datetime.now() - timedelta(days=30 - i*5),
            application_deadline=datetime.now() + timedelta(days=30 + i*10),
            results_publication_date=datetime.now() + timedelta(days=60 + i*10),
            status=statuses[i-1],
            created_by_id=coordinator.id,
            published_at=datetime.now() - timedelta(days=25 - i*5) if statuses[i-1] != CallStatus.DRAFT else None
        )
        session.add(call)
        calls[f'call_{i}'] = call
    
    await session.commit()
    print(f"✅ Created {len(calls)} calls for applicants")
    
    return calls


async def create_applications(session: AsyncSession, users: dict, calls: dict):
    """Create test applications"""
    print("\n📝 Creating company applications...")
    
    applications = {}
    app_statuses = [
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
        ApplicationStatus.DOCUMENTS_PENDING,
        ApplicationStatus.ADDITIONAL_INFO_REQUIRED
    ]
    
    app_idx = 0
    
    # Create applications for each call
    for call_idx in range(1, 4):
        call = calls[f'call_{call_idx}']
        
        # Each call gets 3-4 applications
        num_apps = 3 if call_idx != 1 else 4
        for i in range(1, num_apps + 1):
            company_idx = (app_idx % 5) + 1
            company = users[f'company_obj_{company_idx}']
            status = app_statuses[app_idx % len(app_statuses)]
            
            application = CompanyApplication(
                call_id=call.id,
                company_id=company.id,
                status=status,
                motivation_letter=f"Notre entreprise souhaite former {i*2} employés dans le domaine de {call.department.value}. "
                                  f"Cette formation permettra d'améliorer les compétences de notre équipe.",
                proposed_employee_count=i * 2,
                coordinator_id=users['coordinator'].id if status in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED] else None,
                decision_date=datetime.now() - timedelta(days=2) if status in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED] else None,
                decision_notes=f"Application {'approuvée' if status == ApplicationStatus.APPROVED else 'rejetée'} après révision" 
                               if status in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED] else None,
                rejection_reason="Capacité maximale atteinte" if status == ApplicationStatus.REJECTED else None,
                submitted_at=datetime.now() - timedelta(days=10 + app_idx)
            )
            session.add(application)
            applications[f'app_{app_idx + 1}'] = application
            app_idx += 1
    
    await session.commit()
    print(f"✅ Created {len(applications)} applications")
    print(f"   - Submitted: {len([a for a in applications.values() if a.status == ApplicationStatus.SUBMITTED])}")
    print(f"   - Under Review: {len([a for a in applications.values() if a.status == ApplicationStatus.UNDER_REVIEW])}")
    print(f"   - Approved: {len([a for a in applications.values() if a.status == ApplicationStatus.APPROVED])}")
    print(f"   - Rejected: {len([a for a in applications.values() if a.status == ApplicationStatus.REJECTED])}")
    
    return applications


async def create_documents(session: AsyncSession, applications: dict):
    """Create test application documents"""
    print("\n📄 Creating application documents...")
    
    documents = []
    doc_types = ['registre_commerce', 'attestation_fiscale', 'liste_employes']
    review_statuses = [DocumentReviewStatus.APPROVED, DocumentReviewStatus.PENDING, DocumentReviewStatus.REJECTED]
    
    for app_key, application in applications.items():
        # Each application gets 1-3 documents
        num_docs = min(len(doc_types), (len(documents) % 3) + 1)
        
        for i, doc_type in enumerate(doc_types[:num_docs]):
            status = review_statuses[i % len(review_statuses)]
            
            document = ApplicationDocument(
                application_id=application.id,
                document_type=doc_type,
                document_label=doc_type.replace('_', ' ').title(),
                file_path=f"/uploads/documents/app_{application.id}_{doc_type}.pdf",
                original_filename=f"{doc_type}.pdf",
                file_size=1024000 + (i * 10000),
                mime_type="application/pdf",
                review_status=status,
                review_notes="Document conforme" if status == DocumentReviewStatus.APPROVED else 
                            ("En attente de révision" if status == DocumentReviewStatus.PENDING else "Document non conforme"),
                uploaded_at=datetime.now() - timedelta(days=8 + i)
            )
            session.add(document)
            documents.append(document)
    
    await session.commit()
    print(f"✅ Created {len(documents)} application documents")
    
    return documents


async def create_employee_submissions(session: AsyncSession, users: dict, applications: dict):
    """Create test employee submissions"""
    print("\n👨‍💼 Creating employee submissions...")
    
    submissions = []
    
    # Only create submissions for approved applications
    approved_apps = {k: v for k, v in applications.items() if v.status == ApplicationStatus.APPROVED}
    
    for app_key, application in list(approved_apps.items())[:2]:  # Only first 2 approved applications
        # Get employees from the same company
        company_id = application.company_id
        
        # Find employees for this company (we created 2 employees per company)
        employee_indices = []
        for i in range(1, 11):
            employee = users[f'employee_obj_{i}']
            if employee.company_id == company_id:
                employee_indices.append(i)
        
        # Create submissions for these employees
        for i, emp_idx in enumerate(employee_indices[:application.proposed_employee_count]):
            employee = users[f'employee_obj_{emp_idx}']
            submission_statuses = [EmployeeSubmissionStatus.PENDING, EmployeeSubmissionStatus.SUBMITTED, EmployeeSubmissionStatus.APPROVED]
            status = submission_statuses[i % len(submission_statuses)]
            
            submission = EmployeeSubmission(
                company_application_id=application.id,
                employee_id=employee.id,
                status=status,
                reviewed_at=datetime.now() - timedelta(days=1) if status == EmployeeSubmissionStatus.APPROVED else None
            )
            session.add(submission)
            submissions.append(submission)
    
    await session.commit()
    print(f"✅ Created {len(submissions)} employee submissions")
    
    return submissions


async def create_audit_logs(session: AsyncSession, users: dict, applications: dict):
    """Create test audit logs"""
    print("\n📋 Creating audit logs...")
    
    logs = []
    coordinator = users['coordinator']
    
    # Create audit logs for application reviews
    for app_key, application in list(applications.items())[:5]:
        if application.status in [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED]:
            log = AuditLog(
                user_id=coordinator.id,
                user_role=UserRole.COORDINATOR.value,
                action="review_application",
                entity_type="company_application",
                entity_id=application.id,
                old_values={"status": "under_review"},
                new_values={"status": application.status.value, "decision": "approved" if application.status == ApplicationStatus.APPROVED else "rejected"},
                notes=f"Application {'approved' if application.status == ApplicationStatus.APPROVED else 'rejected'} by coordinator",
                ip_address="127.0.0.1",
                created_at=datetime.now() - timedelta(days=2, hours=3)
            )
            session.add(log)
            logs.append(log)
    
    # Create audit logs for call publications
    for i in range(1, 4):
        log = AuditLog(
            user_id=coordinator.id,
            user_role=UserRole.COORDINATOR.value,
            action="publish_call",
            entity_type="call_for_applicants",
            entity_id=i,
            old_values={"status": "draft"},
            new_values={"status": "published"},
            notes=f"Call for applicants published",
            ip_address="127.0.0.1",
            created_at=datetime.now() - timedelta(days=25 - i*5)
        )
        session.add(log)
        logs.append(log)
    
    await session.commit()
    print(f"✅ Created {len(logs)} audit log entries")
    
    return logs


async def seed_database():
    """Main seeding function"""
    print("=" * 60)
    print("🌱 SEEDING DATABASE FOR COORDINATOR DASHBOARD TESTING")
    print("=" * 60)
    
    async for session in get_session():
        try:
            # Clear existing test data
            await clear_test_data(session)
            
            # Create all test data
            users = await create_users(session)
            calls = await create_calls(session, users)
            applications = await create_applications(session, users, calls)
            documents = await create_documents(session, applications)
            submissions = await create_employee_submissions(session, users, applications)
            logs = await create_audit_logs(session, users, applications)
            
            print("\n" + "=" * 60)
            print("✨ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print("\n📊 Summary:")
            print(f"   - Coordinator users: 1")
            print(f"   - Companies: 5")
            print(f"   - Employees: 10")
            print(f"   - Calls for applicants: {len(calls)}")
            print(f"   - Applications: {len(applications)}")
            print(f"   - Documents: {len(documents)}")
            print(f"   - Employee submissions: {len(submissions)}")
            print(f"   - Audit logs: {len(logs)}")
            print("\n🔐 Test Credentials:")
            print("   Coordinator:")
            print("     Email: test_coordinator@example.com")
            print("     Password: password123")
            print("\n   Companies (1-5):")
            print("     Email: test_company{1-5}@example.com")
            print("     Password: password123")
            print("\n" + "=" * 60)
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
            raise
        finally:
            await session.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
