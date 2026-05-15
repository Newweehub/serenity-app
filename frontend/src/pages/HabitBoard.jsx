import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import ConfirmModal from '../components/ui/ConfirmModal.jsx';
import AddHabitModal, { dayLabel, formatTime12, DAYS } from '../components/ui/AddHabitModal.jsx';
import { EXERCISES, findExercise } from '../lib/exercises.js';
import './HabitBoard.css';
import MicButton from '../components/ui/MicButton.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  sleep: '🌙', movement: '🏃', mindfulness: '🧘',
  nutrition: '🌱', social: '🤝', other: '✦',
};
const CATEGORIES = ['sleep', 'movement', 'mindfulness', 'nutrition', 'social', 'other'];
const CATEGORY_EXERCISE_FALLBACK = {
  mindfulness: 'body_scan_5min', sleep: 'breathing_478',
  movement: 'progressive_relax', social: 'loving_kindness',
  nutrition: 'gratitude_3',      other: 'mindful_breath',
};

function scheduleLabel(schedule) {
  if (!schedule?.targetTime) return null;
  const day  = dayLabel(schedule.dayOfWeek);
  const time = formatTime12(schedule.targetTime);
  return `${day} at ${time}`;
}


// ── Adaptation suppression helpers ───────────────────────────────────────────
// After a user accepts an adapted habit, suppress suggestions for that habit
// for 3 days so the new schedule has time to establish itself.
const SUPPRESS_DAYS = 3;

function getSuppressKey(habitId) {
  return 'serenity_suppress_adapt:' + habitId;
}

function suppressAdaptation(habitId) {
  const until = Date.now() + SUPPRESS_DAYS * 86_400_000;
  localStorage.setItem(getSuppressKey(habitId), String(until));
}

function isAdaptationSuppressed(habitId) {
  const raw = localStorage.getItem(getSuppressKey(habitId));
  if (!raw) return false;
  return Date.now() < Number(raw);
}

function clearAdaptationSuppression(habitId) {
  localStorage.removeItem(getSuppressKey(habitId));
}

// ── Habit Calendar ────────────────────────────────────────────────────────────
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function sortByTime(list) {
  return [...list].sort((a, b) => {
    const ta = a.schedule?.targetTime ?? '99:99';
    const tb = b.schedule?.targetTime ?? '99:99';
    return ta.localeCompare(tb);
  });
}

