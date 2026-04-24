import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import './Journal.css';

function timeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'anytime' : 'evening';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function Journal() {
  const [view,         setView]         = useState('write'); // 'write' | 'list'
  const [text,         setText]         = useState('');
  const [prompt,       setPrompt]       = useState('');
  const [saving,       setSaving]       = useState(false);
  const [savedEntry,   setSavedEntry]   = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  const { data: listData, loading: listLoading, refetch } = useApi(
    () => api.journal.list(20, 0),
    []
  );
  const entries = listData?.entries ?? [];

  // Load a journaling prompt on mount
  useEffect(() => {
    setLoadingPrompt(true);
    api.journal.getPrompt(timeOfDay())
      .then(r => setPrompt(r.prompt))
      .catch(() => setPrompt("What's on your mind today?"))
      .finally(() => setLoadingPrompt(false));
  }, []);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { entry } = await api.journal.create({
        freeText: text,
        promptUsed: prompt,
      });
      setSavedEntry(entry);
      setText('');
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleNewEntry() {
    setSavedEntry(null);
    setText('');
  }

  return (
    <div className="journal-page">
      {/* Tab switcher */}
      <div className="journal-tabs">
        <button
          className={`journal-tab ${view === 'write' ? 'active' : ''}`}
          onClick={() => setView('write')}
        >
          Write
        </button>
        <button
          className={`journal-tab ${view === 'list' ? 'active' : ''}`}
          onClick={() => setView('list')}
        >
          Past entries {entries.length > 0 && `(${entries.length})`}
        </button>
      </div>

      {view === 'write' && (
        <div className="journal-write fade-up">
          {!savedEntry ? (
            <>
              {/* Prompt */}
              <div className="journal-prompt-box">
                {loadingPrompt ? (
                  <div className="skeleton" style={{ height: 20, width: '70%' }} />
                ) : (
                  <p className="journal-prompt-text">✦ {prompt}</p>
                )}
              </div>

              {/* Editor */}
              <textarea
                className="journal-editor"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Begin writing here… there are no rules."
                rows={10}
              />

              <div className="journal-editor-footer">
                <span className="word-count">
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : ''}
                </span>
                <button
                  className="btn-save-journal"
                  onClick={handleSave}
                  disabled={saving || !text.trim()}
                >
                  {saving ? 'Saving…' : 'Save & Reflect'}
                </button>
              </div>
            </>
          ) : (
            /* Post-save: show AI reflection */
            <div className="journal-reflection fade-up">
              <div className="reflection-header">
                <span className="reflection-icon">🌿</span>
                <h3 className="reflection-title">Serenity's reflection</h3>
              </div>

              {savedEntry.aiAnalysis?.reflectionOffered && (
                <p className="reflection-text">
                  {savedEntry.aiAnalysis.reflectionOffered}
                </p>
              )}

              <div className="reflection-tags">
                {savedEntry.aiAnalysis?.emotions?.map(e => (
                  <span key={e} className="tag tag-emotion">{e}</span>
                ))}
                {savedEntry.aiAnalysis?.themes?.map(t => (
                  <span key={t} className="tag tag-theme">{t}</span>
                ))}
              </div>

              {savedEntry.aiAnalysis?.habitSuggestion && (
                <div className="reflection-habit-hint">
                  💡 {savedEntry.aiAnalysis.habitSuggestion}
                </div>
              )}

              <button className="btn-new-entry" onClick={handleNewEntry}>
                Write another entry
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'list' && (
        <div className="journal-list fade-up">
          {listLoading ? (
            <div className="list-skeletons stagger">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
            </div>
          ) : entries.length === 0 ? (
            <p className="journal-empty">No entries yet. Write your first one.</p>
          ) : (
            <ul className="entry-list stagger">
              {entries.map(entry => (
                <li key={entry.id} className="entry-item fade-up">
                  <div className="entry-meta">
                    <span className="entry-date">{formatDate(entry.createdAt)}</span>
                    {entry.content.moodEmoji && (
                      <span className="entry-mood">{entry.content.moodEmoji}</span>
                    )}
                  </div>
                  <p className="entry-preview">
                    {entry.content.freeText.slice(0, 160)}
                    {entry.content.freeText.length > 160 && '…'}
                  </p>
                  {entry.aiAnalysis?.summary && (
                    <p className="entry-summary">{entry.aiAnalysis.summary}</p>
                  )}
                  <div className="entry-tags">
                    {entry.aiAnalysis?.emotions?.slice(0, 3).map(e => (
                      <span key={e} className="tag tag-emotion">{e}</span>
                    ))}
                    {entry.aiAnalysis?.themes?.slice(0, 2).map(t => (
                      <span key={t} className="tag tag-theme">{t}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
