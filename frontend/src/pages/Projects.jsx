import { useState, useEffect } from 'react';
import api from '../services/api';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });

  const fetchProjects = async () => {
    setLoading(true);
    const r = await api.get('/data/projects');
    setProjects(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/data/projects', formData);
    setShowForm(false);
    setFormData({ name: '', description: '', status: 'active' });
    fetchProjects();
  };

  const handleDelete = async (id) => {
    await api.delete(`/data/projects/${id}`);
    fetchProjects();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Projects</h3>
          <p className="text-text-muted text-sm">{projects.length} projects</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Project
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
              <label className="block text-sm text-text-secondary mb-1">Status</label>
              <select className="input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-text-secondary mb-1">Description</label>
              <textarea className="input" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="btn-primary">Create Project</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => (
          <div key={p.id} className="card group hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-xs text-text-muted">{p.status}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-danger transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {p.description && <p className="text-sm text-text-secondary mt-3">{p.description}</p>}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800">
              <span className="text-xs text-text-muted">{formatDate(p.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && !loading && (
        <div className="card text-center py-16">
          <FolderKanban className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
          <p className="text-text-secondary">No projects yet</p>
          <p className="text-text-muted text-sm mt-1">Create your first project to get started</p>
        </div>
      )}
    </div>
  );
}
