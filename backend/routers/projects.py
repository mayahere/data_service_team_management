import uuid
from fastapi import APIRouter, Depends, HTTPException
from models import Project, ProjectCreate, ProjectUpdate
from auth import get_current_user, require_manager
import store

router = APIRouter(prefix="/projects", tags=["projects"])


def _enrich(p: Project) -> dict:
    leader = store.user_index_by_id.get(p.leader_id)
    sla = store.compute_sla_status(p.project_id)
    project_tasks = store.project_task_map.get(p.project_id, [])
    issue_count = len(store.project_issue_map.get(p.project_id, []))
    return {
        **p.model_dump(),
        "leader_name": leader.full_name if leader else None,
        "task_count": len(project_tasks),
        "issue_count": issue_count,
        "sla_status": sla,
    }


def _accessible(user: dict) -> list[Project]:
    role = user["role"]
    if role == "Manager":
        return store.projects
    if role == "Leader":
        return [p for p in store.projects if p.leader_id == user["sub"]]
    # Operator: projects that have tasks assigned to them
    assigned_project_ids = {
        t.project_id for t in store.tasks
        if t.assignee_id == user["sub"] or t.reviewer_id == user["sub"]
    }
    return [p for p in store.projects if p.project_id in assigned_project_ids]


@router.get("")
def list_projects(user: dict = Depends(get_current_user)):
    return [_enrich(p) for p in _accessible(user)]


@router.get("/{project_id}")
def get_project(project_id: str, user: dict = Depends(get_current_user)):
    p = store.project_index.get(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    accessible_ids = {x.project_id for x in _accessible(user)}
    if project_id not in accessible_ids:
        raise HTTPException(status_code=403, detail="Access denied")
    return _enrich(p)


@router.post("", status_code=201)
def create_project(body: ProjectCreate, user: dict = Depends(require_manager)):
    if any(p.project_code == body.project_code for p in store.projects):
        raise HTTPException(status_code=400, detail="project_code already exists")
    if body.start_date >= body.end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")
    leader = store.user_index_by_id.get(body.leader_id)
    if not leader or leader.role != "Leader":
        raise HTTPException(status_code=400, detail="leader_id must reference a user with Leader role")

    new_id = f"p{uuid.uuid4().hex[:6]}"
    project = Project(project_id=new_id, **body.model_dump())
    store.projects.append(project)
    store.rebuild_project_index()
    return _enrich(project)


@router.put("/{project_id}")
def update_project(project_id: str, body: ProjectUpdate, user: dict = Depends(require_manager)):
    p = store.project_index.get(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    updates = body.model_dump(exclude_none=True)

    if "leader_id" in updates:
        leader = store.user_index_by_id.get(updates["leader_id"])
        if not leader or leader.role != "Leader":
            raise HTTPException(status_code=400, detail="leader_id must reference a user with Leader role")

    if "start_date" in updates or "end_date" in updates:
        start = updates.get("start_date", p.start_date)
        end = updates.get("end_date", p.end_date)
        if start >= end:
            raise HTTPException(status_code=400, detail="start_date must be before end_date")

    data = p.model_dump()
    data.update(updates)
    updated = Project(**data)
    idx = next(i for i, x in enumerate(store.projects) if x.project_id == project_id)
    store.projects[idx] = updated
    store.rebuild_project_index()
    return _enrich(updated)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, user: dict = Depends(require_manager)):
    p = store.project_index.get(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    open_tasks = [
        t for t in store.project_task_map.get(project_id, [])
        if t.status not in ("Approved", "Rejected")
    ]
    if open_tasks:
        raise HTTPException(status_code=409, detail="Cannot delete project with open tasks")

    store.projects = [x for x in store.projects if x.project_id != project_id]
    store.issues = [i for i in store.issues if i.project_id != project_id]
    store.tasks = [t for t in store.tasks if t.project_id != project_id]
    store.rebuild_project_index()
    store.rebuild_task_structures()
    store.rebuild_issue_structures()
