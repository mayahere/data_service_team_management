import { useState, useMemo } from "react";
import { AlertTriangle, Calendar, FolderKanban } from "lucide-react";
import { Project, Task, Issue } from "../types/dashboard";
import { classNames } from "../utils/formatters";

interface ReportsViewProps {
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
}

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start: isoDate(start), end: isoDate(end) };
}

export function ReportsView({ projects, tasks, issues }: ReportsViewProps) {
  const def = defaultRange();
  const [startDate, setStartDate] = useState(def.start);
  const [endDate, setEndDate] = useState(def.end);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "Active"),
    [projects],
  );

  const filteredTasks = useMemo(() => {
    if (!startDate || !endDate) return tasks;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate + "T23:59:59").getTime();
    return tasks.filter((t) => {
      const created = new Date(t.createdAt).getTime();
      return created >= s && created <= e;
    });
  }, [tasks, startDate, endDate]);

  const filteredIssues = useMemo(() => {
    if (!startDate || !endDate) return issues;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate + "T23:59:59").getTime();
    return issues.filter((i) => {
      const created = new Date(i.createdAt).getTime();
      return created >= s && created <= e;
    });
  }, [issues, startDate, endDate]);

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(isoDate(start));
    setEndDate(isoDate(end));
  }

  const badgeBg: Record<string, string> = {
    blue: "bg-blue-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
    slate: "bg-slate-500",
  };

  return (
    <div className="p-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Snapshot of active projects within selected period
          </p>
        </div>
      </div>

      {/* Date range picker */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            Date range
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <span className="text-slate-400 text-sm">→</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-400">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} ·{" "}
            {filteredIssues.length} issue
            {filteredIssues.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Project cards */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FolderKanban className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900">
            Active Projects
          </h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {activeProjects.length}
          </span>
        </div>

        {activeProjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            No active projects.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjects.map((p) => {
              const projectTasks = filteredTasks.filter(
                (t) => t.projectId === p.id,
              );
              const projectIssues = filteredIssues.filter(
                (i) => i.projectId === p.id,
              );

              const ptTotal = projectTasks.length;
              const ptApproved = projectTasks.filter(
                (t) => t.status === "Approved",
              ).length;
              const ptRemaining = ptTotal - ptApproved;
              const approvedPct =
                ptTotal > 0 ? Math.round((ptApproved / ptTotal) * 100) : 0;
              const remainingPct =
                ptTotal > 0 ? Math.round((ptRemaining / ptTotal) * 100) : 0;

              const typeMap = new Map<string, number>();
              projectTasks.forEach((t) =>
                typeMap.set(t.type, (typeMap.get(t.type) ?? 0) + 1),
              );
              const typeEntries = Array.from(typeMap.entries()).sort(
                (a, b) => b[1] - a[1],
              );

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
                          <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Active
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
                      Tasks in period
                    </p>

                    {ptTotal === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No tasks created in this period
                      </p>
                    ) : (
                      <>
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
                                <div
                                  key={type}
                                  className="flex items-center gap-2"
                                >
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
                      </>
                    )}
                  </div>

                  {/* Issues block */}
                  <div className="px-5 py-4 bg-slate-50/60 border-t border-slate-100 space-y-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Issues in period
                    </p>

                    {piTotal === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        No issues in this period
                      </p>
                    ) : (
                      <>
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
                              issueResolvedPct >= 80
                                ? "text-emerald-600"
                                : issueResolvedPct >= 50
                                  ? "text-amber-600"
                                  : "text-red-600",
                            )}
                          >
                            {issueResolvedPct}%{" "}
                            <span className="font-normal text-slate-400">
                              ({piResolved}/{piTotal})
                            </span>
                          </span>
                        </div>
                      </>
                    )}
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
    </div>
  );
}
