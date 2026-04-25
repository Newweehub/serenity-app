import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import ConfirmModal from '../components/ui/ConfirmModal.jsx';
import { EXERCISES } from '../lib/exercises.js';
import './HabitBoard.css';

const CATEGORY_ICONS = {
  sleep:       '🌙',
  movement:    '🏃',
  mindfulness: '🧘',
  nutrition:   '🌱',
  social:      '🤝',
  other:       '✦',
};
const CATEGORIES = ['sleep', 'movement', 'mindfulness', 'nutrition', 'social', 'other'];

// Fallback: pick a sensible exercise ID for each category
const CATEGORY_EXERCISE_FALLBACK = {
  mindfulness: 'body_scan_5min',
  sleep:       'breathing_478',
  movement:    'progressive_relax',
  social:      'loving_kindness',
  nutrition:   'gratitude_3',
  other:       'mindful_breath',
};

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="habit-toast fade-in">
      <span>🔔 {message}</span>
      <button onClick={onClose}>✕</button>
    </div>
  );
}

export default function HabitBoard() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data, loading, refetch } = useApi(() => api.habits.list(), []);
  const habits = data?.habits ?? [];

  const [addMode,      setAddMode]      = useState(false);
  const [suggestInput, setSuggestInput] = useState('');
  const [suggestion,   setSuggestion]   = useState(null);
  const [suggesting,   setSuggesting]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [manualName,   setManualName]   = useState('');
  const [manualCat,    setManualCat]    = useState('other');
  const [manualTime,   setManualTime]   = useState('08:00');
  const [manualDate,   setManualDate]   = useState('');
  const [dupWarning,   setDupWarning]   = useState('');

  const [confirmModal, setConfirmModal] = useState(null);
  const [deleteModal,  setDeleteModal]  = useState(null);

  // Per-habit schedule editing state
  const [editingSchedule, setEditingSchedule] = useState({});  // { [id]: true }
  const [scheduleValues,  setScheduleValues]  = useState({});  // { [id]: { date, time } }
  const [savingSchedule,  setSavingSchedule]  = useState({});  // { [id]: true }

  // Track which habits are "done" this session to disable the button immediately
  const [doneTodayLocal, setDoneTodayLocal] = useState({});

  const [toasts,       setToasts]       = useState([]);
  const [altSuggestion, setAltSuggestion] = useState({});

  const today = new Date().toISOString().slice(0, 10);

  // ── Auto-mark done when returning from Mindfulness ──
  useEffect(() => {
    const { completedHabitId } = location.state ?? {};
    if (!completedHabitId) return;
    navigate(location.pathname, { replace: true, state: {} });
    api.habits.checkIn(completedHabitId, { completed: true, note: 'Completed via Mindfulness page' })
      .then(() => {
        setDoneTodayLocal(prev => ({ ...prev, [completedHabitId]: true }));
        addToast('Exercise marked as done automatically! 🎉');
        refetch();
      })
      .catch(() => {});
  }, [location.state]);

  // ── In-app reminder notifications ──
  useEffect(() => {
    function checkReminders() {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      habits.forEach(h => {
        const target = h.schedule?.targetTime;
        if (!target) return;
        const checkedToday = h.checkIns?.some(c => c.date === today && c.completed);
        if (!checkedToday && target === currentTime) addToast(`Time for "${h.name}"! 🌿`);
      });
    }
    const interval = setInterval(checkReminders, 60_000);
    return () => clearInterval(interval);
  }, [habits, today]);

  function addToast(message) {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
  }
  function removeToast(id) { setToasts(prev => prev.filter(t => t.id !== id)); }

  function getMissedDays(habit) {
    const recent = habit.checkIns?.slice(0, 7) ?? [];
    let count = 0;
    for (const c of recent) { if (!c.completed) count++; else break; }
    return count;
  }

  // ── Navigate to correct exercise — uses stored exerciseId with category fallback ──
  function goToExercise(habit) {
    const exerciseId =
      habit.aiMeta?.exerciseId ??
      CATEGORY_EXERCISE_FALLBACK[habit.category] ??
      'mindful_breath';

    // Validate the exerciseId actually exists in our library
    const validIds = EXERCISES.map(e => e.id);
    const finalId  = validIds.includes(exerciseId) ? exerciseId : CATEGORY_EXERCISE_FALLBACK[habit.category] ?? 'mindful_breath';

    navigate('/mindfulness', { state: { exerciseId: finalId, fromHabitId: habit.id } });
  }

  function isDuplicate(name) {
    return habits.some(h => h.name.toLowerCase().trim() === name.toLowerCase().trim());
  }

  // ── Save schedule (date + time) ──
  async function saveSchedule(habitId) {
    const vals = scheduleValues[habitId] ?? {};
    setSavingSchedule(prev => ({ ...prev, [habitId]: true }));
    try {
      await api.habits.updateSchedule(habitId, {
        targetDate: vals.date || undefined,
        targetTime: vals.time || undefined,
      });
      setEditingSchedule(prev => ({ ...prev, [habitId]: false }));
      addToast('Reminder saved — you\'ll be notified at this time 🔔');
      refetch();
    } catch {
      addToast('Could not save reminder. Please try again.');
    } finally {
      setSavingSchedule(prev => ({ ...prev, [habitId]: false }));
    }
  }

  // ── Confirm Done ──
  async function handleConfirmCheckIn() {
    const { habitId } = confirmModal;
    setConfirmModal(null);
    // Immediately disable button in UI
    setDoneTodayLocal(prev => ({ ...prev, [habitId]: true }));
    try {
      await api.habits.checkIn(habitId, { completed: true });
      const habit = habits.find(h => h.id === habitId);
      if (habit && getMissedDays(habit) >= 2) {
        api.habits.suggest(`I keep missing "${habit.name}". What's a gentler alternative?`)
          .then(r => {
            if (r?.suggestion) setAltSuggestion(prev => ({ ...prev, [habitId]: r.suggestion.confirmationMessage }));
          }).catch(() => {});
      }
      refetch();
    } catch {
      // Revert on failure
      setDoneTodayLocal(prev => { const n = {...prev}; delete n[habitId]; return n; });
    }
  }

  async function handleDelete() {
    const { habitId } = deleteModal;
    setDeleteModal(null);
    try {
      await api.habits.updateStatus(habitId, 'archived');
      refetch();
    } catch (err) { console.error(err); }
  }

  async function handleAISuggest(e) {
    e.preventDefault();
    if (!suggestInput.trim()) return;
    setSuggesting(true);
    setSuggestion(null);
    setDupWarning('');
    try {
      const { suggestion: s } = await api.habits.suggest(suggestInput);
      if (!s) throw new Error('null suggestion');
      setSuggestion(s);
      if (isDuplicate(s.name)) setDupWarning(`"${s.name}" is already on your board.`);
    } catch (err) {
      console.error('[suggest]', err);
      addToast('Could not generate a suggestion — please try rephrasing your goal.');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleConfirmSuggestion() {
    if (!suggestion) return;
    if (isDuplicate(suggestion.name)) {
      setDupWarning(`"${suggestion.name}" is already on your Habit Board.`);
      return;
    }
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
      setSuggestion(null); setSuggestInput(''); setAddMode(false); setDupWarning('');
      refetch();
    } catch { addToast('Could not save. Please try again.'); }
    finally { setSaving(false); }
  }

  async function handleManualAdd(e) {
    e.preventDefault();
    if (!manualName.trim()) return;
    if (isDuplicate(manualName)) {
      setDupWarning(`"${manualName}" is already on your Habit Board.`);
      return;
    }
    setSaving(true);
    try {
      await api.habits.create({
        name: manualName,
        category: manualCat,
        schedule: { targetDate: manualDate || undefined, targetTime: manualTime },
        addedVia: 'manual',
      });
      setManualName(''); setManualCat('other'); setManualTime('08:00'); setManualDate('');
      setAddMode(false); setDupWarning('');
      refetch();
    } finally { setSaving(false); }
  }

  return (
    <div className="habit-board">

      <div className="toast-container">
        {toasts.map(t => <Toast key={t.id} message={t.message} onClose={() => removeToast(t.id)} />)}
      </div>

      {/* ── Header ── */}
      <div className="board-header fade-up">
        <p className="board-subtext">
          {habits.length > 0
            ? `${habits.length} active habit${habits.length !== 1 ? 's' : ''}`
            : 'No habits yet — add one below.'}
        </p>
        <button className="btn-add-habit"
          onClick={() => { setAddMode(v => !v); setSuggestion(null); setDupWarning(''); }}>
          {addMode ? '✕ Cancel' : '+ Add habit'}
        </button>
      </div>

      {/* ── Add panel ── */}
      {addMode && (
        <div className="add-habit-panel fade-up">
          {dupWarning && <p className="dup-warning">⚠️ {dupWarning}</p>}

          <div className="add-section">
            <h4 className="add-section-title">✦ Ask Serenity to suggest one</h4>
            <form className="suggest-form" onSubmit={handleAISuggest}>
              <input className="suggest-input" value={suggestInput}
                onChange={e => setSuggestInput(e.target.value)}
                placeholder="e.g. I want to sleep better, reduce anxiety…" />
              <button type="submit" className="btn-suggest" disabled={suggesting}>
                {suggesting ? '…' : 'Suggest'}
              </button>
            </form>

            {suggestion && (
              <div className="suggestion-card fade-in">
                {dupWarning && <p className="dup-inline">⚠️ {dupWarning}</p>}
                <p className="suggestion-confirm-msg">{suggestion.confirmationMessage}</p>
                <div className="suggestion-details">
                  <span className="sug-field"><strong>Habit:</strong> {suggestion.name}</span>
                  <span className="sug-field"><strong>Suggested time:</strong> {suggestion.suggestedTime}</span>
                  <span className="sug-field"><strong>Why:</strong> {suggestion.timeReason}</span>
                </div>
                <div className="suggestion-actions">
                  <button className="btn-confirm-sug" onClick={handleConfirmSuggestion} disabled={saving}>
                    {saving ? 'Saving…' : 'Yes, add this habit'}
                  </button>
                  <button className="btn-decline-sug" onClick={() => setSuggestion(null)}>Not quite</button>
                </div>
              </div>
            )}
          </div>

          <div className="add-divider"><span>or add manually</span></div>

          <div className="add-section">
            <form className="manual-form" onSubmit={handleManualAdd}>
              <input className="manual-input" value={manualName}
                onChange={e => { setManualName(e.target.value); setDupWarning(''); }}
                placeholder="Habit name e.g. Drink 8 glasses of water" />
              <select className="manual-select" value={manualCat}
                onChange={e => setManualCat(e.target.value)}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <div className="schedule-row">
                <div className="schedule-field">
                  <label className="schedule-label">📅 Start date</label>
                  <input type="date" className="date-input" value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    min={new Date().toISOString().slice(0,10)} />
                </div>
                <div className="schedule-field">
                  <label className="schedule-label">🕐 Reminder time</label>
                  <input type="time" className="time-input" value={manualTime}
                    onChange={e => setManualTime(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn-manual-add"
                disabled={saving || !manualName.trim()}>
                {saving ? 'Saving…' : 'Add'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Habit grid ── */}
      {loading ? (
        <div className="board-skeletons stagger">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : habits.length === 0 && !addMode ? (
        <div className="board-empty fade-in">
          <p className="empty-text">Your habit board is empty.</p>
          <p className="empty-sub">Add your first habit and start building your streak.</p>
        </div>
      ) : (
        <div className="habit-grid stagger">
          {habits.map(h => {
            const checkedInDB   = h.checkIns?.some(c => c.date === today && c.completed);
            const checkedToday  = checkedInDB || doneTodayLocal[h.id];
            const missedDays    = getMissedDays(h);
            const isMindful     = ['mindfulness','sleep','movement','social','nutrition','other'].includes(h.category);
            const alt           = altSuggestion[h.id];
            const isEditSched   = editingSchedule[h.id];
            const schedVals     = scheduleValues[h.id] ?? {};
            const displayDate   = h.schedule?.targetDate ?? '';
            const displayTime   = h.schedule?.targetTime ?? '';
            const isSavingSched = savingSchedule[h.id];

            return (
              <div key={h.id} className={`habit-card fade-up ${checkedToday ? 'checked' : ''}`}>

                <div className="habit-card-header">
                  <span className="habit-icon">{CATEGORY_ICONS[h.category] ?? '✦'}</span>
                  <div className="habit-info">
                    <h3 className="habit-name">{h.name}</h3>
                    {h.goal && <p className="habit-goal">{h.goal}</p>}
                  </div>
                  <div className="habit-streak-badge">
                    <span className="streak-count">{h.streak?.current ?? 0}</span>
                    <span className="streak-label">day{h.streak?.current !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="streak-bar-track">
                  <div className="streak-bar-fill"
                    style={{ width: `${Math.min((h.streak?.current / 30) * 100, 100)}%` }} />
                </div>

                {/* ── Date + time display / editor ── */}
                {!isEditSched ? (
                  <button className="habit-schedule-display"
                    onClick={() => {
                      setScheduleValues(prev => ({ ...prev, [h.id]: { date: displayDate, time: displayTime } }));
                      setEditingSchedule(prev => ({ ...prev, [h.id]: true }));
                    }}>
                    {displayDate || displayTime
                      ? `📅 ${displayDate ? new Date(displayDate + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''} ${displayTime ? '🕐 ' + displayTime : ''}`.trim()
                      : '📅 Set date & reminder time'}
                  </button>
                ) : (
                  <div className="habit-schedule-edit fade-in">
                    <div className="schedule-edit-row">
                      <div className="schedule-field">
                        <label className="schedule-label">📅 Date</label>
                        <input type="date" className="date-input"
                          value={schedVals.date ?? ''}
                          min={new Date().toISOString().slice(0,10)}
                          onChange={e => setScheduleValues(prev => ({
                            ...prev, [h.id]: { ...prev[h.id], date: e.target.value }
                          }))} />
                      </div>
                      <div className="schedule-field">
                        <label className="schedule-label">🕐 Time</label>
                        <input type="time" className="time-input"
                          value={schedVals.time ?? ''}
                          onChange={e => setScheduleValues(prev => ({
                            ...prev, [h.id]: { ...prev[h.id], time: e.target.value }
                          }))} />
                      </div>
                    </div>
                    <div className="schedule-edit-actions">
                      <button className="btn-time-save" onClick={() => saveSchedule(h.id)}
                        disabled={isSavingSched}>
                        {isSavingSched ? 'Saving…' : 'Save reminder'}
                      </button>
                      <button className="btn-time-cancel"
                        onClick={() => setEditingSchedule(prev => ({ ...prev, [h.id]: false }))}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {alt && (
                  <div className="habit-alt-suggestion fade-in">
                    <span className="alt-label">💡 Serenity suggests:</span>
                    <p>{alt}</p>
                  </div>
                )}

                {missedDays >= 3 && !alt && (
                  <p className="habit-missed-warning">Missed {missedDays} days — want to adjust?</p>
                )}

                {isMindful && !checkedToday && (
                  <button className="btn-go-exercise" onClick={() => goToExercise(h)}>
                    ◌ Go to exercise →
                  </button>
                )}

                <div className="habit-actions">
                  {!checkedToday ? (
                    <button className="btn-checkin done"
                      onClick={() => setConfirmModal({ habitId: h.id, habitName: h.name })}>
                      ✓ Done
                    </button>
                  ) : (
                    <p className="habit-checked-label">✓ Completed today</p>
                  )}
                  <button className="btn-delete-habit"
                    onClick={() => setDeleteModal({ habitId: h.id, habitName: h.name })}
                    title="Remove habit">
                    🗑
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          title="Mark as done?"
          message={`Confirm you completed "${confirmModal.habitName}" today.`}
          confirmLabel="Yes, I did it! 🎉"
          cancelLabel="Go back"
          onConfirm={handleConfirmCheckIn}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {deleteModal && (
        <ConfirmModal
          title="Remove this habit?"
          message={`"${deleteModal.habitName}" will be archived. You can always add it back.`}
          confirmLabel="Remove"
          cancelLabel="Keep it"
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

    </div>
  );
}
