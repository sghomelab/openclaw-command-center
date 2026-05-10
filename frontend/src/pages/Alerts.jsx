import { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, AlertTriangle, CheckCircle, Clock, Filter, Plus, Search, Eye, XCircle } from 'lucide-react';
import { formatDate, getStatusBadge } from '../lib/utils';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [tab, setTab] = useState('alerts');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', condition_type: 'threshold', metric_path: '',
    threshold_value: null, threshold_operator: 'lt',
    severity: 'warning', cooldown_seconds: 300, channels: ['email'],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, r, i] = await Promise.all([
        api.get('/alerts'),
        api.get('/alerts/rules'),
        api.get('/alerts/incidents'),
      ]);
      setAlerts(a.data);
      setRules(r.data);
      setIncidents(i.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    await api.post('/alerts/rules', formData);
    setShowForm(false);
    setFormData({
      name: '', condition_type: 'threshold', metric_path: '',
      threshold_value: null, threshold_operator: 'lt',
      severity: 'warning', cooldown_seconds: 300, channels: ['email'],
    });
    fetchData();
  };

  const handleDeleteRule = async (id) => {
    await api.delete(`/alerts/rules/${id}`);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Alert Management</h3>
          <p className="text-text-muted text-sm">Monitor and manage system alerts</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-secondary p-1 rounded-lg w-fit">
        {[
          { key: 'alerts', label: 'Alerts', icon: Bell },
          { key: 'rules', label: 'Rules', icon: Filter },
          { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === key ? 'bg-accent-primary text-white shadow-lg shadow-blue-500/20' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Alerts Tab */}
          {tab === 'alerts' && (
            <div className="card">
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
                  <p className="text-text-secondary">No active alerts</p>
                  <p className="text-text-muted text-sm mt-1">All systems operating normally</p>
                </div>
              ) : (
                <table className="table">
                  <thead><tr><th>Alert</th><th>Status</th><th>Triggered</th><th>Actions</th></tr></thead>
                  <tbody>
                    {alerts.map(a => (
                      <tr key={a.id}>
                        <td className="font-medium">{a.rule_id} — Rule #{a.rule_id}</td>
                        <td><span className={`badge badge-${getStatusBadge(a.status)}`}>{a.status}</span></td>
                        <td className="text-text-muted">{formatDate(a.triggered_at)}</td>
                        <td>
                          <div className="flex gap-1">
                            <button className="btn-ghost !px-2 !py-1"><Eye className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {tab === 'rules' && (
            <div className="space-y-4">
              {showForm && (
                <div className="card border-accent-primary/30">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Create Alert Rule</h4>
                    <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary"><XCircle className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Name</label>
                      <input className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Metric Path</label>
                      <input className="input" value={formData.metric_path} onChange={e => setFormData({...formData, metric_path: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Threshold Value</label>
                      <input type="number" step="any" className="input" value={formData.threshold_value ?? ''} onChange={e => setFormData({...formData, threshold_value: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Operator</label>
                      <select className="input" value={formData.threshold_operator} onChange={e => setFormData({...formData, threshold_operator: e.target.value})}>
                        <option value="lt">&lt; Less Than</option>
                        <option value="gt">&gt; Greater Than</option>
                        <option value="eq">= Equal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Severity</label>
                      <select className="input" value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Cooldown (seconds)</label>
                      <input type="number" className="input" value={formData.cooldown_seconds} onChange={e => setFormData({...formData, cooldown_seconds: parseInt(e.target.value)})} />
                    </div>
                    <div className="md:col-span-2">
                      <button type="submit" className="btn-primary">Create Rule</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card">
                {rules.length === 0 ? (
                  <div className="text-center py-12">
                    <Filter className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
                    <p className="text-text-secondary">No alert rules configured</p>
                  </div>
                ) : (
                  <table className="table">
                    <thead><tr><th>Rule</th><th>Metric</th><th>Threshold</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {rules.map(r => (
                        <tr key={r.id}>
                          <td className="font-medium">{r.name}</td>
                          <td className="font-mono text-xs text-text-muted">{r.metric_path}</td>
                          <td>{r.threshold_value} {r.threshold_operator || ''}</td>
                          <td><span className={`badge badge-${r.severity === 'critical' ? 'danger' : r.severity === 'warning' ? 'warning' : 'info'}`}>{r.severity}</span></td>
                          <td><span className="badge badge-success">{r.is_active ? 'Active' : 'Inactive'}</span></td>
                          <td>
                            <button onClick={() => handleDeleteRule(r.id)} className="text-text-muted hover:text-accent-danger"><XCircle className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Incidents Tab */}
          {tab === 'incidents' && (
            <div className="card">
              {incidents.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
                  <p className="text-text-secondary">No incidents</p>
                </div>
              ) : (
                <table className="table">
                  <thead><tr><th>Title</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead>
                  <tbody>
                    {incidents.map(i => (
                      <tr key={i.id}>
                        <td className="font-medium">{i.title}</td>
                        <td><span className={`badge ${i.priority === 'P1' ? 'badge-danger' : i.priority === 'P2' ? 'badge-warning' : 'badge-info'}`}>{i.priority}</span></td>
                        <td><span className={`badge badge-${getStatusBadge(i.status)}`}>{i.status}</span></td>
                        <td className="text-text-muted">{formatDate(i.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
