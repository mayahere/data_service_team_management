import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from auth import get_current_user, require_manager
import store

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
def dashboard_summary(user: dict = Depends(get_current_user)):
    role = user["role"]

    if role == "Manager":
        visible_projects = store.projects
        visible_tasks = store.tasks
        visible_issues = store.issues
    elif role == "Leader":
        leader_projects = {p.project_id for p in store.projects if p.leader_id == user["sub"]}
        visible_projects = [p for p in store.projects if p.project_id in leader_projects]
        visible_tasks = [t for t in store.tasks if t.project_id in leader_projects]
        visible_issues = [i for i in store.issues if i.project_id in leader_projects]
    else:
        visible_tasks = [
            t for t in store.tasks
            if t.assignee_id == user["sub"] or t.reviewer_id == user["sub"]
        ]
        task_project_ids = {t.project_id for t in visible_tasks}
        visible_projects = [p for p in store.projects if p.project_id in task_project_ids]
        visible_issues = [
            i for i in store.issues
            if i.assignee_id == user["sub"] or i.reviewer_id == user["sub"]
        ]

    status_counts = {}
    for t in visible_tasks:
        status_counts[t.status] = status_counts.get(t.status, 0) + 1

    priority_counts = {}
    for t in visible_tasks:
        priority_counts[t.task_priority] = priority_counts.get(t.task_priority, 0) + 1

    project_summaries = []
    for p in visible_projects:
        sla = store.compute_sla_status(p.project_id)
        project_tasks = [t for t in visible_tasks if t.project_id == p.project_id]
        project_issues = [i for i in visible_issues if i.project_id == p.project_id]
        open_issues = [i for i in project_issues if i.status != "Resolved"]
        leader = store.user_index_by_id.get(p.leader_id)
        project_summaries.append({
            "project_id": p.project_id,
            "project_code": p.project_code,
            "project_name": p.project_name,
            "leader_name": leader.full_name if leader else None,
            "status": p.status,
            "task_count": len(project_tasks),
            "open_issue_count": len(open_issues),
            "sla": sla,
        })

    open_critical = [
        i for i in visible_issues
        if i.status != "Resolved" and i.issue_priority in ("Critical", "High")
    ]

    return {
        "task_status_counts": status_counts,
        "task_priority_counts": priority_counts,
        "total_tasks": len(visible_tasks),
        "total_open_issues": sum(1 for i in visible_issues if i.status != "Resolved"),
        "projects": project_summaries,
        "top_priority_issues": [
            {
                **i.model_dump(),
                "task_title": (store.task_index.get(i.task_id).title if i.task_id and store.task_index.get(i.task_id) else None),
            }
            for i in sorted(open_critical, key=lambda x: ({"Critical": 0, "High": 1}.get(x.issue_priority, 9)))[:5]
        ],
    }


@router.get("/export")
def export_csv(user: dict = Depends(require_manager)):
    rows = []
    for t in store.tasks:
        assignee = store.user_index_by_id.get(t.assignee_id) if t.assignee_id else None
        reviewer = store.user_index_by_id.get(t.reviewer_id) if t.reviewer_id else None
        project = store.project_index.get(t.project_id)
        sla = store.compute_sla_status(t.project_id)
        rows.append({
            "task_id": t.task_id,
            "title": t.title,
            "type": t.type,
            "status": t.status,
            "task_priority": t.task_priority,
            "project_code": project.project_code if project else t.project_id,
            "project_name": project.project_name if project else "",
            "assignee": assignee.full_name if assignee else "",
            "reviewer": reviewer.full_name if reviewer else "",
            "due_date": t.due_date,
            "completed_at": t.completed_at or "",
            "issue_count": len(store.task_issue_map.get(t.task_id, [])),
            "sla_status": sla["status"],
            "sla_actual": sla["sla_actual"] or "",
            "sla_target": sla["sla_target"] or "",
        })

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tasks_export.csv"},
    )
