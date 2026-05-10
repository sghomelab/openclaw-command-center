import { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Activity, Zap, FolderOpen, MessageSquare } from 'lucide-react';

const AgentCard = ({ agent }) => (
  <div className="card p-5 hover:border-accent-primary/50 transition-all">
    <div className="flex items-start gap-4">
      {/* Emoji Avatar */}
      <div className="text-4xl flex-shrink-0">{agent.emoji}</div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg">{agent.name}</h3>
        <p className="text-text-muted text-sm">{agent.role}</p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        agent.status === 'active'
          ? 'bg-emerald-500/10 text-emerald-400'
          : agent.status === 'idle'
          ? 'bg-blue-500/10 text-blue-400'
          : 'bg-red-500/10 text-red-400'
      }`}>
        {agent.status}
      </span>
    </div>

    {/* Details */}
    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-800">
      <div>
        <p className="text-xs text-text-muted">Model</p>
        <p className="text-sm font-medium truncate">{agent.model || '—'}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted">Thinking</p>
        <p className="text-sm font-medium truncate">{agent.thinking || '—'}</p>
      </div>
      <div className="col-span-2">
        <p className="text-xs text-text-muted">Workspace</p>
        <p className="text-xs font-mono text-text-muted truncate">{agent.workspace}</p>
      </div>
    </div>
  </div>
);

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/agents').then(r => setAgents(r.data.agents || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Build hierarchy: Hajar (main) → 6 specialists
  const orchestrator = agents.find(a => a.id === 'main');
  const specialists = agents.filter(a => a.id !== 'main');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-accent-primary" />
            Agent Team
          </h2>
          <p className="text-text-muted mt-1">
            {agents.length} agents • Umm al-Muʾminīn Framework
          </p>
        </div>
      </div>

      {/* Orchestrator */}
      {orchestrator && (
        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Orchestrator</h3>
          <div className="card border-accent-primary/30 p-6">
            <div className="flex items-center gap-6">
              <div className="text-6xl">{orchestrator.emoji}</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{orchestrator.name}</h3>
                <p className="text-text-muted">{orchestrator.role}</p>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">active</span>
                  {orchestrator.model && (
                    <span className="text-sm bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {orchestrator.model}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Specialists Grid */}
      <div>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Specialists</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialists.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Framework Info */}
      <div className="card">
        <h3 className="font-semibold mb-3">Framework Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-text-muted">Total Agents</p>
            <p className="text-xl font-bold">{agents.length}</p>
          </div>
          <div>
            <p className="text-text-muted">Channels</p>
            <p className="text-xl font-bold">7</p>
          </div>
          <div>
            <p className="text-text-muted">Discord</p>
            <p className="text-xl font-bold flex items-center gap-1">
              <Activity className="w-4 h-4 text-emerald-400" /> Active
            </p>
          </div>
          <div>
            <p className="text-text-muted">Location</p>
            <p className="text-xl font-bold">Singapore</p>
          </div>
        </div>
      </div>
    </div>
  );
}
