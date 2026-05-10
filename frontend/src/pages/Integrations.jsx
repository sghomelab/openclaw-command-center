import { useState, useEffect } from 'react';
import api from '../services/api';
import { Puzzle, Trash2, Plus, RefreshCw, ExternalLink } from 'lucide-react';
import { formatDate, getStatusBadge } from '../lib/utils';

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'webhook', is_active: true, config: {} });

  const fetchIntegrations = async () => {
    setLoading(true);
    const r = await api.get('/integrations');
    setIntegrations(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/integrations', { ...formData, config: typeof formData.config === 'string' ? JSON.parse(formData.config) : formData.config });
    setShowForm(false);
    setFormData({ name: '', type: 'webhook', is_active: true, config: {} });
    fetchIntegrations();
  };

  const handleDelete = async (id) => {
    await api.delete(`/integrations/${id}`);
    fetchIntegrations();
  };

  const typeIcons = {
    webhook: '\ud83d\udd17', slack: '\ud83d\udcac', email: '\ud83d\udce7', discord: '\u2755', generic: '\ud83d\ud50c',
  };

  const getConfig = (integ) => {
    const c = integ.config;
    if (!c) return null;
    try {
      return typeof c === 'string' ? JSON.parse(c) : c;
    } catch {
      return null;
    }
  };

  const getCredentials = (integ) => {
    const c = integ.credentials;
    if (!c) return null;
    try {
      return typeof c === 'string' ? JSON.parse(c) : c;
    } catch {
      return null;
    }
  };

  const getAgentEmoji = (integ) => {
    const c = getConfig(integ);
    if (c && c.emoji) return c.emoji;
    return typeIcons[integ.type] || '\ud83d\ud50c';
  };

  const getAgentRole = (integ) => {
    const c = getConfig(integ);
    if (c && c.role) return c.role;
    return null;
  };

  const getChannelName = (integ) => {
    const creds = getCredentials(integ);
    if (creds && creds.channelName) return creds.channelName;
    const c = getConfig(integ);
    if (c && c.channelName) return c.channelName;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Integrations</h3>
          <p className="text-text-muted text-sm">{integrations.length} connected services</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Integration
        </button>
      </div>

      {showForm && (
        <div className="card border-accent-primary/30">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Name</label>
              <input className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Type</label>
              <select className="input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="webhook">Webhook</option>
                <option value="slack">Slack</option>
                <option value="discord">Discord</option>
                <option value="email">Email</option>
                <option value="generic">Generic API</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-text-secondary mb-1">Config (JSON)</label>
              <textarea className="input font-mono text-xs" rows={3} placeholder='{"url": "https://example.com/hook"}' value={typeof formData.config === 'string' ? formData.config : JSON.stringify(formData.config, null, 2)} onChange={e => setFormData({...formData, config: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">Add Integration</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map(integ => {
          const agentRole = getAgentRole(integ);
          const channelName = getChannelName(integ);
          return (
          <div key={integ.id} className="card group hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{getAgentEmoji(integ)}</div>
                <div>
                  <h4 className="font-semibold text-sm">{integ.name}</h4>
                  <p className="text-xs text-text-muted">{integ.type}</p>
                  {agentRole && <p className="text-xs text-accent-primary mt-0.5">{agentRole}</p>}
                  {channelName && <p className="text-xs text-text-muted mt-0.5">{channelName}</p>}
                </div>
              </div>
              <span className={`badge ${integ.is_active ? 'badge-success' : 'badge-neutral'}`}>
                {integ.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {integ.endpoint && (
              <p className="text-xs font-mono text-text-muted truncate bg-bg-secondary rounded px-2 py-1 mb-3">
                {integ.endpoint}
              </p>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <span className="text-xs text-text-muted">
                {integ.last_sync_at ? `Last: ${formatDate(integ.last_sync_at)}` : 'Never synced'}
              </span>
              <div className="flex gap-1">
                <button className="p-1.5 text-text-muted hover:text-accent-primary rounded transition-colors" title="Sync">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(integ.id)} className="p-1.5 text-text-muted hover:text-accent-danger rounded transition-colors" title="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {integrations.length === 0 && !loading && (
        <div className="card text-center py-16">
          <Puzzle className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
          <p className="text-text-secondary">No integrations configured</p>
          <p className="text-text-muted text-sm mt-1">Connect Slack, Discord, webhooks, and more</p>
        </div>
      )}
    </div>
  );
}
