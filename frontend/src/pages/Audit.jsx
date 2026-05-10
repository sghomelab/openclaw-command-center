import { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Search, Filter } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    const r = await api.get(`/audit/logs?page=${page}`);
    setLogs(r.data.items || r.data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Audit Logs</h3>
          <p className="text-text-muted text-sm">Track all system activities</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><Filter className="w-4 h-4" /> Filter</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card overflow-x-auto">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
              <p className="text-text-secondary">No audit logs yet</p>
              <p className="text-text-muted text-sm mt-1">Logs will appear as system actions are performed</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Timestamp</th><th>Action</th><th>User</th><th>Resource</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td className="text-text-muted text-xs font-mono">{formatDate(log.timestamp || log.created_at)}</td>
                    <td><span className="badge badge-info">{log.action || log.event_type || 'unknown'}</span></td>
                    <td className="text-sm">{log.user_id || log.user || '—'}</td>
                    <td className="text-sm text-text-secondary">{log.resource || log.target || '—'}</td>
                    <td className="text-xs text-text-muted max-w-xs truncate">{log.details || log.description || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
