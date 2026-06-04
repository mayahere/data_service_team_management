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

@router.post("/setup")
def setup_database(session: Session = Depends(get_session)):
    import seed
    from models import Project, Task, Issue
    
    created_users = []
    try:
        users_data = seed._load("users.json")
        for u_data in users_data:
            existing = session.exec(select(User).where(User.email == u_data["email"])).first()
            if not existing:
                new_user = User(**u_data)
                session.add(new_user)
                created_users.append(u_data["email"])
        
        projects_data = seed._load("projects.json")
        for p_data in projects_data:
            existing = session.exec(select(Project).where(Project.project_id == p_data["project_id"])).first()
            if not existing:
                session.add(Project(**p_data))
                
        tasks_data = seed._load("tasks.json")
        for t_data in tasks_data:
            existing = session.exec(select(Task).where(Task.task_id == t_data["task_id"])).first()
            if not existing:
                session.add(Task(**t_data))
                
        issues_data = seed._load("issues.json")
        for i_data in issues_data:
            existing = session.exec(select(Issue).where(Issue.issue_id == i_data["issue_id"])).first()
            if not existing:
                session.add(Issue(**i_data))
                
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")
        
    return {"status": "success", "created_users": created_users}
