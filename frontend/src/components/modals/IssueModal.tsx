import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../../api';
import { Issue, Project, Task, AppUser } from '../../types/dashboard';

interface IssueFormData {
  issue_title: string;
  description: string;
  issue_priority: string;
  project_id: string;
  task_id: string;
  assignee_id: string;
  reviewer_id: string;
  due_date: string;
  status: string;
}

interface IssueModalProps {
  defaultProjectId?: string;
  defaultTaskId?: string;
  issue: Issue | null;
  onClose: () => void;
  onError: (msg: string) => void;
  onSaved: () => void;
  open: boolean;
  projects: Project[];
  tasks: Task[];
  users: AppUser[];
}

const EMPTY: IssueFormData = {
  issue_title: '',
  description: '',
  issue_priority: 'Medium',
  project_id: '',
  task_id: '',
  assignee_id: '',
  reviewer_id: '',
  due_date: '',
  status: 'Open',
};

export function IssueModal({
  open,
  issue,
  projects,
  tasks,
  users,
  defaultProjectId,
  defaultTaskId,
  onClose,
  onSaved,
  onError,
}: IssueModalProps) {
  const [form, setForm] = useState<IssueFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof IssueFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const availableTasks = issue ? tasks.filter((t) => t.projectId === issue.projectId) : tasks;

  useEffect(() => {
    if (open) {
      if (issue) {
        setForm({
          issue_title: issue.issueTitle,
          description: issue.description,
          issue_priority: issue.issuePriority,
          project_id: issue.projectId,
          task_id: issue.taskId ?? '',
          assignee_id: issue.assigneeId ?? '',
          reviewer_id: issue.reviewerId ?? '',
          due_date: issue.dueDate ? issue.dueDate.split('T')[0] : '',
          status: issue.status,
        });
      } else {
        setForm({
          ...EMPTY,
          project_id: defaultProjectId ?? '',
          task_id: defaultTaskId ?? '',
        });
      }
      setErrors({});
    }
  }, [open, issue, defaultProjectId, defaultTaskId]);

  const set = (field: keyof IssueFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function validate(): boolean {
    const e: Partial<Record<keyof IssueFormData, string>> = {};
    if (!form.issue_title.trim()) e.issue_title = 'Title is required';
    if (!form.project_id) e.project_id = 'Project is required';
    if (!form.task_id) e.task_id = 'Task is required';
    if (!form.issue_priority) e.issue_priority = 'Priority is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      if (issue) {
        await api.put(`/issues/${issue.id}`, {
          issue_title: form.issue_title,
          description: form.description,
          issue_priority: form.issue_priority,
          task_id: form.task_id || null,
          assignee_id: form.assignee_id || null,
          reviewer_id: form.reviewer_id || null,
          due_date: form.due_date || null,
          status: form.status,
        });
      } else {
        await api.post('/issues', {
          issue_title: form.issue_title,
          description: form.description,
          issue_priority: form.issue_priority,
          project_id: form.project_id,
          task_id: form.task_id || null,
          assignee_id: form.assignee_id || null,
          reviewer_id: form.reviewer_id || null,
          due_date: form.due_date || null,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to save issue';
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';
  const errCls = 'mt-1 text-xs text-red-600';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                {issue ? 'Edit Issue' : 'New Issue'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className={`${inputCls} ${errors.issue_title ? 'border-red-300' : 'border-slate-200'}`}
                  value={form.issue_title}
                  onChange={(e) => set('issue_title', e.target.value)}
                  placeholder="Issue title"
                />
                {errors.issue_title && <p className={errCls}>{errors.issue_title}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className={`${inputCls} border-slate-200 resize-none`}
                  rows={3}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Describe the issue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`${inputCls} ${errors.issue_priority ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.issue_priority}
                    onChange={(e) => set('issue_priority', e.target.value)}
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  {errors.issue_priority && <p className={errCls}>{errors.issue_priority}</p>}
                </div>
                {issue && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                    <select
                      className={`${inputCls} border-slate-200`}
                      value={form.status}
                      onChange={(e) => set('status', e.target.value)}
                    >
                      <option>Open</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Related Task <span className="text-red-500">*</span>
                </label>
                <select
                  className={`${inputCls} ${errors.task_id ? 'border-red-300' : 'border-slate-200'}`}
                  value={form.task_id}
                  onChange={(e) => {
                    const taskId = e.target.value;
                    const task = tasks.find((t) => t.id === taskId);
                    setForm((f) => ({
                      ...f,
                      task_id: taskId,
                      project_id: task ? task.projectId : f.project_id,
                    }));
                  }}
                >
                  <option value="">Select task…</option>
                  {availableTasks.map((t) => {
                    const project = projects.find((p) => p.id === t.projectId);
                    return (
                      <option key={t.id} value={t.id}>
                        {t.title} {project && !issue ? `(${project.name})` : ''}
                      </option>
                    );
                  })}
                </select>
                {errors.task_id && <p className={errCls}>{errors.task_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Assignee</label>
                  <select
                    className={`${inputCls} border-slate-200`}
                    value={form.assignee_id}
                    onChange={(e) => set('assignee_id', e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className={`${inputCls} ${form.task_id ? 'bg-slate-50 border-slate-200' : 'border-slate-200'}`}
                    value={form.due_date}
                    onChange={(e) => set('due_date', e.target.value)}
                    disabled={!!form.task_id}
                    title={form.task_id ? "Due date follows the related task" : ""}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {issue ? 'Save Changes' : 'Report Issue'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
