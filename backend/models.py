from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, timezone


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[str] = Field(default=None, primary_key=True)  # UUID from Supabase Auth
    email: str = Field(unique=True, index=True)
    plan: str = Field(default="pro")
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    domains: List["Domain"] = Relationship(back_populates="user")


class Domain(SQLModel, table=True):
    __tablename__ = "domains"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)  # UUID string
    domain: str = Field(index=True)
    verified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=_utcnow)

    user: Optional[User] = Relationship(back_populates="domains")
    scans: List["Scan"] = Relationship(back_populates="domain_rel")
    alerts: List["Alert"] = Relationship(back_populates="domain_rel")


class Scan(SQLModel, table=True):
    __tablename__ = "scans"

    id: Optional[int] = Field(default=None, primary_key=True)
    domain_id: int = Field(foreign_key="domains.id", index=True)
    triggered_by: str = Field(default="user")  # user | cron | system
    status: str = Field(default="pending")  # pending | running | completed | target_failed
    ai_remediation_summary: Optional[str] = None
    pdf_report_url: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)
    completed_at: Optional[datetime] = None

    domain_rel: Optional[Domain] = Relationship(back_populates="scans")
    results: List["ScanResult"] = Relationship(back_populates="scan")


class ScanResult(SQLModel, table=True):
    __tablename__ = "scan_results"

    id: Optional[int] = Field(default=None, primary_key=True)
    scan_id: int = Field(foreign_key="scans.id", index=True)
    check_name: str
    status: str  # pass | fail | warning | info
    severity: str  # low | medium | high | critical | info
    detail: Optional[str] = None
    created_at: datetime = Field(default_factory=_utcnow)

    scan: Optional[Scan] = Relationship(back_populates="results")


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: Optional[int] = Field(default=None, primary_key=True)
    domain_id: int = Field(foreign_key="domains.id", index=True)
    type: str  # malware | domain_expiring | new_port | breach_detected
    message: str = ""
    is_read: bool = Field(default=False)
    sent_at: datetime = Field(default_factory=_utcnow)

    domain_rel: Optional[Domain] = Relationship(back_populates="alerts")
