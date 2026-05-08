import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  X,
  ChevronRight,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Role,
  Task,
  Alert,
  KPI,
  SLAMetric,
  ProjectHealth,
  Project,
} from "../types/dashboard";
import {
  formatRelativeTime,
  classNames,
  getProjectColors,
} from "../utils/formatters";

interface DashboardViewProps {
  role: Role;
  project: Project | null | undefined;
  projects: Project[];
  tasks: Task[];
  alerts: Alert[];
  kpis: KPI[];
  sla: SLAMetric;
  projectHealth: ProjectHealth[];
}

export function DashboardView({
  role,
  projects,
  tasks,
  alerts,
  kpis,
  sla,
  projectHealth,
}: DashboardViewProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const criticalAlerts = alerts.filter(
    (a) => !a.acknowledged && (a.type === "breach" || a.type === "issue"),
  );
  const showBanner = criticalAlerts.length > 0 && !bannerDismissed;

  const totalTasks = tasks.length;
  const tasksByStatus = {
    "Not Started": tasks.filter((t) => t.status === "Not Started").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    Completed: tasks.filter((t) => t.status === "Completed").length,
    Approved: tasks.filter((t) => t.status === "Approved").length,
    Rejected: tasks.filter((t) => t.status === "Rejected").length,
  };

  const criticalTasks = tasks.filter(
    (t) => t.taskPriority === "Critical" || t.taskPriority === "High",
  ).length;
  const criticalPercentage =
    totalTasks > 0 ? Math.round((criticalTasks / totalTasks) * 100) : 0;

  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate).getTime() < Date.now();
  }).length;
  const overduePercentage =
    totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

  const statusChartData = [
    {
      name: "Not Started",
      value: tasksByStatus["Not Started"],
      color: "#94a3b8",
    },
    {
      name: "In Progress",
      value: tasksByStatus["In Progress"],
      color: "#3b82f6",
    },
    { name: "Completed", value: tasksByStatus["Completed"], color: "#8b5cf6" },
    { name: "Approved", value: tasksByStatus["Approved"], color: "#10b981" },
    { name: "Rejected", value: tasksByStatus["Rejected"], color: "#ef4444" },
  ];

  const colorToHex: Record<string, string> = {
    blue: "#3b82f6",
    violet: "#8b5cf6",
    emerald: "#10b981",
    slate: "#64748b",
  };

  const projectChartData = projects.map((p) => ({
    name: p.shortName,
    tasks: tasks.filter((t) => t.projectId === p.id).length,
    color: p.color,
  }));

  const recentActivity = tasks
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 10);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            {role === "manager" ? "Data Services Overview" : "Team Overview"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            •
            <span className="ml-1 font-medium text-amber-600">
              {criticalAlerts.length} items need your attention
            </span>
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="bg-red-50 border-l-4 border-red-500 rounded-r-md p-4 flex items-start justify-between shadow-sm"
          >
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Critical Action Required
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {criticalAlerts[0].message}
                </p>
                {criticalAlerts.length > 1 && (
                  <button className="text-xs font-medium text-red-800 mt-2 hover:underline flex items-center">
                    View all {criticalAlerts.length} critical alerts{" "}
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SLA Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900"># Days turn-around Overview</h3>
          <span className="text-xs font-medium text-slate-500">
            {sla.totalTasks} Total Tasks
          </span>
        </div>

        {kpis.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => (
              <div key={i} className="text-center">
                <p className="text-xl font-bold text-slate-900">
                  {kpi.current}
                  {kpi.unit}
                </p>
                <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100 mt-4">
          <div
            style={{
              width:
                sla.totalTasks > 0
                  ? `${(sla.approved / sla.totalTasks) * 100}%`
                  : "0%",
            }}
            className="bg-emerald-500 transition-all duration-500"
          />
          <div
            style={{
              width:
                sla.totalTasks > 0
                  ? `${(sla.inProgress / sla.totalTasks) * 100}%`
                  : "0%",
            }}
            className="bg-blue-400 transition-all duration-500"
          />
          <div
            style={{
              width:
                sla.totalTasks > 0
                  ? `${(sla.notStarted / sla.totalTasks) * 100}%`
                  : "0%",
            }}
            className="bg-slate-300 transition-all duration-500"
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            <span className="text-slate-600 font-medium">
              {sla.approved} Approved
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
            <span className="text-slate-600 font-medium">
              {sla.inProgress} In Progress
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-slate-300 mr-2" />
            <span className="text-slate-600 font-medium">
              {sla.notStarted} Not Started
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Total Tasks</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">
              {totalTasks}
            </span>
            <div className="flex items-center text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              {tasksByStatus["Approved"]} approved
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">
              Tasks by Status
            </h3>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-center">
              <span className="block text-lg font-bold text-slate-700">
                {tasksByStatus["Not Started"]}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                To Do
              </span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-blue-600">
                {tasksByStatus["In Progress"]}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                Doing
              </span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-violet-600">
                {tasksByStatus["Completed"]}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                Done
              </span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-emerald-600">
                {tasksByStatus["Approved"]}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                Appr.
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">
              High Priority
            </h3>
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">
              {criticalTasks}
            </span>
            <span className="text-sm font-medium text-amber-600">
              {criticalPercentage}% of total
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">
              Overdue Tasks
            </h3>
            <div className="p-2 bg-red-50 rounded-lg">
              <Clock className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">
              {overdueTasks}
            </span>
            <span className="text-sm font-medium text-red-600">
              {overduePercentage}% of total
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Tasks by Status
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Tasks per Project
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                  {projectChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colorToHex[entry.color] || "#64748b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-hidden flex flex-col">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Upcoming Deadlines
          </h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {tasks
              .filter(
                (t) => t.dueDate && new Date(t.dueDate).getTime() > Date.now(),
              )
              .sort(
                (a, b) =>
                  new Date(a.dueDate!).getTime() -
                  new Date(b.dueDate!).getTime(),
              )
              .slice(0, 5)
              .map((task) => (
                <div
                  key={`timeline-${task.id}`}
                  className="relative pl-4 border-l-2 border-slate-200"
                >
                  <div
                    className={classNames(
                      "absolute -left-[5px] top-1.5 w-2 h-2 rounded-full",
                      task.taskPriority === "Critical" ||
                        task.taskPriority === "High"
                        ? "bg-red-500"
                        : task.taskPriority === "Medium"
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                  />
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-slate-900 truncate pr-2">
                      {task.title}
                    </p>
                    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {new Date(task.dueDate!).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={classNames(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
                        (() => {
                          const c = getProjectColors(
                            projects.find((p) => p.id === task.projectId)
                              ?.color || "slate",
                          );
                          return `${c.bg100} ${c.text700}`;
                        })(),
                      )}
                    >
                      {projects.find((p) => p.id === task.projectId)
                        ?.shortName || task.projectId}
                    </span>
                    <span className="text-xs text-slate-400">
                      {task.assigneeName || "Unassigned"}
                    </span>
                  </div>
                </div>
              ))}
            {tasks.filter(
              (t) => t.dueDate && new Date(t.dueDate).getTime() > Date.now(),
            ).length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">
                No upcoming tasks.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity & Project Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Recent Activity
            </h2>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recentActivity.map((task) => (
                <div
                  key={`task-${task.id}`}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-start"
                >
                  <div className="mt-0.5 mr-3 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">
                        {task.assigneeName || "Someone"}
                      </span>{" "}
                      updated task{" "}
                      <span className="font-medium">{task.title}</span>
                    </p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-xs text-slate-500">
                        {formatRelativeTime(task.updatedAt)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span
                        className={classNames(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                          (() => {
                            const c = getProjectColors(
                              projects.find((p) => p.id === task.projectId)
                                ?.color || "slate",
                            );
                            return `${c.bg100} ${c.text700}`;
                          })(),
                        )}
                      >
                        {projects.find((p) => p.id === task.projectId)
                          ?.shortName || task.projectId}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Project Health
            </h2>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {projectHealth.map((project) => (
                <div
                  key={project.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div
                      className={classNames(
                        "w-2 h-2 rounded-full mr-3",
                        project.status === "healthy"
                          ? "bg-emerald-500"
                          : project.status === "at-risk"
                            ? "bg-amber-500"
                            : "bg-red-500",
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {project.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {project.activeTasks} active • {project.openIssues}{" "}
                        issues
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={classNames(
                        "text-sm font-semibold",
                        project.slaCompliance >= 90
                          ? "text-emerald-600"
                          : project.slaCompliance >= 75
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {project.slaCompliance ?? 0}%
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                      # Days turn-around
                    </p>
                  </div>
                </div>
              ))}
              {projectHealth.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No projects available.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
