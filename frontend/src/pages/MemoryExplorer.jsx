import { useState, useEffect } from 'react';
import api from '../services/api';
import { Brain, Search, FileText, ChevronRight, ChevronDown } from 'lucide-react';

export default function MemoryExplorer() {
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/memory/search?q=${encodeURIComponent(query)}`);
      setResults(res.data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/memory/files');
      setFiles(res.data.files || []);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (file) => {
    setSelectedFile(file);
    setLoading(true);
    try {
      const res = await api.get(`/memory/${file.name}`);
      setFileContent(res.data.content || '');
    } catch {
      setFileContent('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'browser') loadFiles();
  }, [mode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Memory Explorer</h2>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${mode === 'search' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('search')}
          >
            <Search className="w-4 h-4" /> Search
          </button>
          <button
            className={`btn btn-sm ${mode === 'browser' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMode('browser')}
          >
            <FileText className="w-4 h-4" /> Files
          </button>
        </div>
      </div>

      {mode === 'search' && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Search memory files..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
            <button className="btn btn-primary" onClick={doSearch} disabled={loading || !query.trim()}>
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          <div className="space-y-3">
            {results.length === 0 && !loading && (
              <div className="text-center py-12 text-text-muted">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Enter a search term to find memories</p>
              </div>
            )}

            {results.map((r, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-info">{r.file}</span>
                  <span className="text-xs text-text-muted">line {r.line}</span>
                </div>
                <div className="bg-bg-tertiary p-3 rounded text-sm text-text-secondary font-mono whitespace-pre-wrap">
                  {r.context}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === 'browser' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-text-muted mb-2">{files.length} files</h3>
            {files.map(f => (
              <button
                key={f.name}
                onClick={() => openFile(f)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedFile?.name === f.name
                    ? 'bg-accent-primary/10 border-accent-primary/30'
                    : 'bg-bg-secondary border-border-default hover:border-accent-primary/30'
                }`}
              >
                <p className="font-medium text-sm">{f.name}</p>
                <p className="text-xs text-text-muted">{new Date(f.modified).toLocaleDateString()} · {(f.size / 1024).toFixed(1)}KB</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2 card p-5">
            {selectedFile ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-accent-primary" />
                  <h3 className="font-bold">{selectedFile.name}</h3>
                </div>
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono bg-bg-tertiary p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                  {fileContent || 'Loading...'}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted">
                <div className="text-center">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a file to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
