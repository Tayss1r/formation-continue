import logging
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from .api.courses import course_router
from .api.newsletter import newsletter_router
from .api.calls import calls_router
from .api.applications import applications_router
from .api.submissions import submissions_router
from .api.coordinator import coordinator_router
from .api.professor import professor_router
from .api.materials import materials_router
from .api.news import news_router
from .api.admin import admin_router
from .api.feedback import feedback_router
from .api.employee_training import employee_training_router
from .api.contact import contact_router
from .middleware import register_middleware

from .error import register_all_errors
from .api.auth import auth_router
from .api.invitations import invitations_router
from .core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - runs on startup and shutdown."""
    # Startup
    logger.info("Starting application...")
    
    # Create upload directories if they don't exist
    os.makedirs(settings.COURSES_UPLOAD_DIR, exist_ok=True)
    os.makedirs("uploads/verifications", exist_ok=True)
    logger.info(f"Upload directory ensured: {settings.COURSES_UPLOAD_DIR}")
    
    yield
    # Shutdown (cleanup if needed)
    logger.info("Shutting down application...")


API_VERSION = "v1"
app = FastAPI(
    title="Formation Continue - Training Courses Platform",
    description="University Continuous Training Office - Course Management System",
    version=API_VERSION,
    lifespan=lifespan
)

register_all_errors(app)
register_middleware(app)

# Mount static files for serving uploaded images
# This allows accessing images via /uploads/courses/image.jpg
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# API Routes
app.include_router(auth_router, prefix=f"/api/{API_VERSION}/auth", tags=['Authentication'])
app.include_router(course_router, prefix=f"/api/{API_VERSION}/courses", tags=['Courses'])
app.include_router(newsletter_router, prefix=f"/api/{API_VERSION}/newsletter", tags=['Newsletter'])
app.include_router(calls_router, prefix=f"/api/{API_VERSION}/calls", tags=['Calls for Applicants'])
app.include_router(applications_router, prefix=f"/api/{API_VERSION}/applications", tags=['Company Applications'])
app.include_router(submissions_router, prefix=f"/api/{API_VERSION}/submissions", tags=['Employee Submissions'])
app.include_router(coordinator_router, prefix=f"/api/{API_VERSION}/coordinator", tags=['Coordinator Dashboard'])
app.include_router(professor_router, prefix=f"/api/{API_VERSION}/professor", tags=['Professor'])
app.include_router(materials_router, prefix=f"/api/{API_VERSION}/materials", tags=['Materials'])
app.include_router(news_router, prefix=f"/api/{API_VERSION}/news", tags=['News'])
app.include_router(admin_router, prefix=f"/api/{API_VERSION}/admin", tags=['Admin'])
app.include_router(feedback_router, prefix=f"/api/{API_VERSION}/feedback", tags=['Feedback'])
app.include_router(invitations_router, prefix=f"/api/{API_VERSION}/invitations", tags=['Invitations'])
app.include_router(employee_training_router, prefix=f"/api/{API_VERSION}/employee/training", tags=['Employee Training'])
app.include_router(contact_router, prefix=f"/api/{API_VERSION}/contact", tags=['Contact'])
