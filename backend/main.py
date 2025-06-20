from fastapi import FastAPI, Depends, HTTPException, status, Body, Request, APIRouter, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session, joinedload
from backend.db import SessionLocal, User as DBUser, engine, Base, log_audit_action, Requirement, AuditLog, SuccessCriteriaDocument, SuccessCriteriaDocumentRequirement
from sqlalchemy import and_, text, func
import time
import sys
import platform
import psutil
import requests
import csv
from datetime import datetime, timedelta
from typing import List, Optional
import jwt
from fastapi.responses import Response
import logging
from sqlalchemy.exc import IntegrityError

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
DB_MANAGER_URL = os.getenv("DB_MANAGER_URL", "http://db-manager:8000/db-health")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")  # In production, use a secure secret
DEFAULT_SESSION_DURATION = int(os.getenv("DEFAULT_SESSION_DURATION", "3600"))  # 1 hour in seconds

app = FastAPI()
router = APIRouter(prefix="/api")
security = HTTPBearer()

# Create tables if they don't exist (for dev/demo)
# Base.metadata.create_all(bind=engine)

# Pydantic User model for API responses
class User(BaseModel):
    email: str
    name: str | None = None
    picture: str | None = None
    role: str = "normal"

class UserDetails(User):
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class RequirementIn(BaseModel):
    category: str
    requirement: str
    product: str | None = None
    doc_link: str | None = None
    tenant_link: str | None = None

class RequirementMassEdit(BaseModel):
    category: str | None = None
    product: str | None = None

class RequirementOut(RequirementIn):
    id: int
    created_at: datetime
    created_by: str
    updated_at: datetime | None = None
    updated_by: str | None = None

    class Config:
        from_attributes = True

# Schemas for Success Criteria Documents
class SCDRequirementIn(BaseModel):
    category: str
    requirement: str
    product: Optional[str] = None
    doc_link: Optional[str] = None
    tenant_link: Optional[str] = None
    original_requirement_id: Optional[int] = None
    order: int

class SCDRequirementOut(SCDRequirementIn):
    id: int
    document_id: int

    class Config:
        from_attributes = True

class SCDIn(BaseModel):
    name: str
    description: Optional[str] = None
    requirements: List[SCDRequirementIn] = []

class SCDOut(SCDIn):
    id: int
    owner: User
    created_at: datetime
    updated_at: datetime
    requirements: List[SCDRequirementOut] = []

    class Config:
        from_attributes = True

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency to get current user from Google ID token and DB
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials. No email in token.",
            )

        user = db.query(DBUser).filter(DBUser.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"User {email} not found",
            )
        return User(email=user.email, name=user.name, picture=user.picture, role=user.role)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        ) from None
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {e}",
        ) from e

@router.get("/")
def read_root():
    return {"message": "Welcome to the pov-platform API!"}

