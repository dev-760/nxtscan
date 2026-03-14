import os
import logging
import time
import re
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from celery.result import AsyncResult
from sqlmodel import SQLModel, Session, create_engine, text
from pydantic import BaseModel, field_validator
import stripe

from config import settings
import models  # noqa: F401 — import triggers SQLModel table registration
from worker import execute_free_scan, execute_pro_scan, celery_app

logger = logging.getLogger("nextlab.api")

# ── Database ──────────────────────────────────────────────
_db_url = settings.database_url
_is_sqlite = _db_url.startswith("sqlite")

_engine_kwargs: dict = {"echo": settings.sql_echo}

if not _is_sqlite:
    _engine_kwargs.update(
        pool_pre_ping=True,        # Auto-reconnect stale connections
        pool_recycle=300,           # Recycle every 5 min (Supabase idle timeout)
        pool_size=5,
        max_overflow=10,
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000",
        },
    )

engine = create_engine(_db_url, **_engine_kwargs)

# ── Domain validation ─────────────────────────────────────
DOMAIN_REGEX = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+"
    r"[a-zA-Z]{2,}$"
)

# ── Simple in-memory rate limiter ─────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)


def _is_rate_limited(client_ip: str) -> bool:
    """Check if a client IP has exceeded the free scan rate limit (per hour)."""
    now = time.time()
    window = 3600  # 1 hour

    # Clean old entries
    _rate_store[client_ip] = [t for t in _rate_store[client_ip] if now - t < window]

    if len(_rate_store[client_ip]) >= settings.free_scan_rate_limit:
        return True

    _rate_store[client_ip].append(now)
    return False


def _validate_domain(domain: str) -> str:
    """Validate and normalize a domain string."""
    domain = domain.strip().lower()
    # Strip protocol if user accidentally includes it
    domain = re.sub(r"^https?://", "", domain)
    # Strip trailing slash and path
    domain = domain.split("/")[0]
    # Strip port
    domain = domain.split(":")[0]

    if not DOMAIN_REGEX.match(domain):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid domain format: '{domain}'. Please provide a valid domain like 'example.com'.",
        )
    return domain


