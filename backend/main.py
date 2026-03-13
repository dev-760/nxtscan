from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from celery.result import AsyncResult
from sqlmodel import SQLModel, Session, create_engine, text
import stripe

from .config import settings
from .models import User, Domain, Scan, ScanResult, Alert
from .worker import execute_free_scan, execute_pro_scan, celery_app


engine = create_engine(settings.database_url, echo=settings.sql_echo)


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, version=settings.app_version)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup() -> None:
        SQLModel.metadata.create_all(engine)

    return app


app = create_app()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "NextScan Backend Running"}

@app.post("/scans/free")
def trigger_free_scan(domain: str):
    # Dispatch task to Upstash Redis queue via Celery
    task = execute_free_scan.delay(domain)
    return {"status": "queued", "message": "Scan dispatched to queue", "domain": domain, "task_id": task.id}

@app.post("/scans/pro")
def trigger_pro_scan(domain: str, domain_id: str):
    # In production, this would verify the Authorization Bearer Token against supabase auth
    # For A-to-Z execution, this dispatches the deeply complex pro worker
    task = execute_pro_scan.delay(domain, domain_id)
    return {"status": "pro_queued", "message": "Pro scan dispatched", "domain": domain, "task_id": task.id}

@app.get("/scans/task/{task_id}")
def get_scan_status(task_id: str):
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.state == 'PENDING':
        return {"status": "pending"}
    elif task_result.state != 'FAILURE':
        return {"status": "completed", "result": task_result.result}
    else:
        return {"status": "failed", "error": str(task_result.info)}

@app.get("/scans/pdf/{task_id}")
def download_pdf_report(task_id: str):
    task_result = AsyncResult(task_id, app=celery_app)
    if task_result.state == 'SUCCESS':
        pdf_path = task_result.result.get("report_pdf")
        if pdf_path and os.path.exists(pdf_path):
            return FileResponse(pdf_path, media_type="application/pdf", filename=f"NextLab_Report_{task_id}.pdf")
    raise HTTPException(status_code=404, detail="PDF Report not found or scan not completed yet")

# ==========================================
# Stripe Payment Infrastructure
# ==========================================

stripe.api_key = settings.stripe_secret_key

from pydantic import BaseModel
class CheckoutRequest(BaseModel):
    user_id: str
    email: str

@app.post("/stripe/create-checkout-session")
def create_checkout_session(request: CheckoutRequest):
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            customer_email=request.email,
            client_reference_id=request.user_id, # Link stripe session back to Supabase user
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'NextLab Professional',
                            'description': 'Automated weekly vulnerability scanning & Executive PDF reports.'
                        },
                        'unit_amount': 900, # $9.00
                        'recurring': {'interval': 'month'},
                    },
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=f"{settings.frontend_url.rstrip('/')}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.frontend_url.rstrip('/')}/#pricing",
        )
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@app.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook Error: {str(e)}",
        )

    # Automatically upgrade the user in the database when they pay!
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        supabase_user_id = session.get("client_reference_id")
        stripe_cust_id = session.get("customer")
        stripe_sub_id = session.get("subscription")
        
        if supabase_user_id:
            try:
                with Session(engine) as db:
                    stmt = text(
                        """
                        UPDATE public.users
                        SET plan = :plan,
                            stripe_customer_id = :customer_id,
                            stripe_subscription_id = :subscription_id
                        WHERE id = :user_id
                        """
                    )
                    db.exec(
                        stmt,
                        {
                            "plan": "pro",
                            "customer_id": stripe_cust_id,
                            "subscription_id": stripe_sub_id,
                            "user_id": supabase_user_id,
                        },
                    )
                    db.commit()
                    print(f"Successfully upgraded {supabase_user_id} to PRO!")
            except Exception as e:
                print(f"Failed to upgrade user {supabase_user_id}: {str(e)}")

    return {"status": "success"}
