export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Approved' | 'Rejected';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type IssueStatus = 'Open' | 'In Progress' | 'Resolved';
export type IssuePriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type AlertType = 'breach' | 'risk' | 'issue' | 'info';
export type TrendDirection = 'up' | 'down' | 'flat';
export type Role = 'manager' | 'leader' | 'operator';

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  shortName: string;
  color: string;
  leaderId: string;
  leaderName: string | null;
  taskCount: number;
  issueCount: number;
  slaStatus: {
    status: string;
    slaActual: number | null;
    slaTarget: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  url: string | null;
  status: TaskStatus;
  type: string;
  taskPriority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  reviewerId: string | null;
  dueDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
  reviewerName: string | null;
  issueCount: number;
}

export interface Issue {
  id: string;
  issueCode: string;
  issueTitle: string;
  description: string;
  status: IssueStatus;
  issuePriority: IssuePriority;
  projectId: string;
  taskId: string | null;
  assigneeId: string | null;
  reviewerId: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
  assigneeName: string | null;
  reviewerName: string | null;
  taskTitle: string | null;
  projectName: string | null;
}

export interface DataOperator {
  id: string;
  name: string;
  avatar: string;
  role: string;
  tasksAssigned: number;
  tasksCompleted: number;
  issueCount: number;
  issueRate: number;
  currentLoad: number;
}

export interface SLAMetric {
  compliance: number;
  totalTasks: number;
  approved: number;
  inProgress: number;
  notStarted: number;
}

export interface KPI {
  label: string;
  target: string | number;
  current: string | number;
  unit: string;
  trend: TrendDirection;
  trendValue?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  taskId?: string;
  acknowledged: boolean;
}

export interface ProjectHealth {
  id: string;
  name: string;
  slaCompliance: number;
  activeTasks: number;
  openIssues: number;
  status: 'healthy' | 'at-risk' | 'critical';
}

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}
