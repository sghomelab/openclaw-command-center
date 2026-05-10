"""Application settings — loaded from env vars or defaults."""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Claw Portal — Mission Control"
    APP_VERSION: str = "3.0.0"
    DEBUG: bool = Field(default=False, alias="CLAW_DEBUG")
    SECRET_KEY: str = Field(
        default="change-me-in-production-run-openpgp-generate-secret",
        alias="CLAW_SECRET_KEY",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./claw_portal.db",
        alias="CLAW_DATABASE_URL",
    )

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 9000
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: ["http://localhost:5713", "http://localhost:9000"],
        alias="CLAW_CORS_ORIGINS",
    )

    # Integrations (Phase 3.4)
    SLACK_WEBHOOK_URL: Optional[str] = Field(default=None, alias="CLAW_SLACK_WEBHOOK")
    TEAMS_WEBHOOK_URL: Optional[str] = Field(default=None, alias="CLAW_TEAMS_WEBHOOK")
    SMTP_HOST: Optional[str] = Field(default=None, alias="CLAW_SMTP_HOST")
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = Field(default=None, alias="CLAW_SMTP_USER")
    SMTP_PASSWORD: Optional[str] = Field(default=None, alias="CLAW_SMTP_PASSWORD")
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default=None, alias="CLAW_TWILIO_SID")
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default=None, alias="CLAW_TWILIO_TOKEN")
    TWILIO_PHONE: Optional[str] = Field(default=None, alias="CLAW_TWILIO_PHONE")

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # ML (Phase 3.3)
    ML_ENABLED: bool = False
    ML_MODEL_PATH: str = "./models/anomaly_detection.pkl"

    # Alerting
    ALERT_DEFAULT_COOLDOWN: int = 300  # 5 minutes
    ALERT_MAX_PER_HOUR: int = 50

    class Config:
        env_file = ".env"
        env_prefix = ""
        extra = "ignore"


# Global settings singleton
settings = Settings()
