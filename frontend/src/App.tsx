import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TaskQueueView } from './components/TaskQueueView';
import { IssueTrackingView } from './components/IssueTrackingView';
import { PerformanceView } from './components/PerformanceView';
import { ReportsView } from './components/ReportsView';
import { ProjectsView } from './components/ProjectsView';
import { LoginView } from './components/LoginView';
import { ToastContainer } from './components/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useAppData } from './hooks/useAppData';
import { Role } from './types/dashboard';

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const {
    project,
    projects,
    tasks,
    issues,
    operators,
    users,
    alerts,
    kpis,
    sla,
    projectHealth,
    loading,
    refresh,
  } = useAppData(user?.userId);

  const activeRole: Role =
    user?.role === 'Manager' ? 'manager' : user?.role === 'Leader' ? 'leader' : 'operator';

  if (!user) {
    return <LoginView />;
  }

  const alertCounts = {
    errors: alerts.filter((a) => !a.acknowledged && a.type === 'issue').length,
    tasksAtRisk: tasks.filter((t) => {
      if (!t.dueDate) return false;
      const diff = new Date(t.dueDate).getTime() - Date.now();
      return diff > 0 && diff < 2 * 24 * 3_600_000;
    }).length,
  };

  if (loading && !project && projects.length === 0) {
    return (
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Loading workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar
        activeRole={activeRole}
        onRoleChange={() => {}}
        alertCounts={alertCounts}
      />
      <main className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="min-h-full"
          >
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={
                <DashboardView role={activeRole} project={project} projects={projects} tasks={tasks} alerts={alerts} kpis={kpis} sla={sla} projectHealth={projectHealth} />
              } />
              <Route path="/projects" element={<ProjectsView projects={projects} users={users} refresh={refresh} />} />
              <Route path="/projects/:project_id/tasks" element={<TaskQueueView tasks={tasks} projects={projects} users={users} refresh={refresh} />} />
              <Route path="/projects/:project_id/tasks/:task_id" element={<TaskQueueView tasks={tasks} projects={projects} users={users} refresh={refresh} />} />
              <Route path="/projects/:project_id/tasks/:task_id/issues" element={<IssueTrackingView issues={issues} projects={projects} tasks={tasks} users={users} refresh={refresh} />} />
              <Route path="/projects/:project_id/tasks/:task_id/issues/:issue_id" element={<IssueTrackingView issues={issues} projects={projects} tasks={tasks} users={users} refresh={refresh} />} />
              <Route path="/tasks" element={<TaskQueueView tasks={tasks} projects={projects} users={users} refresh={refresh} />} />
              <Route path="/tasks/:task_id" element={<TaskQueueView tasks={tasks} projects={projects} users={users} refresh={refresh} />} />
              <Route path="/issues" element={<IssueTrackingView issues={issues} projects={projects} tasks={tasks} users={users} refresh={refresh} />} />
              <Route path="/issues/:issue_id" element={<IssueTrackingView issues={issues} projects={projects} tasks={tasks} users={users} refresh={refresh} />} />
              <Route path="/monitor" element={<PerformanceView operators={operators} kpis={kpis} projects={projects} />} />
              <Route path="/report" element={<ReportsView kpis={kpis} sla={sla} project={project} />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <ToastContainer />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
