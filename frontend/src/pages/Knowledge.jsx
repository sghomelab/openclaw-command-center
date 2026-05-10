import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Database, Search, Hash, FolderOpen, TrendingUp, Clock, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const StatCard = ({ title, value, icon: Icon, subtitle, color }) => (
  <div className="card group hover:border-gray-600 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-text-muted text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2 text-text-primary">{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

// ── Stats Tab ──────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/data/knowledge/stats').then(r => setStats(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="flex justify-center h-32"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (stats?.status === 'offline') return <div className="card text-center text-text-muted py-8">{stats.note}</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Facts" value={stats.total_facts} icon={Database} color="bg-blue-500/10 text-blue-400" subtitle="Indexed knowledge" />
        <StatCard title="Source Files" value={stats.source_files} icon={FolderOpen} color="bg-purple-500/10 text-purple-400" subtitle="Memory files scanned" />
        <StatCard title="Unique Entities" value={stats.unique_entities} icon={Hash} color="bg-emerald-500/10 text-emerald-400" subtitle="Distinct entity IDs" />
        <StatCard title="Avg Confidence" value={stats.avg_confidence} icon={TrendingUp} color="bg-amber-500/10 text-amber-400" subtitle="Extraction confidence" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-text-muted text-sm">First Extraction</p>
          <p className="text-lg font-medium mt-1">{stats.first_extracted || '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-text-muted text-sm">Last Extraction</p>
          <p className="text-lg font-medium mt-1">{stats.last_extracted || '—'}</p>
        </div>
      </div>
    </div>
  );
}

// ── Search Tab ─────────────────────────────────────────────
function SearchTab() {
  const [query, setQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [results, setResults] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(() => {
    setLoading(true);
    api.get('/data/knowledge/search', { params: { query: query || undefined, entity: entityFilter || undefined, source: sourceFilter || undefined } })
      .then(r => { setResults(r.data.results); setCount(r.data.count); })
      .finally(() => setLoading(false));
  }, [query, entityFilter, sourceFilter]);

  const topEntities = results.length > 0 ? [...new Set(results.map(r => r.entity))].slice(0, 10) : [];

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-64">
            <input className="input" placeholder="Search facts..." value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()} />
          </div>
          <input className="input w-40" placeholder="Entity filter..." value={entityFilter} onChange={e => setEntityFilter(e.target.value)} />
          <input className="input w-40" placeholder="Source filter..." value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} />
          <button className="btn btn-primary" onClick={doSearch} disabled={loading}>
            <Search className="w-4 h-4" /> {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {(query || entityFilter || sourceFilter) && (
          <div className="flex gap-2 mt-2">
            {query && <span className="badge badge-info">text: "{query}"</span>}
            {entityFilter && <span className="badge badge-info">entity: "{entityFilter}"</span>}
            {sourceFilter && <span className="badge badge-info">source: "{sourceFilter}"</span>}
            <button className="text-xs text-text-muted hover:text-text-primary" onClick={() => { setQuery(''); setEntityFilter(''); setSourceFilter(''); }}>Clear</button>
          </div>
        )}
      </div>
      {count > 0 && (
        <div className="card p-3">
          <p className="text-sm text-text-muted">{count} result{count !== 1 ? 's' : ''}</p>
          {topEntities.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {topEntities.map(e => (
                <button key={e} className="badge badge-info cursor-pointer hover:bg-blue-500/20" onClick={() => setEntityFilter(e)}>{e}</button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        {results.map((r, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{r.fact}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-text-muted">Entity: {r.entity}</span>
                  <span className="text-xs text-text-muted">Confidence: {r.confidence}</span>
                  <span className="text-xs text-text-muted truncate max-w-xs">{r.source}</span>
                  <span className="text-xs text-text-muted">{r.extracted_at}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {results.length === 0 && !loading && (
          <div className="card text-center py-8 text-text-muted">
            No facts match your search. Try broader terms or clear filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Entities Tab ───────────────────────────────────────────
function EntitiesTab() {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => { api.get('/data/knowledge/entities').then(r => setEntities(r.data)).finally(() => setLoading(false)); }, []);

  const sorted = [...entities].sort((a, b) => sortDir === 'desc' ? b.fact_count - a.fact_count : a.fact_count - b.fact_count);
  const chartData = sorted.slice(0, 15);

  if (loading) return <div className="flex justify-center h-32"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm">{entities.length} entity types found</p>
        <button className="btn-sm text-text-muted hover:text-text-primary" onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}>
          {sortDir === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />} {sortDir === 'desc' ? 'Highest first' : 'Lowest first'}
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-accent-primary" />
          <h3 className="font-semibold">Top Entities by Fact Count</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="entity" stroke="#6b7280" fontSize={11} angle={-30} textAnchor="end" height={80} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }} />
            <Bar dataKey="fact_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-3">All Entities</h3>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {sorted.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-md hover:bg-bg-secondary">
              <span className="text-sm text-text-primary truncate flex-1">{e.entity}</span>
              <span className="text-xs text-text-muted ml-3">{e.fact_count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sources Tab ────────────────────────────────────────────
function SourcesTab() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/data/knowledge/sources').then(r => setSources(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="flex justify-center h-32"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {sources.map((s, i) => (
        <div key={i} className="card p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{s.source}</p>
              <div className="flex gap-4 mt-1 text-xs text-text-muted">
                <span>{s.facts} facts</span>
                <span>First: {s.first_extracted}</span>
                <span>Last: {s.last_extracted}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      {sources.length === 0 && <div className="card text-center py-8 text-text-muted">No source files indexed yet.</div>}
    </div>
  );
}

// ── Timeline Tab ───────────────────────────────────────────
function TimelineTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/data/knowledge/timeline').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="flex justify-center h-32"><div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (data.length === 0) return <div className="card text-center py-8 text-text-muted">No extraction history yet.</div>;

  const total = data.reduce((s, d) => s + d.facts, 0);
  const pieData = data.map(d => ({ name: d.date, value: d.facts }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Extraction Runs" value={data.length} icon={Clock} color="bg-cyan-500/10 text-cyan-400" />
        <StatCard title="Total Facts" value={total} icon={Database} color="bg-blue-500/10 text-blue-400" />
        <StatCard title="Date Range" value={`${data[0].date}`} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-400" subtitle={`— ${data[data.length - 1]?.date || ''}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-accent-primary" />
            <h3 className="font-semibold">Facts Per Day</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }} />
              <Bar dataKey="facts" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-accent-secondary" />
            <h3 className="font-semibold">Distribution by Day</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f3f4f6' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Main Knowledge Page ────────────────────────────────────
const tabs = [
  { key: 'stats', label: 'Stats', icon: Database },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'entities', label: 'Entities', icon: Hash },
  { key: 'sources', label: 'Sources', icon: FolderOpen },
  { key: 'timeline', label: 'Timeline', icon: TrendingUp },
];

const tabComponents = { stats: StatsTab, search: SearchTab, entities: EntitiesTab, sources: SourcesTab, timeline: TimelineTab };

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState('stats');
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Knowledge Graph</h3>
        <p className="text-text-muted text-sm">Memnon knowledge graph — indexed facts, entities, and extraction history</p>
      </div>

      <div className="flex gap-1 bg-bg-secondary p-1 rounded-lg w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === key ? 'bg-accent-primary text-white shadow-lg shadow-blue-500/20' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <ActiveComponent />
    </div>
  );
}
