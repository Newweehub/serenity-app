import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser.js';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import './Dashboard.css';

const MOODS = [
  { emoji: '😔', label: 'Low',      score: 2 },
  { emoji: '😕', label: 'Meh',      score: 4 },
  { emoji: '😐', label: 'Okay',     score: 5 },
  { emoji: '🙂', label: 'Good',     score: 7 },
  { emoji: '😊', label: 'Great',    score: 9 },
];

function greeting(name) {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${salutation}, ${name || 'friend'}.`;
}

export default function Dashboard() {
  const navigate            = useNavigate();
  const { user }            = useUser();
  const { data: habitsData, loading: habitsLoading } = useApi(() => api.habits.list());

  const [selectedMood, setSelectedMood] = useState(null);
  const [moodSaved,    setMoodSaved]    = useState(false);

  const habits = habitsData?.habits ?? [];
  const today  = new Date().toISOString().slice(0, 10);
  const doneToday  = habits.filter(h => h.checkIns?.some(c => c.date === today && c.completed)).length;
  const totalActive = habits.length;

  const streaks = user?.streaks ?? {};
  const memory  = user?.memoryContext ?? {};

  async function handleMoodSelect(mood) {
    setSelectedMood(mood);
    // Log as a quick journal entry with just a mood score
    try {
      await api.journal.create({
        freeText: `Daily mood check-in: ${mood.label}`,
        moodEmoji: mood.emoji,
        moodScore: mood.score,
      });
      setMoodSaved(true);
    } catch {
      // Non-critical — don't block the user
    }
  }

  return (
    <div className="dashboard stagger">

      {/* Greeting */}
      <div className="dash-greeting fade-up">
        <h2 className="greeting-text">{greeting(user?.profile?.displayName)}</h2>
        {memory.lastSessionSummary && (
          <p className="last-session">Last time: {memory.lastSessionSummary}</p>
        )}
      </div>

      {/* Mood check-in */}
      <section className="dash-card mood-card fade-up">
        <h3 className="card-label">How are you feeling right now?</h3>
        {!moodSaved ? (
          <div className="mood-row">
            {MOODS.map(m => (
              <button
                key={m.score}
                className={`mood-btn ${selectedMood?.score === m.score ? 'selected' : ''}`}
                onClick={() => handleMoodSelect(m)}
                aria-label={m.label}
              >
                <span className="mood-emoji">{m.emoji}</span>
                <span className="mood-label">{m.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mood-saved fade-in">
            {selectedMood?.emoji} Noted — thanks for checking in.
          </p>
        )}
      </section>

      {/* Stats row */}
      <div className="dash-stats fade-up">
        <div className="stat-card" onClick={() => navigate('/journal')}>
          <span className="stat-value">{streaks.journalStreak ?? 0}</span>
          <span className="stat-label">Journal streak</span>
          <span className="stat-unit">days</span>
        </div>
        <div className="stat-card" onClick={() => navigate('/mindfulness')}>
          <span className="stat-value">{streaks.mindfulnessStreak ?? 0}</span>
          <span className="stat-label">Mindfulness streak</span>
          <span className="stat-unit">days</span>
        </div>
        <div className="stat-card" onClick={() => navigate('/habits')}>
          <span className="stat-value">{habitsLoading ? '—' : `${doneToday}/${totalActive}`}</span>
          <span className="stat-label">Habits today</span>
          <span className="stat-unit">done</span>
        </div>
        <div className="stat-card" onClick={() => navigate('/insight')}>
          <span className="stat-value mood-trend-val">
            {memory.moodTrend === 'improving' ? '↑' : memory.moodTrend === 'declining' ? '↓' : '→'}
          </span>
          <span className="stat-label">Mood trend</span>
          <span className="stat-unit">{memory.moodTrend ?? 'stable'}</span>
        </div>
      </div>

      {/* Habits focus today */}
      <section className="dash-card fade-up">
        <div className="card-header-row">
          <h3 className="card-label">Today's focus</h3>
          <button className="card-link" onClick={() => navigate('/habits')}>
            View all →
          </button>
        </div>
        {habitsLoading ? (
          <div className="dash-skeletons">
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36 }} />)}
          </div>
        ) : habits.length === 0 ? (
          <p className="dash-empty">
            No habits yet.{' '}
            <button className="inline-link" onClick={() => navigate('/habits')}>
              Add one →
            </button>
          </p>
        ) : (
          <ul className="focus-habit-list">
            {habits.slice(0, 4).map(h => {
              const done = h.checkIns?.some(c => c.date === today && c.completed);
              return (
                <li key={h.id} className={`focus-habit-item ${done ? 'done' : ''}`}>
                  <span className="focus-check">{done ? '✓' : '○'}</span>
                  <span className="focus-name">{h.name}</span>
                  <span className="focus-streak">{h.streak?.current ?? 0}d</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Quick nav */}
      <div className="dash-quick-nav fade-up">
        <button className="quick-btn" onClick={() => navigate('/journal')}>
          <span>✦</span> Write in journal
        </button>
        <button className="quick-btn" onClick={() => navigate('/mindfulness')}>
          <span>◌</span> Start exercise
        </button>
        <button className="quick-btn" onClick={() => navigate('/insight')}>
          <span>◈</span> View insights
        </button>
      </div>

    </div>
  );
}
