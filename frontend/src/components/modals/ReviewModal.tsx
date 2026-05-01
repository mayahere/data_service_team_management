import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../api';
import { Task } from '../../types/dashboard';

interface ReviewModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

export function ReviewModal({ open, task, onClose, onSaved, onError }: ReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (open) {
      setAction(null);
      setNotes('');
      setActionError('');
    }
  }, [open]);

  async function handleSubmit() {
    if (!action) {
      setActionError('Please select an action');
      return;
    }
    if (!task) return;
    setLoading(true);
    try {
      await api.post(`/tasks/${task.id}/review`, { action });
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Review action failed';
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && task && (
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
            className="relative z-10 bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Review Task</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Task info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                {task.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {task.assigneeName && (
                    <span className="text-xs text-slate-500">
                      Assignee: <span className="font-medium text-slate-700">{task.assigneeName}</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    Due: <span className="font-medium text-slate-700">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : '—'}</span>
                  </span>
                </div>
              </div>

              {/* Action selection */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Decision</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setAction('approve'); setActionError(''); }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      action === 'approve'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 hover:border-emerald-200 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${action === 'approve' ? 'text-emerald-500' : 'text-slate-400'}`} />
                    Approve
                  </button>
                  <button
                    onClick={() => { setAction('reject'); setActionError(''); }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      action === 'reject'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 hover:border-red-200 text-slate-600'
                    }`}
                  >
                    <XCircle className={`w-5 h-5 ${action === 'reject' ? 'text-red-500' : 'text-slate-400'}`} />
                    Reject
                  </button>
                </div>
                {actionError && <p className="text-xs text-red-600">{actionError}</p>}
              </div>

              {/* Notes (local only, not saved) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Notes <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes for this review..."
                />
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
                disabled={loading || !action}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading && (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {action === 'reject' ? 'Reject Task' : 'Approve Task'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
