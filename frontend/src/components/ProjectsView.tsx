import { useState } from 'react';
import { Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Project, AppUser } from '../types/dashboard';
import { ProjectModal } from './modals/ProjectModal';
import { ConfirmDialog } from './modals/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { classNames } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface ProjectsViewProps {
  projects: Project[];
  users: AppUser[];
  refresh: () => void;
}

const SLA_STATUS_COLORS: Record<string, string> = {
  Healthy: 'text-emerald-600 bg-emerald-50',
  'At Risk': 'text-amber-600 bg-amber-50',
  Breached: 'text-red-600 bg-red-50',
  'No Data': 'text-slate-500 bg-slate-50',
};

const SLA_STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  Healthy: CheckCircle2,
  'At Risk': AlertTriangle,
  Breached: XCircle,
  'No Data': AlertTriangle,
};

export function ProjectsView({ projects, users, refresh }: ProjectsViewProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const isManager = user?.role === 'Manager';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingProject(null);
    setModalOpen(true);
  }

  function openEdit(p: Project) {
    setEditingProject(p);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      addToast(`Project "${deleteTarget.name}" deleted`, 'success');
      refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Failed to delete project';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isManager && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Projects</p>
          <p className="text-3xl font-bold text-slate-900">{projects.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Active</p>
          <p className="text-3xl font-bold text-blue-600">
            {projects.filter((p) => p.slaStatus.status !== 'Completed').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1"># Days turn-around At Risk / Breached</p>
          <p className="text-3xl font-bold text-amber-600">
            {projects.filter((p) => p.slaStatus.status === 'At Risk' || p.slaStatus.status === 'Breached').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Leader
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Issues
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  # Days turn-around
                </th>
                {isManager && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {projects.map((p) => {
                const slaStatus = p.slaStatus.status;
                const SlaIcon = SLA_STATUS_ICONS[slaStatus] ?? AlertTriangle;
                const slaColors = SLA_STATUS_COLORS[slaStatus] ?? SLA_STATUS_COLORS['No Data'];
                return (
                  <tr 
                    key={p.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${p.id}/tasks`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={classNames(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                            p.color === 'blue'
                              ? 'bg-blue-500'
                              : p.color === 'violet'
                              ? 'bg-violet-500'
                              : p.color === 'emerald'
                              ? 'bg-emerald-500'
                              : 'bg-slate-500'
                          )}
                        >
                          {p.projectCode.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.projectCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.leaderName ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {p.leaderName.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <span className="text-sm text-slate-700">{p.leaderName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-slate-900">{p.taskCount}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={classNames(
                          'text-sm font-semibold',
                          p.issueCount > 0 ? 'text-amber-600' : 'text-slate-400'
                        )}
                      >
                        {p.issueCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={classNames('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', slaColors)}>
                          <SlaIcon className="w-3 h-3" />
                          {p.slaStatus.slaActual != null ? `${p.slaStatus.slaActual}%` : slaStatus}
                        </span>
                        <span className="text-xs text-slate-400">target {p.slaStatus.slaTarget}% (3-day turnaround)</span>
                      </div>
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit project"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProjectModal
        open={modalOpen}
        project={editingProject}
        users={users}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          addToast(editingProject ? 'Project updated' : 'Project created', 'success');
          refresh();
        }}
        onError={(msg) => addToast(msg, 'error')}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
