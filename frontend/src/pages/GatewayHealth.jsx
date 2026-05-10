import { useState, useEffect } from 'react';
import api from '../services/api';
import { Activity, Server, Clock, Zap, AlertTriangle, CheckCircle, XCircle, HardDrive, Cpu, MemoryStick, Monitor } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const config = {
    healthy: { color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle },
    degraded: { color: 'text-amber-400 bg-amber-500/10', icon: AlertTriangle },
    offline: { color: 'text-red-400 bg-red-500/10', icon: XCircle },
  };
  const { color, icon: Icon } = config[status] || config.offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      <Icon className="w-4 h-4" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const MetricCard = ({ title, value, icon: Icon, subtitle, color = "text-text-primary" }) => (
  <div className="card flex items-center gap-4 p-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-text-muted text-sm">{title}</p>
      <p className="text-xl font-bold truncate">{value ?? '—'}</p>
      {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const GaugeBar = ({ percent, label, threshold = 85, color }) => {
  const barColor = percent >= threshold ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : color;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className={`text-sm font-bold ${percent >= threshold ? 'text-red-400' : percent >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
          {percent}%
        </span>
      </div>
      <div className="h-3 bg-bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {percent >= threshold && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Alert: exceeds {threshold}% threshold
        </p>
      )}
    </div>
  );
};

const formatUptime = (seconds) => {
  if (!seconds) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

export default function GatewayHealth() {
  const [gatewayData, setGatewayData] = useState(null);
  const [systemData, setSystemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = async () => {
    try {
      const [gw, sys] = await Promise.allSettled([
        api.get('/health/gateway'),
        api.get('/health/system'),
      ]);
      if (gw.status === 'fulfilled') setGatewayData(gw.value.data);
      else setGatewayData({ status: 'offline', error: gw.reason?.message || 'Gateway unreachable' });
      if (sys.status === 'fulfilled') setSystemData(sys.value.data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setGatewayData({ status: 'offline', error: err.message || 'Gateway unreachable' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  const failingDeps = gatewayData?.failing_dependencies || [];
  const isHealthy = gatewayData?.status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-accent-primary" />
            Gateway & System Health
          </h2>
          <p className="text-text-muted mt-1">OpenClaw Gateway runtime status, system metrics, and diagnostics</p>
        </div>
        <div className="text-right">
          <StatusBadge status={gatewayData?.status || 'offline'} />
          {lastRefresh && <p className="text-xs text-text-muted mt-2">Last refresh: {lastRefresh}</p>}
        </div>
      </div>

      {/* Gateway Alert Banner */}
      {!isHealthy && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-300">
                {gatewayData?.status === 'offline' ? 'Gateway Offline' : 'Gateway Degraded'}
              </p>
              {gatewayData?.error && <p className="text-sm text-text-muted mt-1">{gatewayData.error}</p>}
              {failingDeps.length > 0 && (
                <p className="text-sm text-text-muted mt-1">
                  Failing: {failingDeps.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gateway Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gateway Version"
          value={gatewayData?.version || '—'}
          icon={Zap}
          color="bg-blue-500/10 text-blue-400"
        />
        <MetricCard
          title="Gateway Uptime"
          value={gatewayData?.uptime || '—'}
          icon={Clock}
          subtitle="since last restart"
          color="bg-emerald-500/10 text-emerald-400"
        />
        <MetricCard
          title="Gateway Memory"
          value={gatewayData?.memory_mb ? `${gatewayData.memory_mb} MB` : '—'}
          icon={MemoryStick}
          color="bg-purple-500/10 text-purple-400"
        />
        <MetricCard
          title="Active Sessions"
          value={gatewayData?.active_sessions ?? '—'}
          icon={Server}
          subtitle="connected clients"
          color="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* System Metrics Section */}
      {systemData && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Monitor className="w-5 h-5 text-accent-secondary" />
            System Metrics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <GaugeBar
                percent={systemData.disk?.percent || 0}
                label={`Disk (${systemData.disk?.used_gb}/${systemData.disk?.total_gb} GB)`}
                threshold={85}
                color="bg-blue-500"
              />
            </div>
            <div className="card p-4">
              <GaugeBar
                percent={systemData.memory?.percent || 0}
                label={`Memory (${systemData.memory?.used_gb}/${systemData.memory?.total_gb} GB)`}
                threshold={90}
                color="bg-purple-500"
              />
            </div>
            <div className="card p-4">
              <GaugeBar
                percent={systemData.cpu_percent || 0}
                label="CPU Usage"
                threshold={90}
                color="bg-emerald-500"
              />
            </div>
            <div className="card flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-text-muted text-sm">System Uptime</p>
                <p className="text-xl font-bold">{formatUptime(systemData.uptime_seconds)}</p>
              </div>
            </div>
          </div>

          {/* Portal Health */}
          <div className="card">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Portal Health
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${systemData.portal_backend?.port_9000 === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div>
                  <p className="text-sm font-medium">Backend (port 9000)</p>
                  <span className={`text-xs ${systemData.portal_backend?.port_9000 === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {systemData.portal_backend?.port_9000 || 'unknown'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${systemData.portal_backend?.port_5713 === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div>
                  <p className="text-sm font-medium">Frontend (port 5713)</p>
                  <span className={`text-xs ${systemData.portal_backend?.port_5713 === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {systemData.portal_backend?.port_5713 || 'unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alert History Timeline */}
          {systemData.alert_history && systemData.alert_history.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Alert History
              </h3>
              <div className="space-y-3">
                {systemData.alert_history.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-amber-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{alert.message}</span>
                        <span className={`badge badge-${alert.status === 'resolved' ? 'success' : alert.status === 'acknowledged' ? 'warning' : 'danger'}`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {alert.time ? new Date(alert.time).toLocaleString() : 'Unknown time'} • Type: {alert.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gateway Probes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Liveness Probe (/healthz)
          </h3>
          {gatewayData?.healthz ? (
            <pre className="text-sm text-text-muted bg-bg-tertiary rounded-lg p-3 overflow-x-auto max-h-48">
              {JSON.stringify(gatewayData.healthz, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-red-400">Unreachable</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Readiness Probe (/readyz)
          </h3>
          {gatewayData?.readyz ? (
            <pre className="text-sm text-text-muted bg-bg-tertiary rounded-lg p-3 overflow-x-auto max-h-48">
              {JSON.stringify(gatewayData.readyz, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-red-400">Unreachable</p>
          )}
        </div>
      </div>

      {/* Compaction Mode */}
      {gatewayData?.compaction_mode && (
        <div className="card">
          <h3 className="font-semibold mb-2">Compaction Mode</h3>
          <p className="text-text-muted">{gatewayData.compaction_mode}</p>
        </div>
      )}
    </div>
  );
}
