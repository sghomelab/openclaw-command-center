import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BookOpen, Upload, Search, FileText, Brain, Users,
  GitBranch, RefreshCw, AlertTriangle, CheckCircle,
  FolderOpen, Eye, MessageSquare, Play
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'browse', label: 'Browse', icon: FolderOpen },
  { id: 'query', label: 'Query', icon: Search },
  { id: 'ingest', label: 'Ingest', icon: Play },
  { id: 'lint', label: 'Lint', icon: RefreshCw },
];

export default function LLMWiki() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Browse state
  const [browseDir, setBrowseDir] = useState('sources');
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);

  // Query state
  const [queryText, setQueryText] = useState('');
  const [queryResults, setQueryResults] = useState(null);

  // Ingest state
  const [rawFiles, setRawFiles] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [ingestResult, setIngestResult] = useState(null);

  // Lint state
  const [lintResult, setLintResult] = useState(null);
  const [linting, setLinting] = useState(false);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/wiki/stats');
      setStats(res.data);
    } catch {}
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/wiki/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedFile(res.data);
    } catch (e) {
      alert('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const loadPages = async (dir) => {
    setLoading(true);
    try {
      const res = await api.get(`/wiki/pages/${dir}`);
      setPages(res.data.pages || []);
      setSelectedPage(null);
    } catch {}
    finally { setLoading(false); }
  };

  const loadPage = async (dir, name) => {
    setLoading(true);
    try {
      const res = await api.get(`/wiki/page/${dir}/${name}`);
      setSelectedPage(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleQuery = async () => {
    if (!queryText.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('question', queryText);
      const res = await api.post('/wiki/query', formData);
      setQueryResults(res.data);
    } catch (e) {
      alert('Query failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRawFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/wiki/pages/raw');
      setRawFiles(res.data.pages || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleIngest = async () => {
    if (!selectedSource) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('filename', selectedSource);
      const res = await api.post('/wiki/ingest', formData);
      setIngestResult(res.data);
    } catch (e) {
      alert('Ingest failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLint = async () => {
    setLinting(true);
    try {
      const res = await api.post('/wiki/lint');
      setLintResult(res.data);
    } catch (e) {
      alert('Lint failed: ' + e.message);
    } finally {
      setLinting(false);
    }
  };

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-muted text-sm">{label}</p>
          <p className="text-2xl font-bold mt-1">{value ?? '—'}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">LLM Wiki</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 pb-0 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'browse') { setBrowseDir('sources'); loadPages('sources'); }
                if (tab.id === 'ingest') loadRawFiles();
              }}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors text-sm ${
                activeTab === tab.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Entities" value={stats?.entities} icon={Users} color="bg-blue-500/10 text-blue-400" />
            <StatCard label="Concepts" value={stats?.concepts} icon={Brain} color="bg-purple-500/10 text-purple-400" />
            <StatCard label="Sources" value={stats?.sources} icon={FileText} color="bg-emerald-500/10 text-emerald-400" />
            <StatCard label="Analysis" value={stats?.analysis} icon={BookOpen} color="bg-amber-500/10 text-amber-400" />
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-3">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                <Upload className="w-4 h-4" /> Upload Source
              </button>
              <button className="btn btn-ghost" onClick={() => setActiveTab('query')}>
                <Search className="w-4 h-4" /> Query Wiki
              </button>
              <button className="btn btn-ghost" onClick={() => setActiveTab('browse')}>
                <FolderOpen className="w-4 h-4" /> Browse Pages
              </button>
              <button className="btn btn-ghost" onClick={() => setActiveTab('ingest')}>
                <Play className="w-4 h-4" /> Ingest Source
              </button>
              <button className="btn btn-ghost" onClick={() => { setActiveTab('lint'); handleLint(); }}>
                <RefreshCw className="w-4 h-4" /> Lint Wiki
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            className="card p-8 border-2 border-dashed border-gray-700 hover:border-accent-primary/50 transition-colors text-center"
            onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files[0]); }}
            onDragOver={e => e.preventDefault()}
          >
            <Upload className="w-12 h-12 mx-auto mb-3 text-text-muted opacity-50" />
            <p className="text-text-muted mb-3">Drop a file here or click to upload</p>
            <input
              type="file"
              onChange={e => handleUpload(e.target.files[0])}
              className="hidden"
              id="wiki-upload"
            />
            <label htmlFor="wiki-upload" className="btn btn-primary cursor-pointer">
              Choose File
            </label>
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-accent-primary">
              <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
              Uploading...
            </div>
          )}
          {uploadedFile && (
            <div className="card p-4 bg-emerald-500/5 border-emerald-500/30">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>Uploaded: {uploadedFile.filename} ({uploadedFile.size} bytes)</span>
              </div>
              <p className="text-sm text-text-muted mt-2">File saved to raw/ directory. Go to "Ingest" tab to process it.</p>
            </div>
          )}
        </div>
      )}

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            {['sources', 'entities', 'concepts', 'analysis'].map(dir => (
              <button
                key={dir}
                onClick={() => { setBrowseDir(dir); loadPages(dir); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  browseDir === dir
                    ? 'bg-accent-primary/10 border-accent-primary/30'
                    : 'bg-bg-secondary border-border-default hover:border-accent-primary/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{dir}</span>
                  <span className="text-xs text-text-muted">{pages.filter(p => true).length} pages</span>
                </div>
              </button>
            ))}
            <div className="mt-4 space-y-1 max-h-80 overflow-y-auto">
              {loading && <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto" />}
              {pages.map(page => (
                <button
                  key={page.name}
                  onClick={() => loadPage(browseDir, page.name)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    selectedPage?.name === page.name
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  {page.name}
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 card p-5">
            {selectedPage ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-info capitalize">{selectedPage.directory}</span>
                  <h3 className="font-bold">{selectedPage.name}</h3>
                </div>
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono bg-bg-tertiary p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                  {selectedPage.content}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a page to view</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Query Tab */}
      {activeTab === 'query' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Ask a question about your wiki..."
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
            />
            <button className="btn btn-primary" onClick={handleQuery} disabled={loading}>
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Query'}
            </button>
          </div>
          {queryResults && (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Found {queryResults.total} relevant page(s) for: "{queryResults.question}"
              </p>
              {queryResults.relevant_pages.map((page, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-info capitalize">{page.directory}</span>
                    <span className="font-semibold">{page.name}</span>
                  </div>
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap bg-bg-tertiary p-3 rounded">
                    {page.preview}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ingest Tab */}
      {activeTab === 'ingest' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-bold mb-2">Available Sources (raw/)</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {rawFiles.map(file => (
                <label key={file.name} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-bg-tertiary">
                  <input
                    type="radio"
                    name="source"
                    value={file.name}
                    checked={selectedSource === file.name}
                    onChange={e => setSelectedSource(e.target.value)}
                  />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)}KB</span>
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleIngest} disabled={!selectedSource || loading}>
            <Play className="w-4 h-4" />
            {loading ? 'Processing...' : 'Ingest Selected Source'}
          </button>
          {ingestResult && (
            <div className="card p-4 bg-amber-500/5 border-amber-500/30">
              <p className="font-medium mb-2">⚠️ Ingest requires LLM agent processing</p>
              <p className="text-sm text-text-muted">{ingestResult.note}</p>
              <pre className="text-xs text-text-secondary mt-2 bg-bg-tertiary p-3 rounded whitespace-pre-wrap">
                {ingestResult.preview?.substring(0, 1000)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Lint Tab */}
      {activeTab === 'lint' && (
        <div className="space-y-4">
          <button className="btn btn-primary" onClick={handleLint} disabled={linting}>
            <RefreshCw className={`w-4 h-4 ${linting ? 'animate-spin' : ''}`} />
            {linting ? 'Linting...' : 'Run Lint Check'}
          </button>
          {lintResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold">{lintResult.stats.total}</p>
                  <p className="text-xs text-text-muted">Total Pages</p>
                </div>
                <div className="card p-3 text-center">
                  <p className="text-2xl font-bold">{lintResult.total_issues}</p>
                  <p className="text-xs text-text-muted">Issues Found</p>
                </div>
              </div>
              {lintResult.issues.length > 0 ? (
                <div className="space-y-2">
                  {lintResult.issues.map((issue, i) => (
                    <div key={i} className="card p-3 border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium capitalize">{issue.type}</span>
                        <span className="text-xs text-text-muted">{issue.page}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-1">{issue.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-4 bg-emerald-500/5 border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400">Wiki is healthy — no issues found</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
