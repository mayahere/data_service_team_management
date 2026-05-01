import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  Users,
  Activity,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import { DataOperator, KPI, Project } from "../types/dashboard";
import { classNames } from "../utils/formatters";

interface PerformanceViewProps {
  operators: DataOperator[];
  kpis: KPI[];
  projects: Project[];
}

export function PerformanceView({ operators, projects }: PerformanceViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DataOperator;
    direction: "asc" | "desc";
  } | null>(null);

  const filteredOperators = useMemo(() => {
    const filtered = operators.filter((op) => {
      const matchesSearch = op.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProject =
        projectFilter === "all" ||
        projects.some((p) => {
          const opTasks = p.taskCount;
          return opTasks > 0 && projectFilter === p.id;
        });
      return matchesSearch && matchesProject;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
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
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
    }
    return filtered;
  }, [operators, projects, searchTerm, projectFilter, sortConfig]);

  const handleSort = (key: keyof DataOperator) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const totalOperators = filteredOperators.length;
  const avgIssueRate =
    filteredOperators.length > 0
      ? (filteredOperators.reduce((acc, o) => acc + o.issueRate, 0) / filteredOperators.length).toFixed(1)
      : 0;
  const avgCompletionRate =
    filteredOperators.length > 0
      ? (
          (filteredOperators.reduce(
            (acc, o) => acc + (o.tasksAssigned > 0 ? o.tasksCompleted / o.tasksAssigned : 0),
            0
          ) /
            filteredOperators.length) *
          100
        ).toFixed(1)
      : 0;
  const avgLoad =
    filteredOperators.length > 0
      ? (filteredOperators.reduce((acc, o) => acc + o.currentLoad, 0) / filteredOperators.length).toFixed(1)
      : 0;

  const tasksCompletedData = filteredOperators
    .map((o) => ({ name: o.name.split(" ")[0], tasks: o.tasksCompleted }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 10);

  const scatterData = filteredOperators.map((o) => ({
    name: o.name,
    issueRate: o.issueRate,
    workload: o.currentLoad,
  }));

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Leader": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Operator": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getProgressBarColor = (completed: number, assigned: number) => {
    if (assigned === 0) return "bg-slate-200";
    const ratio = completed / assigned;
    if (ratio >= 0.9) return "bg-emerald-500";
    if (ratio >= 0.5) return "bg-blue-500";
    return "bg-amber-500";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Team Performance</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor operator workload, efficiency, and quality</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Avg Issue Rate</h3>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <span className="text-3xl font-bold text-slate-900">{avgIssueRate}%</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Avg Completion Rate</h3>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <span className="text-3xl font-bold text-emerald-600">{avgCompletionRate}%</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Avg Active Load</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <span className="text-3xl font-bold text-blue-600">{avgLoad}%</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-500">Operators</h3>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <span className="text-3xl font-bold text-indigo-600">{totalOperators}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search operators..."
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
        </div>

        <div className="text-sm text-slate-500 font-medium">
          Showing {filteredOperators.length} operators
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("name")}>
                  <div className="flex items-center">Operator <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("role")}>
                  <div className="flex items-center">Role <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("tasksCompleted")}>
                  <div className="flex items-center">Completed <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Progress
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("issueRate")}>
                  <div className="flex items-center">Issue Rate <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("currentLoad")}>
                  <div className="flex items-center">Active Load <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("issueCount")}>
                  <div className="flex items-center">Open Issues <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredOperators.map((op) => {
                const isHighIssueRate = op.issueRate > 20;
                return (
                  <tr key={op.id} className={classNames("hover:bg-slate-50 transition-colors group", isHighIssueRate ? "bg-red-50/20" : "")}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {op.avatar}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-slate-900">{op.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={classNames("inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border", getRoleColor(op.role))}>
                        {op.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-medium">
                        {op.tasksCompleted}{" "}
                        <span className="text-slate-400 font-normal">/ {op.tasksAssigned}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap w-48">
                      <div className="flex items-center">
                        <div className="w-full bg-slate-100 rounded-full h-2 mr-2">
                          <div
                            className={classNames("h-2 rounded-full", getProgressBarColor(op.tasksCompleted, op.tasksAssigned))}
                            style={{ width: `${op.tasksAssigned > 0 ? (op.tasksCompleted / op.tasksAssigned) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-medium w-8">
                          {op.tasksAssigned > 0 ? Math.round((op.tasksCompleted / op.tasksAssigned) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={classNames("text-sm font-semibold", isHighIssueRate ? "text-red-600" : "text-emerald-600")}>
                        {op.issueRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={classNames("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", op.currentLoad > 70 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")}>
                        {op.currentLoad}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {op.issueCount > 0 ? (
                        <span className={classNames("inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold", op.issueCount > 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                          {op.issueCount}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredOperators.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No operators found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Top 10: Tasks Completed</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksCompletedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                  {tasksCompletedData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Issue Rate vs Active Load</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="workload" name="Load (%)" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} domain={[0, 100]} />
                <YAxis type="number" dataKey="issueRate" name="Issue Rate (%)" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <ZAxis type="category" dataKey="name" name="Operator" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Scatter name="Operators" data={scatterData}>
                  {scatterData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#3b82f6" />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-hidden flex flex-col">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Top Progress</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {filteredOperators
              .filter((o) => o.tasksAssigned > 0)
              .sort((a, b) => b.tasksCompleted / b.tasksAssigned - a.tasksCompleted / a.tasksAssigned)
              .slice(0, 5)
              .map((op) => {
                const progress = Math.round((op.tasksCompleted / op.tasksAssigned) * 100);
                return (
                  <div key={`progress-${op.id}`} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-900">{op.name}</span>
                      <span className="font-semibold text-slate-700">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={classNames("h-2 rounded-full", getProgressBarColor(op.tasksCompleted, op.tasksAssigned))}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {filteredOperators.filter((o) => o.tasksAssigned > 0).length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">No progress data available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
