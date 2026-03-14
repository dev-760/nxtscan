import os
import logging
import time
import re
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from celery.result import AsyncResult
from sqlmodel import SQLModel, Session, create_engine, text
import jwt

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


# ── Supabase JWT Authentication ───────────────────────────

def get_current_user(request: Request) -> dict:
    """Extract and verify the Supabase JWT from the Authorization header.
    Returns the decoded payload (contains 'sub' = user UUID).
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header.",
        )

    token = auth_header[7:]  # strip "Bearer "

    if not settings.supabase_jwt_secret:
        logger.warning("SUPABASE_JWT_SECRET not set — skipping token verification")
        # Decode without verifying (dev mode fallback)
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except jwt.DecodeError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")


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

# Cache for expensive health sub-checks (avoids DoS via /health)
_health_cache: dict = {"checks": {"api": "ok"}, "ts": 0.0}
_HEALTH_TTL = 30  # seconds


@app.get("/health")
def health_check():
    """Health check endpoint for monitoring / load balancers.
    Always returns 200 so Northflank doesn't restart the container.
    Expensive sub-checks (DB, Redis) are cached for 30s.
    """
    now = time.time()

    if now - _health_cache["ts"] > _HEALTH_TTL:
        checks: dict[str, str] = {"api": "ok"}

        # DB check
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

        _health_cache["checks"] = checks
        _health_cache["ts"] = now

    cached = _health_cache["checks"]
    all_ok = all(v == "ok" for v in cached.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "checks": cached,
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
def trigger_pro_scan(
    domain: str,
    domain_id: int,
    user: dict = Depends(get_current_user),
):
    """Trigger an advanced pro-tier scan. Requires authentication.
    Verifies the caller owns the domain before dispatching.
    """
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not extract user identity from token.",
        )

    # Verify the domain belongs to the requesting user
    try:
        with Session(engine) as db:
            row = db.execute(
                text("SELECT user_id FROM domains WHERE id = :domain_id"),
                {"domain_id": domain_id},
            ).first()

            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Domain not found.",
                )
            if str(row[0]) != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not own this domain.",
                )
    except HTTPException:
        raise  # re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error("Domain ownership check failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify domain ownership.",
        )

    clean_domain = _validate_domain(domain)
    try:
        task = execute_pro_scan.delay(clean_domain, str(domain_id))
    except Exception as e:
        logger.error("Failed to queue pro scan: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect to task queue. Please try again later.",
        )

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
