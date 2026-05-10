import { useState, useEffect } from 'react';
import api from '../services/api';
import { MessageSquare, Search, Users, Radio, Clock } from 'lucide-react';

export default function ConversationViewer() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await api.get('/sessions');
      setSessions(res.data.sessions || []);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  };

  const loadMessages = async (id) => {
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/sessions/${id}/history?limit=50`);
      setMessages(res.data.messages || []);
    } catch { setMessages([]); }
    finally { setLoadingMsgs(false); }
  };

  const handleSelect = async (session) => {
    setSelected(session);
    await loadMessages(session.id);
  };

  const filtered = sessions.filter(s =>
    !search || (s.label || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.agentId || '').toLowerCase().includes(search.toLowerCase())
  );

  const timeAgo = (ts) => {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Agent Conversations</h2>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-text-muted" />
          <input className="input text-sm" placeholder="Filter sessions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Session List */}
        <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
          {filtered.map(session => (
            <button
              key={session.id}
              onClick={() => handleSelect(session)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selected?.id === session.id
                  ? 'bg-accent-primary/10 border-accent-primary/30'
                  : 'bg-bg-secondary border-border-default hover:border-accent-primary/30'
              }`}
            >
              <p className="font-medium text-sm truncate">{session.label || 'Untitled'}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                {session.agentId && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{session.agentId}</span>}
                {session.model && <span className="flex items-center gap-0.5"><Radio className="w-3 h-3" />{session.model.split('/').pop()}</span>}
                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(session.lastActivity)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Conversation View */}
        <div className="lg:col-span-2 card p-5">
          {selected ? (
            <div>
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-800">
                <MessageSquare className="w-5 h-5 text-accent-primary" />
                <div>
                  <h3 className="font-bold">{selected.label || 'Untitled'}</h3>
                  <p className="text-xs text-text-muted">{selected.messageCount || 0} messages</p>
                </div>
              </div>

              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                  {messages.map((msg, i) => (
                    <div key={i} className={`p-3 rounded-lg ${
                      msg.role === 'user' ? 'bg-blue-500/5 border border-blue-500/20' :
                      msg.role === 'assistant' ? 'bg-purple-500/5 border border-purple-500/20' :
                      'bg-bg-secondary border border-bg-tertiary'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-text-muted">
                          {msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Agent' : msg.role === 'tool' ? '🔧 Tool' : msg.role}
                        </span>
                        {msg.timestamp && <span className="text-xs text-text-muted/60">{new Date(msg.timestamp).toLocaleTimeString()}</span>}
                      </div>
                      <pre className="whitespace-pre-wrap text-sm text-text-secondary font-mono">
                        {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2).substring(0, 500)}
                      </pre>
                    </div>
                  ))}
                  {messages.length === 0 && <p className="text-center py-8 text-text-muted">No messages</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a session to view conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
