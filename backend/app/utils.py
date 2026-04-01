import logging
import uuid
from typing import Any
from itsdangerous import URLSafeTimedSerializer

import jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer

from .core.config import settings
from datetime import timedelta, datetime
from .celery_tasks import send_email
from .mail import create_message, mail

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='login')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

serializer = URLSafeTimedSerializer(
        secret_key=settings.JWT_SECRET,
        salt="email-configuration"
    )

def hash(password: str):
    return pwd_context.hash(password)

def verify(plain_pwd, hashed_pwd):
    return pwd_context.verify(plain_pwd, hashed_pwd)

def create_access_token(user_data: dict, expiry: timedelta = None, refresh: bool = False):
    payload = {"user": user_data, "exp": datetime.now() + (
        expiry if expiry is not None else timedelta(seconds=settings.ACCESS_TOKEN_EXPIRY)
    ), "jti": str(uuid.uuid4()), "refresh": refresh}

    token = jwt.encode(
        payload=payload, key=settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )

    return token

def decode_token(token: str) -> Any | None:
    try:
        token_data = jwt.decode(
            jwt=token, key=settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )

        return token_data
    except jwt.PyJWTError as e:
        logging.exception(e)
        return None

def create_url_safe_token(data: dict):
    token = serializer.dumps(data)
    return token

def decode_url_safe_token(token: str, max_age: int = 84600):
    return serializer.loads(token, max_age=max_age)

def send_verification_email(user):
    email = user.email
    token = create_url_safe_token({"email": email})

    link = f"http://{settings.DOMAIN}/api/v1/auth/verify/{token}"
    html = f"""
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>Forminy | Vérifiez votre adresse e-mail</title>
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
                <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
                    <tr>
                        <td style="padding: 40px; text-align: center;">
                            <h2 style="color: #111827; margin-bottom: 10px;">Bienvenue sur Forminy, {user.fullname} !</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Merci d'avoir rejoint notre communauté de formation professionnelle. Veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse e-mail et finaliser votre inscription.
                            </p>
                            <a href="{link}" 
                            style="display: inline-block; margin-top: 25px; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 8px; font-size: 16px;">
                                Confirmer mon e-mail
                            </a>
                            <p style="margin-top: 35px; color: #9ca3af; font-size: 13px; line-height: 1.4;">
                                Ce lien expirera prochainement. Si vous rencontrez des difficultés, n'hésitez pas à contacter notre équipe support.
                            </p>
                            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 30px 0;">
                            <p style="color: #9ca3af; font-size: 13px;">
                                Si vous n’avez pas créé de compte sur <strong>Forminy</strong>, vous pouvez ignorer cet e-mail.
                            </p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
    emails = [email]
    subject = "Verify your Email"
    send_email.delay(emails, subject, html)

async def send_verification_code_email(user, code: str):
    """Send 6-digit verification code via email"""
    email = user.email
    html = f"""
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <title>Forminy | Code de vérification</title>
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
                <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; margin-top: 40px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
                    <tr>
                        <td style="padding: 40px; text-align: center;">
                            <h2 style="color: #111827; margin-bottom: 10px;">Bienvenue sur Forminy, {user.fullname} !</h2>
                            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                                Nous sommes ravis de vous compter parmi nous. Veuillez utiliser le code de vérification ci-dessous pour confirmer votre adresse e-mail et activer votre compte :
                            </p>
                            <div style="margin: 35px 0; padding: 24px; background-color: #eff6ff; border-radius: 10px; border: 1px dashed #bfdbfe;">
                                <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #2563eb;">{code}</span>
                            </div>
                            <p style="color: #9ca3af; font-size: 14px;">
                                <strong>Note :</strong> Ce code est valide pendant 10 minutes.
                            </p>
                            <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 30px 0;">
                            <p style="color: #9ca3af; font-size: 13px; line-height: 1.4;">
                                Si vous n'avez pas créé de compte sur <strong>Forminy</strong>, vous pouvez ignorer cet e-mail en toute sécurité.
                            </p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
    emails = [email]
    subject = "Your Email Verification Code"
    message = create_message(
        recipients=emails,
        subject=subject,
        body=html,
    )
    await mail.send_message(message)
