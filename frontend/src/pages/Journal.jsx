import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { findExercise } from '../lib/exercises.js';
import './Journal.css';
import MicButton from '../components/ui/MicButton.jsx';
import { useTTSContext } from '../context/TTSContext.jsx';
import '../components/ui/ConfirmModal.css';

function EntryModal({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div className="modal-backdrop fade-in" onClick={onClose}>
      <div className="entry-modal-box fade-up" onClick={e => e.stopPropagation()}>
        <div className="entry-modal-header">
          <div className="entry-modal-meta">
            {entry.content.moodEmoji && <span className="entry-modal-emoji">{entry.content.moodEmoji}</span>}
            <span className="entry-modal-date">
              {new Date(entry.createdAt).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
            </span>
          </div>
          <button className="entry-modal-close" onClick={onClose}>✕</button>
        </div>
        {entry.content.promptUsed && (
          <p className="entry-modal-prompt">✦ {entry.content.promptUsed}</p>
        )}
        <p className="entry-modal-text">{entry.content.freeText}</p>
        {entry.aiAnalysis?.reflectionOffered && (
          <div className="entry-modal-reflection">
            <span className="reflection-leaf">🌿</span>
            <p>{entry.aiAnalysis.reflectionOffered}</p>
          </div>
        )}
        <div className="entry-modal-tags">
          {entry.aiAnalysis?.emotions?.map(e => (
            <span key={e} className="tag tag-emotion">{e}</span>
          ))}
          {entry.aiAnalysis?.themes?.map(t => (
            <span key={t} className="tag tag-theme">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'anytime' : 'evening';
}

// Group entries by date for timeline display
// Convert UTC ISO string to local date string YYYY-MM-DD (fixes Bangkok UTC+7 timezone bug)
function toLocalDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function localToday() {
  return toLocalDate(new Date().toISOString());
}

function localYesterday() {
  return toLocalDate(new Date(Date.now() - 86_400_000).toISOString());
}

function groupByDate(entries) {
  const groups = {};
  entries.forEach(e => {
    const date = toLocalDate(e.createdAt);   // use local date, not UTC slice
    if (!groups[date]) groups[date] = [];
    groups[date].push(e);
  });
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatDateHeader(localDate) {
  if (localDate === localToday())     return 'Today';
  if (localDate === localYesterday()) return 'Yesterday';
  const d = new Date(localDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function Journal() {
  const navigate = useNavigate();
  const [view,          setView]          = useState('write');
  const [text,          setText]          = useState('');
  const [prompt,        setPrompt]        = useState('');
  const [saving,        setSaving]        = useState(false);
  const [savedEntry,    setSavedEntry]    = useState(null);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  // AI follow-up chat after saving
  const [followUps,     setFollowUps]     = useState([]);   // [{role, content}]
  const [followInput,   setFollowInput]   = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedEntry,  setSelectedEntry]  = useState(null);
  const followEndRef = useRef(null);
  const { speak, speaking, supported: ttsSupported, enabled: ttsEnabled, toggle: toggleTTS } = useTTSContext();
  const prevFollowLen = useRef(0);

  const { data: listData, loading: listLoading, refetch } = useApi(
    () => api.journal.list(50, 0), []
  );
  const entries      = listData?.entries ?? [];
  const timelineGroups = groupByDate(entries);

  useEffect(() => {
    setLoadingPrompt(true);
    api.journal.getPrompt(timeOfDay())
      .then(r => setPrompt(r.prompt))
      .catch(() => setPrompt("What's on your mind today?"))
      .finally(() => setLoadingPrompt(false));
  }, []);

  useEffect(() => {
    followEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [followUps, followLoading]);

  // Auto-speak new assistant messages in follow-up
  useEffect(() => {
    if (followUps.length > prevFollowLen.current) {
      const newest = followUps[followUps.length - 1];
      if (newest?.role === 'assistant') speak(newest.content);
    }
    prevFollowLen.current = followUps.length;
  }, [followUps, speak]);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { entry } = await api.journal.create({ freeText: text, promptUsed: prompt });
      setSavedEntry(entry);
      setText('');
      refetch();
      // Kick off AI follow-up with an opening reflection
      setFollowUps([{
        role: 'assistant',
        content: entry.aiAnalysis?.reflectionOffered ?? 'Thank you for sharing that. How does it feel to have written it out?',
      }]);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleFollowUp(e) {
    e.preventDefault();
    if (!followInput.trim() || followLoading) return;
    const userMsg = { role: 'user', content: followInput };
    const history = [...followUps, userMsg];
    setFollowUps(history);
    setFollowInput('');
    setFollowLoading(true);
    try {
      const { reply } = await api.chat.sendJournal(followInput, followUps);
      setFollowUps([...history, { role: 'assistant', content: reply }]);
    } catch {
      setFollowUps([...history, { role: 'assistant', content: 'I\'m here. Feel free to keep writing.' }]);
    } finally {
      setFollowLoading(false);
    }
  }

  function handleNewEntry() {
    setSavedEntry(null);
    setFollowUps([]);
    setText('');
  }

  // Navigate to Mindfulness page with exercise pre-selected
  function goToExercise(exerciseId) {
    navigate('/mindfulness', { state: { exerciseId } });
  }

  const suggestedExercises = savedEntry?.aiAnalysis?.suggestedExerciseIds ?? [];

  return (
    <div className="journal-page">

      {/* ── Tabs ── */}
      <div className="journal-tabs">
        <button className={`journal-tab ${view === 'write' ? 'active' : ''}`} onClick={() => setView('write')}>
          Write
        </button>
        <button className={`journal-tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
          Timeline {entries.length > 0 && `(${entries.length})`}
        </button>
      </div>

      {/* ══ WRITE VIEW ══ */}
      {view === 'write' && (
        <div className="journal-write fade-up">
          {!savedEntry ? (
            <>
              {/* AI prompt */}
              <div className="journal-prompt-box">
                {loadingPrompt
                  ? <div className="skeleton" style={{ height: 22, width: '65%' }} />
                  : <p className="journal-prompt-text">✦ {prompt}</p>}
              </div>

              {/* Editor + voice input */}
              <div className="journal-editor-wrap">
                <textarea
                  className="journal-editor"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Begin writing here… there are no rules. Or tap 🎙 to speak."
                  rows={10}
                />
                <div className="journal-mic-row">
                  <MicButton
                    onResult={spoken => setText(prev => (prev ? prev + ' ' : '') + spoken.trim())}
                    title="Speak your journal entry"
                    lang="en-US"
                  />
                  <span className="journal-mic-hint">or speak your entry</span>
                </div>
              </div>

              <div className="journal-editor-footer">
                <span className="word-count">
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : ''}
                </span>
                <button className="btn-save-journal" onClick={handleSave}
                  disabled={saving || !text.trim()}>
                  {saving ? 'Saving…' : 'Save & Reflect'}
                </button>
              </div>
            </>
          ) : (
            /* ── Post-save reflection + AI follow-up ── */
            <div className="journal-reflection fade-up">

              <div className="reflection-header">
                <span className="reflection-icon">🌿</span>
                <h3 className="reflection-title">Serenity's reflection</h3>
              </div>

              {/* Emotion + theme tags */}
              <div className="reflection-tags">
                {savedEntry.aiAnalysis?.emotions?.map(e => (
                  <span key={e} className="tag tag-emotion">{e}</span>
                ))}
                {savedEntry.aiAnalysis?.themes?.map(t => (
                  <span key={t} className="tag tag-theme">{t}</span>
                ))}
              </div>

              {/* AI follow-up conversation */}
              {ttsSupported && (
                <div className="followup-tts-row">
                  <button className={"tts-toggle " + (ttsEnabled ? "active" : "")}
                    onClick={toggleTTS}
                    title={ttsEnabled ? "Turn off AI voice" : "Turn on AI voice"}>
                    {speaking ? "🔊" : ttsEnabled ? "🔈" : "🔇"}
                    <span>{ttsEnabled ? (speaking ? "Speaking…" : "Voice on") : "Voice off"}</span>
                  </button>
                </div>
              )}
              <div className="followup-chat">
                {followUps.map((msg, i) => (
                  <div key={i} className={`followup-bubble ${msg.role} fade-up`}>
                    {msg.role === 'assistant' && <span className="bubble-leaf">🌿</span>}
                    <p className="followup-text">{msg.content}</p>
                  </div>
                ))}
                {followLoading && (
                  <div className="followup-bubble assistant fade-in">
                    <span className="bubble-leaf">🌿</span>
                    <div className="typing-dots"><span/><span/><span/></div>
                  </div>
                )}
                <div ref={followEndRef} />
              </div>

              {/* Follow-up input with voice */}
              <form className="followup-form" onSubmit={handleFollowUp}>
                <MicButton
                  onResult={spoken => setFollowInput(prev => (prev ? prev + ' ' : '') + spoken.trim())}
                  size="sm"
                  title="Speak your reply to Serenity"
                />
                <input
                  className="followup-input"
                  value={followInput}
                  onChange={e => setFollowInput(e.target.value)}
                  placeholder="Reply to Serenity…"
                  disabled={followLoading}
                />
                <button type="submit" className="followup-send"
                  disabled={followLoading || !followInput.trim()}>↑</button>
              </form>

              {/* Habit suggestion */}
              {savedEntry.aiAnalysis?.habitSuggestion && (
                <div className="reflection-habit-hint">
                  💡 {savedEntry.aiAnalysis.habitSuggestion}
                </div>
              )}

              {/* ── Go to Mindfulness button (if AI suggests exercises) ── */}
              {suggestedExercises.length > 0 && (
                <div className="reflection-mindfulness-cta">
                  <p className="cta-label">✦ Serenity suggests a mindfulness exercise for you:</p>
                  <div className="cta-exercise-list">
                    {suggestedExercises.map(exId => {
                      const ex = findExercise(exId);
                      if (!ex) return null;
                      return (
                        <button key={exId} className="cta-exercise-btn"
                          onClick={() => goToExercise(exId)}>
                          <span>{ex.icon}</span>
                          <span>{ex.name}</span>
                          <span className="cta-duration">{ex.duration}</span>
                          <span className="cta-arrow">→</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button className="btn-new-entry" onClick={handleNewEntry}>
                Write another entry
              </button>

            </div>
          )}
        </div>
      )}

      {/* ══ TIMELINE VIEW ══ */}
      {view === 'list' && (
        <div className="journal-timeline fade-up">
          {listLoading ? (
            <div className="list-skeletons stagger">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
            </div>
          ) : timelineGroups.length === 0 ? (
            <p className="journal-empty">No entries yet. Write your first one.</p>
          ) : (
            timelineGroups.map(([date, dayEntries]) => (
              <div key={date} className="timeline-group">
                <div className="timeline-date-header">
                  <span className="timeline-date-dot" />
                  <span className="timeline-date-label">{formatDateHeader(date)}</span>
                </div>
                <ul className="timeline-entries">
                  {dayEntries.map(entry => (
                    <li key={entry.id} className="timeline-entry fade-up" onClick={() => setSelectedEntry(entry)} style={{cursor:'pointer'}}>
                      <span className="timeline-time">{formatTime(entry.createdAt)}</span>
                      <div className="timeline-entry-body">
                        <div className="entry-meta">
                          {entry.content.moodEmoji && (
                            <span className="entry-mood">{entry.content.moodEmoji}</span>
                          )}
                          {entry.content.promptUsed && (
                            <span className="entry-prompt-used">✦ {entry.content.promptUsed}</span>
                          )}
                        </div>
                        <p className="entry-preview">
                          {entry.content.freeText.slice(0, 180)}
                          {entry.content.freeText.length > 180 && '…'}
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
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
      {selectedEntry && <EntryModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />}
    </div>
  );
}
