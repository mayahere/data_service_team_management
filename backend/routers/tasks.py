import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func
from database import get_session
from models import Task, TaskCreate, TaskUpdate, TaskStatusUpdate, TaskReviewUpdate, User, Project, Issue
from auth import get_current_user, require_manager_or_leader
from routers.activity import log_activity

router = APIRouter(prefix="/tasks", tags=["tasks"])

VALID_TRANSITIONS: dict[str, set] = {
    "Not Started": {"In Progress"},
    "In Progress":  {"Completed"},
    "Completed":    {"Approved", "Rejected"},
    "Rejected":     {"In Progress"},
    "Approved":     set(),
}


def _enrich(session: Session, t: Task) -> dict:
    assignee = session.get(User, t.assignee_id) if t.assignee_id else None
    reviewer = session.get(User, t.reviewer_id) if t.reviewer_id else None
    issue_count = session.exec(select(func.count(Issue.issue_id)).where(Issue.task_id == t.task_id)).one()
    return {
        **t.model_dump(),
        "assignee_name": assignee.full_name if assignee else None,
        "reviewer_name": reviewer.full_name if reviewer else None,
        "issue_count": issue_count,
    }


def _accessible_tasks(session: Session, user: dict) -> list[Task]:
    role = user["role"]
    if role == "Manager":
        return session.exec(select(Task)).all()
    if role == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        return session.exec(select(Task).where(Task.project_id.in_(leader_projects))).all()
    # Operator: own tasks only
    return session.exec(select(Task).where((Task.assignee_id == user["sub"]) | (Task.reviewer_id == user["sub"]))).all()


@router.get("")
def list_tasks(
    project_id: str = None,
    status: str = None,
    type: str = None,
    task_priority: str = None,
    user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    result = _accessible_tasks(session, user)
    if project_id:
        result = [t for t in result if t.project_id == project_id]
    if status:
        result = [t for t in result if t.status.lower() == status.lower()]
    if type:
        result = [t for t in result if t.type.lower() == type.lower()]
    if task_priority:
        result = [t for t in result if t.task_priority.lower() == task_priority.lower()]
    return [_enrich(session, t) for t in result]


@router.get("/{task_id}")
def get_task(task_id: str, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    t = session.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    accessible_ids = {x.task_id for x in _accessible_tasks(session, user)}
    if task_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return _enrich(session, t)


@router.post("", status_code=201)
def create_task(body: TaskCreate, user: dict = Depends(require_manager_or_leader), session: Session = Depends(get_session)):
    if user["role"] == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if body.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied to this project")

    now_dt = datetime.datetime.utcnow()
    now = now_dt.isoformat()

    new_id = f"t{uuid.uuid4().hex[:6]}"
    body_dict = body.model_dump()
    due_date = body_dict.pop("due_date", None)
    if not due_date or due_date.strip() == "":
        due_date = (now_dt + datetime.timedelta(days=3)).isoformat()

    task = Task(
        task_id=new_id,
        status="Not Started",
        created_at=now,
        updated_at=now,
        due_date=due_date,
        **body_dict,
    )
    session.add(task)
    project = session.get(Project, body.project_id)
    log_activity(session, "task", new_id, body.title, "created", user["full_name"],
                 project.project_name if project else "")
    session.commit()
    session.refresh(task)
    return _enrich(session, task)


@router.put("/{task_id}")
def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    t = session.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if user["role"] == "Operator":
        if t.assignee_id != user["sub"] and t.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if t.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    data = body.model_dump(exclude_none=True)
    for key, value in data.items():
        setattr(t, key, value)
    t.updated_at = datetime.datetime.utcnow().isoformat()

    project = session.get(Project, t.project_id)
    log_activity(session, "task", task_id, t.title, "updated", user["full_name"],
                 project.project_name if project else "")
    session.add(t)
    session.commit()
    session.refresh(t)
    return _enrich(session, t)


@router.patch("/{task_id}/status")
def update_task_status(task_id: str, body: TaskStatusUpdate, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    t = session.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if user["role"] == "Operator":
        if t.assignee_id != user["sub"] and t.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if t.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    new_status = body.status
    valid_statuses = {"Not Started", "In Progress", "Completed", "Approved", "Rejected"}
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status: '{new_status}'. Allowed: {sorted(list(valid_statuses))}",
        )

    old_status = t.status
    t.status = new_status
    t.updated_at = datetime.datetime.utcnow().isoformat()
    if new_status == "Completed":
        t.completed_at = t.updated_at

    project = session.get(Project, t.project_id)
    log_activity(session, "task", task_id, t.title, "status_changed", user["full_name"],
                 project.project_name if project else "", detail=f"{old_status} → {new_status}")
    session.add(t)
    session.commit()
    session.refresh(t)
    return _enrich(session, t)


@router.post("/{task_id}/review")
def review_task(task_id: str, body: TaskReviewUpdate, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    t = session.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    role = user["role"]
    if role == "Operator":
        if t.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Only assigned reviewers can review this task")
    elif role == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if t.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    if t.status != "Completed":
        raise HTTPException(status_code=400, detail="Only Completed tasks can be reviewed")

    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    new_status = "Approved" if body.action == "approve" else "Rejected"
    t.status = new_status
    t.updated_at = datetime.datetime.utcnow().isoformat()

    project = session.get(Project, t.project_id)
    action = "approved" if body.action == "approve" else "rejected"
    log_activity(session, "task", task_id, t.title, action, user["full_name"],
                 project.project_name if project else "", detail=body.feedback)
    session.add(t)
    session.commit()
    session.refresh(t)
    return _enrich(session, t)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, user: dict = Depends(require_manager_or_leader), session: Session = Depends(get_session)):
    t = session.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    if t.status != "Not Started":
        raise HTTPException(status_code=409, detail="Only 'Not Started' tasks can be deleted")
        
    project = session.get(Project, t.project_id)
    log_activity(session, "task", task_id, t.title, "deleted", user["full_name"],
                 project.project_name if project else "")
    issues = session.exec(select(Issue).where(Issue.task_id == task_id)).all()
    for issue in issues:
        session.delete(issue)
    session.delete(t)
    session.commit()
