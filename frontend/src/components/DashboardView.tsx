import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  X,
  ChevronRight,
  ListChecks,
  Bug,
  Calendar,
  Clock,
  CircleDot,
  FolderKanban,
} from "lucide-react";
import {
  Role,
  Task,
  Issue,
  Alert,
  Project,
  ActivityEntry,
} from "../types/dashboard";
import { classNames } from "../utils/formatters";

interface DashboardViewProps {
  role: Role;
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  alerts: Alert[];
  activities: ActivityEntry[];
}

function StatRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  const dotColors: Record<string, string> = {
    slate: "bg-slate-400",
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
  };
  return (
    <div className="flex items-center gap-2">
      <div
        className={classNames(
          "w-2 h-2 rounded-full flex-shrink-0",
          dotColors[color] ?? "bg-slate-400",
        )}
      />
      <span className="text-xs text-slate-600 flex-1 truncate">{label}</span>
      <span className="text-xs font-semibold text-slate-800 w-6 text-right">
        {value}
      </span>
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={classNames(
            "h-full rounded-full",
            dotColors[color] ?? "bg-slate-400",
          )}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 w-7 text-right">{pct}%</span>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function formatDueDate(iso: string): { label: string; color: string } {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0)
    return { label: `${Math.abs(days)}d overdue`, color: "text-red-600" };
  if (days === 0) return { label: "Due today", color: "text-amber-600" };
  if (days === 1) return { label: "Due tomorrow", color: "text-amber-600" };
  return {
    label: new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    color: "text-slate-500",
  };
}

