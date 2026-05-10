import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  TrendingUp, AlertTriangle, CheckSquare, FolderKanban,
  Workflow, Puzzle, ArrowUp, ArrowDown, Activity
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const StatCard = ({ title, value, change, changeType, icon: Icon, color }) => (
  <div className="card group hover:border-gray-600 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-text-muted text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2 text-text-primary">{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${changeType === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {changeType === 'up' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            {change}
          </div>
        )}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

const mockChartData = [
  { name: 'Mon', tasks: 4, alerts: 2, workflows: 3 },
  { name: 'Tue', tasks: 7, alerts: 5, workflows: 4 },
  { name: 'Wed', tasks: 5, alerts: 3, workflows: 6 },
  { name: 'Thu', tasks: 9, alerts: 1, workflows: 5 },
  { name: 'Fri', tasks: 6, alerts: 4, workflows: 7 },
  { name: 'Sat', tasks: 3, alerts: 2, workflows: 2 },
  { name: 'Sun', tasks: 2, alerts: 1, workflows: 1 },
];

const mockActivityData = [
  { name: '00:00', requests: 20 }, { name: '04:00', requests: 15 },
  { name: '08:00', requests: 45 }, { name: '12:00', requests: 60 },
  { name: '16:00', requests: 55 }, { name: '20:00', requests: 35 },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(r => setStats(r.data))
      .catch(() => setStats(null)) // show defaults on error
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={stats?.tasks_total || 0} change="+12% from last week" changeType="up" icon={CheckSquare} color="bg-blue-500/10 text-blue-400" />
        <StatCard title="Active Alerts" value={stats?.alerts_active || 0} change={stats?.alerts_active > 0 ? 'Requires attention' : 'All clear'} changeType={stats?.alerts_active > 0 ? 'down' : 'up'} icon={AlertTriangle} color="bg-amber-500/10 text-amber-400" />
        <StatCard title="Projects" value={stats?.projects_total || 0} icon={FolderKanban} color="bg-purple-500/10 text-purple-400" />
        <StatCard title="Workflows" value="—" icon={Workflow} color="bg-emerald-500/10 text-emerald-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-accent-primary" />
            <h3 className="font-semibold">Weekly Activity</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
              />
              <Area type="monotone" dataKey="tasks" stroke="#3b82f6" fillOpacity={1} fill="url(#gradTasks)" strokeWidth={2} />
              <Area type="monotone" dataKey="alerts" stroke="#f59e0b" fillOpacity={1} fill="url(#gradAlerts)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-accent-secondary" />
            <h3 className="font-semibold">Traffic (24h)</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mockActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }}
              />
              <Bar dataKey="requests" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="font-semibold mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-sm font-medium">API Server</p>
              <p className="text-xs text-text-muted">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-sm font-medium">Database</p>
              <p className="text-xs text-text-muted">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-sm font-medium">Auth System</p>
              <p className="text-xs text-text-muted">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
