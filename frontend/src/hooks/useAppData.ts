import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import {
  mapProject,
  mapTask,
  mapIssue,
  mapOperator,
  mapAppUser,
  mapActivityEntry,
  generateAlerts,
} from '../utils/dataMapper';
import {
  Project,
  Task,
  Issue,
  DataOperator,
  Alert,
  AppUser,
  ActivityEntry,
} from '../types/dashboard';

export interface AppData {
  project: Project | null;
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  operators: DataOperator[];
  users: AppUser[];
  alerts: Alert[];
  activities: ActivityEntry[];
  loading: boolean;
  fetchError: string | null;
  refresh: () => void;
}

export function useAppData(userId?: string): AppData {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [operators, setOperators] = useState<DataOperator[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      if (!localStorage.getItem('token')) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setFetchError(null);
      try {
        const [projectsRes, tasksRes, issuesRes, usersRes, activityRes] = await Promise.all([
          api.get('/projects'),
          api.get('/tasks'),
          api.get('/issues'),
          api.get('/users?include_inactive=true'),
          api.get('/activity'),
        ]);

        if (cancelled) return;

        const rawProjects: Record<string, unknown>[] = projectsRes.data;
        const rawTasks: Record<string, unknown>[] = tasksRes.data;
        const rawIssues: Record<string, unknown>[] = issuesRes.data;
        const rawUsers: Record<string, unknown>[] = usersRes.data;
        const rawActivity: Record<string, unknown>[] = activityRes.data;

        const mappedProjects = rawProjects.map(mapProject);
        const mappedTasks = rawTasks.map(mapTask);
        const mappedIssues = rawIssues.map(mapIssue);
        const mappedUsers = rawUsers.map(mapAppUser);
        const mappedOperators = rawUsers
          .filter((u) => u.role === 'Operator')
          .map((u) => mapOperator(u, mappedTasks, mappedIssues));

        const mappedAlerts = generateAlerts(mappedTasks, mappedIssues);

        setProjects(mappedProjects);
        setTasks(mappedTasks);
        setIssues(mappedIssues);
        setOperators(mappedOperators);
        setUsers(mappedUsers);
        setAlerts(mappedAlerts);
        setActivities(rawActivity.map(mapActivityEntry));
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load data';
          setFetchError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [tick, userId]);

  return {
    project: projects[0] ?? null,
    projects,
    tasks,
    issues,
    operators,
    users,
    alerts,
    activities,
    loading,
    fetchError,
    refresh,
  };
}
