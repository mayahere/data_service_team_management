import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Pencil, Plus } from 'lucide-react';
import { IssueModal } from './modals/IssueModal';
import { Task, Project, AppUser, Issue } from '../types/dashboard';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { mapIssue } from '../utils/dataMapper';
import { useAuth } from '../context/AuthContext';

interface TaskSidePanelProps {
  open: boolean;
  task: Task | null;
  projects: Project[];
  users: AppUser[];
  onClose: () => void;
  onTaskUpdate: () => void;
  onError: (msg: string) => void;
  onEdit?: (task: Task) => void;
}

export function TaskSidePanel({
  open,
  task,
  projects,
  users,
  onClose,
  onTaskUpdate,
  onError,
}: TaskSidePanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'Manager';
  const isLeader = user?.role === 'Leader';
  const canManage = isManager || isLeader;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  
  // Local state for dropdowns to handle immediate optimistic updates visually
  const [status, setStatus] = useState<string>('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [reviewerId, setReviewerId] = useState<string>('');
  const [taskNote, setTaskNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [savingInline, setSavingInline] = useState(false);

  useEffect(() => {
    if (open && task) {
      setStatus(task.status);
      setAssigneeId(task.assigneeId || '');
      setReviewerId(task.reviewerId || '');
      setTaskNote(task.taskNote || '');
      setIsInlineEditing(false);
      fetchIssues(task.id);
    }
  }, [open, task]);

  async function fetchIssues(taskId: string) {
    setLoadingIssues(true);
    try {
      const res = await api.get('/issues', { params: { task_id: taskId } });
      setIssues(res.data.map(mapIssue));
    } catch (err) {
      console.error('Failed to fetch issues for task', err);
    } finally {
      setLoadingIssues(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!task) return;
    setStatus(newStatus);
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
      onTaskUpdate();
    } catch (err: unknown) {
      setStatus(task.status); // Revert
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to update status';
      onError(msg);
    }
  }

  async function handleUserChange(field: 'assignee_id' | 'reviewer_id', newUserId: string) {
    if (!task) return;
    if (field === 'assignee_id') setAssigneeId(newUserId);
    else setReviewerId(newUserId);

    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        url: task.url,
        task_note: task.taskNote,
        type: task.type,
        task_priority: task.taskPriority,
        assignee_id: field === 'assignee_id' ? (newUserId || null) : task.assigneeId,
        reviewer_id: field === 'reviewer_id' ? (newUserId || null) : task.reviewerId,
      });
      onTaskUpdate();
    } catch (err: unknown) {
      if (field === 'assignee_id') setAssigneeId(task.assigneeId || '');
      else setReviewerId(task.reviewerId || '');
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to update user';
      onError(msg);
    }
  }

  async function handleNoteBlur() {
    if (!task) return;
    setIsEditingNote(false);
    if (taskNote === task.taskNote) return;
    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description,
        url: task.url,
        task_note: taskNote,
        type: task.type,
        task_priority: task.taskPriority,
        assignee_id: task.assigneeId,
        reviewer_id: task.reviewerId,
      });
      onTaskUpdate();
    } catch (err: unknown) {
      setTaskNote(task.taskNote || ''); // Revert
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to update note';
      onError(msg);
    }
  }

  const startEditing = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditUrl(task.url || '');
    setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setIsInlineEditing(true);
  };

  const saveInline = async () => {
    if (!task) return;
    if (!editTitle.trim()) {
      onError('Title is required');
      return;
    }
    setSavingInline(true);
    try {
      await api.put(`/tasks/${task.id}`, {
        title: editTitle,
        description: editDesc,
        url: editUrl || null,
        task_note: task.taskNote,
        type: task.type,
        task_priority: task.taskPriority,
        assignee_id: task.assigneeId,
        reviewer_id: task.reviewerId,
        due_date: canManage ? (editDueDate || null) : task.dueDate,
      });
      onTaskUpdate();
      setIsInlineEditing(false);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to update task';
      onError(msg);
    } finally {
      setSavingInline(false);
    }
  };

  const projectCode = task ? projects.find(p => p.id === task.projectId)?.projectCode : '';
  const displayDate = task?.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : '';

  const getIssueStatusColor = (status: string) => {
    switch (status) {
      case "Resolved": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "In Progress": return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Open": return "bg-amber-50 text-amber-700 border border-amber-200";
      default: return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Completed": return "bg-violet-50 text-violet-700 border-violet-100";
      case "In Progress": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Rejected": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const operators = users.filter((u) => u.role === 'Operator');
  const reviewers = users.filter((u) => u.role === 'Leader' || u.role === 'Manager' || u.role === 'Operator');

  return (
    <AnimatePresence>
      {open && task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-400/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 mr-4">
                  {isInlineEditing ? (
                     <input 
                       className="text-2xl font-bold text-slate-900 mb-1 border border-blue-300 rounded-lg w-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30 transition-all" 
                       value={editTitle} 
                       onChange={(e) => setEditTitle(e.target.value)} 
                       placeholder="Task title..."
                       autoFocus
                     />
                  ) : (
                     <h2 className="text-2xl font-bold text-slate-900 mb-1">{task.title}</h2>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isInlineEditing ? (
                    <>
                      <button onClick={saveInline} disabled={savingInline} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                        {savingInline && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Save
                      </button>
                      <button onClick={() => setIsInlineEditing(false)} disabled={savingInline} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200" title="Share">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={startEditing}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                        title="Edit inline"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200" title="Close panel">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex justify-between w-full">
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <span className="text-slate-700 px-2 py-1 bg-slate-100 rounded-md">{projectCode}</span>
                    <span className="text-slate-700 px-2 py-1 bg-slate-100 rounded-md">{task.type}</span>
                    {isInlineEditing && canManage ? (
                      <input
                        type="date"
                        className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    ) : (
                      <span className="text-slate-400">{displayDate}</span>
                    )}
                  </div>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-lg border appearance-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${getTaskStatusColor(status)}`}
                  >
                    <option value="Not Started">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-between mt-2 w-full">
                  <div className="relative gap-2">
                    <span className="text-slate-500 italic">Assignee:</span>
                    <select
                      value={assigneeId}
                      onChange={(e) => handleUserChange('assignee_id', e.target.value)}
                      className="pl-2 pr-2 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <option value="">Assignee</option>
                      {operators.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative gap-2">
                    <span className="text-slate-500 italic">Reviewer:</span>
                    <select
                      value={reviewerId}
                      onChange={(e) => handleUserChange('reviewer_id', e.target.value)}
                      className="pl-2 pr-2 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <option value="">Reviewer</option>
                      {reviewers.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              
              {/* Description Placeholder */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Description</h3>
                {isInlineEditing ? (
                  <textarea 
                    className="w-full border border-blue-300 rounded-lg p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30 transition-all resize-none" 
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Enter description..."
                  />
                ) : (
                  <p className="text-sm text-slate-700 hover:bg-slate-50 p-2 -ml-2 rounded-lg cursor-text transition-colors whitespace-pre-wrap">
                    {task.description || <span className="text-slate-400 italic">Add a description...</span>}
                  </p>
                )}
              </div>

              {/* URL Placeholder */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">URL</h3>
                {isInlineEditing ? (
                  <input 
                    type="url"
                    className="w-full border border-blue-300 rounded-lg p-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30 transition-all"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://..."
                  />
                ) : (
                  <p className="text-sm text-blue-500 hover:bg-slate-50 p-2 -ml-2 rounded-lg cursor-pointer transition-colors w-max">
                    {task.url ? <a href={task.url} target="_blank" rel="noopener noreferrer">{task.url}</a> : <span className="text-slate-400 italic">Add a URL</span>}
                  </p>
                )}
              </div>

              {/* Note Placeholder */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Note</h3>
                {isEditingNote ? (
                  <textarea
                    autoFocus
                    value={taskNote}
                    onChange={(e) => setTaskNote(e.target.value)}
                    onBlur={handleNoteBlur}
                    className="w-full text-sm text-slate-700 bg-white border border-blue-500 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none min-h-[80px]"
                    placeholder="Add a note..."
                  />
                ) : (
                  <p 
                    onClick={() => setIsEditingNote(true)}
                    className="text-sm text-slate-900 italic hover:bg-slate-50 p-2 -ml-2 rounded-lg cursor-text transition-colors min-h-[40px] whitespace-pre-wrap"
                  >
                    {task.taskNote || "Add a note..."}
                  </p>
                )}
              </div>

              {/* Issue Lists */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900">Issue Lists</h3>
                  <button
                    onClick={() => setIssueModalOpen(true)}
                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                    title="Add issue"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {loadingIssues ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : issues.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                    No issues reported for this task.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {issues.map(issue => (
                      <div 
                        key={issue.id} 
                        onClick={() => { onClose(); navigate(`/issues/${issue.id}`); }}
                        className="flex flex-col items-start justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-violet-700 bg-white border border-violet-200 px-2 py-1 rounded-md">
                            {issue.issueCode}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getIssueStatusColor(issue.status)}`}>
                          {issue.status}
                          </span>
                        </div>
                        <div className="flex flex-col mt-4">
                          <p className="text-base font-medium text-slate-700">{issue.issueTitle}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString('en-GB') : "No Due Date"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <IssueModal
            open={issueModalOpen}
            issue={null}
            projects={projects}
            tasks={[task]}
            users={users}
            defaultProjectId={task.projectId}
            defaultTaskId={task.id}
            onClose={() => setIssueModalOpen(false)}
            onSaved={() => {
              setIssueModalOpen(false);
              fetchIssues(task.id);
              onTaskUpdate();
            }}
            onError={onError}
          />
        </>
      )}
    </AnimatePresence>
  );
}
