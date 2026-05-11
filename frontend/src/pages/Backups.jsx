import { useState, useEffect } from 'react';
import api from '../services/api';
import { Archive, CheckCircle, AlertTriangle, RefreshCw, Download, Calendar } from 'lucide-react';

export default function Backups() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/backups/status');
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!data) return <div className="text-center py-12 text-text-muted">Failed to load backup status</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Backup Status</h2>
        <button className="btn btn-sm btn-ghost" onClick={loadData}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-text-muted text-sm">Total Backups</p>
          <p className="text-2xl font-bold">{data.total_backups}</p>
        </div>
        <div className="card p-4">
          <p className="text-text-muted text-sm">Total Size</p>
          <p className="text-2xl font-bold">{data.total_size}</p>
        </div>
        <div className="card p-4">
          <p className="text-text-muted text-sm">Latest Backup</p>
          <p className="text-lg font-bold">{data.latest.date || '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-text-muted text-sm">Latest Status</p>
          <div className="flex items-center gap-2 mt-1">
            {data.latest.verified ? (
              <><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-emerald-400 font-medium">Verified OK</span></>
            ) : (
              <><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="text-amber-400 font-medium">Unverified</span></>
            )}
          </div>
        </div>
      </div>

      {/* Backup Files */}
      <div className="card p-5">
        <h3 className="font-bold mb-4">Backup Files</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted border-b border-gray-800">
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Filename</th>
                <th className="text-right py-2 px-3">Size</th>
                <th className="text-left py-2 px-3">Modified</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.files.map((file, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-bg-tertiary/50">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-text-muted" />
                      {file.date}
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono text-xs">{file.filename}</td>
                  <td className="py-2 px-3 text-right">{file.size_human}</td>
                  <td className="py-2 px-3 text-text-muted">{new Date(file.modified * 1000).toLocaleString()}</td>
                  <td className="py-2 px-3 text-center">
                    <CheckCircle className="w-4 h-4 text-emerald-400 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Viewer */}
      <div className="card p-5">
        <button
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          onClick={() => setShowLog(!showLog)}
        >
          {showLog ? <Archive className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          {showLog ? 'Hide Log' : 'Show Backup Log'} ({data.recent_log_entries.length} entries)
        </button>
        {showLog && (
          <pre className="mt-3 text-xs text-text-secondary whitespace-pre-wrap bg-bg-tertiary p-4 rounded-lg max-h-60 overflow-y-auto font-mono">
            {data.recent_log_entries.join('\n')}
          </pre>
        )}
      </div>

      {/* Info */}
      <div className="card p-5 bg-bg-tertiary">
        <h4 className="font-bold mb-2 text-sm">Backup Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-text-muted">
          <div><span className="text-text-secondary">Directory:</span> {data.backup_dir}</div>
          <div><span className="text-text-secondary">Schedule:</span> Daily at 03:00 UTC</div>
          <div><span className="text-text-secondary">Retention:</span> 7 days</div>
          <div><span className="text-text-secondary">Excluded:</span> venv/, __pycache__, .db-journal</div>
        </div>
      </div>
    </div>
  );
}
