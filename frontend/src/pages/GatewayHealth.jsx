import { useState, useEffect } from 'react';
import api from '../services/api';
import { Activity, Server, Clock, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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

export default function GatewayHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchHealth = async () => {
    try {
      const resp = await api.get('/health/gateway');
      setData(resp.data);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setData({ status: 'offline', error: err.message || 'Gateway unreachable' });
      setLastRefresh(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  const failingDeps = data?.failing_dependencies || [];
  const isHealthy = data?.status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="w-6 h-6 text-accent-primary" />
            Gateway Health
          </h2>
          <p className="text-text-muted mt-1">OpenClaw Gateway runtime status and diagnostics</p>
        </div>
        <div className="text-right">
          <StatusBadge status={data?.status || 'offline'} />
          {lastRefresh && <p className="text-xs text-text-muted mt-2">Last refresh: {lastRefresh}</p>}
        </div>
      </div>

      {/* Alert Banner */}
      {!isHealthy && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-300">
                {data?.status === 'offline' ? 'Gateway Offline' : 'Gateway Degraded'}
              </p>
              {data?.error && <p className="text-sm text-text-muted mt-1">{data.error}</p>}
              {failingDeps.length > 0 && (
                <p className="text-sm text-text-muted mt-1">
                  Failing: {failingDeps.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Version"
          value={data?.version || '—'}
          icon={Zap}
          color="bg-blue-500/10 text-blue-400"
        />
        <MetricCard
          title="Uptime"
          value={data?.uptime || '—'}
          icon={Clock}
          subtitle="since last restart"
          color="bg-emerald-500/10 text-emerald-400"
        />
        <MetricCard
          title="Memory"
          value={data?.memory_mb ? `${data.memory_mb} MB` : '—'}
          icon={Activity}
          color="bg-purple-500/10 text-purple-400"
        />
        <MetricCard
          title="Active Sessions"
          value={data?.active_sessions ?? '—'}
          icon={Server}
          subtitle="connected clients"
          color="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* Runtime Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liveness Probe */}
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Liveness Probe (/healthz)
          </h3>
          {data?.healthz ? (
            <pre className="text-sm text-text-muted bg-bg-tertiary rounded-lg p-3 overflow-x-auto max-h-48">
              {JSON.stringify(data.healthz, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-red-400">Unreachable</p>
          )}
        </div>

        {/* Readiness Probe */}
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Readiness Probe (/readyz)
          </h3>
          {data?.readyz ? (
            <pre className="text-sm text-text-muted bg-bg-tertiary rounded-lg p-3 overflow-x-auto max-h-48">
              {JSON.stringify(data.readyz, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-red-400">Unreachable</p>
          )}
        </div>
      </div>

      {/* Compaction Mode */}
      {data?.compaction_mode && (
        <div className="card">
          <h3 className="font-semibold mb-2">Compaction Mode</h3>
          <p className="text-text-muted">{data.compaction_mode}</p>
        </div>
      )}
    </div>
  );
}
