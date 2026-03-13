import os
from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, BaseSettings, Field, validator


class Settings(BaseSettings):
    app_name: str = "NextScan API"
    app_version: str = "1.0.0"

    # Database
    database_url: str = Field(
        default="sqlite:///./scan.db", env="DATABASE_URL"
    )
    sql_echo: bool = Field(default=False, env="SQL_ECHO")

    # Frontend / CORS
    frontend_url: AnyHttpUrl = Field(
        default="http://localhost:3000",
        env="FRONTEND_URL",
    )
    additional_cors_origins: str = Field(
        default="",
        env="CORS_EXTRA_ORIGINS",
        description="Comma-separated list of extra allowed origins.",
    )

    # Stripe
    stripe_secret_key: str = Field(default="sk_test_mock", env="STRIPE_SECRET_KEY")
    stripe_webhook_secret: str = Field(
        default="whsec_mock", env="STRIPE_WEBHOOK_SECRET"
    )

    # Redis / Celery
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

    # External services
    groq_api_key: str = Field(default="", env="GROQ_API_KEY")
    shodan_api_key: str = Field(default="", env="SHODAN_API_KEY")

    @property
    def cors_origins(self) -> List[str]:
        """Return all allowed CORS origins as a list."""
        extra = [
            o.strip()
            for o in self.additional_cors_origins.split(",")
            if o.strip()
        ]
        # Normalize FRONTEND_URL without trailing slash
        return [self.frontend_url.rstrip("/"), *extra]

    @validator("database_url")
    def _normalize_db_url(cls, v: str) -> str:
        # Allow short-form sqlite paths like "scan.db"
        if v.endswith(".db") and "://" not in v:
            return f"sqlite:///{v}"
        return v


@lru_cache()
def get_settings() -> Settings:
    # Single cached instance per process
    return Settings(_env_file=os.getenv("ENV_FILE", None))


settings = get_settings()

