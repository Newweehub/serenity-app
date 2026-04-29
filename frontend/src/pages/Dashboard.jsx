import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser.js';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import './Dashboard.css';
import { getMockWearableData, getWearableExerciseSuggestion } from '../lib/wearable.js';


const MOODS = [
  { emoji: '😔', label: 'Low',   score: 2 },
  { emoji: '😕', label: 'Meh',   score: 4 },
  { emoji: '😐', label: 'Okay',  score: 5 },
  { emoji: '🙂', label: 'Good',  score: 7 },
  { emoji: '😊', label: 'Great', score: 9 },
];

function greeting(name) {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${prefix}, ${name || 'friend'}.`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();

  const { data: habitsData, loading: habitsLoading } = useApi(() => api.habits.list());
  const { data: insightData } = useApi(() => api.insights.get('week'));

  const [selectedMood, setSelectedMood] = useState(null);
  const [moodSaved,    setMoodSaved]    = useState(false);

  const habits      = habitsData?.habits ?? [];
  const today       = new Date().toISOString().slice(0, 10);
  const doneToday   = habits.filter(h => h.checkIns?.some(c => c.date === today && c.completed)).length;
  const totalActive = habits.length;
  const streaks     = user?.streaks      ?? {};
  const memory      = user?.memoryContext ?? {};
  const report      = insightData?.report;
  const wearable    = getMockWearableData();
  const wearableSuggestion = getWearableExerciseSuggestion(wearable);

  async function handleMoodSelect(mood) {
    if (moodSaved) return;
    setSelectedMood(mood);
    try {
      await api.journal.create({
        freeText: `Daily mood check-in: ${mood.label}`,
        moodEmoji: mood.emoji,
        moodScore: mood.score,
      });
      setMoodSaved(true);
    } catch { /* non-critical */ }
  }

  return (
    <div className="dashboard stagger">

      {/* ── Greeting ── */}
      <div className="dash-greeting fade-up">
        <h2 className="greeting-text">{greeting(user?.profile?.displayName)}</h2>
        {memory.lastSessionSummary && (
          <p className="last-session">Last time: {memory.lastSessionSummary}</p>
        )}
      </div>

      {/* ── Mood check-in block ── */}
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

      {/* ── Stats row ── */}
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
          <span className="stat-value">
            {habitsLoading ? '—' : `${doneToday}/${totalActive}`}
          </span>
          <span className="stat-label">Habits today</span>
          <span className="stat-unit">done</span>
        </div>
        <div className="stat-card" onClick={() => navigate('/insight')}>
          <span className="stat-value mood-trend-val">
            {memory.moodTrend === 'improving' ? '↑'
              : memory.moodTrend === 'declining' ? '↓' : '→'}
          </span>
          <span className="stat-label">Mood trend</span>
          <span className="stat-unit">{memory.moodTrend ?? 'stable'}</span>
        </div>
      </div>

      <div className="dash-bottom-row fade-up">

        {/* ── Habit board focus ── */}
        <section className="dash-card habit-focus-card">
          <div className="card-header-row">
            <h3 className="card-label">Habit board — today's focus</h3>
            <button className="card-link" onClick={() => navigate('/habits')}>View all →</button>
          </div>
          {habitsLoading ? (
            <div className="dash-skeletons">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38 }} />)}
            </div>
          ) : habits.length === 0 ? (
            <p className="dash-empty">
              No habits yet.{' '}
              <button className="inline-link" onClick={() => navigate('/habits')}>Add one →</button>
            </p>
          ) : (() => {
            const todayDay = new Date().getDay();
            const todaysHabits = habits.filter(h => {
              const dw = h.schedule?.dayOfWeek;
              return dw === null || dw === undefined || Number(dw) === todayDay;
            });
            return todaysHabits.length === 0 ? (
              <p className="dash-empty">No habits scheduled for today. <button className="inline-link" onClick={() => navigate('/habits')}>Add one →</button></p>
            ) : (
              <ul className="focus-habit-list">
                {todaysHabits.slice(0, 5).map(h => {
                  const done = h.checkIns?.some(c => c.date === today && c.completed);
                  return (
                    <li key={h.id} className={`focus-habit-item ${done ? 'done' : ''}`}
                      onClick={() => navigate('/habits')}>
                      <span className="focus-check">{done ? '✓' : '○'}</span>
                      <span className="focus-name">{h.name}</span>
                      {h.schedule?.targetTime && (
                        <span className="focus-time">{h.schedule.targetTime}</span>
                      )}
                      <span className="focus-streak">{h.streak?.current ?? 0}d 🔥</span>
                    </li>
                  );
                })}
              </ul>
            );
          })()
          }
        </section>

        {/* ── Insight snippet from insight page ── */}
        <section className="dash-card insight-snippet-card"
          onClick={() => navigate('/insight')} role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/insight')}>
          <h3 className="card-label">Insight this week</h3>
          {report ? (
            <>
              <p className="snippet-headline">{report.headline}</p>
              {report.patterns?.[0] && (
                <p className="snippet-pattern">◈ {report.patterns[0]}</p>
              )}
              {report.suggestion && (
                <div className="snippet-suggestion">
                  <span className="snippet-suggestion-label">✦ Next step</span>
                  <span>{report.suggestion}</span>
                </div>
              )}
            </>
          ) : (
            <p className="dash-empty" style={{ fontStyle: 'italic' }}>
              Keep journaling — insights will appear here.
            </p>
          )}
          <span className="snippet-cta">See full insight →</span>
        </section>

      </div>

      {/* ── Wearable data card ── */}
      <div className="dash-bottom-row-3 fade-up">
        <section className="dash-card wearable-card">
          <div className="card-header-row">
            <h3 className="card-label">Body data today <span className="wearable-source">({wearable.source})</span></h3>
          </div>
          <div className="wearable-metrics">
            <div className="wearable-metric">
              <span className="wm-icon">👟</span>
              <div>
                <span className="wm-value">{wearable.today.steps.toLocaleString()}</span>
                <span className="wm-label">/ {wearable.today.stepGoal.toLocaleString()} steps</span>
              </div>
              <div className="wm-bar-track">
                <div className="wm-bar-fill" style={{width: `${Math.min(100, wearable.today.steps / wearable.today.stepGoal * 100)}%`}} />
              </div>
            </div>
            <div className="wearable-metric">
              <span className="wm-icon">❤️</span>
              <div>
                <span className="wm-value">{wearable.today.heartRate}</span>
                <span className="wm-label">bpm · {wearable.today.hrZone}</span>
              </div>
            </div>
            <div className="wearable-metric">
              <span className="wm-icon">😴</span>
              <div>
                <span className="wm-value">{wearable.today.sleep.totalHours}h</span>
                <span className="wm-label">sleep · {wearable.today.sleep.quality}</span>
              </div>
            </div>
            <div className="wearable-metric">
              <span className="wm-icon">🧘</span>
              <div>
                <span className="wm-value">{wearable.today.stressLevel}</span>
                <span className="wm-label">stress level</span>
              </div>
            </div>
          </div>
          {wearableSuggestion && (
            <button className="wearable-suggestion"
              onClick={() => navigate('/mindfulness', { state: { exerciseId: wearableSuggestion.exerciseId } })}>
              🌿 {wearableSuggestion.reason} <span className="ws-arrow">Try it →</span>
            </button>
          )}
        </section>

      </div>

      {/* ── Quick nav ── */}
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
