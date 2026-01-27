import logging
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from .api.courses import course_router
from .api.newsletter import newsletter_router
from .api.availability import availability_router
from .api.booking import booking_router
from .api.enrollment import enrollment_router
from .middleware import register_middleware

from .error import register_all_errors
from .api.auth import auth_router
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
app.include_router(availability_router, prefix=f"/api/{API_VERSION}/availability", tags=['Availability'])
app.include_router(booking_router, prefix=f"/api/{API_VERSION}/bookings", tags=['Bookings'])
app.include_router(enrollment_router, prefix=f"/api/{API_VERSION}/enrollment", tags=['Enrollment'])