@router.get("/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    return user

@router.get("/admin-only")
def admin_only(user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return {"message": f"Welcome, admin {user.email}!"}

@router.get("/public-google-client-id")
def public_google_client_id():
    return {"client_id": GOOGLE_CLIENT_ID}

@router.get("/users", response_model=List[UserDetails])
def get_all_users(user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    users = db.query(DBUser).all()
    return users

@router.post("/users/promote")
def promote_user(
    email: str = Body(...),
    make_admin: bool = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    target = db.query(DBUser).filter(DBUser.email == email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    old_role = target.role
    target.role = "admin" if make_admin else "normal"
    db.commit()
    db.refresh(target)
    log_audit_action(
        db,
        action="promote_user",
        user_email=user.email,
        details=f"Changed {email} from {old_role} to {target.role}",
        ip_address=request.client.host if request else None,
    )
    return {"email": target.email, "role": target.role}

@router.post("/login")
async def api_login(request: Request, db: Session = Depends(get_db)):
    print("Received /api/login request")
    data = await request.json()
    print("Request JSON:", data)
    id_token_str = data.get("id_token")
    if not id_token_str:
        print("ERROR: Missing id_token in request body")
        raise HTTPException(status_code=400, detail="Missing id_token")
    try:
        idinfo = id_token.verify_oauth2_token(id_token_str, grequests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo["email"]
        user = db.query(DBUser).filter(DBUser.email == email).first()
        if not user:
            user = DBUser(
                email=email,
                name=idinfo.get("name"),
                picture=idinfo.get("picture"),
                role="normal",
                created_at=datetime.utcnow(),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Create a JWT token with expiration based on session duration
        exp = datetime.utcnow() + timedelta(seconds=DEFAULT_SESSION_DURATION)
        token = jwt.encode(
            {
                "sub": user.email,
                "exp": exp,
                "iat": datetime.utcnow(),
                "role": user.role
            },
            JWT_SECRET,
            algorithm="HS256"
        )
        
        log_audit_action(
            db,
            action="login",
            user_email=user.email,
            details="User logged in",
            ip_address=request.client.host if request else None,
        )
        return {
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
            "role": user.role,
            "token": token,
            "expires_at": exp.isoformat(),
        }
    except Exception as e:
        print("ERROR: Exception during token verification", e)
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

@router.get("/audit-logs")
def get_audit_logs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
    start_date: str = None,
    end_date: str = None,
    email: str = None,
    action: str = None,
    request: Request = None,
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    query = db.query(AuditLog)
    filters = []
    if start_date:
        filters.append(AuditLog.timestamp >= start_date)
    if end_date:
        filters.append(AuditLog.timestamp <= end_date)
    if email:
        filters.append(AuditLog.user_email.ilike(f"%{email}%"))
    if action:
        filters.append(AuditLog.action.ilike(f"%{action}%"))
    if filters:
        query = query.filter(and_(*filters))
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp,
            "user_email": log.user_email,
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
        }
        for log in logs
    ]

START_TIME = time.time()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Check DB connectivity
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"
    # System stats
    uptime = time.time() - START_TIME
    return {
        "status": "ok",
        "db": db_status,
        "uptime_seconds": int(uptime),
        "python_version": sys.version,
        "platform": platform.platform(),
        "memory_mb": int(psutil.virtual_memory().used / 1024 / 1024),
        "total_memory_mb": int(psutil.virtual_memory().total / 1024 / 1024),
    }

@router.get("/db-health")
def proxy_db_health():
    try:
        resp = requests.get(DB_MANAGER_URL, timeout=2)
        return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers['Content-Type'])
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/requirements", response_model=list[RequirementOut])
def list_requirements(db: Session = Depends(get_db)):
    return db.query(Requirement).all()

@router.post("/requirements", response_model=RequirementOut)
def add_requirement(req: RequirementIn, db: Session = Depends(get_db), user: User = Depends(get_current_user), request: Request = None):
    now = datetime.utcnow().isoformat()
    db_req = Requirement(
        category=req.category,
        requirement=req.requirement,
        product=req.product,
        doc_link=req.doc_link,
        tenant_link=req.tenant_link,
        created_at=now,
        created_by=user.email,
        updated_at=now,
        updated_by=user.email,
    )
    db.add(db_req)
    db.commit()
    db.refresh(db_req)
    log_audit_action(
        db,
        action="add_requirement",
        user_email=user.email,
        details=f"Added requirement id={db_req.id}, category={db_req.category}",
        ip_address=request.client.host if request else None,
    )
    return db_req

@router.put("/requirements/{req_id}", response_model=RequirementOut)
def edit_requirement(req_id: int, req: RequirementIn, db: Session = Depends(get_db), user: User = Depends(get_current_user), request: Request = None):
    db_req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    db_req.category = req.category
    db_req.requirement = req.requirement
    db_req.product = req.product
    db_req.doc_link = req.doc_link
    db_req.tenant_link = req.tenant_link
    db_req.updated_at = datetime.utcnow().isoformat()
    db_req.updated_by = user.email
    db.commit()
    db.refresh(db_req)
    log_audit_action(
        db,
        action="edit_requirement",
        user_email=user.email,
        details=f"Edited requirement id={db_req.id}, category={db_req.category}",
        ip_address=request.client.host if request else None,
    )
    return db_req

@router.delete("/requirements/{req_id}")
def delete_requirement(req_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user), request: Request = None):
    db_req = db.query(Requirement).filter(Requirement.id == req_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    db.delete(db_req)
    db.commit()
    log_audit_action(
        db,
        action="delete_requirement",
        user_email=user.email,
        details=f"Deleted requirement id={req_id}",
        ip_address=request.client.host if request else None,
    )
    return {"status": "deleted"}

@router.post("/requirements/bulk-upload")
def bulk_upload_requirements(file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_current_user), request: Request = None):
    try:
        content = file.file.read().decode('utf-8')
        reader = csv.DictReader(content.splitlines())
        now = datetime.utcnow()
        new_reqs = []
        for i, row in enumerate(reader, 1):
            # Validate required fields
            if not row.get('category') or not row.get('requirement'):
                raise HTTPException(status_code=400, detail=f"Row {i} missing required fields: category and requirement")
            db_req = Requirement(
                category=row.get('category', ''),
                requirement=row.get('requirement', ''),
                product=row.get('product', None),
                doc_link=row.get('doc_link', None),
                tenant_link=row.get('tenant_link', None),
                created_at=now,
                created_by=user.email
            )
            db.add(db_req)
            new_reqs.append(db_req)
        db.commit()

        for req in new_reqs:
            db.refresh(req)

        log_audit_action(
            db,
            action="bulk_upload_requirements",
            user_email=user.email,
            details=f"Bulk uploaded {len(new_reqs)} requirements from file {file.filename}",
            ip_address=request.client.host if request else None,
        )

        return {"count": len(new_reqs)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")

@router.post("/requirements/mass-delete")
def mass_delete_requirements(ids: list[int] = Body(...), db: Session = Depends(get_db), user: User = Depends(get_current_user), request: Request = None):
    reqs_to_delete = db.query(Requirement).filter(Requirement.id.in_(ids)).all()
    
    if not reqs_to_delete:
        return {"deleted": 0}

    num_deleted = len(reqs_to_delete)

    for req in reqs_to_delete:
        db.delete(req)
        
    db.commit()

    log_audit_action(
        db,
        action="mass_delete_requirements",
        user_email=user.email,
        details=f"Mass deleted requirements ids={ids}",
        ip_address=request.client.host if request else None,
    )
    return {"deleted": num_deleted}

@router.post("/requirements/mass-edit")
def mass_edit_requirements(
    ids: list[int] = Body(...),
    updates: RequirementMassEdit = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not ids:
        raise HTTPException(status_code=400, detail="No requirement IDs provided.")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
        
    query = db.query(Requirement).filter(Requirement.id.in_(ids))
    
    update_data = updates.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    update_data["updated_by"] = user.email

    updated_count = query.update(update_data, synchronize_session=False)
    db.commit()

    log_audit_action(
        db,
        action="mass_edit_requirements",
        user_email=user.email,
        details=f"Mass edited {updated_count} requirements with updates: {updates.dict(exclude_unset=True)} on IDs: {ids}",
    )
    
    return {"message": f"Successfully updated {updated_count} requirements."}

@router.get("/requirements/template")
def download_template():
    output = [
        ["category", "requirement", "product", "doc_link", "tenant_link"],
        ["General", "This is an example requirement.", "Product A", "http://docs.example.com/a", "http://tenant.example.com/a"],
    ]
    
    # Using Response to manually set headers
    content = ""
    with open('temp_template.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(output)
    
    with open('temp_template.csv', 'r') as f:
        content = f.read()
        
    os.remove('temp_template.csv')

    return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=requirements_template.csv"})

# --- Success Criteria Document Endpoints ---

@router.post("/scd", response_model=SCDOut, status_code=status.HTTP_201_CREATED)
def create_scd(
    scd_in: SCDIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    new_scd = SuccessCriteriaDocument(
        name=scd_in.name,
        description=scd_in.description,
        owner_id=db_user.id
    )

    for req_in in scd_in.requirements:
        new_req = SuccessCriteriaDocumentRequirement(
            **req_in.dict()
        )
        new_scd.requirements.append(new_req)
    
    db.add(new_scd)
    db.commit()
    db.refresh(new_scd)

    log_audit_action(
        db,
        "create_scd",
        user.email,
        f"Created SCD '{new_scd.name}' (ID: {new_scd.id})",
        request.client.host if request else None
    )

    return new_scd

@router.get("/scd", response_model=List[SCDOut])
def list_scds(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    scds = db.query(SuccessCriteriaDocument).filter(SuccessCriteriaDocument.owner_id == db_user.id).all()
    return scds

@router.get("/scd/{scd_id}", response_model=SCDOut)
def get_scd(
    scd_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scd = db.query(SuccessCriteriaDocument).filter(SuccessCriteriaDocument.id == scd_id).first()

    if not scd:
        raise HTTPException(status_code=404, detail="Success Criteria Document not found")

    # For now, only the owner can view. We can add sharing logic later.
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if not db_user or scd.owner_id != db_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to view this document.")

    return scd

@router.post("/scd/{scd_id}/clone", response_model=SCDOut, status_code=status.HTTP_201_CREATED)
def clone_scd(
    scd_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    # Use joinedload to efficiently fetch the document and its requirements in one query
    original_scd = db.query(SuccessCriteriaDocument).options(
        joinedload(SuccessCriteriaDocument.requirements)
    ).filter(SuccessCriteriaDocument.id == scd_id).first()

    if not original_scd:
        raise HTTPException(status_code=404, detail="SCD not found")
        
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if not db_user or original_scd.owner_id != db_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to clone this document.")

    # Create the new document, assigning the current user as the owner
    cloned_scd = SuccessCriteriaDocument(
        name=f"[CLONE] {original_scd.name}",
        description=original_scd.description,
        owner_id=db_user.id,
    )
    
    # Create new requirement instances, copying the data from the originals
    cloned_scd.requirements = [
        SuccessCriteriaDocumentRequirement(
            category=original_req.category,
            requirement=original_req.requirement,
            product=original_req.product,
            doc_link=original_req.doc_link,
            tenant_link=original_req.tenant_link,
            original_requirement_id=original_req.original_requirement_id,
            order=original_req.order
        ) for original_req in original_scd.requirements
    ]
        
    db.add(cloned_scd)
    db.commit()
    db.refresh(cloned_scd)
    
    log_audit_action(
        db, "clone_scd", user.email,
        f"Cloned SCD '{original_scd.name}' (ID: {original_scd.id}) to new SCD '{cloned_scd.name}' (ID: {cloned_scd.id})",
        request.client.host if request else None
    )

    return cloned_scd

class UpdateSCDRequirementsIn(BaseModel):
    requirement_ids: List[int]

@router.put("/scd/{scd_id}/requirements", response_model=SCDOut)
def add_requirements_to_scd(
    scd_id: int,
    data: UpdateSCDRequirementsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch the document and check ownership
    scd = db.query(SuccessCriteriaDocument).filter(SuccessCriteriaDocument.id == scd_id).first()
    if not scd:
        raise HTTPException(status_code=404, detail="SCD not found")
    
    db_user = db.query(DBUser).filter(DBUser.email == user.email).first()
    if not db_user or scd.owner_id != db_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this document.")

    # Get the highest current order
    highest_order = db.query(func.max(SuccessCriteriaDocumentRequirement.order)).filter_by(document_id=scd_id).scalar() or -1

    # Fetch master requirements to be copied
    master_requirements = db.query(Requirement).filter(Requirement.id.in_(data.requirement_ids)).all()
    if len(master_requirements) != len(data.requirement_ids):
        raise HTTPException(status_code=404, detail="One or more master requirements not found.")

    for i, master_req in enumerate(master_requirements):
        new_req = SuccessCriteriaDocumentRequirement(
            document_id=scd_id,
            category=master_req.category,
            requirement=master_req.requirement,
            product=master_req.product,
            doc_link=master_req.doc_link,
            tenant_link=master_req.tenant_link,
            original_requirement_id=master_req.id,
            order=highest_order + 1 + i
        )
        db.add(new_req)

    scd.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(scd)

    return scd

class SessionConfig(BaseModel):
    duration: int  # Session duration in seconds

@router.get("/session-config")
def get_session_config(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return {"duration": DEFAULT_SESSION_DURATION}

@router.post("/session-config")
def update_session_config(config: SessionConfig, user: User = Depends(get_current_user), request: Request = None):
    # This is a mock update as we can't persist this setting easily without a dedicated settings table
    # For now, we can just log the attempt
    global DEFAULT_SESSION_DURATION
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    
    old_duration = DEFAULT_SESSION_DURATION
    DEFAULT_SESSION_DURATION = config.duration
    
    log_audit_action(
        db=next(get_db()),
        action="update_session_config",
        user_email=user.email,
        details=f"Changed session duration from {old_duration}s to {config.duration}s",
        ip_address=request.client.host if request else None,
    )
    return {"message": f"Session duration updated to {config.duration} seconds. This will apply to new logins."}

app.include_router(router)
