from pydantic import BaseModel
from typing import Optional


class User(BaseModel):
    user_id: str
    full_name: str
    email: str
    password: str
    role: str  # Manager | Leader | Operator
    is_active: bool = True


class Project(BaseModel):
    project_id: str
    project_code: str
    project_name: str
    description: str
    start_date: str
    end_date: str
    leader_id: str
    status: str  # Active | Completed | On Hold
    sla_target: float = 85.0


class Task(BaseModel):
    task_id: str
    title: str
    description: str
    url: Optional[str] = None
    status: str  # Not Started | In Progress | Completed | Approved | Rejected
    type: str    # Annotation | Review
    task_priority: str  # Low | Medium | High | Critical
    project_id: str
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: str
    completed_at: Optional[str] = None
    created_at: str
    updated_at: str


class Issue(BaseModel):
    issue_id: str
    issue_code: str
    issue_title: str
    description: str
    status: str  # Open | In Progress | Resolved
    issue_priority: str  # Low | Medium | High | Critical
    project_id: str
    task_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str


class Attachment(BaseModel):
    attachment_id: str
    issue_id: str
    file_url: str
    uploaded_by: str  # user_id
    created_at: str


# --- Request bodies ---

class LoginRequest(BaseModel):
    email: str
    password: str


class ProjectCreate(BaseModel):
    project_code: str
    project_name: str
    description: str
    start_date: str
    end_date: str
    leader_id: str
    status: str = "Active"
    sla_target: float = 85.0


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    leader_id: Optional[str] = None
    status: Optional[str] = None
    sla_target: Optional[float] = None


class TaskCreate(BaseModel):
    title: str
    description: str
    url: Optional[str] = None
    type: str
    task_priority: str
    project_id: str
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: str


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    type: Optional[str] = None
    task_priority: Optional[str] = None
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: str


class TaskReviewUpdate(BaseModel):
    action: str  # approve | reject
    feedback: Optional[str] = None


class IssueCreate(BaseModel):
    issue_title: str
    description: str
    issue_priority: str
    project_id: str
    task_id: Optional[str] = None
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None


class IssueUpdate(BaseModel):
    issue_title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    issue_priority: Optional[str] = None
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None
    resolved_at: Optional[str] = None
