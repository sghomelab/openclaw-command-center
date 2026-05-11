import { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, CheckCircle, AlertTriangle, RefreshCw, Settings, ChevronRight } from 'lucide-react';

export default function MultiAgentConfig() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSetting, setSelectedSetting] = useState(null);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    loadData();
    loadSummary();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/config/multi-agent');
      setData(res.data);
    } catch (e) {
      console.error('Failed to load multi-agent config:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get('/config/multi-agent/summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Failed to load summary:', e);
    }
  };

  const compareSetting = async (setting) => {
    try {
      const res = await api.get(`/config/multi-agent/diff/${setting}`);
      setComparison(res.data);
      setSelectedSetting(setting);
    } catch (e) {
      console.error('Failed to compare setting:', e);
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return <span className="text-text-muted">null</span>;
    if (typeof value === 'boolean') return <span className={value ? 'text-emerald-400' : 'text-red-400'}>{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-blue-400">{value}</span>;
    return <span className="text-text-secondary">"{value}"</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-primary" />
            Multi-Agent Config View
          </h2>
          <p className="text-sm text-text-muted mt-1">Compare and synchronize configurations across all 7 agents</p>
        </div>
        <button onClick={loadData} className="btn btn-sm btn-ghost">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-text-muted">Total Agents</div>
            <div className="text-2xl font-bold">{summary.total_agents}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-text-muted">Total Channels</div>
            <div className="text-2xl font-bold">{summary.total_channels}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-text-muted">Consistent Settings</div>
            <div className="text-2xl font-bold text-emerald-400">{data?.consistent_settings || 0}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-text-muted">Inconsistent Settings</div>
            <div className="text-2xl font-bold text-amber-400">{data?.inconsistent_settings || 0}</div>
          </div>
        </div>
      )}

      {/* Agent Cards */}
      {summary?.agents && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.agents.map((agent) => (
            <div key={agent.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold">{agent.name}</h3>
                  <p className="text-xs text-text-muted font-mono">{agent.id}</p>
                </div>
                {agent.is_default && (
                  <span className="badge badge-sm bg-accent-primary/20 text-accent-primary">Default</span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Model:</span>
                  <span className="font-mono text-xs">{agent.model === 'default' ? 'Inherited' : agent.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Heartbeat:</span>
                  <span className="font-mono text-xs">{agent.heartbeat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Memory:</span>
                  <span className="font-mono text-xs">{agent.memory_backend}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Channels:</span>
                  <span className="font-mono text-xs">{agent.channel_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison Table */}
      {data && (
        <div className="card">
          <h3 className="text-lg font-bold p-4 border-b border-gray-800">Settings Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-text-muted">
                  <th className="text-left p-3">Setting</th>
                  {data.agents && Object.entries(data.agents).map(([id, info]) => (
                    <th key={id} className="text-left p-3">{info.name}</th>
                  ))}
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {Object.entries(data.comparison).map(([key, comp]) => (
                  <tr key={key} className="hover:bg-bg-tertiary transition-colors cursor-pointer" onClick={() => compareSetting(key)}>
                    <td className="p-3 font-mono text-xs">
                      <div className="flex items-center gap-1">
                        {key}
                        <ChevronRight className="w-3 h-3 text-text-muted" />
                      </div>
                    </td>
                    {Object.entries(comp.values).map(([agentId, value]) => (
                      <td key={agentId} className="p-3">
                        <span className="font-mono text-xs">{formatValue(value)}</span>
                      </td>
                    ))}
                    <td className="p-3">
                      {comp.consistent ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-4 h-4" /> Consistent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="w-4 h-4" /> {comp.unique_count} values
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {comparison && selectedSetting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setComparison(null)}>
          <div className="card w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{comparison.setting} Comparison</h3>
              <button onClick={() => setComparison(null)} className="btn btn-sm btn-ghost">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(comparison.values).map(([agentId, value]) => (
                <div key={agentId} className="card p-4">
                  <div className="text-sm text-text-muted mb-1">{agentId}</div>
                  <div className="font-mono text-sm">{formatValue(value)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-bg-tertiary">
              <div className="text-sm text-text-muted">Status</div>
              <div className="flex items-center gap-2">
                {comparison.consistent ? (
                  <><CheckCircle className="w-5 h-5 text-emerald-400" /> All agents have the same value</>
                ) : (
                  <><AlertTriangle className="w-5 h-5 text-amber-400" /> {comparison.unique_values.length} different values across agents</>
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-text-muted">
              Note: Syncing settings across agents requires manual editing of each agent's config or using the Config Editor.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
