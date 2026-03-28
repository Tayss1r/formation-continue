from pydantic import BaseModel, Field, EmailStr, field_validator


class ContactMessageCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    message: str = Field(..., min_length=10, max_length=3000)

    @field_validator("name", "message")
    @classmethod
    def strip_values(cls, value: str) -> str:
        return value.strip()


class ContactMessageResponse(BaseModel):
    message: str
