from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from database import get_session
from models import User, LoginRequest
from auth import create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, session: Session = Depends(get_session)):
    statement = select(User).where(User.email == body.email)
    user = session.exec(statement).first()
    
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
