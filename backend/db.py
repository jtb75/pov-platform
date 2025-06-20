import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Text, Table
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

class SuccessCriteriaDocument(Base):
    __tablename__ = "success_criteria_documents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    requirements = relationship("SuccessCriteriaDocumentRequirement", back_populates="document", cascade="all, delete-orphan")

class SuccessCriteriaDocumentRequirement(Base):
    __tablename__ = "scd_requirements"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("success_criteria_documents.id"), nullable=False)
    
    # Fields copied from the master Requirement table
    category = Column(String, nullable=False)
    requirement = Column(Text, nullable=False)
    product = Column(String, nullable=True)
    doc_link = Column(String, nullable=True)
    tenant_link = Column(String, nullable=True)
    
    # Store the original ID for reference, but don't enforce a foreign key relationship
    original_requirement_id = Column(Integer, nullable=True)
    
    # To maintain order within the document
    order = Column(Integer, nullable=False)

    document = relationship("SuccessCriteriaDocument", back_populates="requirements")

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