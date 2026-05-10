import { useState, useEffect } from 'react';
import api from '../services/api';
import { Workflow, Play, Trash2, Plus, Eye } from 'lucide-react';
import { formatDate, getStatusBadge } from '../lib/utils';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });

  const fetchWorkflows = async () => {
    setLoading(true);
    const r = await api.get('/workflows');
    setWorkflows(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/workflows', formData);
    setShowForm(false);
    setFormData({ name: '', description: '', is_active: true });
    fetchWorkflows();
  };

  const handleDelete = async (id) => {
    await api.delete(`/workflows/${id}`);
    fetchWorkflows();
  };

  const handleRun = async (id) => {
    await api.post(`/workflows/${id}/run`, {});
    fetchWorkflows();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Workflow Engine</h3>
          <p className="text-text-muted text-sm">{workflows.length} workflows</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {showForm && (
        <div className="card border-accent-primary/30">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Name</label>
              <input className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-4 h-4 rounded accent-blue-500" />
                <span className="text-sm text-text-secondary">Active</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-text-secondary mb-1">Description</label>
              <textarea className="input" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">Create Workflow</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {workflows.map(wf => (
          <div key={wf.id} className="card group hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{wf.name}</h4>
                    <span className={`badge badge-${getStatusBadge(wf.status)}`}>{wf.status}</span>
                    <span className={`badge ${wf.is_active !== false ? 'badge-success' : 'badge-neutral'}`}>{wf.is_active !== false ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {wf.steps_count} steps · {wf.success_count} runs · {wf.failure_count} failures
                    {wf.last_run_at && ` · Last: ${formatDate(wf.last_run_at)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRun(wf.id)} className="btn-ghost !px-2 !py-1" title="Run">
                  <Play className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(wf.id)} className="btn-ghost !px-2 !py-1 text-text-muted hover:text-accent-danger" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && !loading && (
        <div className="card text-center py-16">
          <Workflow className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
          <p className="text-text-secondary">No workflows yet</p>
          <p className="text-text-muted text-sm mt-1">Create automated workflows to orchestrate tasks</p>
        </div>
      )}
    </div>
  );
}
