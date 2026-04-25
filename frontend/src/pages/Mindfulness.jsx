import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useChat } from '../hooks/useChat.js';
import { api } from '../lib/api.js';
import { EXERCISES, EXERCISE_CATEGORIES, findExercise } from '../lib/exercises.js';
import './Mindfulness.css';

const DIFFICULTY_COLOR = {
  Beginner:     'var(--forest-light)',
  Intermediate: 'var(--amber-warm)',
  Advanced:     'var(--blush)',
};

export default function Mindfulness() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeExercise, setActiveExercise] = useState(null);
  const [fromHabitId,    setFromHabitId]    = useState(null);
  const [filter,         setFilter]         = useState('all');
  const [addedToBoard,   setAddedToBoard]   = useState({});
  const [sessionDone,    setSessionDone]    = useState(false);

  // Load recent journal entries to surface recommended exercises
  const { data: journalData } = useApi(() => api.journal.list(5, 0), []);
  const recentEntries  = journalData?.entries ?? [];
  const recommendedIds = [...new Set(
    recentEntries.flatMap(e => e.aiAnalysis?.suggestedExerciseIds ?? [])
  )].slice(0, 3);
  const recommendedExercises = recommendedIds.map(id => findExercise(id)).filter(Boolean);

  // Latest mood from journal for personalised greeting
  const latestMood = recentEntries[0]?.aiAnalysis?.emotions?.[0] ?? null;

  // Accept navigation state from HabitBoard (exerciseId + fromHabitId)
  useEffect(() => {
    if (location.state?.exerciseId) {
      const ex = findExercise(location.state.exerciseId);
      if (ex) {
        setActiveExercise(ex);
        setFromHabitId(location.state.fromHabitId ?? null);
      }
      // Clear state so back-navigation doesn't re-open
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  const filtered = filter === 'all'
    ? EXERCISES
    : EXERCISES.filter(e => e.category === filter);

  async function handleAddToBoard(exercise) {
    if (addedToBoard[exercise.id]) return;
    try {
      await api.habits.create({
        name: exercise.name,
        category: 'mindfulness',
        goal: `Practice ${exercise.name} regularly`,
        addedVia: 'manual',
        aiMeta: { exerciseId: exercise.id }, // store exact exerciseId for routing fix
      });
      setAddedToBoard(prev => ({ ...prev, [exercise.id]: true }));
    } catch {
      alert('Could not add to Habit Board. Please try again.');
    }
  }

  // Called when user finishes the session and clicks "Done"
  async function handleSessionDone() {
    setSessionDone(true);
    // Auto-add to habit board if not already there
    if (activeExercise && !addedToBoard[activeExercise.id]) {
      try {
        await api.habits.create({
          name: activeExercise.name,
          category: 'mindfulness',
          goal: `Practice ${activeExercise.name} regularly`,
          addedVia: 'ai_suggestion',
          aiMeta: { exerciseId: activeExercise.id },
        });
        setAddedToBoard(prev => ({ ...prev, [activeExercise.id]: true }));
      } catch { /* non-critical */ }
    }
    // If came from habit board, navigate back and auto-mark done
    if (fromHabitId) {
      navigate('/habits', { state: { completedHabitId: fromHabitId } });
    }
  }

  function startExercise(ex) {
    setActiveExercise(ex);
    setFromHabitId(null);
    setSessionDone(false);
  }

  // ── Session view ──
  if (activeExercise) {
    return (
      <SessionView
        exercise={activeExercise}
        fromHabitId={fromHabitId}
        latestMood={latestMood}
        addedToBoard={addedToBoard}
        sessionDone={sessionDone}
        onAddToBoard={() => handleAddToBoard(activeExercise)}
        onDone={handleSessionDone}
        onBack={() => { setActiveExercise(null); setFromHabitId(null); setSessionDone(false); }}
      />
    );
  }

  // ── Library view ──
  return (
    <div className="mindfulness-page">

      {/* Mood-based greeting — no chat block */}
      {latestMood && (
        <div className="mood-greeting-banner fade-up">
          <span>🌿</span>
          <p>Based on your journal, you've been feeling <strong>{latestMood}</strong>.
            {recommendedExercises.length > 0
              ? ' Here are some exercises that may help:'
              : ' Browse the library below when you\'re ready.'}
          </p>
        </div>
      )}

      {/* ── Recommended for you (from journal) ── */}
      {recommendedExercises.length > 0 && (
        <section className="recommended-section fade-up">
          <h3 className="section-label">✦ Recommended for you — based on your journal</h3>
          <div className="recommended-row">
            {recommendedExercises.map(ex => (
              <ExerciseCard key={ex.id} exercise={ex} highlighted
                onStart={() => startExercise(ex)}
                onAddToBoard={() => handleAddToBoard(ex)}
                added={addedToBoard[ex.id]} />
            ))}
          </div>
        </section>
      )}

      {/* ── Full library ── */}
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
              added={addedToBoard[ex.id]} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ── Session view sub-component ──
function SessionView({ exercise, fromHabitId, latestMood, addedToBoard, sessionDone, onAddToBoard, onDone, onBack }) {
  const { messages, loading, send } = useChat();
  const [input,       setInput]       = useState('');
  const [greeted,     setGreeted]     = useState(false);

  // Auto-send a personalised greeting that includes user mood from journal
  useEffect(() => {
    if (!greeted) {
      setGreeted(true);
      const moodContext = latestMood
        ? `The user has been feeling ${latestMood} recently according to their journal. `
        : '';
      send(`${moodContext}Please guide me through the "${exercise.name}" exercise.`);
    }
  }, []);

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

      {/* Steps */}
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

      {/* Chat */}
      <div className="session-chat-area">
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
          <input className="session-input" value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Talk to Serenity, or say 'done' when finished…"
            disabled={loading} />
          <button type="submit" className="session-send"
            disabled={loading || !input.trim()}>↑</button>
        </form>
      </div>

      {/* Done + Add to Board */}
      <div className="session-footer">
        {!sessionDone ? (
          <button className="btn-session-done" onClick={onDone}>
            {fromHabitId ? '✓ Done — mark habit complete' : '✓ I finished this exercise'}
          </button>
        ) : (
          <p className="session-done-msg">
            🌿 Well done! {fromHabitId ? 'Heading back to your Habit Board…' : 'Your progress is saved.'}
          </p>
        )}
        <button
          className={`btn-add-to-board ${addedToBoard[exercise.id] ? 'added' : ''}`}
          onClick={onAddToBoard}
          disabled={addedToBoard[exercise.id]}>
          {addedToBoard[exercise.id] ? '✓ Added to Habit Board' : '+ Add to Habit Board'}
        </button>
      </div>
    </div>
  );
}

// ── Exercise card sub-component ──
function ExerciseCard({ exercise: ex, onStart, onAddToBoard, added, highlighted }) {
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
        <button className={`btn-board-ex ${added ? 'added' : ''}`}
          onClick={e => { e.stopPropagation(); onAddToBoard(); }}
          disabled={added} title="Add to Habit Board">
          {added ? '✓' : '+ Board'}
        </button>
      </div>
    </div>
  );
}
