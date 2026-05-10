import { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Activity, Zap, FolderOpen, MessageSquare, Clock, Eye, Radio, Play, Square, Heart } from 'lucide-react';

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const timeAgo = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const AgentCard = ({ agent, onViewSessions, onSteer, onKill }) => (
  <div className="card p-5 hover:border-accent-primary/50 transition-all">
    <div className="flex items-start gap-4">
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
      <div>
        <p className="text-xs text-text-muted flex items-center gap-1">
          <Clock className="w-3 h-3" /> Last Activity
        </p>
        <p className="text-sm font-medium">{timeAgo(agent.last_activity)}</p>
      </div>
      <div>
        <p className="text-xs text-text-muted flex items-center gap-1">
          <Heart className="w-3 h-3" /> Heartbeat
        </p>
        <p className="text-sm font-medium">{formatTimestamp(agent.heartbeat_time)}</p>
      </div>
      {agent.current_task && (
        <div className="col-span-2">
          <p className="text-xs text-text-muted flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Current Task
          </p>
          <p className="text-xs font-mono text-text-muted truncate bg-bg-tertiary rounded px-2 py-1 mt-1">{agent.current_task}</p>
        </div>
      )}
      <div className="col-span-2">
        <p className="text-xs text-text-muted">Workspace</p>
        <p className="text-xs font-mono text-text-muted truncate">{agent.workspace}</p>
      </div>
    </div>

    {/* Actions */}
    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
      <button onClick={() => onViewSessions(agent.id)} className="btn-ghost text-xs !px-3 !py-1.5 flex items-center gap-1">
        <Eye className="w-3.5 h-3.5" /> View Sessions
      </button>
      <button onClick={() => onSteer(agent.id)} className="btn-ghost text-xs !px-3 !py-1.5 flex items-center gap-1 text-blue-400 hover:bg-blue-500/10">
        <Play className="w-3.5 h-3.5" /> Steer
      </button>
      <button onClick={() => onKill(agent.id)} className="btn-ghost text-xs !px-3 !py-1.5 flex items-center gap-1 text-red-400 hover:bg-red-500/10">
        <Square className="w-3.5 h-3.5" /> Kill
      </button>
    </div>
  </div>
);

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    const fetchAgents = () => {
      api.get('/agents').then(r => setAgents(r.data.agents || []));
    };
    fetchAgents();
    setLoading(false);
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewSessions = async (agentId) => {
    setSelectedAgent(agentId);
    setSessionsLoading(true);
    try {
      const resp = await api.get(`/agents/${agentId}/sessions`);
      setSessions(resp.data?.sessions || []);
    } catch (err) {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleSteer = async (agentId) => {
    try {
      await api.post(`/agents/${agentId}/steer`);
    } catch (err) {
      console.error('Failed to steer agent:', err);
    }
  };

  const handleKill = async (agentId) => {
    try {
      await api.post(`/agents/${agentId}/kill`);
    } catch (err) {
      console.error('Failed to kill agent:', err);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

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

      {/* Sessions Modal */}
      {selectedAgent && (
        <div className="card border-accent-primary/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-accent-primary" />
              Sessions for {agents.find(a => a.id === selectedAgent)?.name || selectedAgent}
            </h3>
            <button onClick={() => setSelectedAgent(null)} className="btn-ghost !px-2">✕</button>
          </div>
          {sessionsLoading ? (
            <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <p className="text-text-muted text-center py-4">No sessions found</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.map(sess => (
                <div key={sess.id} className="flex items-center justify-between bg-bg-tertiary rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Radio className={`w-4 h-4 ${sess.state === 'running' || sess.state === 'active' ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <div>
                      <p className="font-medium truncate max-w-xs">{sess.id}</p>
                      <p className="text-xs text-text-muted">{formatTimestamp(sess.updated_at)}</p>
                    </div>
                  </div>
                  <span className={`badge badge-${sess.state === 'running' || sess.state === 'active' ? 'success' : sess.state === 'idle' ? 'info' : 'neutral'}`}>
                    {sess.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orchestrator */}
      {orchestrator && (
        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Orchestrator</h3>
          <div className="card border-accent-primary/30 p-6">
            <div className="flex items-center gap-6">
              <div className="text-6xl">{orchestrator.emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold">{orchestrator.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    orchestrator.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                    orchestrator.status === 'idle' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>{orchestrator.status}</span>
                </div>
                <p className="text-text-muted">{orchestrator.role}</p>
                <div className="flex flex-wrap gap-4 mt-2">
                  {orchestrator.model && (
                    <span className="text-sm bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {orchestrator.model}
                    </span>
                  )}
                  <span className="text-sm flex items-center gap-1 text-text-muted">
                    <Clock className="w-3 h-3" /> Last: {timeAgo(orchestrator.last_activity)}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleViewSessions(orchestrator.id)} className="btn-ghost text-xs flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> View Sessions
                  </button>
                  <button onClick={() => handleSteer(orchestrator.id)} className="btn-ghost text-xs flex items-center gap-1 text-blue-400 hover:bg-blue-500/10">
                    <Play className="w-3.5 h-3.5" /> Steer
                  </button>
                  <button onClick={() => handleKill(orchestrator.id)} className="btn-ghost text-xs flex items-center gap-1 text-red-400 hover:bg-red-500/10">
                    <Square className="w-3.5 h-3.5" /> Kill
                  </button>
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
            <AgentCard
              key={agent.id}
              agent={agent}
              onViewSessions={handleViewSessions}
              onSteer={handleSteer}
              onKill={handleKill}
            />
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
            <p className="text-text-muted">Active</p>
            <p className="text-xl font-bold text-emerald-400">{agents.filter(a => a.status === 'active').length}</p>
          </div>
          <div>
            <p className="text-text-muted">Idle</p>
            <p className="text-xl font-bold text-blue-400">{agents.filter(a => a.status === 'idle').length}</p>
          </div>
          <div>
            <p className="text-text-muted">Offline</p>
            <p className="text-xl font-bold text-red-400">{agents.filter(a => a.status === 'offline').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
