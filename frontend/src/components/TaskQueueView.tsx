import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Filter,
  AlertCircle,
  ArrowUpDown,
  Plus,
  Pencil,
  Trash2,
  ArrowRightCircle,
  CheckSquare,
} from "lucide-react";
import { Task, Project, AppUser } from "../types/dashboard";
import { classNames, getProjectColors } from "../utils/formatters";
import { TaskModal } from "./modals/TaskModal";
import { TaskSidePanel } from "./TaskSidePanel";
import { ReviewModal } from "./modals/ReviewModal";
import { StatusModal } from "./modals/StatusModal";
import { ConfirmDialog } from "./modals/ConfirmDialog";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";

interface TaskQueueViewProps {
  tasks: Task[];
  projects: Project[];
  users: AppUser[];
  refresh: () => void;
}

export function TaskQueueView({ tasks, projects, users, refresh }: TaskQueueViewProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isManager = user?.role === "Manager";
  const isLeader = user?.role === "Leader";
  const canManage = isManager || isLeader;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [reviewerFilter, setReviewerFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Task | "project";
    direction: "asc" | "desc";
  } | null>(null);
  const [editingDueDateTaskId, setEditingDueDateTaskId] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { project_id, task_id } = useParams();
  const navigate = useNavigate();

  const selectedSideTask = useMemo(() => {
    if (!task_id) return null;
    return tasks.find(t => t.id === task_id) || null;
  }, [task_id, tasks]);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [statusTask, setStatusTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const projectName =
        projects.find((p) => p.id === task.projectId)?.name || task.projectId;
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.assigneeName &&
          task.assigneeName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;
      const matchesProject =
        projectFilter === "all" || task.projectId === projectFilter;
      const matchesPriority =
        priorityFilter === "all" || task.taskPriority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === "all" || task.assigneeId === assigneeFilter;
      const matchesReviewer =
        reviewerFilter === "all" || task.reviewerId === reviewerFilter;
      const matchesRouteProject = project_id ? task.projectId === project_id : true;
      return matchesSearch && matchesStatus && matchesProject && matchesPriority && matchesAssignee && matchesReviewer && matchesRouteProject;
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
        if (aValue === null) return 1;
        if (bValue === null) return -1;
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
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return filtered;
  }, [tasks, projects, searchTerm, statusFilter, projectFilter, priorityFilter, sortConfig, assigneeFilter, reviewerFilter, project_id]);

  const handleSort = (key: keyof Task | "project") => {
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
      await api.delete(`/tasks/${deleteTarget.id}`);
      addToast(`Task "${deleteTarget.title}" deleted`, "success");
      refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to delete task";
      addToast(msg, "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-emerald-100 text-emerald-700";
      case "Completed": return "bg-violet-100 text-violet-700";
      case "In Progress": return "bg-blue-100 text-blue-700";
      case "Rejected": return "bg-red-100 text-red-700";
      case "Not Started": return "bg-slate-100 text-slate-700";
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

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "annotation": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "review": return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="p-8 w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Task Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor all operational tasks</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditingTask(null); setTaskModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">Assignees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))} 
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={reviewerFilter}
              onChange={(e) => setReviewerFilter(e.target.value)}
              className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="all">Reviewers</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))} 
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-slate-200 rounded-lg text-sm py-2 pl-3 pr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="all">Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

      </div>
      {/* Main Table */}
      <div className="text-sm text-slate-500 font-medium">Showing {filteredTasks.length} tasks</div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("title")}>
                  <div className="flex items-center">Name <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("project")}>
                  <div className="flex items-center">Project <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("assigneeName")}>
                  <div className="flex items-center">Assignee <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("assigneeName")}>
                  <div className="flex items-center">Reviewer <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("status")}>
                  <div className="flex items-center">Status <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("dueDate")}>
                  <div className="flex items-center">Due Date <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100" onClick={() => handleSort("taskPriority")}>
                  <div className="flex items-center">Priority <ArrowUpDown className="w-3 h-3 ml-1" /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now();
                const canDelete = canManage && task.status === "Not Started";
                const canReview = (canManage || task.reviewerId === user?.userId) && task.status === "Completed";
                const canUpdateStatus = true;
                return (
                  <tr 
                    key={task.id} 
                    className="hover:bg-slate-50 transition-colors group cursor-pointer" 
                    onClick={() => {
                      const baseUrl = project_id ? `/projects/${project_id}/tasks` : '/tasks';
                      navigate(`${baseUrl}/${task.id}`);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 truncate max-w-[180px]" title={task.title}>
                          {task.title}
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5">
                          <span className={classNames("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border", getTypeColor(task.type))}>
                            {task.type}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={classNames(
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
                          (() => {
                            const c = getProjectColors(projects.find((p) => p.id === task.projectId)?.color || "slate");
                            return `${c.bg100} ${c.text700}`;
                          })()
                        )}
                      >
                        {projects.find((p) => p.id === task.projectId)?.shortName || task.projectId}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.assigneeName ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 mr-2">
                            {task.assigneeName.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm text-slate-700">{task.assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.reviewerName ? (
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 mr-2">
                            {task.reviewerName.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="text-sm text-slate-700">{task.reviewerName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={classNames("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", getStatusColor(task.status))}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {canManage && editingDueDateTaskId === task.id ? (
                        <input
                          type="date"
                          className="border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          value={task.dueDate ? task.dueDate.split("T")[0] : ""}
                          onChange={async (e) => {
                            const newDate = e.target.value;
                            if (newDate) {
                              try {
                                await api.put(`/tasks/${task.id}`, {
                                  title: task.title,
                                  description: task.description,
                                  url: task.url,
                                  task_note: task.taskNote,
                                  type: task.type,
                                  task_priority: task.taskPriority,
                                  assignee_id: task.assigneeId,
                                  reviewer_id: task.reviewerId,
                                  due_date: newDate,
                                });
                                addToast("Due date updated", "success");
                                refresh();
                              } catch (err: unknown) {
                                const msg = (err as any)?.response?.data?.detail ?? "Failed to update due date";
                                addToast(msg, "error");
                              }
                            }
                            setEditingDueDateTaskId(null);
                          }}
                          onBlur={() => setEditingDueDateTaskId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            } else if (e.key === "Escape") {
                              setEditingDueDateTaskId(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div 
                          className={classNames(
                            "flex items-center",
                            canManage && "cursor-pointer hover:bg-slate-100 p-1 rounded transition-colors group/date"
                          )}
                          onClick={() => {
                            if (canManage) {
                              setEditingDueDateTaskId(task.id);
                            }
                          }}
                        >
                          {task.dueDate ? (
                            <>
                              <span className={classNames("text-sm", isOverdue ? "text-red-600 font-medium" : "text-slate-600")}>
                                {new Date(task.dueDate).toLocaleDateString("en-GB")}
                              </span>
                              {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 ml-1.5 flex-shrink-0" />}
                              {canManage && (
                                <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover/date:opacity-100 ml-2 transition-opacity" />
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-sm text-slate-400 italic">No date</span>
                              {canManage && (
                                <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover/date:opacity-100 ml-2 transition-opacity" />
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={classNames("inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border", getPriorityColor(task.taskPriority))}>
                        {task.taskPriority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Update status */}
                        {canUpdateStatus && (
                          <button
                            onClick={() => setStatusTask(task)}
                            title="Update status"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ArrowRightCircle className="w-4 h-4" />
                          </button>
                        )}
                        {/* Review (approve/reject) */}
                        {canReview && (
                          <button
                            onClick={() => setReviewTask(task)}
                            title="Review task"
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                        )}
                        {/* Edit */}
                        {canManage && (
                          <button
                            onClick={() => { setEditingTask(task); setTaskModalOpen(true); }}
                            title="Edit task"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {/* Delete */}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(task)}
                            title="Delete task"
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
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No tasks found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TaskModal
        open={taskModalOpen}
        task={editingTask}
        projects={projects}
        users={users}
        onClose={() => setTaskModalOpen(false)}
        onSaved={() => {
          addToast(editingTask ? "Task updated" : "Task created", "success");
          refresh();
        }}
        onError={(msg) => addToast(msg, "error")}
      />

      <ReviewModal
        open={!!reviewTask}
        task={reviewTask}
        onClose={() => setReviewTask(null)}
        onSaved={() => {
          addToast("Task reviewed", "success");
          refresh();
        }}
        onError={(msg) => addToast(msg, "error")}
      />

      <StatusModal
        open={!!statusTask}
        task={statusTask}
        onClose={() => setStatusTask(null)}
        onSaved={() => {
          addToast("Status updated", "success");
          refresh();
        }}
        onError={(msg) => addToast(msg, "error")}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Task"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <TaskSidePanel
        open={!!selectedSideTask}
        task={selectedSideTask}
        projects={projects}
        users={users}
        onClose={() => navigate(project_id ? `/projects/${project_id}/tasks` : '/tasks')}
        onTaskUpdate={() => {
          refresh();
        }}
        onError={(msg) => addToast(msg, "error")}
      />
    </div>
  );
}
