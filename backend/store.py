"""
In-memory data store with core data structures:
  1. Hash Map index        — O(1) lookup by ID
  2. Min-Heap priority queue — O(log n) insert, O(1) peek
  3. Sorted list           — O(n log n) sort
  4. Dict of Lists (grouping) — O(1) group access
"""

import heapq
from collections import defaultdict
from models import Task, Issue, Project, User, Attachment

# ── Raw collections ─────────────────────────────────────────────────────────────
users: list[User] = []
projects: list[Project] = []
tasks: list[Task] = []
issues: list[Issue] = []
attachments: list[Attachment] = []

# ── 1. Hash Map indexes ─────────────────────────────────────────────────────────
user_index_by_id:    dict[str, User]    = {}  # user_id  → User
user_index_by_email: dict[str, User]    = {}  # email    → User
project_index:       dict[str, Project] = {}  # project_id → Project
task_index:          dict[str, Task]    = {}  # task_id  → Task
issue_index:         dict[str, Issue]   = {}  # issue_id → Issue

# ── 2. Min-Heap priority queues ─────────────────────────────────────────────────
task_priority_queue:  list[tuple] = []
issue_priority_queue: list[tuple] = []

_PRIORITY_SCORE = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}


def _task_priority_key(t: Task) -> tuple:
    return (_PRIORITY_SCORE.get(t.task_priority, 9), t.due_date, t.task_id)


def _issue_priority_key(i: Issue) -> tuple:
    return (_PRIORITY_SCORE.get(i.issue_priority, 9), i.issue_id)


# ── 3. Sorted lists ─────────────────────────────────────────────────────────────

def sorted_tasks_by_priority() -> list[Task]:
    return sorted(tasks, key=lambda t: (_PRIORITY_SCORE.get(t.task_priority, 9), t.due_date))


def sorted_issues_by_priority() -> list[Issue]:
    return sorted(issues, key=lambda i: _PRIORITY_SCORE.get(i.issue_priority, 9))


# ── 4. Dict of Lists (grouping) ─────────────────────────────────────────────────
project_task_map:  dict[str, list[Task]]  = defaultdict(list)
project_issue_map: dict[str, list[Issue]] = defaultdict(list)
task_issue_map:    dict[str, list[Issue]] = defaultdict(list)
status_groups:     dict[str, list[Task]]  = defaultdict(list)


# ── Rebuild helpers ──────────────────────────────────────────────────────────────

def rebuild_user_indexes():
    user_index_by_id.clear()
    user_index_by_email.clear()
    for u in users:
        user_index_by_id[u.user_id] = u
        user_index_by_email[u.email] = u


def rebuild_project_index():
    project_index.clear()
    for p in projects:
        project_index[p.project_id] = p


def rebuild_task_structures():
    task_index.clear()
    task_priority_queue.clear()
    project_task_map.clear()
    status_groups.clear()

    heap = []
    for t in tasks:
        task_index[t.task_id] = t
        heapq.heappush(heap, _task_priority_key(t))
        project_task_map[t.project_id].append(t)
        status_groups[t.status].append(t)

    task_priority_queue.extend(heap)
    heapq.heapify(task_priority_queue)


def rebuild_issue_structures():
    issue_index.clear()
    issue_priority_queue.clear()
    project_issue_map.clear()
    task_issue_map.clear()

    heap = []
    for i in issues:
        issue_index[i.issue_id] = i
        heapq.heappush(heap, _issue_priority_key(i))
        project_issue_map[i.project_id].append(i)
        if i.task_id:
            task_issue_map[i.task_id].append(i)

    issue_priority_queue.extend(heap)
    heapq.heapify(issue_priority_queue)


def rebuild_all():
    rebuild_user_indexes()
    rebuild_project_index()
    rebuild_task_structures()
    rebuild_issue_structures()


# ── SLA helper ───────────────────────────────────────────────────────────────────

def compute_sla_status(project_id: str) -> dict:
    p = project_index.get(project_id)
    if not p:
        return {"status": "Unknown", "sla_actual": None, "sla_target": None}

    project_tasks = project_task_map.get(project_id, [])
    total = len(project_tasks)
    if total == 0:
        return {"status": "No Data", "sla_actual": None, "sla_target": p.sla_target}

    approved = sum(1 for t in project_tasks if t.status == "Approved")
    actual = round(approved / total * 100, 1)
    target = p.sla_target

    if actual >= target:
        status = "Met"
    elif actual >= target - 10:
        status = "At Risk"
    else:
        status = "Breached"

    return {"status": status, "sla_actual": actual, "sla_target": target}


def get_top_priority_tasks(n: int = 5) -> list[Task]:
    return sorted_tasks_by_priority()[:n]


def get_top_priority_issues(n: int = 5) -> list[Issue]:
    open_issues = [i for i in issues if i.issue_priority in ("Critical", "High") and i.status != "Resolved"]
    return sorted(open_issues, key=lambda i: _PRIORITY_SCORE.get(i.issue_priority, 9))[:n]
