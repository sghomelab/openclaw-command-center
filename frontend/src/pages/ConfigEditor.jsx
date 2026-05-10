import { useState, useEffect } from 'react';
import api from '../services/api';
import { Settings, Save, RefreshCw, ChevronRight, ChevronDown, AlertTriangle } from 'lucide-react';

export default function ConfigEditor() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [edited, setEdited] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await api.get('/config');
      setConfig(res.data);
    } catch (e) {
      setMessage({ type: 'error', text: `Failed to load config: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEdit = (path, value) => {
    setEdited(prev => ({ ...prev, [path]: value }));
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      for (const [path, value] of Object.entries(edited)) {
        try {
          await api.patch(`/config/${path}`, { value });
        } catch (e) {
          setMessage({ type: 'error', text: `Failed to save ${path}: ${e.message}` });
          return;
        }
      }
      setMessage({ type: 'success', text: 'All changes saved successfully' });
      setEdited({});
      await loadConfig();
    } finally {
      setSaving(false);
    }
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) return <span className="text-text-muted">null</span>;
    if (typeof value === 'boolean') return <span className={value ? 'text-emerald-400' : 'text-red-400'}>{value.toString()}</span>;
    if (typeof value === 'number') return <span className="text-blue-400">{value}</span>;
    if (typeof value === 'string') return <span className="text-text-secondary">"{value}"</span>;
    return <span className="text-text-muted">{JSON.stringify(value)}</span>;
  };

  const renderConfigTree = (obj, path = '', depth = 0) => {
    if (!obj || typeof obj !== 'object') return null;

    return Object.entries(obj).map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
      const isEdited = edited[currentPath] !== undefined;

      return (
        <div key={key} style={{ marginLeft: depth > 0 ? '20px' : '0' }}>
          <div className="flex items-center gap-2 py-1 hover:bg-bg-tertiary/50 rounded px-2">
            {isObject && (
              <button onClick={() => toggleSection(currentPath)} className="p-0.5">
                {expanded[currentPath]
                  ? <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                  : <ChevronRight className="w-3.5 h-3.5 text-text-muted" />}
              </button>
            )}
            <span className="text-accent-primary font-mono text-sm">{key}</span>
            <span className="text-text-muted">:</span>

            {isObject ? (
              <span className="text-text-muted text-xs">{Array.isArray(value) ? `Array[${value.length}]` : `Object`}</span>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                {renderValue(value)}
                {!isObject && typeof value !== 'object' && (
                  <input
                    type="text"
                    className="input text-xs font-mono w-48 hidden"
                    value={String(edited[currentPath] ?? value)}
                    onChange={e => handleEdit(currentPath, e.target.value)}
                    style={{ display: 'none' }}
                  />
                )}
              </div>
            )}

            {isEdited && (
              <span className="text-amber-400 text-xs">✏️ modified</span>
            )}
          </div>

          {isObject && expanded[currentPath] && renderConfigTree(value, currentPath, depth + 1)}
        </div>
      );
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gateway Config Editor</h2>
        <div className="flex items-center gap-2">
          <button onClick={loadConfig} className="btn btn-sm btn-ghost">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {Object.keys(edited).length > 0 && (
            <button onClick={saveAll} className="btn btn-sm btn-primary" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : `Save (${Object.keys(edited).length})`}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="card p-4 overflow-auto max-h-[calc(100vh-250px)]">
        {config ? renderConfigTree(config) : (
          <div className="text-center py-8 text-text-muted">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Failed to load configuration</p>
          </div>
        )}
      </div>
    </div>
  );
}
