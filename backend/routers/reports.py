import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from sqlalchemy import func
from database import get_session
from models import Project, Task, Issue, User
from auth import get_current_user, require_manager
from routers.projects import compute_sla_status

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
def dashboard_summary(user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    role = user["role"]

    if role == "Manager":
        visible_projects = session.exec(select(Project)).all()
        visible_tasks = session.exec(select(Task)).all()
        visible_issues = session.exec(select(Issue)).all()
    elif role == "Leader":
        leader_projects = session.exec(select(Project.project_id).where(Project.leader_id == user["sub"])).all()
        visible_projects = session.exec(select(Project).where(Project.project_id.in_(leader_projects))).all()
        visible_tasks = session.exec(select(Task).where(Task.project_id.in_(leader_projects))).all()
        visible_issues = session.exec(select(Issue).where(Issue.project_id.in_(leader_projects))).all()
    else:
        visible_tasks = session.exec(select(Task).where((Task.assignee_id == user["sub"]) | (Task.reviewer_id == user["sub"]))).all()
        task_project_ids = {t.project_id for t in visible_tasks}
        if task_project_ids:
            visible_projects = session.exec(select(Project).where(Project.project_id.in_(task_project_ids))).all()
        else:
            visible_projects = []
        visible_issues = session.exec(select(Issue).where((Issue.assignee_id == user["sub"]) | (Issue.reviewer_id == user["sub"]))).all()

    status_counts = {}
    for t in visible_tasks:
        status_counts[t.status] = status_counts.get(t.status, 0) + 1

    priority_counts = {}
    for t in visible_tasks:
        priority_counts[t.task_priority] = priority_counts.get(t.task_priority, 0) + 1

    project_summaries = []
    for p in visible_projects:
        sla = compute_sla_status(session, p)
        project_tasks = [t for t in visible_tasks if t.project_id == p.project_id]
        project_issues = [i for i in visible_issues if i.project_id == p.project_id]
        open_issues = [i for i in project_issues if i.status != "Resolved"]
        leader = session.get(User, p.leader_id)
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
                "task_title": (session.get(Task, i.task_id).title if i.task_id else None),
            }
            for i in sorted(open_critical, key=lambda x: ({"Critical": 0, "High": 1}.get(x.issue_priority, 9)))[:5]
        ],
    }


@router.get("/export")
def export_csv(user: dict = Depends(require_manager), session: Session = Depends(get_session)):
    rows = []
    tasks = session.exec(select(Task)).all()
    for t in tasks:
        assignee = session.get(User, t.assignee_id) if t.assignee_id else None
        reviewer = session.get(User, t.reviewer_id) if t.reviewer_id else None
        project = session.get(Project, t.project_id)
        sla = compute_sla_status(session, project) if project else {"status": "Unknown", "sla_actual": None, "sla_target": None}
        issue_count = session.exec(select(func.count(Issue.issue_id)).where(Issue.task_id == t.task_id)).one()
        
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
            "issue_count": issue_count,
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
