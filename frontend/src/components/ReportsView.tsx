import { useState } from 'react';
import {
  Download,
  Copy,
  FileText,
  CheckCircle2,
  Calendar,
  ChevronRight } from
'lucide-react';
import { KPI, SLAMetric, Project } from '../types/dashboard';
import { classNames } from '../utils/formatters';
interface ReportsViewProps {
  kpis: KPI[];
  sla: SLAMetric;
  project: Project | null | undefined;
}
export function ReportsView({ kpis, sla }: ReportsViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 800);
  };
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const historicalReports = [
  {
    id: 1,
    date: 'Yesterday',
    title: 'Daily Operations Summary'
  },
  {
    id: 2,
    date: 'Oct 24, 2023',
    title: 'Daily Operations Summary'
  },
  {
    id: 3,
    date: 'Oct 23, 2023',
    title: 'Weekly Performance Rollup'
  },
  {
    id: 4,
    date: 'Oct 20, 2023',
    title: 'Daily Operations Summary'
  }];

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Reports
        </h1>
        <div className="flex items-center space-x-3">
          <div className="flex items-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 shadow-sm">
            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
            <span>Today</span>
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            
            {isGenerating ?
            <span className="flex items-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Generating...
              </span> :

            <span className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </span>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Report Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Auto-Generated Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-base font-semibold text-slate-900">
                Executive Summary
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopy}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Copy to clipboard">
                  
                  {copied ?
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :

                  <Copy className="w-4 h-4" />
                  }
                </button>
                <button
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Download PDF">
                  
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4 font-medium">{today}</p>
              <div className="prose prose-sm prose-slate max-w-none text-slate-700 space-y-4">
                <p>
                  Today's operations are proceeding with moderate friction. The
                  team has completed{' '}
                  <strong>
                    {kpis[0].current} of {kpis[0].target}
                  </strong>{' '}
                  daily tasks, tracking slightly behind the target pace.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>SLA Compliance</strong> is currently at{' '}
                    <strong>{sla.compliance}%</strong> ({sla.approved} approved of {sla.totalTasks} total tasks).
                  </li>
                  <li>
                    <strong>Quality Metrics:</strong> The error rate is elevated
                    at <strong>{kpis[1].current}%</strong>, primarily driven by
                    upstream data quality issues in Project Beacon.
                  </li>
                  <li>
                    <strong>Resource Utilization:</strong> Priya Patel is
                    currently operating at 95% capacity, while James Wilson has
                    available bandwidth. Reallocation of Project Delta tasks is
                    recommended.
                  </li>
                </ul>
                <p>
                  <strong>Recommended Actions:</strong> Prioritize the{' '}
                  {sla.inProgress} in-progress tasks in the queue and investigate the
                  recurring schema mismatch errors affecting Project Atlas
                  pipelines.
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-semibold text-slate-900">
                Key Metrics Snapshot
              </h2>
            </div>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-white">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    
                    Metric
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    
                    Target
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    
                    Actual
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {kpis.map((kpi, idx) => {
                  const current =
                  typeof kpi.current === 'number' ?
                  kpi.current :
                  parseFloat(kpi.current);
                  const target =
                  typeof kpi.target === 'number' ?
                  kpi.target :
                  parseFloat(kpi.target);
                  let isWarning = false;
                  if (
                  kpi.label === 'Error Rate' ||
                  kpi.label === 'Avg Processing Time')
                  {
                    isWarning = current > target;
                  } else {
                    isWarning = current < target * 0.9;
                  }
                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {kpi.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {kpi.target}
                        {kpi.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                        {kpi.current}
                        {kpi.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={classNames(
                            'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium',
                            isWarning ?
                            'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          )}>
                          
                          {isWarning ? 'Off Track' : 'On Track'}
                        </span>
                      </td>
                    </tr>);

                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Historical Reports */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-semibold text-slate-900">
                Historical Reports
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {historicalReports.map((report) =>
              <button
                key={report.id}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                
                  <div>
                    <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                      {report.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {report.date}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </button>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View All Archives
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>);

}