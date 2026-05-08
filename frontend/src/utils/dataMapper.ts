import {
  Project,
  Task,
  Issue,
  DataOperator,
  SLAMetric,
  KPI,
  Alert,
  ProjectHealth,
  AppUser,
  TrendDirection,
} from '../types/dashboard';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const PROJECT_COLORS: Record<string, string> = {
  'ESG-2026': 'blue',
  'Banking-EMEA': 'violet',
  'DV-2025': 'emerald',
};

// ── User mapping ───────────────────────────────────────────────────────────────

export function mapAppUser(u: Record<string, unknown>): AppUser {
  return {
    id: String(u.user_id),
    fullName: String(u.full_name),
    email: String(u.email),
    role: String(u.role),
    isActive: Boolean(u.is_active),
  };
}

// ── Project mapping ────────────────────────────────────────────────────────────

export function mapProject(p: Record<string, unknown>): Project {
  const code = String(p.project_code ?? '');
  const raw_sla = p.sla_status as Record<string, unknown> | null | undefined;
  return {
    id: String(p.project_id),
    projectCode: code,
    name: String(p.project_name),
    shortName: code,
    color: PROJECT_COLORS[code] ?? 'slate',
    leaderId: String(p.leader_id ?? ''),
    leaderName: p.leader_name ? String(p.leader_name) : null,
    taskCount: Number(p.task_count ?? 0),
    issueCount: Number(p.issue_count ?? 0),
    slaStatus: {
      status: raw_sla ? String(raw_sla.status ?? 'No Data') : 'No Data',
      slaActual: raw_sla?.sla_actual != null ? Number(raw_sla.sla_actual) : null,
      slaTarget: raw_sla ? Number(raw_sla.sla_target ?? 85) : 85,
    },
  };
}

// ── Task mapping ───────────────────────────────────────────────────────────────

export function mapTask(t: Record<string, unknown>): Task {
  return {
    id: String(t.task_id),
    title: String(t.title),
    description: String(t.description ?? ''),
    url: t.url ? String(t.url) : null,
    taskNote: t.task_note ? String(t.task_note) : null,
    status: String(t.status ?? 'Not Started') as Task['status'],
    type: String(t.type ?? 'Annotation'),
    taskPriority: String(t.task_priority ?? 'Medium') as Task['taskPriority'],
    projectId: String(t.project_id),
    assigneeId: t.assignee_id ? String(t.assignee_id) : null,
    reviewerId: t.reviewer_id ? String(t.reviewer_id) : null,
    dueDate: String(t.due_date ?? ''),
    completedAt: t.completed_at ? String(t.completed_at) : null,
    createdAt: String(t.created_at ?? new Date().toISOString()),
    updatedAt: String(t.updated_at ?? new Date().toISOString()),
    assigneeName: t.assignee_name ? String(t.assignee_name) : null,
    reviewerName: t.reviewer_name ? String(t.reviewer_name) : null,
    issueCount: Number(t.issue_count ?? 0),
  };
}

// ── Issue mapping ──────────────────────────────────────────────────────────────

export function mapIssue(i: Record<string, unknown>): Issue {
  return {
    id: String(i.issue_id),
    issueCode: String(i.issue_code),
    issueTitle: String(i.issue_title),
    description: String(i.description ?? ''),
    status: String(i.status ?? 'Open') as Issue['status'],
    issuePriority: String(i.issue_priority ?? 'Medium') as Issue['issuePriority'],
    projectId: String(i.project_id),
    taskId: i.task_id ? String(i.task_id) : null,
    assigneeId: i.assignee_id ? String(i.assignee_id) : null,
    reviewerId: i.reviewer_id ? String(i.reviewer_id) : null,
    dueDate: i.due_date ? String(i.due_date) : null,
    resolvedAt: i.resolved_at ? String(i.resolved_at) : null,
    issueNote: i.issue_note ? String(i.issue_note) : null,
    issueUrl: i.issue_url ? String(i.issue_url) : null,
    createdAt: String(i.created_at ?? new Date().toISOString()),
    assigneeName: i.assignee_name ? String(i.assignee_name) : null,
    reviewerName: i.reviewer_name ? String(i.reviewer_name) : null,
    taskTitle: i.task_title ? String(i.task_title) : null,
    projectName: i.project_name ? String(i.project_name) : null,
  };
}

// ── Operator mapping (computed from user + tasks + issues) ─────────────────────

