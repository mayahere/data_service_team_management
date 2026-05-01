from fastapi import APIRouter, HTTPException, Depends
from models import LoginRequest
from auth import create_token, get_current_user
import store

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest):
    user = store.user_index_by_email.get(body.email)
    if not user or not user.is_active or user.password != body.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user.user_id, user.email, user.role, user.full_name)
    return {
        "access_token": token,
        "role": user.role,
        "full_name": user.full_name,
        "user_id": user.user_id,
    }


@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["sub"],
        "full_name": user["full_name"],
        "email": user["email"],
        "role": user["role"],
    }
