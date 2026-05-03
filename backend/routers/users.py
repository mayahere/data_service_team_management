from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from sqlmodel import Session, select
from database import get_session
from models import User

router = APIRouter(prefix="/users", tags=["users"])


def _safe(u) -> dict:
    return {
        "user_id": u.user_id,
        "full_name": u.full_name,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
    }


@router.get("")
def list_users(user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    users = session.exec(select(User).where(User.is_active == True)).all()
    return [_safe(u) for u in users]


@router.get("/{user_id}")
def get_user(user_id: str, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    u = session.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return _safe(u)
