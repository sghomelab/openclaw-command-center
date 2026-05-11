import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  Activity, Server, Clock, Database, HardDrive, Cpu, MemoryStick,
  RefreshCw, AlertTriangle, CheckCircle, Archive, Users, Workflow, Calendar
} from 'lucide-react';

const COLORS = {
  accent: '#6366f1',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  muted: '#6b7280',
  bg: '#1f2937',
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

function MetricCard({ title, value, unit, icon: Icon, percent, color, status }) {
  const statusColor = status === 'healthy' ? 'text-emerald-400' :
                      status === 'warning' ? 'text-amber-400' :
                      status === 'critical' ? 'text-red-400' : 'text-text-primary';
  const barColor = color || 'bg-accent-primary';

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-muted" />
          <span className="text-sm text-text-muted">{title}</span>
        </div>
        {status && (
          <span className={`text-xs font-medium ${statusColor}`}>
            {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : 'Critical'}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      {percent !== undefined && (
        <div className="mt-3">
          <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-text-muted">{percent}%</span>
            <span className="text-xs text-text-muted">{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function GaugeChart({ value, max, label }) {
  const percent = (value / max * 100).toFixed(0);
  const angle = (percent / 100) * 180;
  const fillColor = percent > 90 ? '#ef4444' : percent > 75 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#374151" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={fillColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 157} 157`}
        />
        <text x="60" y="55" textAnchor="middle" fill={fillColor} fontSize="24" fontWeight="bold">{percent}%</text>
      </svg>
      <span className="text-sm text-text-muted mt-2">{label}</span>
    </div>
  );
}

export default function Monitoring() {
  const [system, setSystem] = useState(null);
  const [openclaw, setOpenClaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    try {
      const [sysRes, ocRes] = await Promise.all([
        api.get('/monitoring/system'),
        api.get('/monitoring/openclaw'),
      ]);
      setSystem(sysRes.data);
      setOpenClaw(ocRes.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Loading metrics...</span>
        </div>
      </div>
    );
  }

  const disk = system?.disk;
  const memory = system?.memory;
  const cpu = system?.cpu;
  const load = system?.load;
  const uptime = system?.uptime;
  const sessions = openclaw?.sessions;
  const crons = openclaw?.crons;
  const backups = openclaw?.backups;

  // Determine status based on thresholds
  const diskStatus = disk?.percent > 95 ? 'critical' : disk?.percent > 85 ? 'warning' : 'healthy';
  const memStatus = memory?.percent > 90 ? 'critical' : memory?.percent > 75 ? 'warning' : 'healthy';
  const cpuStatus = cpu?.percent > 90 ? 'critical' : cpu?.percent > 75 ? 'warning' : 'healthy';
  const cronStatus = crons?.errors > 0 ? 'warning' : 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Monitoring Dashboard</h2>
          <p className="text-sm text-text-muted">System & OpenClaw metrics — auto-refreshes every 30s</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-text-muted">Updated: {lastUpdated}</span>}
          <button className="btn btn-sm btn-ghost" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* System Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Disk Usage"
          value={formatBytes(disk?.used)}
          unit={formatBytes(disk?.total)}
          icon={HardDrive}
          percent={disk?.percent}
          status={diskStatus}
        />
        <MetricCard
          title="Memory"
          value={formatBytes(memory?.used)}
          unit={formatBytes(memory?.total)}
          icon={MemoryStick}
          percent={memory?.percent}
          status={memStatus}
        />
        <MetricCard
          title="CPU"
          value={`${cpu?.percent || 0}%`}
          icon={Cpu}
          percent={cpu?.percent}
          status={cpuStatus}
        />
        <MetricCard
          title="Uptime"
          value={uptime ? `${uptime.days}d ${uptime.hours}h` : '—'}
          icon={Clock}
        />
      </div>

      {/* Load Averages */}
      <div className="card p-5">
        <h3 className="font-bold mb-4">Load Averages</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold">{load?.['1m'] || '—'}</div>
            <div className="text-sm text-text-muted">1 minute</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{load?.['5m'] || '—'}</div>
            <div className="text-sm text-text-muted">5 minutes</div>
          </div>
          <div>
            <div className="text-3xl font-bold">{load?.['15m'] || '—'}</div>
            <div className="text-sm text-text-muted">15 minutes</div>
          </div>
        </div>
      </div>

      {/* OpenClaw Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Active Sessions"
          value={sessions || 0}
          icon={Users}
          status={sessions > 0 ? 'healthy' : 'warning'}
        />
        <MetricCard
          title="Cron Jobs"
          value={`${crons?.enabled || 0}/${crons?.total || 0}`}
          icon={Workflow}
          status={cronStatus}
        />
        <MetricCard
          title="Backups"
          value={backups?.count || 0}
          unit={`(${formatBytes(backups?.total_size)})`}
          icon={Archive}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Disk Usage Pie */}
        <div className="card p-5">
          <h3 className="font-bold mb-4">Disk Usage</h3>
          <div className="flex items-center gap-6">
            <GaugeChart value={disk?.percent || 0} max={100} label={formatBytes(disk?.available) + ' free'} />
            <div className="text-sm text-text-muted space-y-2">
              <div>Total: {formatBytes(disk?.total)}</div>
              <div>Used: {formatBytes(disk?.used)}</div>
              <div>Free: {formatBytes(disk?.available)}</div>
              <div>Usage: {disk?.percent}%</div>
            </div>
          </div>
        </div>

        {/* Memory Usage Bar */}
        <div className="card p-5">
          <h3 className="font-bold mb-4">Memory Usage</h3>
          <div className="flex items-center gap-6">
            <GaugeChart value={memory?.percent || 0} max={100} label={formatBytes(memory?.available) + ' free'} />
            <div className="text-sm text-text-muted space-y-2">
              <div>Total: {formatBytes(memory?.total)}</div>
              <div>Used: {formatBytes(memory?.used)}</div>
              <div>Available: {formatBytes(memory?.available)}</div>
              <div>Usage: {memory?.percent}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cron Jobs Detail */}
      <div className="card p-5">
        <h3 className="font-bold mb-4">Cron Job Health</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-primary">{crons?.total || 0}</div>
            <div className="text-sm text-text-muted">Total Jobs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{crons?.enabled || 0}</div>
            <div className="text-sm text-text-muted">Enabled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{crons?.errors || 0}</div>
            <div className="text-sm text-text-muted">With Errors</div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="card p-5 bg-bg-tertiary">
        <h4 className="font-bold mb-3 text-sm">System Health Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {[
            { label: 'Disk', status: diskStatus },
            { label: 'Memory', status: memStatus },
            { label: 'CPU', status: cpuStatus },
            { label: 'Cron', status: cronStatus },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              {item.status === 'healthy' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {item.status === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
              {item.status === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span className="text-text-muted">{item.label}:</span>
              <span className={
                item.status === 'healthy' ? 'text-emerald-400' :
                item.status === 'warning' ? 'text-amber-400' : 'text-red-400'
              }>
                {item.status === 'healthy' ? 'OK' : item.status === 'warning' ? 'Warning' : 'Critical'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
