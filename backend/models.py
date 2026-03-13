from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    plan: str = Field(default="free")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    domains: List["Domain"] = Relationship(back_populates="user")

class Domain(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    domain: str = Field(index=True)
    verified_at: Optional[datetime] = None

    user: Optional[User] = Relationship(back_populates="domains")
    scans: List["Scan"] = Relationship(back_populates="domain")
    alerts: List["Alert"] = Relationship(back_populates="domain")

class Scan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    domain_id: int = Field(foreign_key="domain.id")
    triggered_by: str = Field(default="user") # user or cron
    status: str = Field(default="pending") # pending, running, completed, target_failed
    created_at: datetime = Field(default_factory=datetime.utcnow)

    domain: Optional[Domain] = Relationship(back_populates="scans")
    results: List["ScanResult"] = Relationship(back_populates="scan")

class ScanResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    scan_id: int = Field(foreign_key="scan.id")
    check_name: str
    status: str # pass, fail, warning
    severity: str # low, medium, high, critical
    detail: Optional[str] = None

    scan: Optional[Scan] = Relationship(back_populates="results")

class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    domain_id: int = Field(foreign_key="domain.id")
    type: str # malware, domain_expiring, new_port
    sent_at: datetime = Field(default_factory=datetime.utcnow)

    domain: Optional[Domain] = Relationship(back_populates="alerts")
