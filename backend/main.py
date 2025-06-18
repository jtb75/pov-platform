from fastapi import FastAPI, Depends, HTTPException, status, Body, Request, APIRouter, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from backend.db import SessionLocal, User as DBUser, engine, Base, log_audit_action, Requirement, AuditLog, SuccessCriteria, SuccessCriteriaRequirement
from sqlalchemy import and_, text
import time
import sys
import platform
import psutil
import requests
import csv
from datetime import datetime
from typing import List, Optional

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
DB_MANAGER_URL = os.getenv("DB_MANAGER_URL", "http://db-manager:8000/db-health")

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
        idinfo = id_token.verify_oauth2_token(token, grequests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo["email"]
        user = db.query(DBUser).filter(DBUser.email == email).first()
        if not user:
            user = DBUser(
                email=email,
                name=idinfo.get("name"),
                picture=idinfo.get("picture"),
                role="normal",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return User(email=user.email, name=user.name, picture=user.picture, role=user.role)
    except Exception as e:
        import traceback
        print("AUTH ERROR:", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
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

@router.get("/users")
def get_all_users(user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    users = db.query(DBUser).all()
    return [User(email=u.email, name=u.name, picture=u.picture, role=u.role) for u in users]

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
            )
            db.add(user)
            db.commit()
            db.refresh(user)
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
            "token": id_token_str,
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
        return resp.json()
    except Exception as e:
        return {"status": "error", "error": str(e)}

# Pydantic model for API
from pydantic import BaseModel as PydanticBaseModel
class RequirementIn(PydanticBaseModel):
    category: str
    requirement: str
    product: str | None = None
    doc_link: str | None = None
    tenant_link: str | None = None

class RequirementMassEdit(PydanticBaseModel):
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
        orm_mode = True

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
                created_by=user.email,
                updated_at=now,
                updated_by=user.email,
            )
            db.add(db_req)
            new_reqs.append(db_req)
        db.commit()
        log_audit_action(
            db,
            action="bulk_upload_requirements",
            user_email=user.email,
            details=f"Bulk uploaded {len(new_reqs)} requirements",
            ip_address=request.client.host if request else None,
        )
        return {"count": len(new_reqs)}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Bulk upload failed: {str(e)}")

@router.post("/requirements/mass-delete")
def mass_delete_requirements(ids: list[int] = Body(...), db: Session = Depends(get_db), user: User = Depends(get_current_user), request: Request = None):
    deleted = db.query(Requirement).filter(Requirement.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    log_audit_action(
        db,
        action="mass_delete_requirements",
        user_email=user.email,
        details=f"Mass deleted requirements ids={ids}",
        ip_address=request.client.host if request else None,
    )
    return {"deleted": deleted}

@router.post("/requirements/mass-edit")
def mass_edit_requirements(
    ids: list[int] = Body(...),
    updates: RequirementMassEdit = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.utcnow().isoformat()
    update_dict = {}
    if updates.category not in (None, ""):
        update_dict[Requirement.category] = updates.category
    if updates.product not in (None, ""):
        update_dict[Requirement.product] = updates.product
    update_dict[Requirement.updated_at] = now
    update_dict[Requirement.updated_by] = user.email
    updated = db.query(Requirement).filter(Requirement.id.in_(ids)).update(update_dict, synchronize_session=False)
    db.commit()
    return {"updated": updated}

@router.get("/requirements/template")
def download_template():
    from fastapi.responses import StreamingResponse
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["category", "requirement", "product", "doc_link", "tenant_link"])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=sample-requirements.csv"})

class SuccessCriteriaRequirementIn(BaseModel):
    requirement_id: Optional[int] = None  # If referencing a DB requirement
    custom_text: Optional[str] = None     # If custom text
    order: Optional[int] = None

class SuccessCriteriaIn(BaseModel):
    title: str
    description: Optional[str] = None
    shared_with: Optional[List[str]] = []
    requirements: Optional[List[SuccessCriteriaRequirementIn]] = []

class SuccessCriteriaRequirementOut(SuccessCriteriaRequirementIn):
    id: int
    requirement: Optional[RequirementOut] = None

    class Config:
        orm_mode = True

class SuccessCriteriaOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    owner_email: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    shared_with: Optional[List[str]] = []
    requirements: List[SuccessCriteriaRequirementOut] = []

    class Config:
        orm_mode = True

def parse_shared_with(shared_with: Optional[str]) -> List[str]:
    if not shared_with:
        return []
    return [email.strip() for email in shared_with.split(",") if email.strip()]

def join_shared_with(shared_with: Optional[List[str]]) -> Optional[str]:
    if not shared_with:
        return None
    return ",".join(shared_with)

@router.get("/success-criteria", response_model=List[SuccessCriteriaOut])
def list_success_criteria(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Show owned or shared with user
    q = db.query(SuccessCriteria).filter(
        (SuccessCriteria.owner_email == user.email) |
        (SuccessCriteria.shared_with.ilike(f"%{user.email}%"))
    )
    results = q.all()
    out = []
    for sc in results:
        out.append(SuccessCriteriaOut(
            id=sc.id,
            title=sc.title,
            description=sc.description,
            owner_email=sc.owner_email,
            created_at=sc.created_at,
            updated_at=sc.updated_at,
            shared_with=parse_shared_with(sc.shared_with),
            requirements=[
                SuccessCriteriaRequirementOut(
                    id=r.id,
                    requirement_id=r.requirement_id,
                    custom_text=r.custom_text,
                    order=r.order,
                    requirement=RequirementOut.from_orm(r.requirement) if r.requirement else None
                ) for r in sorted(sc.requirements, key=lambda x: (x.order or 0, x.id))
            ]
        ))
    return out

@router.post("/success-criteria", response_model=SuccessCriteriaOut)
def create_success_criteria(
    data: SuccessCriteriaIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    now = datetime.utcnow()
    sc = SuccessCriteria(
        title=data.title,
        description=data.description,
        owner_email=user.email,
        created_at=now,
        updated_at=now,
        shared_with=join_shared_with(data.shared_with),
    )
    db.add(sc)
    db.flush()  # Get sc.id
    # Add requirements
    for i, req in enumerate(data.requirements or []):
        scr = SuccessCriteriaRequirement(
            success_criteria_id=sc.id,
            requirement_id=req.requirement_id,
            custom_text=req.custom_text,
            order=req.order if req.order is not None else i
        )
        db.add(scr)
    db.commit()
    db.refresh(sc)
    log_audit_action(
        db,
        action="create_success_criteria",
        user_email=user.email,
        details=f"Created success_criteria id={sc.id}, title={sc.title}",
        ip_address=request.client.host if request else None,
    )
    # Return with requirements
    sc = db.query(SuccessCriteria).filter(SuccessCriteria.id == sc.id).first()
    return SuccessCriteriaOut(
        id=sc.id,
        title=sc.title,
        description=sc.description,
        owner_email=sc.owner_email,
        created_at=sc.created_at,
        updated_at=sc.updated_at,
        shared_with=parse_shared_with(sc.shared_with),
        requirements=[
            SuccessCriteriaRequirementOut(
                id=r.id,
                requirement_id=r.requirement_id,
                custom_text=r.custom_text,
                order=r.order,
                requirement=RequirementOut.from_orm(r.requirement) if r.requirement else None
            ) for r in sorted(sc.requirements, key=lambda x: (x.order or 0, x.id))
        ]
    )

@router.get("/success-criteria/{sc_id}", response_model=SuccessCriteriaOut)
def get_success_criteria(sc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sc = db.query(SuccessCriteria).filter(SuccessCriteria.id == sc_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Not found")
    if sc.owner_email != user.email and user.email not in parse_shared_with(sc.shared_with):
        raise HTTPException(status_code=403, detail="Forbidden")
    return SuccessCriteriaOut(
        id=sc.id,
        title=sc.title,
        description=sc.description,
        owner_email=sc.owner_email,
        created_at=sc.created_at,
        updated_at=sc.updated_at,
        shared_with=parse_shared_with(sc.shared_with),
        requirements=[
            SuccessCriteriaRequirementOut(
                id=r.id,
                requirement_id=r.requirement_id,
                custom_text=r.custom_text,
                order=r.order,
                requirement=RequirementOut.from_orm(r.requirement) if r.requirement else None
            ) for r in sorted(sc.requirements, key=lambda x: (x.order or 0, x.id))
        ]
    )

@router.put("/success-criteria/{sc_id}", response_model=SuccessCriteriaOut)
def update_success_criteria(
    sc_id: int,
    data: SuccessCriteriaIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    sc = db.query(SuccessCriteria).filter(SuccessCriteria.id == sc_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Not found")
    if sc.owner_email != user.email:
        raise HTTPException(status_code=403, detail="Only owner can update")
    sc.title = data.title
    sc.description = data.description
    sc.updated_at = datetime.utcnow()
    sc.shared_with = join_shared_with(data.shared_with)
    # Replace requirements
    db.query(SuccessCriteriaRequirement).filter(SuccessCriteriaRequirement.success_criteria_id == sc.id).delete()
    for i, req in enumerate(data.requirements or []):
        scr = SuccessCriteriaRequirement(
            success_criteria_id=sc.id,
            requirement_id=req.requirement_id,
            custom_text=req.custom_text,
            order=req.order if req.order is not None else i
        )
        db.add(scr)
    db.commit()
    db.refresh(sc)
    log_audit_action(
        db,
        action="update_success_criteria",
        user_email=user.email,
        details=f"Updated success_criteria id={sc.id}, title={sc.title}",
        ip_address=request.client.host if request else None,
    )
    # Return with requirements
    sc = db.query(SuccessCriteria).filter(SuccessCriteria.id == sc.id).first()
    return SuccessCriteriaOut(
        id=sc.id,
        title=sc.title,
        description=sc.description,
        owner_email=sc.owner_email,
        created_at=sc.created_at,
        updated_at=sc.updated_at,
        shared_with=parse_shared_with(sc.shared_with),
        requirements=[
            SuccessCriteriaRequirementOut(
                id=r.id,
                requirement_id=r.requirement_id,
                custom_text=r.custom_text,
                order=r.order,
                requirement=RequirementOut.from_orm(r.requirement) if r.requirement else None
            ) for r in sorted(sc.requirements, key=lambda x: (x.order or 0, x.id))
        ]
    )

@router.delete("/success-criteria/{sc_id}")
def delete_success_criteria(sc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    sc = db.query(SuccessCriteria).filter(SuccessCriteria.id == sc_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="Not found")
    if sc.owner_email != user.email:
        raise HTTPException(status_code=403, detail="Only owner can delete")
    db.query(SuccessCriteriaRequirement).filter(SuccessCriteriaRequirement.success_criteria_id == sc.id).delete()
    db.delete(sc)
    db.commit()
    log_audit_action(
        db,
        action="delete_success_criteria",
        user_email=user.email,
        details=f"Deleted success_criteria id={sc_id}",
        ip_address=request.client.host if request else None,
    )
    return {"status": "deleted"}

app.include_router(router)
