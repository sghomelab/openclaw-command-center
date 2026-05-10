import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import {
  Plus, Search, Filter, X, GripVertical, User, AlertCircle,
  ChevronDown, ChevronUp, MoreHorizontal, Trash2, CheckCircle2
} from 'lucide-react';
import { formatDate } from '../lib/utils';

const COLUMNS = [
  { id: 'planning', label: 'Planning', color: 'border-purple-500' },
  { id: 'inbox', label: 'Inbox', color: 'border-blue-500' },
  { id: 'assigned', label: 'Assigned', color: 'border-cyan-500' },
  { id: 'in_progress', label: 'In Progress', color: 'border-orange-500' },
  { id: 'testing', label: 'Testing', color: 'border-yellow-500' },
  { id: 'review', label: 'Review', color: 'border-indigo-500' },
  { id: 'done', label: 'Done', color: 'border-emerald-500' },
];

const PRIORITY_MAP = {
  high: { label: 'High', class: 'badge-danger' },
  medium: { label: 'Medium', class: 'badge-warning' },
  low: { label: 'Low', class: 'badge-info' },
};

const AGENTS = [
  { id: 'agent-1', name: 'ResearchBot', emoji: '🔍' },
  { id: 'agent-2', name: 'CodeBot', emoji: '💻' },
  { id: 'agent-3', name: 'DeployBot', emoji: '🚀' },
  { id: 'agent-4', name: 'ReviewBot', emoji: '📋' },
  { id: 'agent-5', name: 'TestBot', emoji: '🧪' },
];

function TaskCard({ task, onDragStart, onDelete, onToggle }) {
  const agent = AGENTS.find(a => a.id === task.assignee_id);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="card !p-3 !rounded-lg cursor-grab active:cursor-grabbing hover:border-gray-600 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`badge ${PRIORITY_MAP[task.priority]?.class || 'badge-neutral'}`}>
              {task.priority || 'medium'}
            </span>
            {task.status === 'done' && (
              <span className="badge badge-success">Done</span>
            )}
          </div>
          <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <GripVertical className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
        <div className="flex items-center gap-1.5">
          {agent ? (
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <span>{agent.emoji}</span>
              <span>{agent.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <User className="w-3 h-3" />
              <span>Unassigned</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className="p-1 hover:bg-bg-tertiary rounded" title="Toggle">
            {task.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-text-muted" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 hover:bg-bg-tertiary rounded text-text-muted hover:text-accent-danger" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ column, tasks, onDragStart, onDrop, onDelete, onToggle }) {
  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/5'); };
  const handleDragLeave = (e) => { e.currentTarget.classList.remove('bg-white/5'); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-white/5');
    onDrop(column.id);
  };

  return (
    <div
      className="flex-shrink-0 w-72 flex flex-col min-h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${column.color}`}>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-text-primary">{column.label}</h4>
          <span className="badge badge-neutral">{tasks.length}</span>
        </div>
      </div>
      <div className="space-y-2 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-text-muted text-xs italic">No tasks</div>
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedTask, setDraggedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', priority: 'medium', assignee_id: '', status: 'inbox'
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchTasks = async () => {
    try {
      const r = await api.get('/data/tasks');
      const data = r.data || [];
      data.forEach(t => {
        if (!COLUMNS.find(c => c.id === t.status)) t.status = 'inbox';
      });
      setTasks(data);
    } catch (e) { console.error('Failed to fetch tasks', e); }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);
  useEffect(() => {
    const id = setInterval(fetchTasks, 10000);
    return () => clearInterval(id);
  }, []);

  const handleDragStart = useCallback((e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }, []);

  const handleDrop = useCallback((columnId) => {
    if (draggedTask) {
      setTasks(prev => prev.map(t =>
        t.id === draggedTask.id ? { ...t, status: columnId } : t
      ));
      api.post(`/data/tasks/${draggedTask.id}`, { status: columnId }).catch(console.error);
      setDraggedTask(null);
    }
  }, [draggedTask]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/data/tasks', formData);
    setShowModal(false);
    setFormData({ title: '', description: '', priority: 'medium', assignee_id: '', status: 'inbox' });
    fetchTasks();
  };

  const handleDelete = async (id) => {
    await api.delete(`/data/tasks/${id}`);
    fetchTasks();
  };

  const handleToggle = async (id) => {
    await api.post(`/data/tasks/${id}/toggle`);
    fetchTasks();
  };

  const filteredTasks = tasks.filter(t => {
    if (filterAssignee !== 'all' && t.assignee_id !== filterAssignee) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const spinner = (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Kanban Board</h3>
          <p className="text-text-muted text-sm">{tasks.length} total tasks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card !p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input !pl-9 !py-2 !text-sm"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-ghost !px-3 !py-2 !text-sm ${showFilters ? 'text-accent-primary' : ''}`}
        >
          <Filter className="w-4 h-4" /> Filters {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showFilters && (
          <>
            <select
              className="input !py-2 !text-sm !w-40"
              value={filterAssignee}
              onChange={e => setFilterAssignee(e.target.value)}
            >
              <option value="all">All Assignees</option>
              {AGENTS.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
            </select>
            <select
              className="input !py-2 !text-sm !w-32"
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </>
        )}
      </div>

      {/* Board */}
      {loading ? spinner : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2" style={{ minHeight: 'calc(100vh - 320px)' }}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={filteredTasks.filter(t => t.status === col.id)}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* New Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-md border-accent-primary/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">New Task</h4>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Title</label>
                <input className="input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Description</label>
                <textarea className="input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Priority</label>
                  <select className="input" value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Assignee</label>
                  <select className="input" value={formData.assignee_id} onChange={e => setFormData({ ...formData, assignee_id: e.target.value })}>
                    <option value="">Unassigned</option>
                    {AGENTS.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Status</label>
                <select className="input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Create Task</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
