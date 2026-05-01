import {
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  BarChart3,
  FileText,
  Grid,
  LogOut,
  FolderKanban } from
'lucide-react';
import { Role } from '../types/dashboard';
import { classNames } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  alertCounts: {
    errors: number;
    tasksAtRisk: number;
  };
}
export function Sidebar({
  activeView,
  onViewChange,
  activeRole: _activeRole,
  onRoleChange: _onRoleChange,
  alertCounts
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navItems = [
  {
    id: 'scan',
    label: 'Overview',
    icon: LayoutDashboard
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban
  },
  {
    id: 'prioritise',
    label: 'Task Queue',
    icon: ListChecks,
    badge: alertCounts.tasksAtRisk > 0 ? alertCounts.tasksAtRisk : undefined,
    badgeColor: 'bg-amber-500'
  },
  {
    id: 'triage',
    label: 'Issues',
    icon: AlertTriangle,
    badge: alertCounts.errors > 0 ? alertCounts.errors : undefined,
    badgeColor: 'bg-red-500'
  },
  {
    id: 'monitor',
    label: 'Performance',
    icon: BarChart3
  },
  {
    id: 'report',
    label: 'Reports',
    icon: FileText
  }];

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col border-r border-slate-800 text-slate-300 flex-shrink-0">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Grid className="w-6 h-6 text-blue-400 mr-3" />
        <span className="text-white font-semibold text-lg tracking-tight">
          DataOps Hub
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={classNames(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-colors duration-150 text-sm font-medium',
                isActive ?
                'bg-slate-800 text-white border-l-2 border-blue-400 pl-2.5' :
                'hover:bg-slate-800/50 hover:text-white border-l-2 border-transparent'
              )}>
              
              <div className="flex items-center">
                <Icon
                  className={classNames(
                    'w-5 h-5 mr-3',
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  )} />
                
                {item.label}
              </div>
              {item.badge !== undefined &&
              <span
                className={classNames(
                  'text-[10px] font-bold text-white px-2 py-0.5 rounded-full',
                  item.badgeColor
                )}>
                
                  {item.badge}
                </span>
              }
            </button>);

        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {/* Logged-in user */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.fullName}</p>
            <p className="text-slate-500 text-[10px] truncate">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="ml-auto text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>);

}