import os


# Ensure required settings exist before importing app modules.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRY", "3600")
os.environ.setdefault("REFRESH_TOKEN_EXPIRY_DAYS", "7")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("MAIL_USERNAME", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "test-password")
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_PORT", "587")
os.environ.setdefault("MAIL_SERVER", "smtp.example.com")
os.environ.setdefault("MAIL_FROM_NAME", "Formation Continue Tests")
os.environ.setdefault("MAIL_STARTTLS", "true")
os.environ.setdefault("MAIL_SSL_TLS", "false")
os.environ.setdefault("DOMAIN", "localhost:8000")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

# app.main mounts ./uploads at import time.
os.makedirs("uploads", exist_ok=True)
