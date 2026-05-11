import { useState, useEffect } from 'react';
import api from '../services/api';
import { History, RefreshCw, Download, AlertTriangle, CheckCircle, Trash2, ArrowLeft } from 'lucide-react';

export default function ConfigHistory() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [diff, setDiff] = useState(null);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState(null);
  const [userFilter, setUserFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);

  useEffect(() => {
    loadSnapshots();
    loadStats();
  }, [daysFilter]);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/config/history?days=${daysFilter}`);
      setSnapshots(res.data);
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to load history: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/config/history/stats');
      setStats(res.data);
    } catch {}
  };

  const viewSnapshot = async (snapshotId) => {
    try {
      const res = await api.get(`/config/history/${snapshotId}`);
      setSelectedSnapshot(res.data);
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to load snapshot: ${e.message}` });
    }
  };

  const viewDiff = async (id1, id2) => {
    try {
      const res = await api.get(`/config/history/${id1}/diff/${id2}`);
      setDiff(res.data);
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to compute diff: ${e.message}` });
    }
  };

  const restoreSnapshot = async (snapshotId) => {
    if (!confirm('⚠️ Restore config from this snapshot? This will replace your current config with a backup taken before the change.')) return;
    
    try {
      const res = await api.post(`/config/restore/${snapshotId}`, {
        user: 'admin',
        reason: 'Manual restore from snapshot'
      });
      setMessage({ type: 'success', text: res.data.message });
      await loadSnapshots();
    } catch (e) {
      setMessage({ type: 'error', text: `Restore failed: ${e.message}` });
    }
  };

  const createSnapshot = async () => {
    try {
      const res = await api.post('/config/snapshot', {
        user: 'admin',
        reason: 'Manual snapshot'
      });
      setMessage({ type: 'success', text: 'Snapshot created' });
      await loadSnapshots();
    } catch (e) {
      setMessage({ type: 'error', text: `Snapshot failed: ${e.message}` });
    }
  };

  const deleteSnapshot = async (snapshotId) => {
    if (!confirm('Delete this snapshot? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/config/history/${snapshotId}`);
      setMessage({ type: 'success', text: 'Snapshot deleted' });
      await loadSnapshots();
    } catch (e) {
      setMessage({ type: 'error', text: `Delete failed: ${e.message}` });
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString('en-SG', { 
      dateStyle: 'short', 
      timeStyle: 'short',
      timeZone: 'Asia/Singapore' 
    });
  };

  if (loading && snapshots.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-accent-primary" />
            Config History
          </h2>
          <p className="text-sm text-text-muted mt-1">Track, diff, and rollback config changes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={createSnapshot} className="btn btn-sm">
            <Download className="w-4 h-4" /> Snapshot Now
          </button>
          <button onClick={loadSnapshots} className="btn btn-sm btn-ghost">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-text-muted">Total Snapshots</div>
            <div className="text-2xl font-bold">{stats.total_snapshots}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-text-muted">Last 7 Days</div>
            <div className="text-2xl font-bold">{Object.values(stats.daily_last_7_days || {}).reduce((a, b) => a + b, 0)}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-text-muted">Oldest</div>
            <div className="text-sm">{stats.oldest_snapshot ? formatTimestamp(stats.oldest_snapshot) : 'N/A'}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-text-muted">Most Active User</div>
            <div className="text-sm font-medium">
              {Object.entries(stats.per_user || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex gap-4">
        <div className="flex-1">
          <label className="text-xs text-text-muted">Days to show</label>
          <input 
            type="number" 
            value={daysFilter} 
            onChange={(e) => setDaysFilter(parseInt(e.target.value) || 7)}
            className="input input-sm w-24"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-muted">Filter by user</label>
          <input 
            type="text" 
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="All users"
            className="input input-sm w-full"
          />
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`card p-4 ${message.type === 'error' ? 'bg-red-500/10 border-red-500' : 'bg-emerald-500/10 border-emerald-500'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Snapshot List */}
      <div className="card">
        <div className="divide-y divide-gray-800">
          {snapshots
            .filter(s => !userFilter || s.user === userFilter)
            .map((snapshot, index) => (
            <div key={snapshot.id} className="p-4 hover:bg-bg-tertiary transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">#{snapshot.id}</span>
                    <span className="text-sm text-text-muted">{formatTimestamp(snapshot.timestamp)}</span>
                    <span className="badge badge-sm">{snapshot.user}</span>
                  </div>
                  {snapshot.diff_summary && (
                    <p className="text-xs text-text-muted mt-1">{snapshot.diff_summary}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => viewSnapshot(snapshot.id)}
                    className="btn btn-sm btn-ghost"
                    title="View"
                  >
                    <ArrowLeft className="w-4 h-4" /> View
                  </button>
                  {index > 0 && (
                    <button 
                      onClick={() => viewDiff(snapshot.id, snapshots[index - 1].id)}
                      className="btn btn-sm btn-ghost"
                      title="Diff vs previous"
                    >
                      Diff
                    </button>
                  )}
                  <button 
                    onClick={() => restoreSnapshot(snapshot.id)}
                    className="btn btn-sm"
                    title="Restore"
                  >
                    Restore
                  </button>
                  <button 
                    onClick={() => deleteSnapshot(snapshot.id)}
                    className="btn btn-sm btn-ghost text-red-400 hover:text-red-300"
                    title="Delete"
                    disabled={index === 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Snapshot Detail Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Snapshot #{selectedSnapshot.id}</h3>
              <button onClick={() => setSelectedSnapshot(null)} className="btn btn-sm btn-ghost">✕</button>
            </div>
            <div className="text-sm text-text-muted mb-4">
              <span>{formatTimestamp(selectedSnapshot.timestamp)}</span> · <span>{selectedSnapshot.user}</span>
            </div>
            <pre className="bg-bg-tertiary p-4 rounded-lg overflow-x-auto text-xs">
              {JSON.stringify(selectedSnapshot.config, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Diff Modal */}
      {diff && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                Config Diff · {diff.total_changes} changes
              </h3>
              <button onClick={() => setDiff(null)} className="btn btn-sm btn-ghost">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-text-muted mb-4">
              <div>From: #{diff.snapshot1.id} ({formatTimestamp(diff.snapshot1.timestamp)})</div>
              <div>To: #{diff.snapshot2.id} ({formatTimestamp(diff.snapshot2.timestamp)})</div>
            </div>
            <div className="divide-y divide-gray-800">
              {diff.changes.map((change, i) => (
                <div key={i} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge badge-sm ${
                      change.type === 'added' ? 'bg-emerald-500/20 text-emerald-400' :
                      change.type === 'removed' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {change.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm">{change.path}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    {change.old_value !== undefined && (
                      <div className="bg-red-500/5 p-2 rounded">
                        <div className="text-text-muted mb-1">Old</div>
                        <pre className="font-mono text-xs">{JSON.stringify(change.old_value, null, 2)}</pre>
                      </div>
                    )}
                    {change.new_value !== undefined && (
                      <div className="bg-emerald-500/5 p-2 rounded">
                        <div className="text-text-muted mb-1">New</div>
                        <pre className="font-mono text-xs">{JSON.stringify(change.new_value, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
