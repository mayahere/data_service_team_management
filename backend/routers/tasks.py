import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException
from models import Task, TaskCreate, TaskUpdate, TaskStatusUpdate, TaskReviewUpdate
from auth import get_current_user, require_manager, require_manager_or_leader
import store

router = APIRouter(prefix="/tasks", tags=["tasks"])

VALID_TRANSITIONS: dict[str, set] = {
    "Not Started": {"In Progress"},
    "In Progress":  {"Completed"},
    "Completed":    {"Approved", "Rejected"},
    "Rejected":     {"In Progress"},
    "Approved":     set(),
}


def _enrich(t: Task) -> dict:
    assignee = store.user_index_by_id.get(t.assignee_id) if t.assignee_id else None
    reviewer = store.user_index_by_id.get(t.reviewer_id) if t.reviewer_id else None
    issue_count = len(store.task_issue_map.get(t.task_id, []))
    return {
        **t.model_dump(),
        "assignee_name": assignee.full_name if assignee else None,
        "reviewer_name": reviewer.full_name if reviewer else None,
        "issue_count": issue_count,
    }


def _accessible_tasks(user: dict) -> list[Task]:
    role = user["role"]
    if role == "Manager":
        return store.tasks
    if role == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        return [t for t in store.tasks if t.project_id in leader_projects]
    # Operator: own tasks only
    return [t for t in store.tasks if t.assignee_id == user["sub"] or t.reviewer_id == user["sub"]]


@router.get("")
def list_tasks(
    project_id: str = None,
    status: str = None,
    type: str = None,
    task_priority: str = None,
    user: dict = Depends(get_current_user),
):
    result = _accessible_tasks(user)
    if project_id:
        result = [t for t in result if t.project_id == project_id]
    if status:
        result = [t for t in result if t.status.lower() == status.lower()]
    if type:
        result = [t for t in result if t.type.lower() == type.lower()]
    if task_priority:
        result = [t for t in result if t.task_priority.lower() == task_priority.lower()]
    return [_enrich(t) for t in result]


@router.get("/priority")
def priority_tasks(n: int = 5, user: dict = Depends(get_current_user)):
    base = _accessible_tasks(user)
    priority_score = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    active = [t for t in base if t.status not in ("Approved", "Rejected")]
    sorted_tasks = sorted(active, key=lambda t: (priority_score.get(t.task_priority, 9), t.due_date))
    return [_enrich(t) for t in sorted_tasks[:n]]


@router.get("/{task_id}")
def get_task(task_id: str, user: dict = Depends(get_current_user)):
    t = store.task_index.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    accessible_ids = {x.task_id for x in _accessible_tasks(user)}
    if task_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return _enrich(t)


@router.post("", status_code=201)
def create_task(body: TaskCreate, user: dict = Depends(require_manager_or_leader)):
    if user["role"] == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        if body.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied to this project")

    now = datetime.datetime.utcnow().isoformat()
    new_id = f"t{uuid.uuid4().hex[:6]}"
    task = Task(
        task_id=new_id,
        status="Not Started",
        created_at=now,
        updated_at=now,
        **body.model_dump(),
    )
    store.tasks.append(task)
    store.rebuild_task_structures()
    return _enrich(task)


@router.put("/{task_id}")
def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(get_current_user)):
    t = store.task_index.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if user["role"] == "Operator":
        if t.assignee_id != user["sub"] and t.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        if t.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    data = t.model_dump()
    data.update(body.model_dump(exclude_none=True))
    data["updated_at"] = datetime.datetime.utcnow().isoformat()
    updated = Task(**data)
    idx = next(i for i, x in enumerate(store.tasks) if x.task_id == task_id)
    store.tasks[idx] = updated
    store.rebuild_task_structures()
    return _enrich(updated)


@router.patch("/{task_id}/status")
def update_task_status(task_id: str, body: TaskStatusUpdate, user: dict = Depends(get_current_user)):
    t = store.task_index.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    if user["role"] == "Operator":
        if t.assignee_id != user["sub"] and t.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Access denied")
    elif user["role"] == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        if t.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    new_status = body.status
    allowed = VALID_TRANSITIONS.get(t.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{t.status}' to '{new_status}'. Allowed: {sorted(allowed) or 'none'}",
        )

    # Operators cannot approve/reject
    if user["role"] == "Operator" and new_status in ("Approved", "Rejected"):
        raise HTTPException(status_code=403, detail="Only Leaders or Managers can approve or reject tasks")

    data = t.model_dump()
    data["status"] = new_status
    data["updated_at"] = datetime.datetime.utcnow().isoformat()
    if new_status == "Completed":
        data["completed_at"] = data["updated_at"]
    updated = Task(**data)
    idx = next(i for i, x in enumerate(store.tasks) if x.task_id == task_id)
    store.tasks[idx] = updated
    store.rebuild_task_structures()
    return _enrich(updated)


@router.post("/{task_id}/review")
def review_task(task_id: str, body: TaskReviewUpdate, user: dict = Depends(get_current_user)):
    t = store.task_index.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")

    role = user["role"]
    if role == "Operator":
        if t.reviewer_id != user["sub"]:
            raise HTTPException(status_code=403, detail="Only assigned reviewers can review this task")
    elif role == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        if t.project_id not in leader_projects:
            raise HTTPException(status_code=403, detail="Access denied")

    if t.status != "Completed":
        raise HTTPException(status_code=400, detail="Only Completed tasks can be reviewed")

    if body.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    new_status = "Approved" if body.action == "approve" else "Rejected"
    data = t.model_dump()
    data["status"] = new_status
    data["updated_at"] = datetime.datetime.utcnow().isoformat()
    updated = Task(**data)
    idx = next(i for i, x in enumerate(store.tasks) if x.task_id == task_id)
    store.tasks[idx] = updated
    store.rebuild_task_structures()
    return _enrich(updated)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, user: dict = Depends(require_manager_or_leader)):
    t = store.task_index.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    if t.status != "Not Started":
        raise HTTPException(status_code=409, detail="Only 'Not Started' tasks can be deleted")
    store.tasks = [x for x in store.tasks if x.task_id != task_id]
    store.issues = [i for i in store.issues if i.task_id != task_id]
    store.rebuild_task_structures()
    store.rebuild_issue_structures()
