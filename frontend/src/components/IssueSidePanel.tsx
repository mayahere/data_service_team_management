import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Pencil, Upload } from 'lucide-react';
import { Issue } from '../types/dashboard';
import api from '../api';

interface IssueSidePanelProps {
  open: boolean;
  issue: Issue | null;
  onClose: () => void;
  onIssueUpdate: () => void;
  onError: (msg: string) => void;
}

export function IssueSidePanel({
  open,
  issue,
  onClose,
  onIssueUpdate,
  onError,
}: IssueSidePanelProps) {
  const [status, setStatus] = useState<string>('');
  const [issueNote, setIssueNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [savingInline, setSavingInline] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && issue) {
      setStatus(issue.status);
      setIssueNote(issue.issueNote || '');
      setIsInlineEditing(false);
    }
  }, [open, issue]);

  const handleStatusChange = async (newStatus: string) => {
    if (!issue) return;
    setStatus(newStatus);
    try {
      await api.put(`/issues/${issue.id}`, {
        issue_title: issue.issueTitle,
        description: issue.description,
        issue_priority: issue.issuePriority,
        task_id: issue.taskId || null,
        assignee_id: issue.assigneeId || null,
        reviewer_id: issue.reviewerId || null,
        due_date: issue.dueDate || null,
        status: newStatus,
        issue_note: issue.issueNote,
        issue_url: issue.issueUrl,
      });
      onIssueUpdate();
    } catch (err: unknown) {
      setStatus(issue.status);
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to update status';
      onError(msg);
    }
  };

  const handleNoteBlur = async () => {
    if (!issue) return;
    setIsEditingNote(false);
    if (issueNote === (issue.issueNote || '')) return;
    try {
      await api.put(`/issues/${issue.id}`, {
        issue_title: issue.issueTitle,
        description: issue.description,
        issue_priority: issue.issuePriority,
        task_id: issue.taskId || null,
        assignee_id: issue.assigneeId || null,
        reviewer_id: issue.reviewerId || null,
        due_date: issue.dueDate || null,
        status: issue.status,
        issue_note: issueNote,
        issue_url: issue.issueUrl,
      });
      onIssueUpdate();
    } catch (err: unknown) {
      setIssueNote(issue.issueNote || '');
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to update note';
      onError(msg);
    }
  };

  const startEditing = () => {
    if (!issue) return;
    setEditTitle(issue.issueTitle);
    setEditDesc(issue.description || '');
    setEditUrl(issue.issueUrl || '');
    setIsInlineEditing(true);
  };

  const saveInline = async () => {
    if (!issue) return;
    if (!editTitle.trim()) {
      onError('Title is required');
      return;
    }
    setSavingInline(true);
    try {
      await api.put(`/issues/${issue.id}`, {
        issue_title: editTitle,
        description: editDesc,
        issue_priority: issue.issuePriority,
        task_id: issue.taskId || null,
        assignee_id: issue.assigneeId || null,
        reviewer_id: issue.reviewerId || null,
        due_date: issue.dueDate || null,
        status: issue.status,
        issue_note: issue.issueNote,
        issue_url: editUrl || null,
      });
      onIssueUpdate();
      setIsInlineEditing(false);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to update issue';
      onError(msg);
    } finally {
      setSavingInline(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !issue) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/issues/${issue.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onIssueUpdate();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail ?? 'Failed to upload image';
      onError(msg);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getIssueStatusColor = (s: string) => {
    switch (s) {
      case "Resolved": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "In Progress": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Open": return "bg-amber-50 text-amber-700 border-amber-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const displayDate = issue?.dueDate ? new Date(issue.dueDate).toLocaleDateString('en-GB') : '';

  return (
    <AnimatePresence>
      {open && issue && (
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
                       placeholder="Issue title..."
                       autoFocus
                     />
                  ) : (
                     <h2 className="text-2xl font-bold text-slate-900 mb-1">{issue.issueTitle}</h2>
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
                    <span className="text-slate-700 px-2 py-1 bg-slate-100 rounded-md">{issue.taskId}</span>
                    <span className="text-slate-400">{displayDate}</span>
                  </div>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-lg border appearance-none outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${getIssueStatusColor(status)}`}
                  >
                    <option value="Open">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              
              {/* Assignees */}
              <div className="flex justify-between text-sm text-slate-600 font-medium">
                <div>Assignee: <span className="text-slate-500 font-normal">{issue.assigneeName || 'Unassigned'}</span></div>
                <div>Reviewer: <span className="text-slate-500 font-normal">{issue.reviewerName || 'Unassigned'}</span></div>
              </div>

              {/* Description */}
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
                    {issue.description || <span className="text-slate-400 italic">No description provided</span>}
                  </p>
                )}
              </div>

              {/* Attachments Placeholder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-slate-900">Attachments</h3>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                  />
                  <button 
                    className="p-1.5 text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    title="Upload image"
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="mb-4">
                  {isInlineEditing ? (
                    <input 
                      type="url"
                      className="w-full border border-blue-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30 transition-all" 
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://example.com/..."
                    />
                  ) : (
                    issue.issueUrl ? (
                      <a href={issue.issueUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                        {issue.issueUrl}
                      </a>
                    ) : (
                      <span className="text-sm text-slate-400 italic">No URL provided</span>
                    )
                  )}
                </div>
                {issue.issueUrl && (
                  <div className="w-full h-64 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden">
                    <img src={issue.issueUrl} alt="Attachment" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* Note Placeholder */}
              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Note</h3>
                {isEditingNote ? (
                  <textarea
                    autoFocus
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                    onBlur={handleNoteBlur}
                    className="w-full text-sm text-slate-700 bg-white border border-blue-500 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none min-h-[80px]"
                    placeholder="Add a note..."
                  />
                ) : (
                  <p 
                    onClick={() => setIsEditingNote(true)}
                    className="text-sm text-slate-900 italic hover:bg-slate-50 p-2 -ml-2 rounded-lg cursor-text transition-colors min-h-[40px] whitespace-pre-wrap"
                  >
                    {issue.issueNote || <span className="text-slate-400">Add a Note...</span>}
                  </p>
                )}
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
