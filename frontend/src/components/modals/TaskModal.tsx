import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../../api';
import { Task, Project, AppUser } from '../../types/dashboard';
import { useAuth } from '../../context/AuthContext';

interface TaskFormData {
  title: string;
  description: string;
  url: string;
  type: string;
  task_priority: string;
  project_id: string;
  assignee_id: string;
  reviewer_id: string;
  due_date: string;
}

interface TaskModalProps {
  open: boolean;
  task: Task | null;
  projects: Project[];
  users: AppUser[];
  defaultProjectId?: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

const EMPTY: TaskFormData = {
  title: '',
  description: '',
  url: '',
  type: 'Annotation',
  task_priority: 'Medium',
  project_id: '',
  assignee_id: '',
  reviewer_id: '',
  due_date: '',
};

export function TaskModal({
  open,
  task,
  projects,
  users,
  defaultProjectId,
  onClose,
  onSaved,
  onError,
}: TaskModalProps) {
  const { user } = useAuth();
  const canManage = user?.role === 'Manager' || user?.role === 'Leader';
  const [form, setForm] = useState<TaskFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const operators = users.filter((u) => u.role === 'Operator');
  const reviewers = users.filter((u) => u.role === 'Leader' || u.role === 'Manager' || u.role === 'Operator');

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title,
          description: task.description,
          url: task.url ?? '',
          type: task.type,
          task_priority: task.taskPriority,
          project_id: task.projectId,
          assignee_id: task.assigneeId ?? '',
          reviewer_id: task.reviewerId ?? '',
          due_date: task.dueDate ? task.dueDate.split('T')[0] : '',
        });
      } else {
        setForm({ ...EMPTY, project_id: defaultProjectId ?? '' });
      }
      setErrors({});
    }
  }, [open, task, defaultProjectId]);

  const set = (field: keyof TaskFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function validate(): boolean {
    const e: Partial<Record<keyof TaskFormData, string>> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.project_id) e.project_id = 'Project is required';
    if (!form.task_priority) e.task_priority = 'Priority is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        url: form.url || null,
        type: form.type,
        task_priority: form.task_priority,
        project_id: form.project_id,
        assignee_id: form.assignee_id || null,
        reviewer_id: form.reviewer_id || null,
        due_date: form.due_date,
      };
      if (task) {
        await api.put(`/tasks/${task.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to save task';
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
                {task ? 'Edit Task' : 'New Task'}
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
                  className={`${inputCls} ${errors.title ? 'border-red-300' : 'border-slate-200'}`}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Task title"
                />
                {errors.title && <p className={errCls}>{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className={`${inputCls} border-slate-200 resize-none`}
                  rows={3}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">URL</label>
                <input
                  className={`${inputCls} border-slate-200`}
                  value={form.url}
                  onChange={(e) => set('url', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`${inputCls} ${errors.project_id ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.project_id}
                    onChange={(e) => set('project_id', e.target.value)}
                  >
                    <option value="">Select project…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.project_id && <p className={errCls}>{errors.project_id}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                  <select
                    className={`${inputCls} border-slate-200`}
                    value={form.type}
                    onChange={(e) => set('type', e.target.value)}
                  >
                    <option>Annotation</option>
                    <option>Review</option>
                    <option>QA</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`${inputCls} ${errors.task_priority ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.task_priority}
                    onChange={(e) => set('task_priority', e.target.value)}
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  {errors.task_priority && <p className={errCls}>{errors.task_priority}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className={`${inputCls} ${canManage ? 'border-slate-200' : 'border-slate-200 bg-slate-50'}`}
                    value={form.due_date}
                    onChange={(e) => set('due_date', e.target.value)}
                    disabled={!canManage}
                    title={canManage ? '' : 'Due date is automatically set by # Days turn-around'}
                  />
                </div>
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
                    {operators.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reviewer</label>
                  <select
                    className={`${inputCls} border-slate-200`}
                    value={form.reviewer_id}
                    onChange={(e) => set('reviewer_id', e.target.value)}
                  >
                    <option value="">None</option>
                    {reviewers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
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
                {task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
