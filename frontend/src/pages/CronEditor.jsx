import { useState, useEffect } from 'react';
import api from '../services/api';
import { Clock, Plus, Edit2, Trash2, Play, Eye } from 'lucide-react';

export default function CronEditor() {
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    schedule: '',
    scheduleKind: 'cron',
    payload: '',
    deliveryChannel: 'discord',
  });

  const loadCrons = async () => {
    try {
      const res = await api.get('/crons');
      setCrons(res.data.jobs || []);
    } catch { setCrons([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCrons(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this cron job?')) return;
    try {
      await api.delete(`/crons/${id}`);
      loadCrons();
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const handleRun = async (id) => {
    try {
      await api.post(`/crons/${id}/run`);
      alert('Job triggered!');
    } catch (e) { alert('Run failed: ' + e.message); }
  };

  const handleEdit = (cron) => {
    setEditing(cron);
    setForm({
      name: cron.name,
      schedule: cron.schedule?.expr || JSON.stringify(cron.schedule || {}),
      scheduleKind: cron.schedule?.kind || 'cron',
      payload: cron.payload?.message || '',
      deliveryChannel: 'discord',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const payload = JSON.parse(form.payload) || { kind: 'agentTurn', message: form.payload };
      const schedule = form.scheduleKind === 'cron' ? { kind: 'cron', expr: form.schedule } : { kind: 'every', everyMs: parseInt(form.schedule) };

      if (editing) {
        await api.post(`/crons/${editing.id}`, { name: form.name, schedule, payload });
      } else {
        await api.post('/crons', { name: form.name, schedule, payload, delivery: { mode: 'announce', channel: form.deliveryChannel } });
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', schedule: '', scheduleKind: 'cron', payload: '', deliveryChannel: 'discord' });
      loadCrons();
    } catch (e) { alert('Save failed: ' + e.message); }
  };

  const formatSchedule = (s) => {
    if (typeof s === 'string') return s;
    if (s?.expr) return s.expr;
    if (s?.every) return `every ${s.everyMs}ms`;
    return JSON.stringify(s);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cron Job Editor</h2>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', schedule: '', scheduleKind: 'cron', payload: '', deliveryChannel: 'discord' }); }}>
          <Plus className="w-4 h-4" /> New Job
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card p-5 space-y-4">
          <h3 className="font-bold">{editing ? 'Edit Job' : 'Create New Job'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-muted">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Job name" />
            </div>
            <div>
              <label className="text-sm text-text-muted">Delivery Channel</label>
              <select className="input" value={form.deliveryChannel} onChange={e => setForm({...form, deliveryChannel: e.target.value})}>
                <option value="discord">Discord</option>
                <option value="telegram">Telegram</option>
                <option value="webchat">Webchat</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-text-muted">Schedule Type</label>
            <select className="input" value={form.scheduleKind} onChange={e => setForm({...form, scheduleKind: e.target.value})}>
              <option value="cron">Cron Expression</option>
              <option value="every">Every (ms)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-text-muted">{form.scheduleKind === 'cron' ? 'Cron Expression (e.g., 0 9 * * *)' : 'Interval (ms)'}</label>
            <input className="input" value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})} placeholder="Schedule" />
          </div>
          <div>
            <label className="text-sm text-text-muted">Payload (message text)</label>
            <textarea className="input" rows={3} value={form.payload} onChange={e => setForm({...form, payload: e.target.value})} placeholder="Agent message to execute" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSave}>Save</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Cron List */}
      <div className="space-y-2">
        {crons.map(cron => (
          <div key={cron.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`badge ${cron.enabled ? 'badge-success' : 'badge-neutral'}`}>
                  {cron.enabled ? 'Active' : 'Paused'}
                </span>
                <span className="font-semibold">{cron.name}</span>
                <code className="text-xs bg-bg-tertiary px-2 py-0.5 rounded font-mono text-text-muted">{formatSchedule(cron.schedule)}</code>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleRun(cron.id)} className="p-1.5 hover:bg-bg-tertiary rounded" title="Run Now"><Play className="w-4 h-4 text-text-muted" /></button>
                <button onClick={() => handleEdit(cron)} className="p-1.5 hover:bg-bg-tertiary rounded" title="Edit"><Edit2 className="w-4 h-4 text-text-muted" /></button>
                <button onClick={() => setViewing(cron)} className="p-1.5 hover:bg-bg-tertiary rounded" title="View"><Eye className="w-4 h-4 text-text-muted" /></button>
                <button onClick={() => handleDelete(cron.id)} className="p-1.5 hover:bg-bg-tertiary rounded" title="Delete"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
            {cron.consecutive_errors > 0 && (
              <div className="mt-2 text-xs text-red-400">{cron.consecutive_errors} consecutive errors — {cron.last_error?.substring(0, 100)}</div>
            )}
          </div>
        ))}
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setViewing(null)}>
          <div className="card p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-3">{viewing.name}</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-text-muted">Schedule:</span> <code className="bg-bg-tertiary px-1 rounded">{formatSchedule(viewing.schedule)}</code></div>
              <div><span className="text-text-muted">Status:</span> {viewing.enabled ? '✅ Active' : '⏸️ Paused'}</div>
              <div><span className="text-text-muted">Last Run:</span> {viewing.last_run ? new Date(viewing.last_run).toLocaleString() : '—'}</div>
              <div><span className="text-text-muted">Next Run:</span> {viewing.next_run ? new Date(viewing.next_run).toLocaleString() : '—'}</div>
              <div><span className="text-text-muted">Errors:</span> {viewing.consecutive_errors || 0}</div>
              {viewing.payload?.message && <div><span className="text-text-muted">Payload:</span> <pre className="bg-bg-tertiary p-2 rounded text-xs mt-1 whitespace-pre-wrap">{viewing.payload.message}</pre></div>}
            </div>
            <button className="btn btn-sm btn-ghost mt-4" onClick={() => setViewing(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
