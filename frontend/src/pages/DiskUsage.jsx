import { useState, useEffect } from 'react';
import api from '../services/api';
import { HardDrive, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

const formatSize = (size) => {
  if (!size) return '—';
  return size;
};

const parseSizeToBytes = (sizeStr) => {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMG]?)B?$/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 'G') return num * 1024 * 1024 * 1024;
  if (unit === 'M') return num * 1024 * 1024;
  if (unit === 'K') return num * 1024;
  return num;
};

export default function DiskUsage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/disk');
      setData(res.data);
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to load disk data: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCleanup = async () => {
    setCleaning(true);
    setMessage(null);
    try {
      const res = await api.post('/disk/cleanup', { target: 'all' });
      setMessage({ type: 'success', text: `Cleaned: ${JSON.stringify(res.data.cleaned)}` });
      await loadData();
    } catch (e) {
      setMessage({ type: 'error', text: `Cleanup failed: ${e.message}` });
    } finally {
      setCleaning(false);
    }
  };

  const getStatusColor = (percent) => {
    if (percent >= 85) return 'red';
    if (percent >= 70) return 'yellow';
    return 'green';
  };

  const statusColor = data ? getStatusColor(data.percent) : 'green';
  const gaugePercent = data ? data.percent : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Disk Usage Dashboard</h2>
        <button onClick={loadData} className="btn btn-sm btn-ghost">Refresh</button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>{message.text}</div>
      )}

      {/* Disk Gauge */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-6 h-6 text-accent-primary" />
            <h3 className="font-bold text-lg">Overall Disk Usage</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            statusColor === 'red' ? 'bg-red-500/10 text-red-400' :
            statusColor === 'yellow' ? 'bg-yellow-500/10 text-yellow-400' :
            'bg-emerald-500/10 text-emerald-400'
          }`}>
            {statusColor === 'red' ? '⚠️ Critical' : statusColor === 'yellow' ? '⚡ Warning' : '✅ Healthy'}
            {data && ` — ${data.disk.total} total, ${data.disk.used} used`}
          </div>
        </div>

        {/* Gauge bar */}
        <div className="relative h-8 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              statusColor === 'red' ? 'bg-red-500' :
              statusColor === 'yellow' ? 'bg-yellow-500' :
              'bg-emerald-500'
            }`}
            style={{ width: `${gaugePercent}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
            {gaugePercent}%
          </div>
        </div>

        <div className="flex justify-between mt-2 text-xs text-text-muted">
          <span>0%</span>
          <span>70% (warning)</span>
          <span>85% (critical)</span>
          <span>100%</span>
        </div>
      </div>

      {/* Cleanup Button */}
      <button
        onClick={handleCleanup}
        className="btn btn-ghost border border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
        disabled={cleaning}
      >
        <Trash2 className="w-4 h-4" />
        {cleaning ? 'Cleaning...' : 'Clean Up Disk Space'}
        <span className="text-xs text-text-muted">(logs, caches, temp files)</span>
      </button>

      {/* Top Consumers */}
      <div className="card p-5">
        <h3 className="font-bold mb-4">Top Disk Consumers</h3>
        {data && data.top_dirs && data.top_dirs.length > 0 ? (
          <div className="space-y-2">
            {data.top_dirs.map((dir, i) => {
              const pct = Math.min(100, (parseSizeToBytes(dir.size) / (parseSizeToBytes(data.disk.total) || 1)) * 100);
              const color = pct > 15 ? 'red' : pct > 5 ? 'yellow' : 'green';
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-6 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-mono text-xs truncate">{dir.path}</span>
                      <span className="text-text-secondary">{dir.size}</span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          color === 'red' ? 'bg-red-500' : color === 'yellow' ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