# ── App lifecycle ─────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    logger.info("NextLab API v%s starting up...", settings.app_version)
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables verified.")
    except Exception as exc:
        logger.error("Database unreachable at startup — tables not synced: %s", exc)
    yield
    logger.info("NextLab API shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


app = create_app()


# ══════════════════════════════════════════════════════════
#  Request Logging Middleware
# ══════════════════════════════════════════════════════════

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    logger.info(
        "%s %s → %d (%sms)",
        request.method, request.url.path, response.status_code, duration,
    )
    return response


# ══════════════════════════════════════════════════════════
#  Health & Status Endpoints
# ══════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring / load balancers.
    Always returns 200 so Northflank doesn't restart the container.
    """
    checks = {"api": "ok"}

    # DB check (optional — don't fail the health check if DB is slow)
    try:
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unreachable"

    # Redis / Celery broker check
    try:
        celery_app.control.ping(timeout=2)
        checks["broker"] = "ok"
    except Exception:
        checks["broker"] = "unreachable"

    all_ok = all(v == "ok" for v in checks.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": checks,
    }


# ══════════════════════════════════════════════════════════
#  Scan Endpoints
# ══════════════════════════════════════════════════════════

@app.post("/scans/free")
def trigger_free_scan(domain: str, request: Request):
    """Trigger a free-tier security scan for a domain."""
    # Validate domain
    clean_domain = _validate_domain(domain)

    # Rate limit
    client_ip = request.client.host if request.client else "unknown"
    if _is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {settings.free_scan_rate_limit} free scans per hour.",
        )

    # Dispatch
    task = execute_free_scan.delay(clean_domain)
    return {
        "status": "queued",
        "message": "Scan dispatched successfully",
        "domain": clean_domain,
        "task_id": task.id,
    }


@app.post("/scans/pro")
def trigger_pro_scan(domain: str, domain_id: str):
    """Trigger an advanced pro-tier scan. Requires a valid domain_id."""
    clean_domain = _validate_domain(domain)
    task = execute_pro_scan.delay(clean_domain, domain_id)
    return {
        "status": "queued",
        "message": "Pro scan dispatched",
        "domain": clean_domain,
        "task_id": task.id,
    }


@app.get("/scans/task/{task_id}")
def get_scan_status(task_id: str):
    """Poll for the status and results of an async scan task."""
    task_result = AsyncResult(task_id, app=celery_app)

    if task_result.state == "PENDING":
        return {"status": "pending"}
    elif task_result.state == "STARTED" or task_result.state == "RETRY":
        return {"status": "running"}
    elif task_result.state == "SUCCESS":
        return {"status": "completed", "result": task_result.result}
    elif task_result.state == "FAILURE":
        return {
            "status": "failed",
            "error": str(task_result.info) if task_result.info else "Unknown error",
        }
    else:
        return {"status": task_result.state.lower()}


@app.get("/scans/pdf/{task_id}")
def download_pdf_report(task_id: str):
    """Download the generated PDF report for a completed scan."""
    task_result = AsyncResult(task_id, app=celery_app)

    if task_result.state != "SUCCESS":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not completed yet or task ID invalid.",
        )

    result = task_result.result or {}
    pdf_path = result.get("report_pdf")

    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDF report file not found. It may have been cleaned up.",
        )

    domain_slug = result.get("domain", "scan").replace(".", "_")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"NextLab_Report_{domain_slug}.pdf",
    )


# ══════════════════════════════════════════════════════════
#  Stripe Payment Infrastructure
# ══════════════════════════════════════════════════════════

stripe.api_key = settings.stripe_secret_key


class CheckoutRequest(BaseModel):
    user_id: str
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.strip().lower()


@app.post("/stripe/create-checkout-session")
def create_checkout_session(payload: CheckoutRequest):
    """Create a Stripe Checkout session for the Pro subscription."""
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            customer_email=payload.email,
            client_reference_id=payload.user_id,
            line_items=[
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {
                            "name": "NextLab Professional",
                            "description": "Automated weekly vulnerability scanning & Executive PDF reports.",
                        },
                        "unit_amount": 900,  # $9.00
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=f"{settings.frontend_url.rstrip('/')}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.frontend_url.rstrip('/')}/#pricing",
        )
        return {"url": checkout_session.url}
    except stripe.StripeError as e:
        logger.error("Stripe error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment error: {e.user_message if hasattr(e, 'user_message') else str(e)}",
        )
    except Exception as e:
        logger.error("Checkout session error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create checkout session. Please try again.",
        )


@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events (e.g., successful payments)."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook error: {e}",
        )

    # Upgrade user on successful checkout
    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]
        supabase_user_id = session_data.get("client_reference_id")
        stripe_cust_id = session_data.get("customer")
        stripe_sub_id = session_data.get("subscription")

        if supabase_user_id:
            try:
                with Session(engine) as db:
                    stmt = text(
                        """
                        UPDATE public.users
                        SET plan = :plan,
                            stripe_customer_id = :customer_id,
                            stripe_subscription_id = :subscription_id,
                            updated_at = NOW()
                        WHERE id = :user_id
                        """
                    )
                    db.execute(
                        stmt,
                        {
                            "plan": "pro",
                            "customer_id": stripe_cust_id,
                            "subscription_id": stripe_sub_id,
                            "user_id": supabase_user_id,
                        },
                    )
                    db.commit()
                    logger.info("Upgraded user %s to PRO plan", supabase_user_id)
            except Exception as e:
                logger.error("Failed to upgrade user %s: %s", supabase_user_id, e)

    # Handle subscription cancellation
    elif event["type"] == "customer.subscription.deleted":
        sub_data = event["data"]["object"]
        stripe_cust_id = sub_data.get("customer")

        if stripe_cust_id:
            try:
                with Session(engine) as db:
                    stmt = text(
                        """
                        UPDATE public.users
                        SET plan = 'free',
                            stripe_subscription_id = NULL,
                            updated_at = NOW()
                        WHERE stripe_customer_id = :customer_id
                        """
                    )
                    db.execute(stmt, {"customer_id": stripe_cust_id})
                    db.commit()
                    logger.info("Downgraded customer %s to free plan (subscription cancelled)", stripe_cust_id)
            except Exception as e:
                logger.error("Failed to downgrade customer %s: %s", stripe_cust_id, e)

    return {"status": "ok"}
