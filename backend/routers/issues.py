import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from models import Issue, IssueCreate, IssueUpdate
from auth import get_current_user, require_manager_or_leader
import store

router = APIRouter(prefix="/issues", tags=["issues"])


def _enrich(i: Issue) -> dict:
    assignee = store.user_index_by_id.get(i.assignee_id) if i.assignee_id else None
    reviewer = store.user_index_by_id.get(i.reviewer_id) if i.reviewer_id else None
    task = store.task_index.get(i.task_id) if i.task_id else None
    project = store.project_index.get(i.project_id)
    return {
        **i.model_dump(),
        "assignee_name": assignee.full_name if assignee else None,
        "reviewer_name": reviewer.full_name if reviewer else None,
        "task_title": task.title if task else None,
        "project_name": project.project_name if project else None,
    }


def _accessible_issues(user: dict) -> list[Issue]:
    role = user["role"]
    if role == "Manager":
        return store.issues
    if role == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        return [i for i in store.issues if i.project_id in leader_projects]
    # Operator: issues assigned to them
    return [i for i in store.issues if i.assignee_id == user["sub"] or i.reviewer_id == user["sub"]]


@router.get("")
def list_issues(
    project_id: str = None,
    task_id: str = None,
    status: str = None,
    issue_priority: str = None,
    user: dict = Depends(get_current_user),
):
    result = _accessible_issues(user)
    if project_id:
        result = [i for i in result if i.project_id == project_id]
    if task_id:
        result = [i for i in result if i.task_id == task_id]
    if status:
        result = [i for i in result if i.status.lower() == status.lower()]
    if issue_priority:
        result = [i for i in result if i.issue_priority.lower() == issue_priority.lower()]
    return [_enrich(i) for i in result]


@router.get("/priority")
def priority_issues(n: int = 5, user: dict = Depends(get_current_user)):
    priority_score = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    base = _accessible_issues(user)
    open_issues = [i for i in base if i.status != "Resolved"]
    sorted_issues = sorted(open_issues, key=lambda i: priority_score.get(i.issue_priority, 9))
    return [_enrich(i) for i in sorted_issues[:n]]


@router.get("/{issue_id}")
def get_issue(issue_id: str, user: dict = Depends(get_current_user)):
    i = store.issue_index.get(issue_id)
    if not i:
        raise HTTPException(status_code=404, detail="Issue not found")
    accessible_ids = {x.issue_id for x in _accessible_issues(user)}
    if issue_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return _enrich(i)


@router.post("", status_code=201)
def create_issue(body: IssueCreate, user: dict = Depends(get_current_user)):
    if user["role"] == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        if body.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied to this project")

    existing_codes = {i.issue_code for i in store.issues}
    next_num = len(store.issues) + 1
    while f"ISS-{next_num:04d}" in existing_codes:
        next_num += 1
    issue_code = f"ISS-{next_num:04d}"

    now = datetime.datetime.utcnow().isoformat()
    new_id = f"iss-{uuid.uuid4().hex[:6]}"
    issue = Issue(
        issue_id=new_id,
        issue_code=issue_code,
        status="Open",
        created_at=now,
        **body.model_dump(),
    )
    store.issues.append(issue)
    store.rebuild_issue_structures()
    return _enrich(issue)


@router.put("/{issue_id}")
def update_issue(issue_id: str, body: IssueUpdate, user: dict = Depends(get_current_user)):
    i = store.issue_index.get(issue_id)
    if not i:
        raise HTTPException(status_code=404, detail="Issue not found")

    if user["role"] == "Operator":
        if i.assignee_id != user["sub"] and i.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        if i.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    data = i.model_dump()
    updates = body.model_dump(exclude_none=True)
    if updates.get("status") == "Resolved" and not updates.get("resolved_at"):
        updates["resolved_at"] = datetime.datetime.utcnow().isoformat()
    data.update(updates)
    updated = Issue(**data)
    idx = next(j for j, x in enumerate(store.issues) if x.issue_id == issue_id)
    store.issues[idx] = updated
    store.rebuild_issue_structures()
    return _enrich(updated)


@router.delete("/{issue_id}", status_code=204)
def delete_issue(issue_id: str, user: dict = Depends(require_manager_or_leader)):
    i = store.issue_index.get(issue_id)
    if not i:
        raise HTTPException(status_code=404, detail="Issue not found")

    if user["role"] == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        if i.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    store.issues = [x for x in store.issues if x.issue_id != issue_id]
    store.rebuild_issue_structures()
