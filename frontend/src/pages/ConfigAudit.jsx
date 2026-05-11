import { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Search, Filter, Download, RefreshCw } from 'lucide-react';

export default function ConfigAudit() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(null);
  const pageSize = 25;

  useEffect(() => {
    loadAuditLogs();
    loadStats();
  }, [currentPage, userFilter, actionFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize,
      });
      
      if (userFilter) params.set('user', userFilter);
      if (actionFilter) params.set('action', actionFilter);
      params.set('days', '30');
      
      const res = await api.get(`/config/audit?${params}`);
      setAuditLogs(res.data.logs || res.data.logs || []);
      setTotalPages(Math.ceil((res.data.total || res.data.logs?.length || 0) / pageSize));
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/config/audit/stats');
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString('en-SG', { 
      dateStyle: 'medium', 
      timeStyle: 'short',
      timeZone: 'Asia/Singapore' 
    });
  };

  const getActionBadge = (action) => {
    const color = action.includes('patched') ? 'bg-blue-500/20 text-blue-400' :
                  action.includes('replaced') ? 'bg-purple-500/20 text-purple-400' :
                  action.includes('restored') ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-gray-500/20 text-gray-400';
    return <span className={`badge ${color}`}>{action}</span>;
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Details'];
    const rows = auditLogs.map(log => [
      formatTimestamp(log.timestamp),
      log.user || 'unknown',
      log.action,
      log.resource_type || '',
      JSON.stringify(log.metadata || {})
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs by search
  const configLogs = auditLogs.filter(log => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        log.action?.toLowerCase().includes(searchLower) ||
        log.user?.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-primary" />
            Config Audit Log
          </h2>
          <p className="text-sm text-text-muted mt-1">Track who changed what and when</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn btn-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={loadAuditLogs} className="btn btn-sm btn-ghost">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-text-muted flex items-center gap-1">
            <Search className="w-3 h-3" /> Search
          </label>
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions, users, details..."
            className="input input-sm w-full"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted flex items-center gap-1">
            <Filter className="w-3 h-3" /> User
          </label>
          <input 
            type="text" 
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="All users"
            className="input input-sm w-full"
          />
        </div>
        <div>
          <label className="text-xs text-text-muted flex items-center gap-1">
            <Filter className="w-3 h-3" /> Action
          </label>
          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input input-sm w-full"
          >
            <option value="">All actions</option>
            <option value="config_patched">Patched</option>
            <option value="config_replaced">Replaced</option>
            <option value="config_restored">Restored</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-text-muted">Config Changes</div>
          <div className="text-2xl font-bold">{stats?.total_changes || configLogs.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-text-muted">Unique Users</div>
          <div className="text-2xl font-bold">{stats ? Object.keys(stats.by_user || {}).length : new Set(configLogs.map(l => l.user || 'unknown')).size}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-text-muted">Patches</div>
          <div className="text-2xl font-bold">{stats?.by_action?.config_patched || configLogs.filter(l => l.action?.includes('patched')).length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-text-muted">Restores</div>
          <div className="text-2xl font-bold">{stats?.by_action?.config_restored || configLogs.filter(l => l.action?.includes('restored')).length}</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-text-muted">
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Resource</th>
              <th className="text-left p-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {configLogs.map((log, index) => (
              <tr key={index} className="hover:bg-bg-tertiary transition-colors">
                <td className="p-3 font-mono text-xs">{formatTimestamp(log.timestamp)}</td>
                <td className="p-3">
                  <span className="badge badge-sm">{log.user || 'unknown'}</span>
                </td>
                <td className="p-3">{getActionBadge(log.action)}</td>
                <td className="p-3">{log.resource_type || 'config'}</td>
                <td className="p-3">
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-text-muted hover:text-text-primary">
                      View details
                    </summary>
                    <pre className="mt-2 bg-bg-tertiary p-3 rounded-lg text-xs overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(log.metadata || {}, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn btn-sm"
            >
              Previous
            </button>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {configLogs.length === 0 && !loading && (
        <div className="card p-8 text-center text-text-muted">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No config changes recorded</p>
          <p className="text-sm mt-1">Changes will appear here when config is modified</p>
        </div>
      )}
    </div>
  );
}
