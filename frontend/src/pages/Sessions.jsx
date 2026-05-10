import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { Users, Search, MessageSquare, Radio, Activity, Clock, ChevronRight, ChevronDown } from 'lucide-react';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [history, setHistory] = useState({});
  const [loadingHistory, setLoadingHistory] = useState({});

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await api.get('/sessions');
      setSessions(res.data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (id) => {
    if (history[id]) return;
    setLoadingHistory(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.get(`/sessions/${id}/history`);
      setHistory(prev => ({ ...prev, [id]: res.data.messages || [] }));
    } catch {
      setHistory(prev => ({ ...prev, [id]: [] }));
    } finally {
      setLoadingHistory(prev => ({ ...prev, [id]: false }));
    }
  };

  const toggleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      await loadHistory(id);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(s =>
      (s.label || '').toLowerCase().includes(q) ||
      (s.agentId || '').toLowerCase().includes(q) ||
      (s.kind || '').toLowerCase().includes(q)
    );
  }, [sessions, search]);

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Session Browser</h2>
        <span className="text-text-muted text-sm">{sessions.length} sessions</span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search sessions by label, agent, or kind..."
          className="input flex-1"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Session List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sessions found</p>
          </div>
        )}

        {filtered.map(session => (
          <div key={session.id} className="card">
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleExpand(session.id)}
                className="p-1 hover:bg-bg-tertiary rounded transition-colors"
              >
                {expanded === session.id
                  ? <ChevronDown className="w-4 h-4 text-text-muted" />
                  : <ChevronRight className="w-4 h-4 text-text-muted" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-semibold truncate">{session.label || 'Untitled'}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    session.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                    session.status === 'idle' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>
                    {session.status || 'unknown'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs bg-bg-tertiary text-text-muted">
                    {session.kind || 'session'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-text-muted">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{session.agentId || '—'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5" />
                  <span className="truncate max-w-32">{session.model || '—'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{session.messageCount || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeAgo(session.lastActivity)}</span>
                </div>
              </div>
            </div>

            {/* Expanded History */}
            {expanded === session.id && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-sm text-text-muted mb-3">Last 10 messages</p>
                {loadingHistory[session.id] && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(history[session.id] || []).map((msg, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${
                      msg.role === 'user' ? 'bg-blue-500/5 border border-blue-500/20' :
                      msg.role === 'assistant' ? 'bg-purple-500/5 border border-purple-500/20' :
                      'bg-bg-secondary border border-bg-tertiary'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-text-muted">
                          {msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Agent' : msg.role}
                        </span>
                      </div>
                      <pre className="whitespace-pre-wrap text-text-secondary text-xs font-mono">
                        {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                      </pre>
                    </div>
                  ))}
                  {(!history[session.id] || history[session.id].length === 0) && !loadingHistory[session.id] && (
                    <p className="text-text-muted text-sm text-center py-4">No messages loaded</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
