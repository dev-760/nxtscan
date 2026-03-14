import json
import logging

from celery import Celery
from celery.schedules import crontab
from groq import Groq
from sqlmodel import Session, create_engine, select

from .config import settings
from .scanners import run_free_checks, run_pro_checks
from .reports import generate_arabic_pdf_report
from .models import Scan, ScanResult, Domain, User

logger = logging.getLogger("nextlab.worker")

# ── Clients ───────────────────────────────────────────────
groq_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None
db_engine = create_engine(settings.database_url)

# ── Celery ────────────────────────────────────────────────
REDIS_URL = settings.redis_url
broker_use_ssl = {"ssl_cert_reqs": "none"} if "rediss://" in REDIS_URL else None

celery_app = Celery(
    "nextlab_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_use_ssl=broker_use_ssl,
    redis_backend_use_ssl=broker_use_ssl,
    task_soft_time_limit=120,   # 2 min soft limit
    task_time_limit=180,        # 3 min hard kill
    task_acks_late=True,        # Re-queue on worker crash
    worker_prefetch_multiplier=1,
)

# ── Scheduled tasks ───────────────────────────────────────
celery_app.conf.beat_schedule = {
    "weekly-pro-scan": {
        "task": "dispatch_weekly_scans",
        "schedule": crontab(day_of_week="monday", hour=0, minute=0),
    },
}

# ── AI Helper ─────────────────────────────────────────────

FREE_SYSTEM_PROMPT = (
    "You are a senior cybersecurity compliance consultant. "
    "Summarize the following scan results and provide 3-5 bullet points of actionable remediation advice. "
    "Focus on the most critical issues first. Be concise and technical. "
    "Include compliance notes for CNDP (Morocco) and international standards where relevant. "
    "Do NOT repeat raw data — extract the story and provide actionable next steps."
)

PRO_SYSTEM_PROMPT = (
    "You are a senior cybersecurity compliance consultant performing a deep infrastructure assessment. "
    "Analyze the scan results including open ports, CMS fingerprinting, email security, headers, and compliance. "
    "Provide a prioritized remediation plan with severity ratings. "
    "Include specific configuration commands or steps where possible. "
    "Focus on: (1) Critical vulnerabilities, (2) Compliance gaps, (3) Hardening recommendations."
)


def generate_ai_remediation(scan_data: list, system_prompt: str) -> str:
    """Generate AI-powered remediation advice using Groq."""
    if not groq_client:
        return "AI analysis unavailable — Groq API key not configured."

    gathered = json.dumps(scan_data, indent=2)

    try:
        logger.info("Generating AI remediation via Groq (%s)...", settings.ai_model)
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": gathered},
            ],
            model=settings.ai_model,
            temperature=0.3,
            max_tokens=1024,
        )
        return completion.choices[0].message.content
    except Exception as e:
        logger.error("Groq API error: %s", e)
        return f"AI analysis encountered an error: {type(e).__name__}"


# ══════════════════════════════════════════════════════════
#  Free Scan Task
# ══════════════════════════════════════════════════════════

@celery_app.task(name="execute_free_scan", bind=True, max_retries=2)
def execute_free_scan(self, domain: str):
    """Execute a free-tier scan with basic checks + AI remediation."""
    logger.info("Starting free scan for %s (task=%s)", domain, self.request.id)

    try:
        # 1. Run all checks concurrently
        scan_results = run_free_checks(domain)

        # 2. AI remediation
        ai_summary = generate_ai_remediation(scan_results, FREE_SYSTEM_PROMPT)

        # 3. Generate PDF report
        logger.info("Generating PDF report for %s...", domain)
        pdf_path = generate_arabic_pdf_report(domain, ai_summary, scan_results)

        logger.info("Free scan complete for %s — %d checks, PDF: %s", domain, len(scan_results), pdf_path)

        return {
            "status": "success",
            "domain": domain,
            "scan_data": scan_results,
            "ai_remediation": ai_summary,
            "report_pdf": pdf_path,
        }

    except Exception as e:
        logger.exception("Free scan failed for %s", domain)
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries * 5)


# ══════════════════════════════════════════════════════════
#  Pro Scan Task
# ══════════════════════════════════════════════════════════

@celery_app.task(name="execute_pro_scan", bind=True, max_retries=2)
def execute_pro_scan(self, domain: str, domain_id: str):
    """Execute a full pro-tier scan with advanced checks + AI + DB persistence."""
    logger.info("Starting pro scan for %s (domain_id=%s, task=%s)", domain, domain_id, self.request.id)

    try:
        # 1. Run all checks concurrently (free + pro)
        scan_results = run_pro_checks(domain)

        # 2. AI remediation with deeper prompt
        ai_summary = generate_ai_remediation(scan_results, PRO_SYSTEM_PROMPT)

        # 3. PDF
        pdf_path = generate_arabic_pdf_report(domain, ai_summary, scan_results)

        # 4. Persist to database
        _save_scan_to_db(domain_id, ai_summary, pdf_path, scan_results)

        logger.info("Pro scan complete for %s — %d checks", domain, len(scan_results))

        return {
            "status": "success",
            "domain": domain,
            "scan_data": scan_results,
            "ai_remediation": ai_summary,
            "report_pdf": pdf_path,
        }

    except Exception as e:
        logger.exception("Pro scan failed for %s", domain)
        raise self.retry(exc=e, countdown=2 ** self.request.retries * 5)


def _save_scan_to_db(domain_id: str, ai_summary: str, pdf_path: str | None, scan_results: list):
    """Persist scan results to the database."""
    try:
        with Session(db_engine) as session:
            from datetime import datetime, timezone

            db_scan = Scan(
                domain_id=int(domain_id),
                triggered_by="user",
                status="completed",
                ai_remediation_summary=ai_summary,
                pdf_report_url=pdf_path,
                completed_at=datetime.now(timezone.utc),
            )
            session.add(db_scan)
            session.commit()
            session.refresh(db_scan)

            for result in scan_results:
                db_result = ScanResult(
                    scan_id=db_scan.id,
                    check_name=result.get("check_name", "Unknown"),
                    status=result.get("status", "info"),
                    severity=result.get("severity", "info"),
                    detail=result.get("detail", ""),
                )
                session.add(db_result)
            session.commit()

            logger.info("Saved scan %d to database for domain_id=%s", db_scan.id, domain_id)

    except Exception as e:
        logger.error("Database save error for domain_id=%s: %s", domain_id, e)


# ══════════════════════════════════════════════════════════
#  Weekly Automated Scans
# ══════════════════════════════════════════════════════════

@celery_app.task(name="dispatch_weekly_scans")
def dispatch_weekly_scans():
    """Dispatch automated pro scans for all domains belonging to pro/agency users."""
    logger.info("Dispatching weekly automated scans...")

    try:
        with Session(db_engine) as session:
            # Fetch all domains belonging to users with pro or agency plans
            stmt = (
                select(Domain)
                .join(User, Domain.user_id == User.id)
                .where(User.plan.in_(["pro", "agency"]))
            )
            domains = session.exec(stmt).all()

            count = 0
            for domain in domains:
                execute_pro_scan.delay(domain.domain, str(domain.id))
                count += 1

            logger.info("Dispatched %d automated pro scans", count)
            return {"dispatched": count}

    except Exception as e:
        logger.error("Weekly dispatch failed: %s", e)
        return {"error": str(e)}
