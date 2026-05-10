import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, AlertTriangle, Workflow, Puzzle,
  FolderKanban, CheckSquare, FileText, Settings, LogOut, Brain, Calendar
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '#/' },
  { label: 'Alerts', icon: AlertTriangle, path: '#/alerts' },
  { label: 'Tasks', icon: CheckSquare, path: '#/tasks' },
  { label: 'Projects', icon: FolderKanban, path: '#/projects' },
  { label: 'Workflows', icon: Workflow, path: '#/workflows' },
  { label: 'Knowledge', icon: Brain, path: '#/knowledge' },
  { label: 'Calendar', icon: Calendar, path: '#/calendar' },
  { label: 'Integrations', icon: Puzzle, path: '#/integrations' },
  { label: 'Audit Logs', icon: FileText, path: '#/audit' },
  { label: 'Settings', icon: Settings, path: '#/settings' },
];

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle }) {
  const { user, logout } = useAuth();

  return (
    <aside className={`fixed left-0 top-0 h-full bg-bg-secondary border-r border-gray-800 flex flex-col transition-all duration-300 z-30 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          C
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-text-primary truncate">Claw Mission Control</h1>
            <p className="text-xs text-text-muted truncate">v3.0.0</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, path }) => {
          const active = currentPage === path.replace('#/', '') || (currentPage === '' && path === '#/');
          return (
            <a
              key={path}
              href={path}
              onClick={(e) => { e.preventDefault(); onNavigate(path); }}
              className={`${active ? 'sidebar-link-active' : 'sidebar-link'} ${collapsed ? 'justify-center px-0' : ''}`}
              title={label}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </a>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-gray-800 space-y-1">
        <button
          onClick={onToggle}
          className="sidebar-link w-full justify-center"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg className="w-5 h-5 transition-transform" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {user && (
          <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.username?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary truncate">{user.username}</p>
                <p className="text-xs text-text-muted truncate">{user.role}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={logout} className="text-text-muted hover:text-accent-danger transition-colors" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
