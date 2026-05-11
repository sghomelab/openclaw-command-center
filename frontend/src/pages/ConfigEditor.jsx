import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Settings, Save, RefreshCw, ChevronRight, ChevronDown, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ConfigEditor() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [edited, setEdited] = useState({});
  const [message, setMessage] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [validating, setValidating] = useState(false);
  const [validationRules, setValidationRules] = useState({});

  useEffect(() => {
    loadConfig();
    loadValidationRules();
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

  const loadValidationRules = async () => {
    try {
      const res = await api.get('/config/validation-rules');
      setValidationRules(res.data);
    } catch (e) {
      console.error('Failed to load validation rules:', e);
    }
  };

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Debounced validation
  const validatePath = useCallback(async (path, value) => {
    try {
      setValidating(true);
      const res = await api.post('/config/validate', { path, value });
      
      if (res.data.errors && res.data.errors.length > 0) {
        setValidationErrors(prev => ({
          ...prev,
          [path]: res.data.errors.map(e => e.error)
        }));
      } else {
        setValidationErrors(prev => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
      }
    } catch (e) {
      console.error('Validation failed:', e);
    } finally {
      setValidating(false);
    }
  }, []);

  const handleEdit = (path, value) => {
    setEdited(prev => ({ ...prev, [path]: value }));
    
    // Validate after a short delay
    setTimeout(() => validatePath(path, value), 300);
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage(null);
    
    // Final validation before save
    try {
      const validations = await Promise.all(
        Object.entries(edited).map(([path, value]) => 
          api.post('/config/validate', { path, value })
        )
      );
      
      const allErrors = validations.flatMap(v => v.data.errors || []);
      if (allErrors.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `Cannot save: ${allErrors.length} validation error(s). ${allErrors[0].error}` 
        });
        setSaving(false);
        return;
      }
    } catch (e) {
      console.error('Pre-save validation failed:', e);
    }
    
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
      setValidationErrors({});
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
      const hasError = validationErrors[currentPath];

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
                    className={`input text-xs font-mono w-48 transition-colors ${
                      hasError ? 'border-red-500 focus:border-red-500' : 
                      isEdited ? 'border-amber-500 focus:border-amber-500' : ''
                    }`}
                    value={String(edited[currentPath] ?? value)}
                    onChange={e => handleEdit(currentPath, e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Status indicators */}
            <div className="flex items-center gap-1">
              {hasError && (
                <div className="group relative">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <div className="absolute right-0 bottom-full mb-1 w-64 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 hidden group-hover:block z-50">
                    {hasError.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              )}
              {isEdited && !hasError && (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {validating && isEdited && (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              )}
            </div>
          </div>

          {isObject && expanded[currentPath] && renderConfigTree(value, currentPath, depth + 1)}
        </div>
      );
    });
  };

  // Count total validation errors
  const totalErrors = Object.values(validationErrors).flat().length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent-primary" />
            Gateway Config Editor
          </h2>
          <p className="text-sm text-text-muted mt-1">Edit config with real-time validation</p>
        </div>
        <div className="flex items-center gap-2">
          {totalErrors > 0 && (
            <span className="badge badge-sm bg-red-500/20 text-red-400">
              {totalErrors} error(s)
            </span>
          )}
          <button onClick={loadConfig} className="btn btn-sm btn-ghost">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {Object.keys(edited).length > 0 && (
            <button 
              onClick={saveAll} 
              className={`btn btn-sm ${totalErrors > 0 ? 'btn-secondary' : 'btn-primary'}`}
              disabled={saving || totalErrors > 0}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : `Save (${Object.keys(edited).length})`}
            </button>
          )}
        </div>
      </div>

      {/* Validation summary */}
      {Object.keys(validationErrors).length > 0 && (
        <div className="card p-4 bg-red-500/5 border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="font-medium text-red-400">Validation Errors</span>
          </div>
          <div className="space-y-1">
            {Object.entries(validationErrors).map(([path, errors]) => (
              <div key={path} className="text-xs">
                <span className="font-mono text-red-300">{path}:</span>
                {errors.map((err, i) => (
                  <div key={i} className="ml-2 text-red-400/80">• {err}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Legend */}
      <div className="card p-3 text-xs text-text-muted flex gap-4">
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-400" /> Valid change</span>
        <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> Validation error</span>
        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 text-amber-400 animate-spin" /> Validating...</span>
        <span className="ml-auto">Hover over error icons to see details</span>
      </div>

      <div className="card p-4 overflow-auto max-h-[calc(100vh-350px)]">
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
