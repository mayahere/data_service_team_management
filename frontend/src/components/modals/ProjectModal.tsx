import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../../api';
import { Project, AppUser } from '../../types/dashboard';

interface ProjectFormData {
  project_code: string;
  project_name: string;
  description: string;
  start_date: string;
  end_date: string;
  leader_id: string;
  status: string;
  sla_target: number;
}

interface ProjectModalProps {
  open: boolean;
  project: Project | null;
  users: AppUser[];
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

const EMPTY: ProjectFormData = {
  project_code: '',
  project_name: '',
  description: '',
  start_date: '',
  end_date: '',
  leader_id: '',
  status: 'Active',
  sla_target: 85,
};

export function ProjectModal({ open, project, users, onClose, onSaved, onError }: ProjectModalProps) {
  const [form, setForm] = useState<ProjectFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const leaders = users.filter((u) => u.role === 'Leader');

  useEffect(() => {
    if (open) {
      if (project) {
        setForm({
          project_code: project.projectCode,
          project_name: project.name,
          description: '',
          start_date: '',
          end_date: '',
          leader_id: project.leaderId,
          status: 'Active',
          sla_target: project.slaStatus.slaTarget,
        });
      } else {
        setForm(EMPTY);
      }
      setErrors({});
    }
  }, [open, project]);

  const set = (field: keyof ProjectFormData, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  function validate(): boolean {
    const e: Partial<Record<keyof ProjectFormData, string>> = {};
    if (!form.project_code.trim()) e.project_code = 'Project code is required';
    if (!form.project_name.trim()) e.project_name = 'Project name is required';
    if (!form.leader_id) e.leader_id = 'Leader is required';
    if (!project) {
      if (!form.start_date) e.start_date = 'Start date is required';
      if (!form.end_date) e.end_date = 'End date is required';
      if (form.start_date && form.end_date && form.start_date >= form.end_date)
        e.end_date = 'End date must be after start date';
    }
    if (form.sla_target < 0 || form.sla_target > 100) e.sla_target = 'SLA target must be 0–100';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      if (project) {
        await api.put(`/projects/${project.id}`, {
          project_name: form.project_name,
          description: form.description || undefined,
          leader_id: form.leader_id,
          status: form.status,
          sla_target: form.sla_target,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
        });
      } else {
        await api.post('/projects', form);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to save project';
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
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                {project ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Project Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`${inputCls} ${errors.project_code ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.project_code}
                    onChange={(e) => set('project_code', e.target.value)}
                    disabled={!!project}
                    placeholder="e.g. ESG-2026"
                  />
                  {errors.project_code && <p className={errCls}>{errors.project_code}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    className={`${inputCls} border-slate-200`}
                    value={form.status}
                    onChange={(e) => set('status', e.target.value)}
                  >
                    <option>Active</option>
                    <option>Completed</option>
                    <option>On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={`${inputCls} ${errors.project_name ? 'border-red-300' : 'border-slate-200'}`}
                  value={form.project_name}
                  onChange={(e) => set('project_name', e.target.value)}
                  placeholder="Full project name"
                />
                {errors.project_name && <p className={errCls}>{errors.project_name}</p>}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Start Date {!project && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    className={`${inputCls} ${errors.start_date ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.start_date}
                    onChange={(e) => set('start_date', e.target.value)}
                  />
                  {errors.start_date && <p className={errCls}>{errors.start_date}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    End Date {!project && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    className={`${inputCls} ${errors.end_date ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.end_date}
                    onChange={(e) => set('end_date', e.target.value)}
                  />
                  {errors.end_date && <p className={errCls}>{errors.end_date}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Leader <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`${inputCls} ${errors.leader_id ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.leader_id}
                    onChange={(e) => set('leader_id', e.target.value)}
                  >
                    <option value="">Select leader…</option>
                    {leaders.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                  {errors.leader_id && <p className={errCls}>{errors.leader_id}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    SLA Target (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={`${inputCls} ${errors.sla_target ? 'border-red-300' : 'border-slate-200'}`}
                    value={form.sla_target}
                    onChange={(e) => set('sla_target', Number(e.target.value))}
                  />
                  {errors.sla_target && <p className={errCls}>{errors.sla_target}</p>}
                </div>
              </div>
            </div>

            {/* Footer */}
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
                {project ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
