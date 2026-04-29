import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useChat } from '../hooks/useChat.js';
import { api } from '../lib/api.js';
import { EXERCISES, EXERCISE_CATEGORIES, findExercise } from '../lib/exercises.js';
import './Mindfulness.css';
import MicButton from '../components/ui/MicButton.jsx';
import { useTTSContext } from '../context/TTSContext.jsx';
import AddHabitModal from '../components/ui/AddHabitModal.jsx';

const DIFFICULTY_COLOR = {
  Beginner:     'var(--forest-light)',
  Intermediate: 'var(--amber-warm)',
  Advanced:     'var(--blush)',
};

export default function Mindfulness() {
  const location = useLocation();
  const navigate  = useNavigate();

  const [activeExercise, setActiveExercise] = useState(null);
  const [fromHabitId,    setFromHabitId]    = useState(null);
  const [filter,         setFilter]         = useState('all');
  const [sessionDone,    setSessionDone]    = useState(false);
  const [addModal,       setAddModal]       = useState(null);  // { exercise } | null
  const [dupError,       setDupError]       = useState('');

  // Load existing habits from DB to know which exercises are already on the board
  const { data: habitsData, refetch: refetchHabits } = useApi(() => api.habits.list(), []);
  const habits = habitsData?.habits ?? [];
  // Build a set of exerciseIds already saved in the habit board
  const boardedExerciseIds = new Set(
    habits.map(h => h.aiMeta?.exerciseId).filter(Boolean)
  );

  // Load recent journal entries to surface recommended exercises
  const { data: journalData } = useApi(() => api.journal.list(5, 0), []);
  const recentEntries  = journalData?.entries ?? [];
  const recommendedIds = [...new Set(
    recentEntries.flatMap(e => e.aiAnalysis?.suggestedExerciseIds ?? [])
  )].slice(0, 3);
  const recommendedExercises = recommendedIds.map(id => findExercise(id)).filter(Boolean);
  const latestMood = recentEntries[0]?.aiAnalysis?.emotions?.[0] ?? null;

  // Accept navigation state from HabitBoard
  useEffect(() => {
    if (location.state?.exerciseId) {
      const ex = findExercise(location.state.exerciseId);
      if (ex) {
        setActiveExercise(ex);
        setFromHabitId(location.state.fromHabitId ?? null);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const filtered = filter === 'all'
    ? EXERCISES
    : EXERCISES.filter(e => e.category === filter);

  // Open add-to-board modal with defaults pre-filled
  // No early-exit: user can add same exercise with a different schedule
  function handleAddToBoard(exercise) {
    setDupError('');
    setAddModal({ exercise });
  }

  // Save from modal
  async function handleModalSave({ name, category, goal, dayOfWeek, time }) {
    const exercise = addModal?.exercise;
    // Duplicate check — only block same exercise on same day AND same time
    const sameDay = (a, b) => (a === null || b === null) ? true : a === b;
    const existing = habits.find(h =>
      h.aiMeta?.exerciseId === exercise?.id &&
      sameDay(h.schedule?.dayOfWeek ?? null, dayOfWeek ?? null) &&
      h.schedule?.targetTime === time
    );
    if (existing) {
      const dayName = dayOfWeek === null ? 'every day' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek];
      setDupError('This exercise is already scheduled for ' + dayName + ' at ' + time + '.');
      return;
    }
    try {
      await api.habits.create({
        name,
        category,
        goal,
        schedule: { dayOfWeek, targetTime: time },
        addedVia: 'manual',
        aiMeta: { exerciseId: exercise?.id ?? null },
      });
      setAddModal(null);
      setDupError('');
      refetchHabits();
    } catch {
      setDupError('Could not save. Please try again.');
    }
  }

  // "I finished this exercise" — marks done via habit board navigation OR direct check-in
  async function handleSessionDone() {
    setSessionDone(true);

    if (fromHabitId) {
      // Came from "Go to exercise" in HabitBoard — navigate back to trigger auto-mark
      navigate('/habits', { state: { completedHabitId: fromHabitId } });
      return;
    }

    // Not from habit board, but exercise is already on the board — find matching habit and check in
    if (activeExercise) {
      const matchingHabit = habits.find(h => h.aiMeta?.exerciseId === activeExercise.id);
      if (matchingHabit) {
        try {
          await api.habits.checkIn(matchingHabit.id, { completed: true, note: 'Completed from Mindfulness page' });
          refetchHabits();
        } catch { /* non-critical */ }
      }
    }
    // Otherwise: just mark sessionDone = true, no other action
  }

  function startExercise(ex) {
    setActiveExercise(ex);
    setFromHabitId(null);
    setSessionDone(false);
  }

  if (activeExercise) {
    return (
      <>
        <SessionView
          exercise={activeExercise}
          fromHabitId={fromHabitId}
          latestMood={latestMood}
          sessionDone={sessionDone}
          onAddToBoard={() => handleAddToBoard(activeExercise)}
          onDone={handleSessionDone}
          onBack={() => { setActiveExercise(null); setFromHabitId(null); setSessionDone(false); }}
        />
        {addModal && (
          <AddHabitModal
            defaultValues={{
              name: addModal.exercise.name,
              category: addModal.exercise.category,
              goal: `Practice ${addModal.exercise.name} regularly`,
              dayOfWeek: null,
              time: '08:00',
              exerciseId: addModal.exercise.id,
            }}
            dupError={dupError}
            onSave={handleModalSave}
            onCancel={() => { setAddModal(null); setDupError(''); }}
            title={`Add "${addModal.exercise.name}" to Habit Board`}
          />
        )}
      </>
    );
  }

  return (
    <div className="mindfulness-page">

      {latestMood && (
        <div className="mood-greeting-banner fade-up">
          <span>🌿</span>
          <p>
            Based on your journal, you've been feeling <strong>{latestMood}</strong>.
            {recommendedExercises.length > 0
              ? ' Here are some exercises that may help:'
              : " Browse the library below when you're ready."}
          </p>
        </div>
      )}

      {recommendedExercises.length > 0 && (
        <section className="recommended-section fade-up">
          <h3 className="section-label">✦ Recommended for you — based on your journal</h3>
          <div className="recommended-row">
            {recommendedExercises.map(ex => (
              <ExerciseCard key={ex.id} exercise={ex} highlighted
                onStart={() => startExercise(ex)}
                onAddToBoard={() => handleAddToBoard(ex)}
  />
            ))}
          </div>
        </section>
      )}

      <section className="exercise-library fade-up">
        <div className="library-header">
          <h3 className="section-label">Exercise library</h3>
          <div className="filter-chips">
            {EXERCISE_CATEGORIES.map(t => (
              <button key={t}
                className={`filter-chip ${filter === t ? 'active' : ''}`}
                onClick={() => setFilter(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="exercise-grid stagger">
          {filtered.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex}
              onStart={() => startExercise(ex)}
              onAddToBoard={() => handleAddToBoard(ex)}
/>
          ))}
        </div>
      </section>
      {addModal && (
        <AddHabitModal
          defaultValues={{
            name: addModal.exercise.name,
            category: 'mindfulness',
            goal: `Practice ${addModal.exercise.name} regularly`,
            dayOfWeek: null,
            time: '08:00',
            exerciseId: addModal.exercise.id,
          }}
          dupError={dupError}
          onSave={handleModalSave}
          onCancel={() => { setAddModal(null); setDupError(''); }}
          title={`Add "${addModal.exercise.name}" to Habit Board`}
        />
      )}
    </div>
  );
}

// ── Session view ──────────────────────────────────────────────────────────────
function SessionView({ exercise, fromHabitId, latestMood, sessionDone, onAddToBoard, onDone, onBack }) {
  const { messages, loading, send } = useChat();
  const { speak, speaking, supported: ttsSupported, enabled: ttsEnabled, toggle: toggleTTS } = useTTSContext();
  const prevLen = useRef(0);
  const [input,   setInput]   = useState('');
  const [greeted, setGreeted] = useState(false);

  useEffect(() => {
    if (!greeted) {
      setGreeted(true);
      const moodCtx = latestMood
        ? `The user has been feeling ${latestMood} recently according to their journal. `
        : '';
      send(`${moodCtx}Please guide me through the "${exercise.name}" exercise.`);
    }
  }, []);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (messages.length > prevLen.current) {
      const newest = messages[messages.length - 1];
      if (newest?.role === 'assistant') speak(newest.content);
    }
    prevLen.current = messages.length;
  }, [messages, speak]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    send(input.trim());
    setInput('');
  }

  return (
    <div className="mindfulness-session fade-up">
      <button className="back-btn" onClick={onBack}>← Back to library</button>

      <div className="session-header">
        <span className="session-icon">{exercise.icon}</span>
        <div className="session-meta">
          <h2 className="session-title">{exercise.name}</h2>
          <div className="session-badges">
            <span className="session-badge">{exercise.duration}</span>
            <span className="session-badge">{exercise.category}</span>
            <span className="session-badge">{exercise.language}</span>
            <span className="session-badge" style={{ color: DIFFICULTY_COLOR[exercise.difficulty] }}>
              {exercise.difficulty}
            </span>
          </div>
        </div>
      </div>

      <div className="session-steps">
        <h4 className="steps-label">Steps overview</h4>
        <ol className="steps-list">
          {exercise.steps.map((s, i) => (
            <li key={i} className="step-item">
              <span className="step-num">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="session-chat-area">
        {ttsSupported && (
          <div className="session-tts-row">
            <button className={"tts-toggle " + (ttsEnabled ? "active" : "")} onClick={toggleTTS}
              title={ttsEnabled ? "Turn off AI voice" : "Turn on AI voice"}>
              {speaking ? "🔊" : ttsEnabled ? "🔈" : "🔇"}
              <span>{ttsEnabled ? (speaking ? "Speaking…" : "Voice on") : "Voice off"}</span>
            </button>
          </div>
        )}
        <div className="session-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`session-bubble ${msg.role} fade-up`}>
              {msg.role === 'assistant' && <span className="bubble-leaf">🌿</span>}
              <p>{msg.content}</p>
            </div>
          ))}
          {loading && (
            <div className="session-bubble assistant fade-in">
              <span className="bubble-leaf">🌿</span>
              <div className="bubble-typing"><span/><span/><span/></div>
            </div>
          )}
        </div>
        <form className="session-input-row" onSubmit={handleSubmit}>
          <MicButton
            onResult={spoken => setInput(prev => (prev ? prev + ' ' : '') + spoken.trim())}
            size="sm"
            title="Speak to Serenity"
          />
          <input className="session-input" value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Talk to Serenity, or tell her when you're done…"
            disabled={loading} />
          <button type="submit" className="session-send"
            disabled={loading || !input.trim()}>↑</button>
        </form>
      </div>

      <div className="session-footer">
        {!sessionDone ? (
          <button className="btn-session-done" onClick={onDone}>
            {fromHabitId
              ? '✓ Done — mark habit complete'
              : '✓ I finished this exercise'}
          </button>
        ) : (
          <p className="session-done-msg">
            🌿 Well done! {fromHabitId ? 'Heading back to your Habit Board…' : 'Your progress is saved.'}
          </p>
        )}
        {!sessionDone && (
          <button className="btn-add-to-board" onClick={onAddToBoard}>
            + Add to Habit Board
          </button>
        )}
      </div>
    </div>
  );
}

// ── Exercise card ─────────────────────────────────────────────────────────────
function ExerciseCard({ exercise: ex, onStart, onAddToBoard, highlighted }) {
  return (
    <div className={`exercise-card fade-up ${highlighted ? 'highlighted' : ''}`}>
      <div className="ex-card-top">
        <span className="ex-icon">{ex.icon}</span>
        <span className="ex-duration">{ex.duration}</span>
      </div>
      <h4 className="ex-name">{ex.name}</h4>
      <p className="ex-desc">{ex.description}</p>
      <div className="ex-badges">
        <span className="ex-badge">{ex.category}</span>
        <span className="ex-badge">{ex.language}</span>
        <span className="ex-badge" style={{ color: DIFFICULTY_COLOR[ex.difficulty] }}>
          {ex.difficulty}
        </span>
      </div>
      <div className="ex-card-actions">
        <button className="btn-start-ex" onClick={onStart}>Start →</button>
        <button className="btn-board-ex"
          onClick={e => { e.stopPropagation(); onAddToBoard(); }}
          title="Add to Habit Board">
          + Board
        </button>
      </div>
    </div>
  );
}
