import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Clock,
  ArrowUpDown,
  Activity,
  PieChart as PieChartIcon,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Issue, Project, Task, AppUser } from "../types/dashboard";
import { classNames, getProjectColors } from "../utils/formatters";
import { IssueModal } from "./modals/IssueModal";
import { ConfirmDialog } from "./modals/ConfirmDialog";
import { IssueSidePanel } from "./IssueSidePanel";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";

interface IssueTrackingViewProps {
  issues: Issue[];
  projects: Project[];
  tasks: Task[];
  users: AppUser[];
  refresh: () => void;
}

export function IssueTrackingView({ issues, projects, tasks, users, refresh }: IssueTrackingViewProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isManager = user?.role === "Manager";
  const isLeader = user?.role === "Leader";
  const canDeleteIssue = isManager || isLeader;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Issue | "project";
    direction: "asc" | "desc";
  } | null>(null);

  const { project_id, task_id, issue_id } = useParams();
  const navigate = useNavigate();

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Issue | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredIssues = useMemo(() => {
    const filtered = issues.filter((issue) => {
      const projectName =
        projects.find((p) => p.id === issue.projectId)?.name || issue.projectId;
      const matchesSearch =
        issue.issueTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.taskTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        issue.issueCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.assigneeName &&
          issue.assigneeName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || issue.status === statusFilter;
      const matchesProject =
        projectFilter === "all" || issue.projectId === projectFilter;
      const matchesPriority =
        priorityFilter === "all" || issue.issuePriority === priorityFilter;
      const matchesRouteProject = project_id ? issue.projectId === project_id : true;
      const matchesRouteTask = task_id ? issue.taskId === task_id : true;
      return matchesSearch && matchesStatus && matchesProject && matchesPriority && matchesRouteProject && matchesRouteTask;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        if (sortConfig.key === "project") {
          const aName = projects.find((p) => p.id === a.projectId)?.name || "";
          const bName = projects.find((p) => p.id === b.projectId)?.name || "";
          return sortConfig.direction === "asc"
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue === bValue) return 0;
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
    }
    return filtered;
  }, [issues, projects, searchTerm, statusFilter, projectFilter, priorityFilter, sortConfig, project_id, task_id]);

  const selectedSideIssue = useMemo(() => {
    if (!issue_id) return null;
    // Search in the *entire* issues list, not just filtered ones, in case they navigated directly
    return issues.find((i) => i.id === issue_id || i.issueCode === issue_id) || null;
  }, [issue_id, issues]);

  const handleSort = (key: keyof Issue | "project") => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/issues/${deleteTarget.id}`);
      addToast(`Issue "${deleteTarget.issueTitle}" deleted`, "success");
      refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to delete issue";
      addToast(msg, "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function canEditIssue(issue: Issue): boolean {
    if (isManager || isLeader) return true;
    return issue.assigneeId === user?.userId || issue.reviewerId === user?.userId;
  }

  // Summary metrics
  const totalIssues = filteredIssues.length;
  const issuesByPriority = {
    Critical: filteredIssues.filter((i) => i.issuePriority === "Critical").length,
    High: filteredIssues.filter((i) => i.issuePriority === "High").length,
    Medium: filteredIssues.filter((i) => i.issuePriority === "Medium").length,
    Low: filteredIssues.filter((i) => i.issuePriority === "Low").length,
  };
  const resolvedIssues = filteredIssues.filter((i) => i.status === "Resolved").length;
  const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
  const overdueIssues = filteredIssues.filter((i) => {
    if (!i.dueDate || i.status === "Resolved") return false;
    return new Date(i.dueDate).getTime() < Date.now();
  }).length;

  // Chart data
  const priorityChartData = [
    { name: "Critical", value: issuesByPriority.Critical, color: "#dc2626" },
    { name: "High", value: issuesByPriority.High, color: "#ef4444" },
    { name: "Medium", value: issuesByPriority.Medium, color: "#f59e0b" },
    { name: "Low", value: issuesByPriority.Low, color: "#10b981" },
  ];

  const colorToHex: Record<string, string> = {
    blue: "#3b82f6",
    violet: "#8b5cf6",
    emerald: "#10b981",
    slate: "#64748b",
  };

  const projectChartData = projects
    .map((p) => ({
      name: p.shortName,
      issues: filteredIssues.filter((i) => i.projectId === p.id).length,
      colorHex: colorToHex[p.color] || "#64748b",
    }))
    .filter((p) => p.issues > 0);

  const trendData = useMemo(() => {
    const dates = filteredIssues.map((i) =>
      new Date(i.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    );
    const uniqueDates = Array.from(new Set(dates)).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    return uniqueDates.map((date) => {
      const onDate = filteredIssues.filter(
        (i) =>
          new Date(i.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }) === date
      );
      return {
        date,
        total: onDate.length,
        critical: onDate.filter((i) => i.issuePriority === "Critical").length,
        high: onDate.filter((i) => i.issuePriority === "High").length,
      };
    });
  }, [filteredIssues]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved": return "bg-emerald-100 text-emerald-700";
      case "In Progress": return "bg-blue-100 text-blue-700";
      case "Open": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-100 text-red-700 border-red-200";
      case "High": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Medium": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Low": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Issue Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor and resolve data quality issues
          </p>
        </div>
        <button
          onClick={() => { setEditingIssue(null); setIssueModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Issue
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Total Issues</h3>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Activity className="w-4 h-4 text-slate-600" />
            </div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{totalIssues}</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Issues by Priority</h3>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-center">
              <span className="block text-lg font-bold text-red-700">{issuesByPriority.Critical}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Crit</span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-red-500">{issuesByPriority.High}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">High</span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-amber-600">{issuesByPriority.Medium}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Med</span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-emerald-600">{issuesByPriority.Low}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Low</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Resolution Rate</h3>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-600">{resolutionRate}%</span>
            <span className="text-sm font-medium text-slate-500">{resolvedIssues} resolved</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Overdue Issues</h3>
            <div className="p-2 bg-red-50 rounded-lg">
              <Clock className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <span className="text-3xl font-bold text-red-600">{overdueIssues}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Issues by Project</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="issues" radius={[4, 4, 0, 0]}>
                  {projectChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.colorHex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Priority Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Issues Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="text-sm text-slate-500 font-medium">
          Showing {filteredIssues.length} issues
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("issueCode")}>
                  <div className="flex items-center">Code <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("issueTitle")}>
                  <div className="flex items-center">Title <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("project")}>
                  <div className="flex items-center">Task <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("status")}>
                  <div className="flex items-center">Status <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("assigneeName")}>
                  <div className="flex items-center">Assignee <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("issuePriority")}>
                  <div className="flex items-center">Priority <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("dueDate")}>
                  <div className="flex items-center">Due Date <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredIssues.map((issue) => {
                const isOverdue =
                  issue.dueDate &&
                  issue.status !== "Resolved" &&
                  new Date(issue.dueDate).getTime() < Date.now();
                const isCritical = issue.issuePriority === "Critical";
                return (
                  <tr
                    key={issue.id}
                    onClick={() => {
                      if (project_id && task_id) {
                        navigate(`/projects/${project_id}/tasks/${task_id}/issues/${issue.id}`);
                      } else if (project_id) {
                        navigate(`/projects/${project_id}/issues/${issue.id}`);
                      } else {
                        navigate(`/issues/${issue.id}`);
                      }
                    }}
                    className={classNames(
                      "hover:bg-slate-50 transition-colors group cursor-pointer",
                      isCritical && issue.status !== "Resolved" ? "bg-red-50/30" : "",
                      selectedSideIssue?.id === issue.id ? "bg-blue-50/50" : ""
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-500">{issue.issueCode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={classNames(
                          "text-sm font-medium truncate max-w-[200px] block",
                          isCritical && issue.status !== "Resolved" ? "text-red-700" : "text-slate-900"
                        )}
                        title={issue.issueTitle}
                      >
                        {issue.issueTitle}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={classNames(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                          (() => {
                            const c = getProjectColors("slate");
                            return `${c.bg100} ${c.text700}`;
                          })()
                        )}
                      >
                        {issue.taskId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={classNames("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(issue.status))}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {issue.assigneeName ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 mr-2">
                            {issue.assigneeName.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm text-slate-700">{issue.assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={classNames("inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border", getPriorityColor(issue.issuePriority))}>
                        {issue.issuePriority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {issue.dueDate ? (
                        <div className="flex items-center">
                          <span className={classNames("text-sm", isOverdue ? "text-red-600 font-medium" : "text-slate-600")}>
                            {new Date(issue.dueDate).toLocaleDateString("en-GB")}
                          </span>
                          {isOverdue && <AlertTriangle className="w-3 h-3 text-red-500 ml-1.5" />}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {canEditIssue(issue) && (
                          <button
                            onClick={() => { setEditingIssue(issue); setIssueModalOpen(true); }}
                            title="Edit issue"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteIssue && (
                          <button
                            onClick={() => setDeleteTarget(issue)}
                            title="Delete issue"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredIssues.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No issues found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IssueModal
        open={issueModalOpen}
        issue={editingIssue}
        projects={projects}
        tasks={tasks}
        users={users}
        onClose={() => setIssueModalOpen(false)}
        onSaved={() => {
          addToast(editingIssue ? "Issue updated" : "Issue reported", "success");
          refresh();
        }}
        onError={(msg) => addToast(msg, "error")}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Issue"
        message={`Delete "${deleteTarget?.issueTitle}"? This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <IssueSidePanel
        open={!!selectedSideIssue}
        issue={selectedSideIssue}
        onClose={() => {
          if (project_id && task_id) {
            navigate(`/projects/${project_id}/tasks/${task_id}/issues`);
          } else if (project_id) {
            navigate(`/projects/${project_id}/issues`);
          } else {
            navigate(`/issues`);
          }
        }}
        onIssueUpdate={() => refresh()}
        onError={(msg) => addToast(msg, "error")}
      />
    </div>
  );
}
