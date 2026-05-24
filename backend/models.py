from sqlmodel import SQLModel, Field
from pydantic import BaseModel
from typing import Optional


class User(SQLModel, table=True):
    user_id: str = Field(primary_key=True)
    full_name: str
    email: str = Field(index=True)
    password: str
    role: str  # Manager | Leader | Operator
    is_active: bool = True


class Project(SQLModel, table=True):
    project_id: str = Field(primary_key=True)
    project_code: str = Field(unique=True, index=True)
    project_name: str
    description: str
    start_date: str
    end_date: str
    leader_id: str = Field(index=True)
    status: str  # Active | Completed | On Hold
    sla_target: float = 7.0  # days to approve from created_at


class Task(SQLModel, table=True):
    task_id: str = Field(primary_key=True)
    title: str
    description: str
    url: Optional[str] = None
    task_note: Optional[str] = None
    status: str = Field(index=True)  # Not Started | In Progress | Completed | Approved | Rejected
    type: str    # Annotation | Review
    task_priority: str  # Low | Medium | High | Critical
    project_id: str = Field(index=True)
    assignee_id: Optional[str] = Field(default=None, index=True)
    reviewer_id: Optional[str] = Field(default=None, index=True)
    due_date: str
    completed_at: Optional[str] = None
    created_at: str
    updated_at: str


class Issue(SQLModel, table=True):
    issue_id: str = Field(primary_key=True)
    issue_code: str = Field(unique=True)
    issue_title: str
    description: str
    status: str = Field(index=True)  # Open | In Progress | Resolved
    issue_priority: str  # Low | Medium | High | Critical
    project_id: str = Field(index=True)
    task_id: str = Field(index=True)
    assignee_id: Optional[str] = Field(default=None, index=True)
    reviewer_id: Optional[str] = Field(default=None, index=True)
    due_date: Optional[str] = None
    resolved_at: Optional[str] = None
    issue_note: Optional[str] = None
    issue_url: Optional[str] = None
    created_at: str


class AuditLog(SQLModel, table=True):
    log_id: str = Field(primary_key=True)
    entity_type: str            # "task" | "issue"
    entity_id: str
    entity_title: str
    action: str                 # "created" | "updated" | "status_changed" | "approved" | "rejected" | "resolved" | "deleted"
    detail: Optional[str] = None
    actor_name: str
    project_name: str
    timestamp: str



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
    sla_target: float = 7.0  # days


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
    task_note: Optional[str] = None
    type: str
    task_priority: str
    project_id: str
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    task_note: Optional[str] = None
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
    task_id: str
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None
    issue_note: Optional[str] = None
    issue_url: Optional[str] = None


class IssueUpdate(BaseModel):
    issue_title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    issue_priority: Optional[str] = None
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None
    resolved_at: Optional[str] = None
    issue_note: Optional[str] = None
    issue_url: Optional[str] = None
