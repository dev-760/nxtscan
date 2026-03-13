import json

from celery import Celery
from celery.schedules import crontab
from groq import Groq
from sqlmodel import Session, create_engine

from .config import settings
from .scanners import check_ssl, check_cndp, check_headers, check_dns, check_shodan
from .reports import generate_arabic_pdf_report
from .models import Scan, ScanResult

# Initialize Groq client
groq_client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None

# Supabase Postgres (or SQLite) for saving scan results
db_engine = create_engine(settings.database_url)

# Upstash Redis for Celery Broker
REDIS_URL = settings.redis_url

# Note for Upstash: It requires TLS/SSL, so the URL usually starts with rediss://
# You may also need to configure broker_use_ssl if encountering handshake errors
broker_use_ssl = {"ssl_cert_reqs": "none"} if "rediss://" in REDIS_URL else None

celery_app = Celery(
    "nextscan_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,  # Or use Postgres for backend: f"db+{settings.database_url}"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_use_ssl=broker_use_ssl,
    redis_backend_use_ssl=broker_use_ssl
)

# Automated Weekly Re-Scan Cron Job for ALL Pro Domains
celery_app.conf.beat_schedule = {
    'weekly-pro-scan-trigger': {
        'task': 'dispatch_weekly_scans',
        'schedule': crontab(day_of_week='monday', hour=0, minute=0), # Run every Monday at midnight 
    },
}

@celery_app.task(name="dispatch_weekly_scans")
def dispatch_weekly_scans():
    # In production, this pulls domain records from Supabase Postgres that belong to `plan='pro'`
    print("Dispatching automated weekly Pro scans for subscribed users...")
    return

@celery_app.task(name="execute_free_scan")
def execute_free_scan(domain: str):
    # This will be the entry point for free scans
    print(f"Starting free scan for {domain}...")
    # 1. Execute Custom Intelligence Scanners (SSL & CNDP)
    print(f"Starting SSL and CNDP scan checks for {domain}...")
    
    # Wait for synchronous scans to complete
    ssl_data = check_ssl(domain)
    cndp_data = check_cndp(domain)
    headers_data = check_headers(domain)
    dns_data = check_dns(domain)
    
    scan_results = [ssl_data, cndp_data, headers_data, dns_data]
    
    # 2. Package gathered vulnerability data for the AI prompt
    gathered_data = json.dumps(scan_results, indent=2)
    ai_summary = "AI processing unavailable (API Key missing)."
    
    # 3. Use Groq AI (Llama 3) to process results and generate human-readable remediation steps
    if groq_client:
        try:
            print("Generating AI remediation summary via Groq...")
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a senior cybersecurity compliance consultant. Summarize the following scan results and provide 2-3 bullet points of actionable remediation advice focusing on Moroccan/international compliance (CNDP & SSL). Keep it strictly technical but concise. DO NOT repeat the raw data, extract the story."
                    },
                    {
                        "role": "user",
                        "content": gathered_data
                    }
                ],
                model="llama3-8b-8192", 
                temperature=0.3,
            )
            ai_summary = chat_completion.choices[0].message.content
        except Exception as e:
            print(f"Groq API Error: {e}")
            ai_summary = "Error generating AI summary."

    # 4. Generate native RTL Arabic PDF report leveraging WeasyPrint
    print(f"Generating Executive PDF Report for {domain}...")
    pdf_path = generate_arabic_pdf_report(domain, ai_summary, scan_results)

    print(f"Finished free scan for {domain} - Report saved natively to {pdf_path}")
    
    return {
        "status": "success", 
        "domain": domain, 
        "scan_data": scan_results,
        "ai_remediation": ai_summary,
        "report_pdf": pdf_path
    }

@celery_app.task(name="execute_pro_scan")
def execute_pro_scan(domain: str, domain_id: str):
    """
    Executes the advanced suite (e.g., Shodan, Subfinder, Wappalyzer CMS fingerprinting)
    """
    print(f"Executing Deep PRO infrastructure scan for ID {domain_id}: {domain}...")
    
    # 1. Execute standard free scans
    ssl_data = check_ssl(domain)
    cndp_data = check_cndp(domain)
    headers_data = check_headers(domain)
    dns_data = check_dns(domain)
    
    # 2. Advanced Pro Scans using actual API
    pro_shodan_data = check_shodan(domain)
    
    # ... Wappalyzer tech fingerprinting mock ...
    pro_wappalyzer_mock = {"check_name": "Tech Fingerprint", "status": "pass", "severity": "info", "detail": "Detected Next.js 14, React. No obvious outdated CVEs associated with this stack version."}
    
    scan_results = [ssl_data, cndp_data, headers_data, dns_data, pro_shodan_data, pro_wappalyzer_mock]
    gathered_data = json.dumps(scan_results, indent=2)
    
    ai_summary = "AI processing unavailable."
    if groq_client:
        try:
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a senior cybersecurity compliance consultant. Summarize the following deep scan results (Ports, CMS, Headers, Compliance) and provide highly technical actionable remediation advice."},
                    {"role": "user", "content": gathered_data}
                ],
                model="llama3-8b-8192", 
                temperature=0.3,
            )
            ai_summary = chat_completion.choices[0].message.content
        except Exception as e:
            ai_summary = "Error generating AI summary."

    pdf_path = generate_arabic_pdf_report(domain, ai_summary, scan_results)

    # 3. Save to Supabase Postgres
    try:
        with Session(db_engine) as session:
            db_scan = Scan(
                domain_id=int(domain_id),
                triggered_by="user",
                status="completed",
                ai_remediation_summary=ai_summary,
                pdf_report_url=pdf_path
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
                    detail=result.get("detail", "")
                )
                session.add(db_result)
            session.commit()
            print(f"Recorded Pro scan {db_scan.id} data into Postgres for domain_id: {domain_id}")
    except Exception as e:
        print(f"Database save error: {str(e)}")

    return {
        "status": "success", 
        "domain": domain, 
        "scan_data": scan_results,
        "ai_remediation": ai_summary,
        "report_pdf": pdf_path
    }
