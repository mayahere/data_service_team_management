export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Approved' | 'Rejected';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type IssueStatus = 'Open' | 'In Progress' | 'Resolved';
export type IssuePriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type AlertType = 'breach' | 'risk' | 'issue' | 'info';
export type Role = 'manager' | 'leader' | 'operator';

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  shortName: string;
  color: string;
  status: string;
  startDate: string;
  endDate: string;
  leaderId: string;
  leaderName: string | null;
  taskCount: number;
  issueCount: number;
  slaStatus: {
    status: string;
    slaActual: number | null;  // breach % of approved tasks that exceeded sla_target days
    slaTarget: number;         // turn-around target in days
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  url: string | null;
  taskNote: string | null;
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
  issueNote: string | null;
  issueUrl: string | null;
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

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  taskId?: string;
  issueId?: string;
  acknowledged: boolean;
}
export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface ActivityEntry {
  logId: string;
  entityType: 'task' | 'issue';
  entityId: string;
  entityTitle: string;
  action: string;
  detail: string | null;
  actorName: string;
  projectName: string;
  timestamp: string;
}
