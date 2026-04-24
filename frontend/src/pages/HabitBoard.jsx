import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import HabitCard from '../components/ui/HabitCard.jsx';
import './HabitBoard.css';

export default function HabitBoard() {
  const { data, loading, refetch } = useApi(() => api.habits.list(), []);
  const habits = data?.habits ?? [];

  // AI suggestion flow
  const [suggestInput,  setSuggestInput]  = useState('');
  const [suggestion,    setSuggestion]    = useState(null);
  const [suggesting,    setSuggesting]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [addMode,       setAddMode]       = useState(false);

  // Manual add
  const [manualName,    setManualName]    = useState('');
  const [manualCat,     setManualCat]     = useState('other');

  async function handleAISuggest(e) {
    e.preventDefault();
    if (!suggestInput.trim()) return;
    setSuggesting(true);
    setSuggestion(null);
    try {
      const { suggestion: s } = await api.habits.suggest(suggestInput);
      setSuggestion(s);
    } catch {
      alert('Could not generate a suggestion. Try again.');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleConfirmSuggestion() {
    if (!suggestion) return;
    setSaving(true);
    try {
      await api.habits.create({
        name: suggestion.name,
        category: suggestion.category,
        goal: suggestion.goal,
        schedule: { targetTime: suggestion.suggestedTime },
        addedVia: 'ai_suggestion',
        originalUserMessage: suggestInput,
      });
      setSuggestion(null);
      setSuggestInput('');
      setAddMode(false);
      refetch();
    } catch {
      alert('Could not save habit. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleManualAdd(e) {
    e.preventDefault();
    if (!manualName.trim()) return;
    setSaving(true);
    try {
      await api.habits.create({
        name: manualName,
        category: manualCat,
        addedVia: 'manual',
      });
      setManualName('');
      setManualCat('other');
      setAddMode(false);
      refetch();
    } finally {
      setSaving(false);
    }
  }

  function handleUpdate(updatedHabit) {
    refetch(); // simplest approach — re-fetch after check-in
  }

  const CATEGORIES = ['sleep','movement','mindfulness','nutrition','social','other'];

  return (
    <div className="habit-board">

      {/* Header row */}
      <div className="board-header fade-up">
        <p className="board-subtext">
          {habits.length > 0
            ? `${habits.length} active habit${habits.length !== 1 ? 's' : ''}`
            : 'No habits yet — add one below.'}
        </p>
        <button
          className="btn-add-habit"
          onClick={() => { setAddMode(v => !v); setSuggestion(null); }}
        >
          {addMode ? '✕ Cancel' : '+ Add habit'}
        </button>
      </div>

      {/* Add habit panel */}
      {addMode && (
        <div className="add-habit-panel fade-up">
          {/* AI suggestion */}
          <div className="add-section">
            <h4 className="add-section-title">✦ Ask Serenity to suggest one</h4>
            <form className="suggest-form" onSubmit={handleAISuggest}>
              <input
                className="suggest-input"
                value={suggestInput}
                onChange={e => setSuggestInput(e.target.value)}
                placeholder="e.g. I want to sleep better, reduce anxiety…"
              />
              <button type="submit" className="btn-suggest" disabled={suggesting}>
                {suggesting ? '…' : 'Suggest'}
              </button>
            </form>

            {suggestion && (
              <div className="suggestion-card fade-in">
                <p className="suggestion-confirm-msg">{suggestion.confirmationMessage}</p>
                <div className="suggestion-details">
                  <span className="sug-field"><strong>Habit:</strong> {suggestion.name}</span>
                  <span className="sug-field"><strong>Time:</strong> {suggestion.suggestedTime}</span>
                  <span className="sug-field"><strong>Why:</strong> {suggestion.timeReason}</span>
                </div>
                <div className="suggestion-actions">
                  <button className="btn-confirm-sug" onClick={handleConfirmSuggestion} disabled={saving}>
                    {saving ? 'Saving…' : "Yes, add this habit"}
                  </button>
                  <button className="btn-decline-sug" onClick={() => setSuggestion(null)}>
                    Not quite
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="add-divider"><span>or add manually</span></div>

          {/* Manual add */}
          <div className="add-section">
            <form className="manual-form" onSubmit={handleManualAdd}>
              <input
                className="manual-input"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Habit name e.g. Drink 8 glasses of water"
              />
              <select
                className="manual-select"
                value={manualCat}
                onChange={e => setManualCat(e.target.value)}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <button type="submit" className="btn-manual-add" disabled={saving || !manualName.trim()}>
                {saving ? 'Saving…' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Habit grid */}
      {loading ? (
        <div className="board-skeletons stagger">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      ) : habits.length === 0 && !addMode ? (
        <div className="board-empty fade-in">
          <p className="empty-text">Your habit board is empty.</p>
          <p className="empty-sub">Add your first habit and start building your streak.</p>
        </div>
      ) : (
        <div className="habit-grid stagger">
          {habits.map(h => (
            <HabitCard key={h.id} habit={h} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
