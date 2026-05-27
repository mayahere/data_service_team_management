import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { DataOperator, Project, AppUser } from "../types/dashboard";
import { classNames } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import { OperatorModal } from "./modals/OperatorModal";
import { ConfirmDialog } from "./modals/ConfirmDialog";
import { useToast } from "../context/ToastContext";
import api from "../api";

interface PerformanceViewProps {
  operators: DataOperator[];
  projects: Project[];
  users: AppUser[];
  refresh: () => void;
}

export function PerformanceView({
  operators,
  projects,
  users,
  refresh,
}: PerformanceViewProps) {
  const { user } = useAuth();
  const { addToast: showToast } = useToast();
  const isManager = user?.role === "Manager";

  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DataOperator;
    direction: "asc" | "desc";
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"performance" | "members">(
    "performance",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const filteredOperators = useMemo(() => {
    const filtered = operators.filter((op) => {
      const matchesSearch = op.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
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
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }
        return 0;
      });
    }
    return filtered;
  }, [operators, projects, searchTerm, projectFilter, sortConfig]);

  const handleSort = (key: keyof DataOperator) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Leader":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "Operator":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const isOperatorActive = (opId: string) =>
    users.find((u) => u.id === opId)?.isActive ?? true;

  const getProgressBarColor = (completed: number, assigned: number) => {
    if (assigned === 0) return "bg-slate-200";
    const ratio = completed / assigned;
    if (ratio >= 0.9) return "bg-emerald-500";
    if (ratio >= 0.5) return "bg-blue-500";
    return "bg-amber-500";
  };

  const filteredMembers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  function openCreate() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(op: DataOperator) {
    const appUser = users.find((u) => u.id === op.id) ?? null;
    setEditingUser(appUser);
    setModalOpen(true);
  }

  function openDelete(op: DataOperator) {
    const appUser = users.find((u) => u.id === op.id) ?? null;
    setDeleteTarget(appUser);
  }

  function openEditUser(u: AppUser) {
    setEditingUser(u);
    setModalOpen(true);
  }

  function openDeleteUser(u: AppUser) {
    setDeleteTarget(u);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      showToast("Operator deactivated", "success");
      refresh();
    } catch {
      showToast("Failed to deactivate operator", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="p-8 w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Team Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor performance and manage team members
          </p>
        </div>
        {isManager && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Operator
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 -mb-2">
        {(["performance", "members"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={classNames(
              "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
            )}
          >
            {tab === "performance" ? "Team Performance" : "Team Members"}
          </button>
        ))}
      </div>

      {activeTab === "performance" && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm overflow-hidden flex flex-col">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Top Progress
              </h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {filteredOperators
                  .filter((o) => o.tasksAssigned > 0)
                  .sort(
                    (a, b) =>
                      b.tasksCompleted / b.tasksAssigned -
                      a.tasksCompleted / a.tasksAssigned,
                  )
                  .slice(0, 5)
                  .map((op) => {
                    const progress = Math.round(
                      (op.tasksCompleted / op.tasksAssigned) * 100,
                    );
                    return (
                      <div key={`progress-${op.id}`} className="space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-slate-900">
                            {op.name}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={classNames(
                              "h-2 rounded-full",
                              getProgressBarColor(
                                op.tasksCompleted,
                                op.tasksAssigned,
                              ),
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {filteredOperators.filter((o) => o.tasksAssigned > 0).length ===
                  0 && (
                  <div className="text-center py-8 text-sm text-slate-500">
                    No progress data available.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div></div>
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
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
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Operator <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center">
                        Role <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("tasksAssigned")}
                    >
                      <div className="flex items-center">
                        Total Tasks <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      Progress
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("issueRate")}
                    >
                      <div className="flex items-center">
                        Issue Rate <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("issueCount")}
                    >
                      <div className="flex items-center">
                        Open Issues <ArrowUpDown className="w-3 h-3 ml-1" />
                      </div>
                    </th>
                    {isManager && (
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredOperators.map((op) => {
                    const isHighIssueRate = op.issueRate > 20;
                    const active = isOperatorActive(op.id);
                    return (
                      <tr
                        key={op.id}
                        className={classNames(
                          "transition-colors group",
                          active
                            ? `hover:bg-slate-50 ${isHighIssueRate ? "bg-red-50/20" : ""}`
                            : "bg-slate-50/60",
                        )}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className={classNames(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                active
                                  ? "bg-slate-200 text-slate-600"
                                  : "bg-slate-100 text-slate-400",
                              )}
                            >
                              {op.avatar}
                            </div>
                            <div className="ml-3">
                              <p
                                className={classNames(
                                  "text-sm font-medium",
                                  active
                                    ? "text-slate-900"
                                    : "text-slate-400 line-through",
                                )}
                              >
                                {op.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={classNames(
                              "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border",
                              getRoleColor(op.role),
                            )}
                          >
                            {op.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isOperatorActive(op.id) ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900 font-medium">
                            {op.tasksAssigned}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-48">
                          <div className="flex items-center">
                            <div className="w-full bg-slate-100 rounded-full h-2 mr-2">
                              <div
                                className={classNames(
                                  "h-2 rounded-full",
                                  getProgressBarColor(
                                    op.tasksCompleted,
                                    op.tasksAssigned,
                                  ),
                                )}
                                style={{
                                  width: `${op.tasksAssigned > 0 ? (op.tasksCompleted / op.tasksAssigned) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 font-medium w-8">
                              {op.tasksAssigned > 0
                                ? Math.round(
                                    (op.tasksCompleted / op.tasksAssigned) *
                                      100,
                                  )
                                : 0}
                              %
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={classNames(
                              "text-sm font-semibold",
                              isHighIssueRate
                                ? "text-red-600"
                                : "text-emerald-600",
                            )}
                          >
                            {op.issueRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {op.issueCount > 0 ? (
                            <span
                              className={classNames(
                                "inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold",
                                op.issueCount > 2
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700",
                              )}
                            >
                              {op.issueCount}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        {isManager && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(op)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openDelete(op)}
                                className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Deactivate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredOperators.length === 0 && (
                    <tr>
                      <td
                        colSpan={isManager ? 8 : 7}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No operators found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "members" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Team Members
              </h2>
              <p className="text-sm text-slate-500">
                All users across roles and statuses
              </p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  {isManager && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredMembers.map((u) => (
                  <tr
                    key={u.id}
                    className={classNames(
                      "transition-colors group",
                      u.isActive ? "hover:bg-slate-50" : "bg-slate-50/60",
                    )}
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={classNames(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            u.isActive
                              ? "bg-slate-200 text-slate-600"
                              : "bg-slate-100 text-slate-400",
                          )}
                        >
                          {u.fullName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <span
                          className={classNames(
                            "text-sm font-medium",
                            u.isActive
                              ? "text-slate-900"
                              : "text-slate-400 line-through",
                          )}
                        >
                          {u.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-500">
                      {u.email}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={classNames(
                          "inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border",
                          getRoleColor(u.role),
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {u.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    {isManager && (
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditUser(u)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteUser(u)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={isManager ? 5 : 4}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OperatorModal
        open={modalOpen}
        operator={editingUser}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          refresh();
          showToast(
            editingUser ? "Operator updated" : "Operator created",
            "success",
          );
        }}
        onError={(msg) => showToast(msg, "error")}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Deactivate Operator"
        message={`Deactivate ${deleteTarget?.fullName}? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
