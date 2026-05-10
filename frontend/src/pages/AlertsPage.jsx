import { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

const METRICS = [
  { value: 'disk', label: 'Disk Usage (%)' },
  { value: 'memory', label: 'Memory Usage (%)' },
  { value: 'agent_offline', label: 'Agent Offline (minutes)' },
];
const OPERATORS = ['>', '<', '=='];
const CHANNELS = ['discord', 'telegram', 'webchat'];

export default function AlertsPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ metric: 'disk', operator: '>', threshold: '90', action: 'notify', channel: 'discord', name: '' });

  const loadRules = async () => {
    try {
      const res = await api.get('/alerts/rules');
      setRules(res.data.rules || []);
    } catch { setRules([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRules(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/alerts/rules/create', form);
      setShowForm(false);
      setForm({ metric: 'disk', operator: '>', threshold: '90', action: 'notify', channel: 'discord', name: '' });
      loadRules();
    } catch (e) { alert('Create failed: ' + e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this alert rule?')) return;
    try {
      await api.delete(`/alerts/rules/${id}`);
      loadRules();
    } catch (e) { alert('Delete failed: ' + e.message); }
  };

  const metricLabel = (m) => METRICS.find(x => x.value === m)?.label || m;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Alert Rules Engine</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <h3 className="font-bold">Create Alert Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-muted">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Rule name" />
            </div>
            <div>
              <label className="text-sm text-text-muted">Metric</label>
              <select className="input" value={form.metric} onChange={e => setForm({...form, metric: e.target.value})}>
                {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-text-muted">Operator</label>
              <select className="input" value={form.operator} onChange={e => setForm({...form, operator: e.target.value})}>
                {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-muted">Threshold</label>
              <input className="input" type="number" value={form.threshold} onChange={e => setForm({...form, threshold: e.target.value})} />
            </div>
            <div>
              <label className="text-sm text-text-muted">Channel</label>
              <select className="input" value={form.channel} onChange={e => setForm({...form, channel: e.target.value})}>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleCreate}>Create Rule</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No alert rules configured</p>
            <button className="btn btn-sm btn-primary mt-3" onClick={() => setShowForm(true)}>Create Your First Rule</button>
          </div>
        )}

        {rules.map(rule => (
          <div key={rule.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="font-semibold">{rule.name || 'Unnamed Rule'}</p>
                  <p className="text-sm text-text-muted">
                    {metricLabel(rule.metric)} {rule.operator} {rule.threshold} → notify via {rule.channel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${rule.enabled !== false ? 'badge-success' : 'badge-neutral'}`}>
                  {rule.enabled !== false ? 'Active' : 'Disabled'}
                </span>
                <button onClick={() => handleDelete(rule.id)} className="p-1.5 hover:bg-bg-tertiary rounded">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
