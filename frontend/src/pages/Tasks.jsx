import { useState, useEffect } from 'react';
import api from '../services/api';
import { CheckSquare, Plus, Search, Edit2, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { formatDate, getStatusBadge } from '../lib/utils';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium' });

  const fetchTasks = async () => {
    setLoading(true);
    const r = await api.get('/data/tasks');
    setTasks(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/data/tasks', formData);
    setShowForm(false);
    setFormData({ title: '', description: '', priority: 'medium' });
    fetchTasks();
  };

  const handleToggle = async (id) => {
    await api.post(`/data/tasks/${id}/toggle`);
    fetchTasks();
  };

  const handleDelete = async (id) => {
    await api.delete(`/data/tasks/${id}`);
    fetchTasks();
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Task Management</h3>
          <p className="text-text-muted text-sm">{tasks.length} total tasks</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {showForm && (
        <div className="card border-accent-primary/30">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Title</label>
              <input className="input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Priority</label>
              <select className="input" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">Create</button>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm text-text-secondary mb-1">Description</label>
              <textarea className="input" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'inbox', 'todo', 'in_progress', 'done'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f ? 'bg-accent-primary text-white' : 'text-text-secondary hover:bg-bg-tertiary'}`}>
            {f === 'all' ? `All (${tasks.length})` : f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
              <p className="text-text-secondary">No tasks found</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th className="w-10"></th><th>Title</th><th>Status</th><th>Priority</th><th>Project</th><th>Created</th><th className="w-20"></th></tr></thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="group">
                    <td>
                      <button onClick={() => handleToggle(t.id)} className="text-text-muted hover:text-accent-primary">
                        {t.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Circle className="w-5 h-5" />}
                      </button>
                    </td>
                    <td>
                      <div className="font-medium">{t.title}</div>
                      {t.description && <div className="text-xs text-text-muted mt-0.5 truncate max-w-xs">{t.description}</div>}
                    </td>
                    <td><span className={`badge badge-${getStatusBadge(t.status)}`}>{t.status}</span></td>
                    <td><span className={`badge ${t.priority === 'high' ? 'badge-danger' : t.priority === 'medium' ? 'badge-warning' : 'badge-info'}`}>{t.priority}</span></td>
                    <td className="text-text-muted">{t.project_id || '—'}</td>
                    <td className="text-text-muted text-xs">{formatDate(t.created_at)}</td>
                    <td>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDelete(t.id)} className="text-text-muted hover:text-accent-danger p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
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
