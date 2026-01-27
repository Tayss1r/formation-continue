"""
User Service - Database operations for users, companies, and professors

Uses model_dump() for Pydantic to ORM conversion as per project standards.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..db.models import User, Company, Professor, EmployeeProfile, UserRole
from ..utils import hash


class UserService:
    """Service layer for user-related database operations"""
    
    @staticmethod
    async def user_exists(email: str, session: AsyncSession) -> bool:
        """Check if a user with the given email exists"""
        statement = select(User).where(User.email == email)
        result = await session.execute(statement)
        return result.scalars().first() is not None

    @staticmethod
    async def username_exists(username: str, session: AsyncSession) -> bool:
        """Check if a user with the given username exists"""
        statement = select(User).where(User.username == username)
        result = await session.execute(statement)
        return result.scalars().first() is not None

    @staticmethod
    async def get_user_by_email(email: str, session: AsyncSession) -> User | None:
        """Get a user by email with related company/professor data"""
        statement = select(User).options(
            selectinload(User.company),
            selectinload(User.professor)
        ).where(User.email == email)
        result = await session.execute(statement)
        return result.scalars().first()

    @staticmethod
    async def get_user_by_id(user_id: int, session: AsyncSession) -> User | None:
        """Get a user by ID with related company/professor data"""
        statement = select(User).options(
            selectinload(User.company),
            selectinload(User.professor)
        ).where(User.id == user_id)
        result = await session.execute(statement)
        return result.scalars().first()

    @staticmethod
    async def create_user(user_data, session: AsyncSession) -> User:
        """
        Create a basic user from Pydantic schema or dict.
        Uses model_dump() if Pydantic model is passed.
        """
        # Convert Pydantic model to dict if needed
        if hasattr(user_data, 'model_dump'):
            data = user_data.model_dump()
        else:
            data = user_data
        
        # Hash password
        hashed_password = hash(data["password"]) if data.get("password") else None
        
        new_user = User(
            username=data["username"],
            email=data["email"],
            password=hashed_password,
            fullname=data["fullname"],
            phone=data.get("phone"),
            role=data.get("role", UserRole.STAFF),
            is_verified=False
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return new_user

    @staticmethod
    async def create_staff_user(user_data: dict, session: AsyncSession) -> User:
        """Create a staff user"""
        hashed_password = hash(user_data["password"])
        
        new_user = User(
            username=user_data["username"],
            email=user_data["email"],
            password=hashed_password,
            fullname=user_data["fullname"],
            phone=user_data.get("phone"),
            role=UserRole.STAFF,
            is_verified=False
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return new_user

    @staticmethod
    async def create_company_user(
        user_data: dict, 
        company_data: dict, 
        session: AsyncSession
    ) -> User:
        """Create a company user with associated Company record"""
        hashed_password = hash(user_data["password"])
        
        # Create the user
        new_user = User(
            username=user_data["username"],
            email=user_data["email"],
            password=hashed_password,
            fullname=user_data["fullname"],
            phone=user_data.get("phone"),
            role=UserRole.COMPANY,
            is_verified=False
        )
        
        session.add(new_user)
        await session.flush()  # Get the user ID without committing
        
        # Create the company
        new_company = Company(
            user_id=new_user.id,
            name=company_data["name"],
            industry_sector=company_data["industry_sector"],
            billing_info=company_data["billing_info"]
        )
        
        session.add(new_company)
        await session.commit()
        await session.refresh(new_user)
        
        # Load relationships
        return await UserService.get_user_by_id(new_user.id, session)

    @staticmethod
    async def create_professor_user(
        user_data: dict, 
        professor_data: dict, 
        session: AsyncSession
    ) -> User:
        """Create a professor user with associated Professor record"""
        hashed_password = hash(user_data["password"])
        
        # Create the user
        new_user = User(
            username=user_data["username"],
            email=user_data["email"],
            password=hashed_password,
            fullname=user_data["fullname"],
            phone=user_data.get("phone"),
            role=UserRole.PROFESSOR,
            is_verified=False
        )
        
        session.add(new_user)
        await session.flush()  # Get the user ID without committing
        
        # Create the professor profile
        new_professor = Professor(
            user_id=new_user.id,
            specialization=professor_data["specialization"],
            hourly_rate=professor_data.get("hourly_rate", 0.0)
        )
        
        session.add(new_professor)
        await session.commit()
        await session.refresh(new_user)
        
        # Load relationships
        return await UserService.get_user_by_id(new_user.id, session)

    @staticmethod
    async def create_employee_user(user_data: dict, session: AsyncSession) -> User:
        """Create an employee user with associated EmployeeProfile record"""
        hashed_password = hash(user_data["password"])
        
        # Generate username from fullname if not provided
        username = user_data.get("username")
        if not username:
            username = await UserService.generate_unique_username(user_data["fullname"], session)
        
        # Create the user
        new_user = User(
            username=username,
            email=user_data["email"],
            password=hashed_password,
            fullname=user_data["fullname"],
            phone=user_data.get("phone"),
            role=UserRole.EMPLOYEE,
            is_verified=False
        )
        
        session.add(new_user)
        await session.flush()  # Get the user ID without committing
        
        # Create the employee profile
        new_employee = EmployeeProfile(
            user_id=new_user.id,
        )
        
        session.add(new_employee)
        await session.commit()
        await session.refresh(new_user)
        
        # Load relationships
        return await UserService.get_user_by_id(new_user.id, session)

    @staticmethod
    async def update_user(user: User, update_data: dict, session: AsyncSession) -> User:
        """Update user fields from dictionary"""
        for key, value in update_data.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        await session.commit()
        await session.refresh(user)
        return user

    @staticmethod
    async def verify_user(user: User, session: AsyncSession) -> User:
        """Mark user as verified"""
        user.is_verified = True
        await session.commit()
        await session.refresh(user)
        return user

    @staticmethod
    async def delete_user(user: User, session: AsyncSession) -> None:
        """Delete a user"""
        await session.delete(user)
        await session.commit()

    @staticmethod
    async def generate_unique_username(base: str, session: AsyncSession) -> str:
        """Generate a unique username from a base string"""
        username = base.lower().replace(" ", "_")[:25]
        
        if not await UserService.username_exists(username, session):
            return username
        
        counter = 1
        while await UserService.username_exists(f"{username}_{counter}", session):
            counter += 1
        
        return f"{username}_{counter}"
