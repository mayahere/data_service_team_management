import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../../api';
import { AppUser } from '../../types/dashboard';

interface OperatorFormData {
  full_name: string;
  email: string;
  password: string;
  role: string;
  is_active: boolean;
  end_date: string;
}

interface OperatorModalProps {
  open: boolean;
  operator: AppUser | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}

const EMPTY: OperatorFormData = {
  full_name: '',
  email: '',
  password: '',
  role: 'Operator',
  is_active: true,
  end_date: '',
};

export function OperatorModal({ open, operator, onClose, onSaved, onError }: OperatorModalProps) {
  const [form, setForm] = useState<OperatorFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof OperatorFormData, string>>>({});
  const [loading, setLoading] = useState(false);

  const isEdit = operator !== null;

  useEffect(() => {
    if (open) {
      if (operator) {
        setForm({
          full_name: operator.fullName,
          email: operator.email,
          password: '',
          role: operator.role,
          is_active: operator.isActive,
          end_date: operator.endDate ?? '',
        });
      } else {
        setForm(EMPTY);
      }
      setErrors({});
    }
  }, [open, operator]);

  function validate(): boolean {
    const e: Partial<Record<keyof OperatorFormData, string>> = {};
    if (!form.full_name.trim()) e.full_name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!isEdit && !form.password.trim()) e.password = 'Password is required';
    if (!form.role) e.role = 'Role is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        end_date: form.end_date || null,
      };
      if (!isEdit) {
        payload.password = form.password;
      } else {
        if (form.password.trim()) payload.password = form.password;
        payload.is_active = form.is_active;
      }
      if (isEdit) {
        await api.put(`/users/${operator!.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save operator';
      onError(msg);
    } finally {
      setLoading(false);
    }
  }

  const field = (
    label: string,
    key: keyof OperatorFormData,
    type = 'text',
    placeholder = '',
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {isEdit ? 'Edit Operator' : 'New Operator'}
              </h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {field('Full Name', 'full_name', 'text', 'Jane Smith')}
              {field('Email', 'email', 'email', 'jane@example.com')}
              {field('End Date', 'end_date', 'date')}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Operator">Operator</option>
                  <option value="Leader">Leader</option>
                </select>
                {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
              </div>

              {isEdit && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-blue-500' : 'bg-slate-300'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                  <span className="text-sm text-slate-700">
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
