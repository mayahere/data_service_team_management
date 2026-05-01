import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import api from '../../api';
import { Task, TaskStatus } from '../../types/dashboard';

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  'Not Started': ['In Progress'],
  'In Progress': ['Completed'],
  'Completed': [],
  'Approved': [],
  'Rejected': ['In Progress'],
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  'Not Started': 'bg-slate-100 text-slate-700 border-slate-200',
  'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
  'Completed': 'bg-violet-100 text-violet-700 border-violet-200',
  'Approved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Rejected': 'bg-red-100 text-red-700 border-red-200',
};

interface StatusModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

export function StatusModal({ open, task, onClose, onSaved, onError }: StatusModalProps) {
  const [selected, setSelected] = useState<TaskStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  if (!task) return null;

  const nextStatuses = VALID_TRANSITIONS[task.status] ?? [];

  async function handleSubmit() {
    if (!selected || !task) return;
    setLoading(true);
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: selected });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to update status';
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

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
            className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Update Status</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[task.status]}`}>
                    {task.status}
                  </span>
                  {nextStatuses.length > 0 && (
                    <>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">Select new status</span>
                    </>
                  )}
                </div>
              </div>

              {nextStatuses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-2">
                  No further transitions available for this status.
                </p>
              ) : (
                <div className="space-y-2">
                  {nextStatuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelected(s)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        selected === s
                          ? `${STATUS_COLORS[s]} border-current`
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span>{s}</span>
                      {selected === s && (
                        <div className="w-4 h-4 rounded-full bg-current opacity-60" />
                      )}
                    </button>
                  ))}
                </div>
              )}
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
                disabled={loading || !selected}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Update Status
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