function HabitCalendar({ habits, onHabitClick }) {
  if (!habits.length) return <p className="cal-empty-msg">No habits yet — add one below.</p>;

  const byDay = Array.from({ length: 7 }, () => []);
  habits.forEach(h => {
    const dw = h.schedule?.dayOfWeek;
    if (!h.schedule?.targetTime) {
      byDay[new Date().getDay()].push({ ...h, unscheduled: true });
    } else if (dw === null || dw === undefined) {
      byDay.forEach(d => d.push(h));
    } else {
      byDay[Number(dw)]?.push(h);
    }
  });

  const todayIdx = new Date().getDay();

  return (
    <div className="habit-calendar">
      {DAY_LABELS.map((label, i) => (
        <div key={i} className={"cal-col" + (i === todayIdx ? " today" : "")}>
          <div className="cal-day-label">{label}</div>
          <div className="cal-events">
            {sortByTime(byDay[i]).map(h => (
              <button key={h.id + i}
                className={"cal-event" + (h.unscheduled ? " cal-unscheduled" : "")}
                title={h.name + (h.schedule?.targetTime ? " at " + h.schedule.targetTime : "")}
                onClick={() => onHabitClick && onHabitClick(h.id)}>
                {h.schedule?.targetTime && (
                  <span className="cal-event-time">{h.schedule.targetTime}</span>
                )}
                <span className="cal-event-name">{h.name}</span>
              </button>
            ))}
            {byDay[i].length === 0 && <div className="cal-empty-day" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HabitBoard() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data, loading, refetch } = useApi(() => api.habits.list(), []);
  const habits = data?.habits ?? [];

  // Add flow
  const [suggestInput,  setSuggestInput]  = useState('');
  const [suggesting,    setSuggesting]    = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [modalDefaults, setModalDefaults] = useState({});
  const [updateHabitId, setUpdateHabitId]  = useState(null); // if set, modal PATCHes instead of POSTing
  const [dupError,      setDupError]      = useState('');
  const [addMode,       setAddMode]       = useState(false);

  // Confirm / delete modals
  const [confirmModal, setConfirmModal] = useState(null);
  const [deleteModal,  setDeleteModal]  = useState(null);

  // Schedule editing per habit
  const [editingSchedule, setEditingSchedule] = useState({});
  const [scheduleValues,  setScheduleValues]  = useState({});
  const [savingSchedule,  setSavingSchedule]  = useState({});

  // Done today (local optimistic)
  const [doneTodayLocal, setDoneTodayLocal] = useState({});
  const [altSuggestion,  setAltSuggestion]  = useState({});

  // Refs map for scroll-to-habit from notification click
  const habitRefs = useRef({});

  const today = new Date().toISOString().slice(0, 10);

  // ── Auto-miss detection: write missed check-ins for yesterday (for localhost)──
  // useEffect(() => {
  //   if (!habits.length) return;
  //   const d = new Date(Date.now() - 86_400_000);
  //   const yesterday = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  //   const yesterdayDay = d.getDay();

  //   habits.forEach(h => {
  //     const s = h.schedule;
  //     if (!s?.targetTime) return;
  //     const dayMatch = s.dayOfWeek === null || s.dayOfWeek === undefined || Number(s.dayOfWeek) === yesterdayDay;
  //     if (!dayMatch) return;
  //     const alreadyHasEntry = (h.checkIns || []).some(c => c.date === yesterday);
  //     if (alreadyHasEntry) return;
  //     api.habits.checkIn(h.id, { completed: false, note: 'Auto-recorded miss' })
  //       .then(() => refetch())
  //       .catch(() => {});
  //   });
  // }, [habits.length]);

  // ── Proactively load adaptation suggestions for repeatedly-missed habits ──
  // Uses a key built from all habit ids + their checkIn counts so it re-runs
  // after an adapt (same length, different data) or after new misses are recorded.
  const habitsMissKey = habits.map(h => h.id + ':' + getMissedDays(h)).join('|');

  useEffect(() => {
    if (!habits.length) return;
    habits.forEach(h => {
      const missed = getMissedDays(h);
      if (missed < 2) return;
      if (altSuggestion[h.id]) return; // already showing a suggestion for this habit
      if (isAdaptationSuppressed(h.id)) return; // user recently accepted an adaptation — wait

      clearAdaptationSuppression(h.id); // suppression expired — clear it so future cycles work cleanly
      api.habits.suggest('I keep missing "' + h.name + '". Suggest a gentler alternative or adjusted timing.')
        .then(r => {
          if (r?.suggestion?.confirmationMessage) {
            setAltSuggestion(prev => ({
              ...prev,
              [h.id]: {
                message:       r.suggestion.confirmationMessage,
                name:          r.suggestion.name,
                category:      r.suggestion.category,
                goal:          r.suggestion.goal,
                suggestedTime: r.suggestion.suggestedTime,
                time:          r.suggestion.suggestedTime,
                dayOfWeek:     r.suggestion.suggestedDayOfWeek ?? null,
              }
            }));
          }
        })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitsMissKey]);

  // ── Scroll to specific habit when arriving from notification ──
  useEffect(() => {
    const { scrollToHabitId } = location.state ?? {};
    if (!scrollToHabitId || !habits.length) return;
    // Clear state so back-navigation doesn't re-scroll
    navigate(location.pathname, { replace: true, state: {} });
    // Wait a tick for the grid to render
    setTimeout(() => {
      const el = habitRefs.current[scrollToHabitId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('habit-card-highlight');
        setTimeout(() => el.classList.remove('habit-card-highlight'), 2000);
      }
    }, 100);
  }, [habits, location.state]);

  // ── Auto-mark done when returning from Mindfulness ──
  useEffect(() => {
    const { completedHabitId } = location.state ?? {};
    if (!completedHabitId) return;
    navigate(location.pathname, { replace: true, state: {} });
    api.habits.checkIn(completedHabitId, { completed: true, note: 'Completed via Mindfulness page' })
      .then(() => {
        setDoneTodayLocal(prev => ({ ...prev, [completedHabitId]: true }));
        refetch();
      }).catch(() => {});
  }, [location.state]);

  // Reminders handled globally in App.jsx

  function getMissedDays(habit) {
    const recent = habit.checkIns?.slice(0, 7) ?? [];
    let count = 0;
    for (const c of recent) { if (!c.completed) count++; else break; }
    return count;
  }

  // ── Duplicate check: name OR (exerciseId + dayOfWeek + time) ──
  function getDuplicateError(fields) {
    const { name, dayOfWeek, time, exerciseId } = fields;
    const normalName = (name || '').toLowerCase().trim();
    for (const h of habits) {
      const hName     = h.name.toLowerCase().trim();
      const hDay      = h.schedule?.dayOfWeek ?? null;
      const hTime     = h.schedule?.targetTime ?? null;
      const sameDay   = (hDay === null || dayOfWeek === null) ? true : hDay === dayOfWeek;
      const sameTime  = hTime === time;

      // Block only if name AND (same day AND same time) — allows same name on different schedule
      if (hName === normalName && sameDay && sameTime) {
        return '"' + h.name + '" is already scheduled for ' + (dayLabel(dayOfWeek)) + ' at ' + formatTime12(time) + '.';
      }
      // Block same exercise on same day+time (regardless of name)
      if (
        exerciseId &&
        h.aiMeta?.exerciseId === exerciseId &&
        sameDay && sameTime
      ) {
        return 'This exercise is already scheduled for ' + dayLabel(dayOfWeek) + ' at ' + formatTime12(time) + '.';
      }
    }
    return '';
  }

  // ── Navigate to exercise on Mindfulness page ──
  function goToExercise(habit) {
    const exerciseId =
      habit.aiMeta?.exerciseId ??
      CATEGORY_EXERCISE_FALLBACK[habit.category] ??
      'mindful_breath';
    const validIds = EXERCISES.map(e => e.id);
    const finalId  = validIds.includes(exerciseId) ? exerciseId : CATEGORY_EXERCISE_FALLBACK[habit.category] ?? 'mindful_breath';
    navigate('/mindfulness', { state: { exerciseId: finalId, fromHabitId: habit.id } });
  }

  // ── AI suggestion → open modal with defaults ──
  async function handleAISuggest(e) {
    e.preventDefault();
    if (!suggestInput.trim()) return;
    setSuggesting(true);
    setDupError('');
    try {
      const { suggestion } = await api.habits.suggest(suggestInput);
      if (!suggestion) throw new Error('null');
      setModalDefaults({
        name:      suggestion.name,
        category:  suggestion.category,
        goal:      suggestion.goal,
        dayOfWeek: suggestion.suggestedDayOfWeek ?? null,
        time:      suggestion.suggestedTime ?? '08:00',
        exerciseId: null,
      });
      setShowModal(true);
    } catch {
      console.warn('Suggestion failed');
    } finally {
      setSuggesting(false);
    }
  }

  // ── Manual add → open modal with empty defaults ──
  function openManualModal() {
    setModalDefaults({ name: '', category: 'other', goal: '', dayOfWeek: null, time: '08:00', exerciseId: null });
    setDupError('');
    setShowModal(true);
  }

  // ── Save from modal ──
  async function handleModalSave({ name, category, goal, dayOfWeek, time }) {
    const exerciseId = modalDefaults.exerciseId ?? null;

    // In update mode, skip duplicate check (we're replacing an existing habit)
    if (!updateHabitId) {
      const err = getDuplicateError({ name, dayOfWeek, time, exerciseId });
      if (err) { setDupError(err); return; }
    }

    try {
      if (updateHabitId) {
        // ADAPT flow — patch the existing habit in place
        await api.habits.update(updateHabitId, {
          name,
          category,
          goal,
          schedule: { dayOfWeek, targetTime: time },
        });
        // Clear the adaptation suggestion for this habit
        setAltSuggestion(prev => { const n = {...prev}; delete n[updateHabitId]; return n; });
        suppressAdaptation(updateHabitId); // suppress for 3 days so it doesn't re-suggest immediately
        setUpdateHabitId(null);
      } else {
        // CREATE flow — new habit
        await api.habits.create({
          name,
          category,
          goal,
          schedule: { dayOfWeek, targetTime: time },
          addedVia: modalDefaults.exerciseId ? 'ai_suggestion' : 'manual',
          aiMeta: { exerciseId },
        });
      }
      setShowModal(false);
      setSuggestInput('');
      setAddMode(false);
      setDupError('');
      refetch();
    } catch {
      console.warn('Save failed');
    }
  }

  // ── Save updated schedule per habit ──
  async function saveSchedule(habitId) {
    const vals = scheduleValues[habitId] ?? {};
    setSavingSchedule(prev => ({ ...prev, [habitId]: true }));
    try {
      await api.habits.updateSchedule(habitId, {
        dayOfWeek: vals.dayOfWeek,
        targetTime: vals.time,
      });
      setEditingSchedule(prev => ({ ...prev, [habitId]: false }));
      refetch();
    } catch {
    } finally {
      setSavingSchedule(prev => ({ ...prev, [habitId]: false }));
    }
  }

  async function handleConfirmCheckIn() {
    const { habitId } = confirmModal;
    setConfirmModal(null);
    setDoneTodayLocal(prev => ({ ...prev, [habitId]: true }));
    try {
      const result = await api.habits.checkIn(habitId, { completed: true });

      // If backend says already checked in, it may have returned stale data
      // Force a refetch regardless
      if (result?.alreadyCheckedIn) {
        console.warn('[checkIn] already checked in for today — forcing refetch');
      }

      await new Promise(r => setTimeout(r, 400));
      await refetch();
    } catch {
      setDoneTodayLocal(prev => {
        const n = { ...prev };
        delete n[habitId];
        return n;
      });
    }
  }

  // Trigger reframing when user admits they missed a habit
  async function handleMissedHabit(habit) {
    try {
      const result = await api.habits.checkIn(habit.id, { completed: false, note: 'Missed today' });
      if (result.reframe) {
        // Store as object consistent with proactive suggestion shape
        setAltSuggestion(prev => ({ ...prev, [habit.id]: { message: result.reframe } }));
      }
      // If 3+ missed, suggest alternative
      const missedCount = getMissedDays({ ...habit, checkIns: [{ date: new Date().toISOString().slice(0,10), completed: false }, ...(habit.checkIns || [])] });
      if (missedCount >= 3) {
        api.habits.suggest('I keep missing "' + habit.name + '". Suggest a gentler alternative.')
          .then(r => {
            if (r?.suggestion?.confirmationMessage) {
              setAltSuggestion(prev => ({ ...prev, [habit.id]: r.suggestion.confirmationMessage }));
            }
          }).catch(() => {});
      }
      refetch();
    } catch (err) { console.error(err); }
  }

  async function handleDelete() {
    const { habitId } = deleteModal;
    setDeleteModal(null);
    try { await api.habits.updateStatus(habitId, 'archived'); refetch(); }
    catch (err) { console.error(err); }
  }

  // 'Go to exercise' only shown when habit has a specific exerciseId linked from the Mindfulness library

  return (
    <div className="habit-board">

      {/* ── Weekly Calendar — top of page ── */}
      {!loading && habits.length > 0 && (
        <section className="dash-card board-calendar-section fade-up">
          <div className="card-header-row" style={{marginBottom: 12}}>
            <h3 className="card-label">Weekly schedule</h3>
            <span className="cal-hint">Click an event to jump to that habit ↓</span>
          </div>
          <HabitCalendar habits={habits} onHabitClick={(habitId) => {
            const el = habitRefs.current[habitId];
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('habit-card-highlight');
              setTimeout(() => el.classList.remove('habit-card-highlight'), 2000);
            }
          }} />
        </section>
      )}

      {/* ── Header ── */}
      <div className="board-header fade-up">
        <p className="board-subtext">
          {habits.length > 0
            ? `${habits.length} active habit${habits.length !== 1 ? 's' : ''}`
            : 'No habits yet.'}
        </p>
        <button className="btn-add-habit"
          onClick={() => { setAddMode(v => !v); setDupError(''); }}>
          {addMode ? '✕ Cancel' : '+ Add habit'}
        </button>
      </div>

      {/* ── Add panel (AI suggest + manual button) ── */}
      {addMode && (
        <div className="add-habit-panel fade-up">
          <div className="add-section">
            <h4 className="add-section-title">✦ Ask Serenity to suggest one</h4>
            <form className="suggest-form" onSubmit={handleAISuggest}>
              <MicButton
                onResult={spoken => setSuggestInput(prev => (prev ? prev + ' ' : '') + spoken.trim())}
                size="sm"
                title="Speak your goal"
              />
              <input className="suggest-input" value={suggestInput}
                onChange={e => setSuggestInput(e.target.value)}
                placeholder="e.g. I want to sleep better, reduce anxiety…" />
              <button type="submit" className="btn-suggest" disabled={suggesting}>
                {suggesting ? '…' : 'Suggest'}
              </button>
            </form>
          </div>
          <div className="add-divider"><span>or</span></div>
          <button className="btn-manual-open" onClick={openManualModal}>
            + Add manually
          </button>
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
            const checkedInDB  = h.checkIns?.some(c => c.date === today && c.completed);
            const checkedToday = checkedInDB || doneTodayLocal[h.id];
            const missedDays   = getMissedDays(h);
            const alt          = altSuggestion[h.id];
            const isEditSched  = editingSchedule[h.id];
            const schedVals    = scheduleValues[h.id] ?? {};
            const isSavingSched = savingSchedule[h.id];
            const sched        = scheduleLabel(h.schedule);

            return (
              <div key={h.id} ref={el => { habitRefs.current[h.id] = el; }} className={`habit-card fade-up ${checkedToday ? 'checked' : ''}`}>

                <div className="habit-card-header">
                  <span className="habit-icon">
                    {h.aiMeta?.exerciseId
                      ? (findExercise(h.aiMeta.exerciseId)?.icon ?? CATEGORY_ICONS[h.category] ?? '✦')
                      : (CATEGORY_ICONS[h.category] ?? '✦')}
                  </span>
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

                {/* ── Schedule display / inline editor ── */}
                {!isEditSched ? (
                  <button className="habit-schedule-display"
                    onClick={() => {
                      setScheduleValues(prev => ({
                        ...prev,
                        [h.id]: {
                          dayOfWeek: h.schedule?.dayOfWeek ?? null,
                          time: h.schedule?.targetTime ?? '08:00',
                        }
                      }));
                      setEditingSchedule(prev => ({ ...prev, [h.id]: true }));
                    }}>
                    {sched ? `🔔 ${sched}` : '📅 Set recurring schedule'}
                  </button>
                ) : (
                  <div className="habit-schedule-edit fade-in">
                    <div className="schedule-edit-row">
                      <div className="modal-field">
                        <label className="schedule-label">📅 Day</label>
                        <select className="modal-select"
                          value={String(schedVals.dayOfWeek ?? 'null')}
                          onChange={e => setScheduleValues(prev => ({
                            ...prev,
                            [h.id]: { ...prev[h.id], dayOfWeek: e.target.value === 'null' ? null : Number(e.target.value) }
                          }))}>
                          {DAYS.map(d => <option key={String(d.value)} value={String(d.value)}>{d.label}</option>)}
                        </select>
                      </div>
                      <div className="modal-field">
                        <label className="schedule-label">🕐 Time</label>
                        <input type="time" className="time-input"
                          value={schedVals.time ?? '08:00'}
                          onChange={e => setScheduleValues(prev => ({
                            ...prev, [h.id]: { ...prev[h.id], time: e.target.value }
                          }))} />
                      </div>
                    </div>
                    <div className="schedule-edit-actions">
                      <button className="btn-time-save" onClick={() => saveSchedule(h.id)}
                        disabled={isSavingSched}>
                        {isSavingSched ? 'Saving…' : 'Save'}
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
                    <span className="alt-label">💡 Missed {missedDays} day{missedDays !== 1 ? 's' : ''} — Serenity suggests:</span>
                    <p className="alt-message">{typeof alt === 'object' ? alt.message : alt}</p>
                    {typeof alt === 'object' && alt.name && (
                      <button className="btn-adapt-habit"
                        onClick={() => {
                          const suggestedDay  = alt.dayOfWeek ?? null;
                          const suggestedTime = alt.suggestedTime ?? alt.time ?? h.schedule?.targetTime ?? '08:00';
                          // Set update mode — modal will PATCH this habit, not create a new one
                          setUpdateHabitId(h.id);
                          setModalDefaults({
                            name:       alt.name ?? h.name,
                            category:   alt.category ?? h.category,
                            goal:       alt.goal ?? h.goal ?? '',
                            dayOfWeek:  suggestedDay,
                            time:       suggestedTime,
                            exerciseId: h.aiMeta?.exerciseId ?? null,
                          });
                          setDupError('');
                          setShowModal(true);
                        }}>
                        ✏ Adapt this habit
                      </button>
                    )}
                  </div>
                )}
                {missedDays >= 2 && !alt && (
                  <p className="habit-missed-warning">Missed {missedDays} days — loading a suggestion…</p>
                )}

                {h.aiMeta?.exerciseId && !checkedToday && (
                  <button className="btn-go-exercise" onClick={() => goToExercise(h)}>
                    ◌ Go to exercise →
                  </button>
                )}

                <div className="habit-actions">
                  {!checkedToday ? (
                    <button className="btn-checkin done btn-done-glow"
                      onClick={() => setConfirmModal({ habitId: h.id, habitName: h.name })}>
                      ✓ Done
                    </button>
                  ) : (
                    <div className="habit-checked-badge">
                      <span className="check-circle">✓</span>
                      <span>Completed today</span>
                    </div>
                  )}
                  <button className="btn-delete-habit"
                    onClick={() => setDeleteModal({ habitId: h.id, habitName: h.name })}
                    title="Remove habit">🗑</button>
                </div>
                {!checkedToday && (
                  <button className="btn-missed-today"
                    onClick={() => handleMissedHabit(h)}>
                    I missed it today
                  </button>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ── Add habit modal ── */}
      {showModal && (
        <AddHabitModal
          defaultValues={modalDefaults}
          dupError={dupError}
          onSave={handleModalSave}
          onCancel={() => { setShowModal(false); setDupError(''); setUpdateHabitId(null); }}
          title={updateHabitId ? 'Adapt this habit' : 'Add to Habit Board'}
        />
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
          message={`"${deleteModal.habitName}" will be archived.`}
          confirmLabel="Remove"
          cancelLabel="Keep it"
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

    </div>
  );
}
