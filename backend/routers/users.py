from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from sqlmodel import Session, select
from database import get_session
from models import User
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


def _safe(u) -> dict:
    return {
        "user_id": u.user_id,
        "full_name": u.full_name,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
    }


def _require_manager(user: dict):
    if user.get("role") != "Manager":
        raise HTTPException(status_code=403, detail="Manager access required")


@router.get("")
def list_users(include_inactive: bool = False, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    q = select(User) if include_inactive else select(User).where(User.is_active == True)
    users = session.exec(q).all()
    return [_safe(u) for u in users]


@router.get("/{user_id}")
def get_user(user_id: str, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return _safe(u)


@router.post("", status_code=201)
def create_user(body: UserCreate, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    _require_manager(user)
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    new_user = User(
        user_id=str(uuid.uuid4()),
        full_name=body.full_name,
        email=body.email,
        password=body.password,
        role=body.role,
        is_active=True,
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return _safe(new_user)


@router.put("/{user_id}")
def update_user(user_id: str, body: UserUpdate, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    _require_manager(user)
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if body.full_name is not None:
        u.full_name = body.full_name
    if body.email is not None:
        existing = session.exec(select(User).where(User.email == body.email, User.user_id != user_id)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        u.email = body.email
    if body.password is not None and body.password != "":
        u.password = body.password
    if body.role is not None:
        u.role = body.role
    if body.is_active is not None:
        u.is_active = body.is_active
    session.commit()
    session.refresh(u)
    return _safe(u)


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: str, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    _require_manager(user)
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = False
    session.commit()
