import os
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    app_name: str = "NextLab API"
    app_version: str = "2.0.0"

    # Database
    database_url: str = Field(
        default="sqlite:///./scan.db", alias="DATABASE_URL"
    )
    sql_echo: bool = Field(default=False, alias="SQL_ECHO")

    # Frontend / CORS
    frontend_url: str = Field(
        default="http://localhost:3000",
        alias="FRONTEND_URL",
    )
    additional_cors_origins: str = Field(
        default="",
        alias="CORS_EXTRA_ORIGINS",
        description="Comma-separated list of extra allowed origins.",
    )

    # Stripe
    stripe_secret_key: str = Field(default="sk_test_mock", alias="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(
        default="whsec_mock", alias="STRIPE_WEBHOOK_SECRET"
    )

    # Redis / Celery
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # External services
    groq_api_key: str = Field(default="", alias="GROQ_API_KEY")
    shodan_api_key: str = Field(default="", alias="SHODAN_API_KEY")

    # Rate limiting
    free_scan_rate_limit: int = Field(
        default=10, alias="FREE_SCAN_RATE_LIMIT",
        description="Max free scans per IP per hour",
    )

    # AI model
    ai_model: str = Field(default="llama-3.3-70b-versatile", alias="AI_MODEL")

    @property
    def cors_origins(self) -> List[str]:
        """Return all allowed CORS origins as a list."""
        extra = [
            o.strip()
            for o in self.additional_cors_origins.split(",")
            if o.strip()
        ]
        return [self.frontend_url.rstrip("/"), *extra]

    def _normalize_db_url(self) -> str:
        if self.database_url.endswith(".db") and "://" not in self.database_url:
            return f"sqlite:///{self.database_url}"
        return self.database_url

    model_config = {
        "env_file": os.getenv("ENV_FILE", ".env"),
        "env_file_encoding": "utf-8",
        "populate_by_name": True,
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
