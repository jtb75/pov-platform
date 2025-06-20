import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://povuser:povpassword@postgres:5432/povdb")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    role = Column(String, default="normal", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    timestamp = Column(String, nullable=False)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)

class Requirement(Base):
    __tablename__ = "requirements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String, nullable=False)
    requirement = Column(String, nullable=False)
    product = Column(String, nullable=True)
    doc_link = Column(String, nullable=True)
    tenant_link = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False)
    created_by = Column(String, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(String, nullable=True)

class SuccessCriteria(Base):
    __tablename__ = "success_criteria"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_email = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=True)
    shared_with = Column(Text, nullable=True)  # Comma-separated emails for now
    requirements = relationship("SuccessCriteriaRequirement", back_populates="success_criteria", cascade="all, delete-orphan")

class SuccessCriteriaRequirement(Base):
    __tablename__ = "success_criteria_requirements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    success_criteria_id = Column(Integer, ForeignKey("success_criteria.id"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=True)
    custom_text = Column(Text, nullable=True)
    order = Column(Integer, nullable=True)
    success_criteria = relationship("SuccessCriteria", back_populates="requirements")
    requirement = relationship("Requirement")

def log_audit_action(db, action, user_email=None, details=None, ip_address=None):
    log = AuditLog(
        timestamp=datetime.utcnow().isoformat(),
        user_email=user_email,
        action=action,
        details=details,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit() 