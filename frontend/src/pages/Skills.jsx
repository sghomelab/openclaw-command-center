import { useState, useEffect } from 'react';
import api from '../services/api';
import { Puzzle, BookOpen, FolderOpen, Code } from 'lucide-react';

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const res = await api.get('/skills');
      setSkills(res.data.skills || []);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSkillDetail = async (name) => {
    setLoadingContent(true);
    try {
      const res = await api.get(`/skills/${name}`);
      setContent(res.data.content || '');
    } catch {
      setContent('');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSelect = async (skill) => {
    setSelected(skill);
    if (!content || content !== skill.name) {
      await loadSkillDetail(skill.name);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Skill Manager</h2>
        <span className="text-text-muted text-sm">{skills.length} installed</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Skill List */}
        <div className="lg:col-span-1 space-y-2">
          {skills.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No skills installed</p>
            </div>
          )}

          {skills.map(skill => (
            <button
              key={skill.name}
              onClick={() => handleSelect(skill)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selected?.name === skill.name
                  ? 'bg-accent-primary/10 border-accent-primary/30'
                  : 'bg-bg-secondary border-border-default hover:border-accent-primary/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Puzzle className="w-5 h-5 text-accent-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{skill.name}</p>
                  <p className="text-xs text-text-muted truncate">{skill.description || 'No description'}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Skill Detail */}
        <div className="lg:col-span-2 card p-5">
          {selected ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Puzzle className="w-6 h-6 text-accent-primary" />
                <h3 className="font-bold text-lg">{selected.name}</h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  {selected.location}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  selected.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {selected.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {loadingContent ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono bg-bg-tertiary p-4 rounded-lg max-h-96 overflow-y-auto">
                  {content || 'No content available'}
                </pre>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a skill to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
