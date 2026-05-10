import { useState, useEffect } from 'react';
import api from '../services/api';
import { RefreshCw, Play, Pause, Trash2, Plus, Clock, Eye, EyeOff } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function Crons() {
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', schedule: '*/5 * * * *', command: '', is_active: true
  });

  const fetchCrons = async () => {
    setLoading(true);
    try {
      const r = await api.get('/crons');
      setCrons(r.data?.jobs || r.data || []);
    } catch (e) { console.error('Failed to fetch crons', e); }
    setLoading(false);
  };

  useEffect(() => { fetchCrons(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/crons', formData);
    setShowForm(false);
    setFormData({ name: '', schedule: '*/5 * * * *', command: '', is_active: true });
    fetchCrons();
  };

  const handleDelete = async (id) => {
    await api.delete(`/crons/${id}`);
    fetchCrons();
  };

  const handleToggle = async (cron) => {
    await api.post(`/crons/${cron.id}`, { is_active: !cron.is_active });
    fetchCrons();
  };

  const handleRun = async (id) => {
    await api.post(`/crons/${id}/run`);
    fetchCrons();
  };

  const spinner = (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scheduled Crons</h3>
          <p className="text-text-muted text-sm">{crons.length} scheduled tasks</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Cron
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-accent-primary/30">
          <h4 className="font-semibold mb-4">Create Scheduled Task</h4>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Name</label>
              <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Cron Schedule</label>
              <input className="input font-mono" value={formData.schedule} onChange={e => setFormData({ ...formData, schedule: e.target.value })} placeholder="*/5 * * * *" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-text-secondary mb-1">Command / Endpoint</label>
              <input className="input" value={formData.command} onChange={e => setFormData({ ...formData, command: e.target.value })} placeholder="/api/health" />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? spinner : (
        <div className="card">
          {crons.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
              <p className="text-text-secondary">No scheduled tasks</p>
              <p className="text-text-muted text-sm mt-1">Create a cron to automate recurring tasks</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Schedule</th><th>Target</th><th>Status</th><th>Last Run</th><th>Next Run</th><th>Errors</th><th></th></tr></thead>
              <tbody>
                {crons.map(cron => {
                  const scheduleStr = typeof cron.schedule === 'string' ? cron.schedule : (cron.schedule?.expr || cron.schedule?.every || 'N/A');
                  const isRunning = cron.state?.runningAtMs ? true : false;
                  const lastError = cron.last_error || cron.state?.lastError;
                  return (
                  <tr key={cron.id} className="group">
                    <td className="font-medium">{cron.name || 'Untitled'}</td>
                    <td><code className="text-xs font-mono bg-bg-secondary px-2 py-0.5 rounded text-text-secondary">{scheduleStr || '—'}</code></td>
                    <td className="text-sm text-text-muted max-w-xs truncate">{cron.session_target || '—'}</td>
                    <td>
                      <span className={`badge ${cron.enabled ? 'badge-success' : (cron.session_target === 'isolated' ? 'badge-info' : 'badge-neutral')}`}>
                        {cron.enabled ? (isRunning ? 'Running' : 'Active') : 'Paused'}
                      </span>
                    </td>
                    <td className="text-text-muted text-xs">
                      {cron.last_status === 'ok' ? '✅' : '❌'} {formatDate(cron.last_run)}
                    </td>
                    <td className="text-text-muted text-xs">{formatDate(cron.next_run)}</td>
                    <td className="text-text-muted text-xs">{cron.consecutive_errors || 0}</td>
                    <td>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleRun(cron.id)} className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-accent-primary" title="Run Now">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
