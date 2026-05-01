from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user, require_manager_or_leader
import store

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
def list_users(user: dict = Depends(get_current_user)):
    return [_safe(u) for u in store.users if u.is_active]


@router.get("/{user_id}")
def get_user(user_id: str, user: dict = Depends(get_current_user)):
    u = store.user_index_by_id.get(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return _safe(u)
