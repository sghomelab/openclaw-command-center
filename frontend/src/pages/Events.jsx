import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import {
  Search, Pause, Play, Filter, Clock, AlertTriangle, Activity,
  Bot, RefreshCw, Heart, Zap, Server, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { formatDate } from '../lib/utils';

const SEVERITY_CONFIG = {
  info:    { color: 'text-blue-400',    bg: 'bg-blue-500/10',     border: 'border-blue-500/20' },
  warning: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  error:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  success: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const EVENT_TYPE_CONFIG = {
  agent:  { icon: Bot,      label: 'Agent',  color: 'text-purple-400' },
  cron:   { icon: RefreshCw, label: 'Cron',   color: 'text-cyan-400' },
  health: { icon: Heart,    label: 'Health', color: 'text-emerald-400' },
  alert:  { icon: AlertTriangle, label: 'Alert', color: 'text-amber-400' },
  system: { icon: Server,   label: 'System', color: 'text-gray-400' },
};

function EventRow({ event }) {
  const severity = event.severity || event.level || 'info';
  const sev = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const eventType = event.event_type || event.type || 'system';
  const typeCfg = EVENT_TYPE_CONFIG[eventType] || EVENT_TYPE_CONFIG.system;
  const TypeIcon = typeCfg.icon;

  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 border-b border-gray-800/50 hover:bg-white/5 transition-colors`}>
      <div className={`w-1 h-8 rounded-full ${sev.bg} ${sev.border} border flex-shrink-0 mt-0.5`} />
      <TypeIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${typeCfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono text-text-muted`}>
            {event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false }) : ''}
          </span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${sev.bg} ${sev.color} border ${sev.border}`}>
            {severity}
          </span>
          <span className="text-xs text-text-muted">[{typeCfg.label}]</span>
        </div>
        <p className="text-sm text-text-primary mt-0.5 truncate">{event.message || event.description || event.action || 'No message'}</p>
      </div>
      {event.source && (
        <span className="text-xs text-text-muted flex-shrink-0 font-mono">{event.source}</span>
      )}
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const feedRef = useRef(null);
  const autoScrollRef = useRef(true);

  const fetchEvents = useCallback(async () => {
    try {
      const r = await api.get('/audit/logs');
      const data = r.data || [];
      setEvents(prev => {
        const existingIds = new Set(prev.map(e => e.id || e.timestamp));
        const newEvents = data.filter(e => !existingIds.has(e.id || e.timestamp));
        return [...newEvents, ...prev];
      });
    } catch (e) { console.error('Failed to fetch events', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(fetchEvents, 5000);
    return () => clearInterval(id);
  }, [paused, fetchEvents]);

  useEffect(() => {
    if (autoScrollRef.current && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events]);

  const handleScroll = useCallback(() => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  }, []);

  const filtered = events.filter(e => {
    if (filterSeverity !== 'all' && (e.severity || e.level || 'info') !== filterSeverity) return false;
    if (filterType !== 'all' && (e.event_type || e.type || 'system') !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const msg = (e.message || e.description || e.action || '').toLowerCase();
      if (!msg.includes(q)) return false;
    }
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
          <h3 className="text-lg font-semibold">Real-Time Event Feed</h3>
          <p className="text-text-muted text-sm">{events.length} events loaded • {paused ? 'Paused' : 'Live'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${paused ? 'text-amber-400' : 'text-emerald-400'}`}>
            <span className={`w-2 h-2 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            {paused ? 'Paused' : 'Live'}
          </span>
          <button
            onClick={() => setPaused(!paused)}
            className={`btn-ghost !px-3 !py-2 !text-sm ${paused ? 'text-emerald-400' : 'text-amber-400'}`}
          >
            {paused ? <><Play className="w-4 h-4" /> Resume</> : <><Pause className="w-4 h-4" /> Pause</>}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card !p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input !pl-9 !py-2 !text-sm"
            placeholder="Search events..."
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
            <select className="input !py-2 !text-sm !w-32" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
              <option value="all">All Severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
            <select className="input !py-2 !text-sm !w-36" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Feed */}
      {loading && events.length === 0 ? spinner : (
        <div className="card !p-0 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          <div ref={feedRef} onScroll={handleScroll} className="overflow-y-auto h-full">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-text-muted/50 mx-auto mb-3" />
                <p className="text-text-secondary">No events found</p>
                <p className="text-text-muted text-sm mt-1">Events will appear as system activities occur</p>
              </div>
            ) : (
              filtered.map((event, i) => (
                <EventRow key={`${event.timestamp || event.id || i}-${i}`} event={event} />
              ))
            )}
          </div>
          <div className="sticky bottom-0 bg-gradient-to-t from-bg-card to-transparent pointer-events-none h-8" />
        </div>
      )}
    </div>
  );
}
