import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, AlertTriangle, Workflow, Puzzle,
  FolderKanban, CheckSquare, FileText, Settings, LogOut, Brain, Calendar,
  Users, Server, Clock, HardDrive, MessageSquare, Eye, Search, BookOpen,
  ChevronDown, ChevronRight, GitBranch, Shield, Activity, Database, Archive,
  History
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '#/' },
  {
    label: 'Operations',
    icon: Workflow,
    children: [
      { label: 'Tasks', icon: CheckSquare, path: '#/tasks' },
      { label: 'Projects', icon: FolderKanban, path: '#/projects' },
      { label: 'Workflows', icon: GitBranch, path: '#/workflows' },
      { label: 'Calendar', icon: Calendar, path: '#/calendar' },
    ],
  },
  {
    label: 'Intelligence',
    icon: Brain,
    children: [
      { label: 'Knowledge Base', icon: Brain, path: '#/knowledge' },
      { label: 'LLM Wiki', icon: BookOpen, path: '#/wiki' },
      { label: 'Memory', icon: Database, path: '#/memory' },
    ],
  },
  {
    label: 'Orchestration',
    icon: Users,
    children: [
      { label: 'Agents', icon: Users, path: '#/agents' },
      { label: 'Sessions', icon: Eye, path: '#/sessions' },
      { label: 'Conversations', icon: MessageSquare, path: '#/conversations' },
    ],
  },
  {
    label: 'Infrastructure',
    icon: Server,
    children: [
      { label: 'Gateway Health', icon: Activity, path: '#/gateway' },
      { label: 'Disk Usage', icon: HardDrive, path: '#/disk' },
      {
        label: 'Cron',
        icon: Clock,
        children: [
          { label: 'Cron Jobs', icon: Clock, path: '#/crons' },
          { label: 'Cron Editor', icon: Clock, path: '#/croneditor' },
        ],
      },
      { label: 'Backups', icon: Archive, path: '#/backups' },
      { label: 'Monitoring', icon: Activity, path: '#/monitoring' },
    ],
  },
  {
    label: 'Configuration',
    icon: Settings,
    children: [
      { label: 'Config Editor', icon: Settings, path: '#/config' },
      { label: 'Config History', icon: History, path: '#/confighistory' },
      { label: 'Config Audit', icon: FileText, path: '#/configaudit' },
      { label: 'Skills', icon: Puzzle, path: '#/skills' },
      { label: 'Integrations', icon: Puzzle, path: '#/integrations' },
    ],
  },
  {
    label: 'Observability',
    icon: Shield,
    children: [
      { label: 'Alert Rules', icon: AlertTriangle, path: '#/alerts' },
      { label: 'Audit Logs', icon: FileText, path: '#/audit' },
      { label: 'Cost Analytics', icon: Search, path: '#/costs' },
    ],
  },
  { label: 'Settings', icon: Settings, path: '#/settings' },
];

function NavItem({ item, currentPage, collapsed }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  const isActive = item.path
    ? currentPage === item.path.replace('#/', '') || (currentPage === '' && item.path === '#/')
    : false;

  const isParentActive = hasChildren && item.children.some(
    child => child.path
      ? currentPage === child.path.replace('#/', '')
      : child.children && child.children.some(
          grandchild => currentPage === grandchild.path.replace('#/', '')
        )
  );

  // Auto-expand if a child is active
  if (isParentActive && !expanded) {
    setExpanded(true);
  }

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors text-sm ${
            collapsed ? 'justify-center' : ''
          } ${isActive || isParentActive ? 'sidebar-link-active' : 'sidebar-link'}`}
          title={item.label}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
          {!collapsed && (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
        </button>
        {expanded && !collapsed && (
          <div className="ml-4 mt-1 space-y-1">
            {item.children.map((child, ci) => (
              <NavItem
                key={ci}
                item={child}
                currentPage={currentPage}
                collapsed={false}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={item.path}
      onClick={(e) => { e.preventDefault(); window.location.hash = item.path; }}
      className={`${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${collapsed ? 'justify-center px-0' : ''}`}
      title={item.label}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </a>
  );
}

export default function Sidebar({ currentPage, collapsed, onToggle }) {
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
            <p className="text-xs text-text-muted truncate">v4.0</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <NavItem
            key={i}
            item={item}
            currentPage={currentPage}
            collapsed={collapsed}
          />
        ))}
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