export function DashboardView({
  role,
  projects,
  tasks,
  issues,
  alerts,
  activities,
}: DashboardViewProps) {
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const criticalAlerts = alerts.filter(
    (a) => !a.acknowledged && (a.type === "breach" || a.type === "issue"),
  );
  const showBanner = criticalAlerts.length > 0 && !bannerDismissed;

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  // ── Task metrics ────────────────────────────────────────────────────────────
  const totalTasks = tasks.length;
  const approvedTasks = tasks.filter((t) => t.status === "Approved").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "In Progress",
  ).length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const notStartedTasks = tasks.filter(
    (t) => t.status === "Not Started",
  ).length;
  const rejectedTasks = tasks.filter((t) => t.status === "Rejected").length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "Approved" || t.status === "Rejected")
      return false;
    return new Date(t.dueDate).getTime() < Date.now();
  }).length;
  const tasksWithIssues = tasks.filter((t) => t.issueCount > 0).length;

  // ── Issue metrics ───────────────────────────────────────────────────────────
  const totalIssues = issues.length;
  const openIssues = issues.filter((i) => i.status === "Open").length;
  const inProgressIssues = issues.filter(
    (i) => i.status === "In Progress",
  ).length;
  const resolvedIssues = issues.filter((i) => i.status === "Resolved").length;
  const urgentIssues = issues.filter(
    (i) =>
      (i.issuePriority === "Critical" || i.issuePriority === "High") &&
      i.status !== "Resolved",
  ).length;

  // ── Upcoming deadlines ─────────────────────────────────────────────────────
  const upcomingTasks = tasks
    .filter(
      (t) => t.dueDate && t.status !== "Approved" && t.status !== "Rejected",
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, 8);

  // ── Action labels ──────────────────────────────────────────────────────────
  const ACTION_LABEL: Record<string, string> = {
    created: "created",
    updated: "updated",
    status_changed: "changed status of",
    approved: "approved",
    rejected: "rejected",
    resolved: "resolved",
    deleted: "deleted",
  };

  const ACTION_COLOR: Record<string, string> = {
    created: "bg-blue-100 text-blue-700",
    updated: "bg-slate-100 text-slate-600",
    status_changed: "bg-violet-100 text-violet-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    resolved: "bg-emerald-100 text-emerald-700",
    deleted: "bg-red-100 text-red-700",
  };

  return (
    <div className="p-8 w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {role === "manager" ? "Data Services Overview" : "Team Overview"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          {criticalAlerts.length > 0 && (
            <>
              {" "}
              •{" "}
              <span className="text-amber-600 font-medium">
                {criticalAlerts.length} item
                {criticalAlerts.length !== 1 ? "s" : ""} need attention
              </span>
            </>
          )}
        </p>
      </div>

      {/* Alert Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="bg-red-50 border-l-4 border-red-500 rounded-r-md p-4 flex items-start justify-between shadow-sm"
          >
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Critical Action Required
                </h3>
                <p
                  className="text-sm text-red-700 mt-1 hover:underline cursor-pointer"
                  onClick={() => {
                    const a = criticalAlerts[0];
                    if (a.issueId) navigate(`/issues/${a.issueId}`);
                    else if (a.taskId) navigate(`/tasks/${a.taskId}`);
                  }}
                >
                  {criticalAlerts[0].message}
                </p>
                {criticalAlerts.length > 1 && (
                  <button
                    onClick={() => navigate("/issues")}
                    className="text-xs font-medium text-red-800 mt-2 hover:underline flex items-center"
                  >
                    View all {criticalAlerts.length} critical alerts{" "}
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PROJECT CARDS ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FolderKanban className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">Projects</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            No projects available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => {
              const projectTasks = tasks.filter((t) => t.projectId === p.id);
              const projectIssues = issues.filter((i) => i.projectId === p.id);
              const ptTotal = projectTasks.length;
              const ptApproved = projectTasks.filter(
                (t) => t.status === "Approved",
              ).length;
              const ptRemaining = ptTotal - ptApproved;
              const approvedPct =
                ptTotal > 0 ? Math.round((ptApproved / ptTotal) * 100) : 0;
              const remainingPct =
                ptTotal > 0 ? Math.round((ptRemaining / ptTotal) * 100) : 0;

              // Tasks by type
              const typeMap = new Map<string, number>();
              projectTasks.forEach((t) =>
                typeMap.set(t.type, (typeMap.get(t.type) ?? 0) + 1),
              );
              const typeEntries = Array.from(typeMap.entries()).sort(
                (a, b) => b[1] - a[1],
              );

              // Issue stats
              const piTotal = projectIssues.length;
              const piResolved = projectIssues.filter(
                (i) => i.status === "Resolved",
              ).length;
              const issueResolvedPct =
                piTotal > 0 ? Math.round((piResolved / piTotal) * 100) : 0;
              const tasksWithIssuesCnt = projectTasks.filter(
                (t) => t.issueCount > 0,
              ).length;
              const tasksWithIssuesPct =
                ptTotal > 0
                  ? Math.round((tasksWithIssuesCnt / ptTotal) * 100)
                  : 0;
              const criticalIssues = projectIssues.filter(
                (i) =>
                  i.issuePriority === "Critical" && i.status !== "Resolved",
              ).length;

              const badgeBg: Record<string, string> = {
                blue: "bg-blue-500",
                violet: "bg-violet-500",
                emerald: "bg-emerald-500",
                slate: "bg-slate-500",
              };

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div
                        className={classNames(
                          "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                          badgeBg[p.color] ?? "bg-slate-500",
                        )}
                      >
                        {p.projectCode.slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {p.name}
                          </p>
                          <span
                            className={classNames(
                              "flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                              p.status === "Active"
                                ? "bg-emerald-100 text-emerald-700"
                                : p.status === "Completed"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {p.projectCode}
                        </p>
                      </div>
                      {criticalIssues > 0 && (
                        <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          {criticalIssues} critical
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {p.leaderName && (
                        <p className="text-[11px] text-slate-500">
                          Leader:{" "}
                          <span className="font-medium text-slate-700">
                            {p.leaderName}
                          </span>
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 ml-auto">
                        {p.startDate
                          ? new Date(p.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                        {" → "}
                        {p.endDate
                          ? new Date(p.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Tasks block */}
                  <div className="px-5 py-4 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Tasks
                    </p>

                    {/* Completed + Remaining — single stacked bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                          <span className="text-[11px] text-slate-600">
                            Completed
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600">
                            {approvedPct}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-amber-500">
                            {remainingPct}%
                          </span>
                          <span className="text-[11px] text-slate-600">
                            Remaining
                          </span>
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${approvedPct}%` }}
                        />
                        <div
                          className="h-full bg-amber-400 transition-all duration-500"
                          style={{ width: `${remainingPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {ptApproved} approved · {ptRemaining} remaining ·{" "}
                        {ptTotal} total
                      </p>
                    </div>

                    {/* By type */}
                    {typeEntries.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-50">
                        <p className="text-[10px] text-slate-400 font-medium">
                          By type
                        </p>
                        {typeEntries.map(([type, count]) => {
                          const typePct =
                            ptTotal > 0
                              ? Math.round((count / ptTotal) * 100)
                              : 0;
                          return (
                            <div key={type} className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-600 w-20 truncate">
                                {type}
                              </span>
                              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-400 rounded-full"
                                  style={{ width: `${typePct}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-700 w-4 text-right">
                                {count}
                              </span>
                              <span className="text-[10px] text-slate-400 w-8 text-right">
                                {typePct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Issues block */}
                  <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100 space-y-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Issues
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        Tasks with issues
                      </span>
                      <span
                        className={classNames(
                          "text-xs font-semibold",
                          tasksWithIssuesPct > 30
                            ? "text-red-600"
                            : tasksWithIssuesPct > 0
                              ? "text-amber-600"
                              : "text-slate-400",
                        )}
                      >
                        {tasksWithIssuesPct}%{" "}
                        <span className="font-normal text-slate-400">
                          ({tasksWithIssuesCnt})
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        Issues resolved
                      </span>
                      <span
                        className={classNames(
                          "text-xs font-semibold",
                          piTotal === 0
                            ? "text-slate-400"
                            : issueResolvedPct >= 80
                              ? "text-emerald-600"
                              : issueResolvedPct >= 50
                                ? "text-amber-600"
                                : "text-red-600",
                        )}
                      >
                        {piTotal > 0 ? `${issueResolvedPct}%` : "—"}{" "}
                        <span className="font-normal text-slate-400">
                          ({piResolved}/{piTotal})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* SLA block */}
                  <div className="px-5 py-4 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        SLA
                      </p>
                      <span
                        className={classNames(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          p.slaStatus.status === "Met"
                            ? "bg-emerald-100 text-emerald-700"
                            : p.slaStatus.status === "At Risk"
                              ? "bg-amber-100 text-amber-700"
                              : p.slaStatus.status === "Breached"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {p.slaStatus.status === "Met"
                          ? "Achieved"
                          : p.slaStatus.status === "Breached"
                            ? "Breached"
                            : p.slaStatus.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        Target turn-around
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {p.slaStatus.slaTarget}d
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 3-COLUMN OVERVIEW ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Col 1 — Tasks + Issues stacked (1/3) */}
        <div className="flex flex-col gap-5">
          {/* Tasks card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
              <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {totalTasks}
              </span>
            </div>

            {/* Key signals */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "In Progress",
                  value: inProgressTasks,
                  accent: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  label: "Overdue",
                  value: overdueTasks,
                  accent: overdueTasks > 0 ? "text-red-600" : "text-slate-400",
                  bg: overdueTasks > 0 ? "bg-red-50" : "bg-slate-50",
                },
                {
                  label: "Pending Review",
                  value: completedTasks,
                  accent: "text-violet-600",
                  bg: "bg-violet-50",
                },
                {
                  label: "With Issues",
                  value: tasksWithIssues,
                  accent:
                    tasksWithIssues > 0 ? "text-amber-600" : "text-slate-400",
                  bg: tasksWithIssues > 0 ? "bg-amber-50" : "bg-slate-50",
                },
              ].map(({ label, value, accent, bg }) => (
                <div
                  key={label}
                  className={classNames(
                    "rounded-lg px-3 py-2.5 flex items-center justify-between",
                    bg,
                  )}
                >
                  <span className="text-[11px] font-medium text-slate-600 leading-tight">
                    {label}
                  </span>
                  <span
                    className={classNames(
                      "text-lg font-bold ml-2 flex-shrink-0",
                      accent,
                    )}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              {[
                { label: "Approved", value: approvedTasks, color: "emerald" },
                { label: "In Progress", value: inProgressTasks, color: "blue" },
                { label: "Completed", value: completedTasks, color: "violet" },
                {
                  label: "Not Started",
                  value: notStartedTasks,
                  color: "slate",
                },
                { label: "Rejected", value: rejectedTasks, color: "red" },
              ].map(({ label, value, color }) => (
                <StatRow
                  key={label}
                  label={label}
                  value={value}
                  pct={pct(value, totalTasks)}
                  color={color}
                />
              ))}
            </div>
          </div>

          {/* Col 2 — Issues */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Issues</h2>
              <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {totalIssues}
              </span>
            </div>

            {/* Status chips */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "Open",
                  value: openIssues,
                  accent: "text-amber-700",
                  bg: "bg-amber-50",
                },
                {
                  label: "In Progress",
                  value: inProgressIssues,
                  accent: "text-blue-700",
                  bg: "bg-blue-50",
                },
                {
                  label: "Resolved",
                  value: resolvedIssues,
                  accent: "text-emerald-700",
                  bg: "bg-emerald-50",
                },
              ].map(({ label, value, accent, bg }) => (
                <div
                  key={label}
                  className={classNames(
                    "rounded-lg px-2 py-2.5 text-center",
                    bg,
                  )}
                >
                  <p className={classNames("text-xl font-bold", accent)}>
                    {value}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Urgent callout */}
            {urgentIssues > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-700 font-medium">
                  {urgentIssues} Critical/High unresolved
                </span>
              </div>
            )}

            {/* Priority breakdown */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              {(["Critical", "High", "Medium", "Low"] as const).map((label) => {
                const colorMap: Record<string, string> = {
                  Critical: "red",
                  High: "orange",
                  Medium: "amber",
                  Low: "emerald",
                };
                const count = issues.filter(
                  (i) => i.issuePriority === label,
                ).length;
                return (
                  <StatRow
                    key={label}
                    label={label}
                    value={count}
                    pct={pct(count, totalIssues)}
                    color={colorMap[label]}
                  />
                );
              })}
            </div>

            {totalIssues === 0 && (
              <p className="text-center text-xs text-slate-400 py-4">
                No issues recorded.
              </p>
            )}
          </div>
        </div>
        {/* end flex col-span-1 */}

        {/* Upcoming Deadlines — col-span-2 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">
              Upcoming Deadlines
            </h2>
            <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {upcomingTasks.length}
            </span>
          </div>

          {upcomingTasks.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">
              No active tasks with deadlines.
            </p>
          ) : (
            <div className="space-y-2.5">
              {upcomingTasks.map((t) => {
                const { label: dueLabel, color: dueColor } = t.dueDate
                  ? formatDueDate(t.dueDate)
                  : { label: "No date", color: "text-slate-400" };
                const isOverdue =
                  t.dueDate && new Date(t.dueDate).getTime() < Date.now();
                const statusColors: Record<string, string> = {
                  "Not Started": "bg-slate-100 text-slate-500",
                  "In Progress": "bg-blue-100 text-blue-700",
                  Completed: "bg-violet-100 text-violet-700",
                };
                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className={classNames(
                      "rounded-lg px-3 py-2.5 border cursor-pointer hover:shadow-sm transition-shadow",
                      isOverdue
                        ? "border-red-100 bg-red-50/50"
                        : "border-slate-100 bg-slate-50/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-800 truncate flex-1">
                        {t.title}
                      </p>
                      <span
                        className={classNames(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
                          statusColors[t.status] ??
                            "bg-slate-100 text-slate-500",
                        )}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock
                        className={classNames(
                          "w-3 h-3 flex-shrink-0",
                          dueColor,
                        )}
                      />
                      <span
                        className={classNames(
                          "text-[10px] font-medium",
                          dueColor,
                        )}
                      >
                        {dueLabel}
                      </span>
                      {t.assigneeName && (
                        <span className="text-[10px] text-slate-400 truncate ml-auto">
                          {t.assigneeName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT ACTIVITY ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CircleDot className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">
            Recent Activity
          </h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            Tasks &amp; Issues
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            No activity recorded yet. Changes to tasks and issues will appear
            here.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {activities.map((entry) => {
              const isTask = entry.entityType === "task";
              const actionLabel = ACTION_LABEL[entry.action] ?? entry.action;
              const actionColor =
                ACTION_COLOR[entry.action] ?? "bg-slate-100 text-slate-600";
              return (
                <div
                  key={entry.logId}
                  className={`flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors ${entry.entityType === "task" ? "cursor-pointer" : ""}`}
                  onClick={() =>
                    entry.entityType === "task" &&
                    navigate(`/tasks/${entry.entityId}`)
                  }
                >
                  {/* Entity icon */}
                  <div
                    className={classNames(
                      "mt-0.5 flex-shrink-0 p-1.5 rounded-md",
                      isTask ? "bg-blue-50" : "bg-amber-50",
                    )}
                  >
                    {isTask ? (
                      <ListChecks className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Bug className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800">
                        {entry.actorName}
                      </span>
                      <span
                        className={classNames(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded",
                          actionColor,
                        )}
                      >
                        {actionLabel}
                      </span>
                      <span className="text-xs text-slate-600 truncate">
                        {entry.entityTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.detail && (
                        <span className="text-[10px] text-slate-400 italic">
                          {entry.detail}
                        </span>
                      )}
                      {entry.detail && (
                        <span className="text-slate-200">·</span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {entry.projectName}
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                    {relativeTime(entry.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