export function mapOperator(
  rawUser: Record<string, unknown>,
  allTasks: Task[],
  allIssues: Issue[],
): DataOperator {
  const userId = String(rawUser.user_id);
  const name = String(rawUser.full_name);

  const assignedTasks = allTasks.filter(
    (t) => t.assigneeId === userId || t.reviewerId === userId,
  );
  const completedTasks = assignedTasks.filter(
    (t) => t.status === 'Approved' || t.status === 'Completed',
  );
  const inProgressTasks = assignedTasks.filter((t) => t.status === 'In Progress');
  const openIssues = allIssues.filter(
    (i) => i.assigneeId === userId && i.status !== 'Resolved',
  );

  const tasksAssigned = assignedTasks.length;
  const currentLoad =
    tasksAssigned > 0 ? Math.round((inProgressTasks.length / tasksAssigned) * 100) : 0;
  const issueRate =
    tasksAssigned > 0 ? Math.round((openIssues.length / tasksAssigned) * 100) : 0;

  return {
    id: userId,
    name,
    avatar: getInitials(name),
    role: String(rawUser.role),
    tasksAssigned,
    tasksCompleted: completedTasks.length,
    issueCount: openIssues.length,
    issueRate,
    currentLoad,
  };
}

// ── Derived metrics ────────────────────────────────────────────────────────────

export function computeSLAMetric(tasks: Task[]): SLAMetric {
  const total = tasks.length;
  const approved = tasks.filter((t) => t.status === 'Approved').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const notStarted = tasks.filter((t) => t.status === 'Not Started').length;
  const compliance = total > 0 ? Math.round((approved / total) * 100) : 0;
  return { compliance, totalTasks: total, approved, inProgress, notStarted };
}

export function computeKPIs(
  tasks: Task[],
  issues: Issue[],
  operators: DataOperator[],
): KPI[] {
  const total = tasks.length;
  const approved = tasks.filter((t) => t.status === 'Approved').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const openCritical = issues.filter(
    (i) => i.issuePriority === 'Critical' && i.status !== 'Resolved',
  ).length;
  const avgLoad =
    operators.length > 0
      ? Math.round(operators.reduce((s, o) => s + o.currentLoad, 0) / operators.length)
      : 0;

  const trend = (val: number, threshold: number): TrendDirection =>
    val > threshold ? 'up' : val < threshold ? 'down' : 'flat';

  return [
    {
      label: 'Tasks Approved',
      target: total,
      current: approved,
      unit: '',
      trend: trend(approved, total * 0.5),
    },
    {
      label: 'In Progress',
      target: total,
      current: inProgress,
      unit: '',
      trend: 'flat',
    },
    {
      label: 'Critical Issues',
      target: 0,
      current: openCritical,
      unit: '',
      trend: openCritical > 2 ? 'up' : 'down',
    },
    {
      label: 'Team Load',
      target: '70%',
      current: `${avgLoad}%`,
      unit: '',
      trend: avgLoad > 75 ? 'up' : 'flat',
    },
  ];
}

export function generateAlerts(tasks: Task[], issues: Issue[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  issues
    .filter((i) => i.issuePriority === 'Critical' && i.status !== 'Resolved')
    .slice(0, 3)
    .forEach((i, idx) => {
      alerts.push({
        id: `alert-issue-${idx}`,
        type: 'issue',
        message: i.issueTitle,
        timestamp: i.createdAt,
        acknowledged: false,
      });
    });

  tasks
    .filter((t) => {
      if (!t.dueDate || t.status === 'Approved' || t.status === 'Rejected') return false;
      const diff = new Date(t.dueDate).getTime() - Date.now();
      return diff > 0 && diff < 2 * 24 * 3_600_000;
    })
    .slice(0, 2)
    .forEach((t, idx) => {
      alerts.push({
        id: `alert-sla-${idx}`,
        type: 'risk',
        message: `Due soon: ${t.title}`,
        timestamp: now,
        taskId: t.id,
        acknowledged: false,
      });
    });

  return alerts;
}

export function computeProjectHealth(
  projects: Project[],
  tasks: Task[],
  issues: Issue[],
): ProjectHealth[] {
  return projects.map((p) => {
    const openIssues = issues.filter(
      (i) => i.projectId === p.id && i.status !== 'Resolved',
    );
    const activeTasks = tasks.filter(
      (t) => t.projectId === p.id && t.status !== 'Approved' && t.status !== 'Rejected',
    ).length;

    const sla = p.slaStatus.slaActual ?? 0;
    const status: ProjectHealth['status'] =
      openIssues.filter((i) => i.issuePriority === 'Critical').length > 0 || sla < 75
        ? 'critical'
        : openIssues.length > 2 || sla < p.slaStatus.slaTarget
          ? 'at-risk'
          : 'healthy';

    return {
      id: p.id,
      name: p.name,
      slaCompliance: sla,
      activeTasks,
      openIssues: openIssues.length,
      status,
    };
  });
}
