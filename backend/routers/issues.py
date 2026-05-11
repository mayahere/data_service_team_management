import uuid
import datetime
import shutil
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from sqlalchemy import func
from database import get_session
from models import Issue, IssueCreate, IssueUpdate, User, Task, Project
from auth import get_current_user, require_manager_or_leader
from routers.activity import log_activity

router = APIRouter(prefix="/issues", tags=["issues"])


def _enrich(session: Session, i: Issue) -> dict:
    assignee = session.get(User, i.assignee_id) if i.assignee_id else None
    reviewer = session.get(User, i.reviewer_id) if i.reviewer_id else None
    task = session.get(Task, i.task_id) if i.task_id else None
    project = session.get(Project, i.project_id)
    return {
        **i.model_dump(),
        "assignee_name": assignee.full_name if assignee else None,
        "reviewer_name": reviewer.full_name if reviewer else None,
        "task_title": task.title if task else None,
        "project_name": project.project_name if project else None,
    }


def _accessible_issues(session: Session, user: dict) -> list[Issue]:
    role = user["role"]
    if role == "Manager":
        return session.exec(select(Issue)).all()
    if role == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        return session.exec(select(Issue).where(Issue.project_id.in_(leader_projects))).all()
    # Operator: issues assigned to them
    return session.exec(select(Issue).where((Issue.assignee_id == user["sub"]) | (Issue.reviewer_id == user["sub"]))).all()


@router.get("")
def list_issues(
    project_id: str = None,
    task_id: str = None,
    status: str = None,
    issue_priority: str = None,
    user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    result = _accessible_issues(session, user)
    if project_id:
        result = [i for i in result if i.project_id == project_id]
    if task_id:
        result = [i for i in result if i.task_id == task_id]
    if status:
        result = [i for i in result if i.status.lower() == status.lower()]
    if issue_priority:
        result = [i for i in result if i.issue_priority.lower() == issue_priority.lower()]
    return [_enrich(session, i) for i in result]


@router.get("/priority")
def priority_issues(n: int = 5, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    priority_score = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    base = _accessible_issues(session, user)
    open_issues = [i for i in base if i.status != "Resolved"]
    sorted_issues = sorted(open_issues, key=lambda i: priority_score.get(i.issue_priority, 9))
    return [_enrich(session, i) for i in sorted_issues[:n]]


@router.get("/{issue_id}")
def get_issue(issue_id: str, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    i = session.get(Issue, issue_id)
    if not i:
        raise HTTPException(status_code=404, detail="Issue not found")
    accessible_ids = {x.issue_id for x in _accessible_issues(session, user)}
    if issue_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return _enrich(session, i)


@router.post("", status_code=201)
def create_issue(body: IssueCreate, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    if user["role"] == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if body.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied to this project")

    total_issues = session.exec(select(func.count(Issue.issue_id))).one()
    
    # Simple logic for issue code
    next_num = total_issues + 1
    issue_code = f"ISS-{next_num:04d}"

    now = datetime.datetime.utcnow().isoformat()
    new_id = f"iss-{uuid.uuid4().hex[:6]}"
    
    body_dict = body.model_dump()
    due_date = body_dict.get("due_date")
    if body_dict.get("task_id"):
        task = session.get(Task, body_dict["task_id"])
        if task:
            due_date = task.due_date
    if "due_date" in body_dict:
        del body_dict["due_date"]

    issue = Issue(
        issue_id=new_id,
        issue_code=issue_code,
        status="Open",
        created_at=now,
        due_date=due_date,
        **body_dict,
    )
    project = session.get(Project, body.project_id)
    log_activity(session, "issue", new_id, body.issue_title, "created", user["full_name"],
                 project.project_name if project else "")
    session.add(issue)
    session.commit()
    session.refresh(issue)
    return _enrich(session, issue)


@router.put("/{issue_id}")
def update_issue(issue_id: str, body: IssueUpdate, user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    i = session.get(Issue, issue_id)
    if not i:
        raise HTTPException(status_code=404, detail="Issue not found")

    if user["role"] == "Operator":
        if i.assignee_id != user["sub"] and i.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if i.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    updates = body.model_dump(exclude_none=True)
    old_status = i.status
    if updates.get("status") == "Resolved" and not updates.get("resolved_at"):
        updates["resolved_at"] = datetime.datetime.utcnow().isoformat()

    for key, value in updates.items():
        setattr(i, key, value)

    new_status = i.status
    project = session.get(Project, i.project_id)
    pname = project.project_name if project else ""
    if new_status != old_status:
        action = "resolved" if new_status == "Resolved" else "status_changed"
        log_activity(session, "issue", issue_id, i.issue_title, action, user["full_name"],
                     pname, detail=f"{old_status} → {new_status}")
    else:
        log_activity(session, "issue", issue_id, i.issue_title, "updated", user["full_name"], pname)

    session.add(i)
    session.commit()
    session.refresh(i)
    return _enrich(session, i)

@router.post("/{issue_id}/upload")
def upload_issue_image(issue_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    i = session.get(Issue, issue_id)
    if not i:
        raise HTTPException(status_code=404, detail="Issue not found")

    if user["role"] == "Operator":
        if i.assignee_id != user["sub"] and i.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if i.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join("uploads", filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    i.issue_url = f"http://localhost:8000/uploads/{filename}"
    session.add(i)
    session.commit()
    session.refresh(i)
    
    return _enrich(session, i)


@router.delete("/{issue_id}", status_code=204)
def delete_issue(issue_id: str, user: dict = Depends(require_manager_or_leader), session: Session = Depends(get_session)):
    i = session.get(Issue, issue_id)
    if not i:
        raise HTTPException(status_code=404, detail="Issue not found")

    if user["role"] == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        if i.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    project = session.get(Project, i.project_id)
    log_activity(session, "issue", issue_id, i.issue_title, "deleted", user["full_name"],
                 project.project_name if project else "")
    session.delete(i)
    session.commit()
