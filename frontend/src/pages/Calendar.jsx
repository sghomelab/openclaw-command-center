import { useState, useEffect } from 'react';
import api from '../services/api';

const tabs = ['Overview', 'Schedule', 'TODO', 'QMD Status'];

export default function Calendar() {
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState(null);
  const [calendar, setCalendar] = useState(null);
  const [todo, setTodo] = useState(null);
  const [qmd, setQmd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'Overview') {
        const res = await api.get('/data/calendar/overview');
        setData(res.data);
      } else if (tab === 'Schedule') {
        const res = await api.get('/data/calendar/');
        setCalendar(res.data);
      } else if (tab === 'TODO') {
        const res = await api.get('/data/calendar/todo');
        setTodo(res.data);
      } else if (tab === 'QMD Status') {
        const res = await api.get('/data/calendar/qmd/status');
        setQmd(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function renderOverview() {
    if (!data) return <div className="text-text-muted">No data</div>;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-secondary rounded-lg p-5 border border-border">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">Calendar</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-text-primary">{data.calendar?.count || 0}</span>
              <span className="text-sm text-text-muted mb-1">total</span>
            </div>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-amber-400">⏳ {data.calendar?.pending || 0} pending</span>
              <span className="text-green-400">✅ {data.calendar?.done || 0} done</span>
            </div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-5 border border-border">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">TODO</h3>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-text-primary">{data.todo?.count || 0}</span>
              <span className="text-sm text-text-muted mb-1">total</span>
            </div>
            <div className="mt-2 flex gap-4 text-sm">
              <span className="text-blue-400">📋 {data.todo?.open || 0} open</span>
              <span className="text-green-400">✅ {data.todo?.done || 0} done</span>
            </div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-5 border border-border">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-3">QMD Index</h3>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${data.qmd?.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                {data.qmd?.status || 'offline'}
              </span>
            </div>
            <div className="mt-2 flex gap-4 text-sm text-text-muted">
              <span>📄 {data.qmd?.files || 0} files</span>
              <span>📦 {data.qmd?.chunks || 0} chunks</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTable(entries, source) {
    if (!entries || entries.length === 0) return <div className="text-text-muted">No entries found</div>;
    const headers = Object.keys(entries[0]);
    return (
      <div>
        <p className="text-sm text-text-muted mb-3">Source: {source}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {headers.map(h => (
                  <th key={h} className="text-left py-2 px-3 text-text-muted font-semibold uppercase text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-bg-secondary/50">
                  {headers.map(h => (
                    <td key={h} className="py-2 px-3 text-text-primary">{row[h]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderSchedule() {
    if (loading) return <Spinner />;
    if (error) return <div className="text-red-400">{error}</div>;
    return renderTable(calendar?.entries, calendar?.source);
  }

  function renderTodo() {
    if (loading) return <Spinner />;
    if (error) return <div className="text-red-400">{error}</div>;
    return renderTable(todo?.entries, todo?.source);
  }

  function renderQmd() {
    if (loading) return <Spinner />;
    if (error) return <div className="text-red-400">{error}</div>;
    if (!qmd) return <div className="text-text-muted">No QMD data</div>;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-secondary rounded-lg p-5 border border-border">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-2">Status</h3>
            <div className="flex items-center gap-3">
              <span className={`inline-block w-3 h-3 rounded-full ${qmd.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-lg font-semibold ${qmd.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>{qmd.status}</span>
            </div>
          </div>
          <div className="bg-bg-secondary rounded-lg p-5 border border-border">
            <h3 className="text-sm font-semibold text-text-muted uppercase mb-2">Index</h3>
            <div className="text-sm space-y-1 text-text-primary">
              <p>Files: {qmd.files_indexed || 0}</p>
              <p>Chunks: {qmd.chunks_indexed || 0}</p>
              <p>DB: {qmd.db_exists ? '✅' : '❌'}</p>
            </div>
          </div>
        </div>
        {qmd.note && <p className="text-text-muted text-sm">{qmd.note}</p>}
      </div>
    );
  }

  function renderContent() {
    switch (tab) {
      case 'Overview': return <>{loading ? <Spinner /> : renderOverview()}</>;
      case 'Schedule': return renderSchedule();
      case 'TODO': return renderTodo();
      case 'QMD Status': return renderQmd();
      default: return <Spinner />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
