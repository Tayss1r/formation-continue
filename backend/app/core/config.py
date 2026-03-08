from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    JWT_SECRET: str
    JWT_ALGORITHM: str
    ACCESS_TOKEN_EXPIRY: int  # in seconds
    REFRESH_TOKEN_EXPIRY_DAYS: int = 7  # refresh token expiry in days
    REDIS_URL: str
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    
    # Domain settings
    DOMAIN: str = "localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Image upload settings
    UPLOAD_DIR: str = "uploads"
    COURSES_UPLOAD_DIR: str = "uploads/courses"
    DOCUMENTS_UPLOAD_DIR: str = "uploads/documents"
    MAX_IMAGE_SIZE: int = 5 * 1024 * 1024  # 5MB
    MAX_DOCUMENT_SIZE: int = 25 * 1024 * 1024  # 25MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    ALLOWED_DOCUMENT_TYPES: list[str] = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8') 


settings = Settings()

broker_url = settings.REDIS_URL
result_backend = settings.REDIS_URL