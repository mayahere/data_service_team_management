import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func
from database import get_session
from models import Project, ProjectCreate, ProjectUpdate, Task, Issue, User
from auth import get_current_user, require_manager

router = APIRouter(prefix="/projects", tags=["projects"])

def compute_sla_status(session: Session, project: Project) -> dict:
    total = session.exec(select(func.count(Task.task_id)).where(Task.project_id == project.project_id)).one()
    if total == 0:
        return {"status": "No Data", "sla_actual": None, "sla_target": project.sla_target}
    approved = session.exec(select(func.count(Task.task_id)).where(Task.project_id == project.project_id, Task.status == "Approved")).one()
    
    actual = round(approved / total * 100, 1)
    target = project.sla_target
    if actual >= target:
        status = "Met"
    elif actual >= target - 10:
        status = "At Risk"
    else:
        status = "Breached"
    return {"status": status, "sla_actual": actual, "sla_target": target}

def _enrich(session: Session, p: Project) -> dict:
    leader = session.get(User, p.leader_id)
    sla = compute_sla_status(session, p)
    task_count = session.exec(select(func.count(Task.task_id)).where(Task.project_id == p.project_id)).one()
    issue_count = session.exec(select(func.count(Issue.issue_id)).where(Issue.project_id == p.project_id)).one()
    
    return {
        **p.model_dump(),
        "leader_name": leader.full_name if leader else None,
        "task_count": task_count,
        "issue_count": issue_count,
        "sla_status": sla,
    }

def _accessible(session: Session, user: dict) -> list[Project]:
    role = user["role"]
    if role == "Manager":
        return session.exec(select(Project)).all()
    if role == "Leader":
        return session.exec(select(Project).where(Project.leader_id == user["sub"])).all()
    
    # Operator: projects that have tasks assigned to them
    subquery = select(Task.project_id).where((Task.assignee_id == user["sub"]) | (Task.reviewer_id == user["sub"]))
    operator_task_project_ids = session.exec(subquery).all()
    return session.exec(select(Project).where(Project.project_id.in_(operator_task_project_ids))).all()


@router.get("")
def list_projects(user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    projects = _accessible(session, user)
    return [_enrich(session, p) for p in projects]


@router.get("/{project_id}")
def get_project(project_id: str, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    p = session.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
        
    accessible_ids = {x.project_id for x in _accessible(session, user)}
    if project_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return _enrich(session, p)


@router.post("", status_code=201)
def create_project(body: ProjectCreate, user: dict = Depends(require_manager), session: Session = Depends(get_session)):
    if session.exec(select(Project).where(Project.project_code == body.project_code)).first():
        raise HTTPException(status_code=400, detail="project_code already exists")
    if body.start_date >= body.end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")
        
    leader = session.get(User, body.leader_id)
    if not leader or leader.role != "Leader":
        raise HTTPException(status_code=400, detail="leader_id must reference a user with Leader role")

    new_id = f"p{uuid.uuid4().hex[:6]}"
    project = Project(project_id=new_id, **body.model_dump())
    session.add(project)
    session.commit()
    session.refresh(project)
    return _enrich(session, project)


@router.put("/{project_id}")
def update_project(project_id: str, body: ProjectUpdate, user: dict = Depends(require_manager), session: Session = Depends(get_session)):
    p = session.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    updates = body.model_dump(exclude_none=True)

    if "leader_id" in updates:
        leader = session.get(User, updates["leader_id"])
        if not leader or leader.role != "Leader":
            raise HTTPException(status_code=400, detail="leader_id must reference a user with Leader role")

    if "start_date" in updates or "end_date" in updates:
        start = updates.get("start_date", p.start_date)
        end = updates.get("end_date", p.end_date)
        if start >= end:
            raise HTTPException(status_code=400, detail="start_date must be before end_date")

    for key, value in updates.items():
        setattr(p, key, value)
        
    session.add(p)
    session.commit()
    session.refresh(p)
    return _enrich(session, p)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, user: dict = Depends(require_manager), session: Session = Depends(get_session)):
    p = session.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    open_tasks = session.exec(select(Task).where(Task.project_id == project_id, Task.status.notin_(["Approved", "Rejected"]))).all()
    if open_tasks:
        raise HTTPException(status_code=409, detail="Cannot delete project with open tasks")

    # Delete all associated tasks and issues
    tasks = session.exec(select(Task).where(Task.project_id == project_id)).all()
    for task in tasks:
        session.delete(task)
        
    issues = session.exec(select(Issue).where(Issue.project_id == project_id)).all()
    for issue in issues:
        session.delete(issue)

    session.delete(p)
    session.commit()
