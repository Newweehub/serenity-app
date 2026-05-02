import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import './Insight.css';
import AddHabitModal from '../components/ui/AddHabitModal.jsx';

const PERIODS = ['week', 'month', 'year'];

const TREND_DISPLAY = {
  improving: { label: 'Improving', icon: '📈', color: 'var(--forest-light)' },
  stable:    { label: 'Stable',    icon: '〰️',  color: 'var(--amber-warm)'  },
  declining: { label: 'Declining', icon: '📉', color: 'var(--blush)'        },
};

export default function Insight() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('week');
  const [addedHabits, setAddedHabits] = useState({});
  const [addModal,    setAddModal]    = useState(null);  // { suggestion } | null
  const [dupError,    setDupError]    = useState('');

  const { data, loading, error, refetch } = useApi(
    () => api.insights.get(period),
    [period]
  );

  const report = data?.report;
  const trend  = TREND_DISPLAY[report?.moodTrend] ?? TREND_DISPLAY.stable;

  // Open modal with the suggestion pre-filled
  function addSuggestionToBoard(suggestion) {
    setDupError('');
    setAddModal({ suggestion });
  }

  async function handleModalSave({ name, category, goal, dayOfWeek, time }) {
    try {
      await api.habits.create({
        name,
        category,
        goal,
        schedule: { dayOfWeek, targetTime: time },
        addedVia: 'ai_suggestion',
      });
      setAddedHabits(prev => ({ ...prev, [addModal.suggestion]: true }));
      setAddModal(null);
      setDupError('');
    } catch {
      setDupError('Could not save. Please try again.');
    }
  }

  return (
    <div className="insight-page">

      {/* ── Period tabs ── */}
      <div className="period-tabs fade-up">
        {PERIODS.map(p => (
          <button key={p}
            className={`period-tab ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}>
            This {p}
          </button>
        ))}
      </div>

      {loading && (
        <div className="insight-loading stagger">
          {[120, 72, 72, 72].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h }} />
          ))}
        </div>
      )}

      {error && (
        <div className="insight-error fade-in">
          <p>Couldn't load insights right now.</p>
          <button onClick={refetch} className="retry-btn">Try again</button>
        </div>
      )}

      {report && !loading && (
        <div className="insight-content stagger">

          {/* ── Headline card ── */}
          <div className="insight-card headline-card fade-up">
            <div className="headline-top">
              <span className="headline-icon">🌿</span>
              <span className="headline-period">Your {period}</span>
            </div>
            <h2 className="headline-text">{report.headline}</h2>
          </div>

          {/* ── Stats row ── */}
          <div className="insight-stats fade-up">
            <div className="insight-stat-card">
              <span className="istat-value" style={{ color: trend.color }}>
                {trend.icon}
              </span>
              <span className="istat-label">Mood trend</span>
              <span className="istat-sub">{trend.label}</span>
            </div>

            <div className="insight-stat-card">
              <div className="emotion-chips">
                {(report.topEmotions ?? []).slice(0, 3).map(e => (
                  <span key={e} className="emotion-chip">{e}</span>
                ))}
                {(!report.topEmotions || report.topEmotions.length === 0) && (
                  <span className="no-data">No data yet</span>
                )}
              </div>
              <span className="istat-label">Top emotions</span>
            </div>

            <div className="insight-stat-card">
              <p className="istat-highlight-text">{report.habitHighlight || '—'}</p>
              <span className="istat-label">Habit highlight</span>
            </div>
          </div>

          {/* ── Encouragement & coaching from reflect ── */}
          {report.headline && (
            <div className="insight-card encouragement-card fade-up">
              <div className="encouragement-header">
                <span>💚</span>
                <h3 className="insight-card-title" style={{ marginBottom: 0 }}>
                  A note from Serenity
                </h3>
              </div>
              <p className="encouragement-text">
                {report.moodTrend === 'improving'
                  ? `You're doing really well. Your ${period}'s data shows real growth — the patterns you're building are working. Keep going.`
                  : report.moodTrend === 'declining'
                  ? `This ${period} has felt heavy, and that's okay. You showed up anyway. Serenity is here — let's take it one small step at a time.`
                  : `You're holding steady. Consistency like this is underrated — it's the foundation of everything. You're doing better than you think.`
                }
              </p>
            </div>
          )}

          {/* ── Patterns we noticed ── */}
          {report.patterns?.length > 0 && (
            <div className="insight-card fade-up">
              <h3 className="insight-card-title">Patterns we noticed</h3>
              <ul className="pattern-list">
                {report.patterns.map((p, i) => (
                  <li key={i} className="pattern-item">
                    <span className="pattern-dot">◈</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Suggestion + Add to Habit Board ── */}
          {report.suggestion && (
            <div className="insight-card suggestion-card fade-up">
              <div className="suggestion-label">✦ One small step</div>
              <p className="suggestion-body">{report.suggestion}</p>
              <div className="suggestion-cta-row">
                <button
                  className={`btn-add-insight-habit ${addedHabits[report.suggestion] ? 'added' : ''}`}
                  onClick={() => addSuggestionToBoard(report.suggestion)}
                  disabled={addedHabits[report.suggestion]}
                >
                  {addedHabits[report.suggestion]
                    ? '✓ Added to Habit Board'
                    : '+ Try this — add to Habit Board'}
                </button>
                <button className="btn-view-board" onClick={() => navigate('/habits')}>
                  View Habit Board →
                </button>
              </div>
            </div>
          )}

          <p className="generated-at fade-up">
            Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>

        </div>
      )}
      {addModal && (
        <AddHabitModal
          defaultValues={{
            name: addModal.suggestion,
            category: 'other',
            goal: 'Suggested from Insight',
            dayOfWeek: null,
            time: '08:00',
          }}
          dupError={dupError}
          onSave={handleModalSave}
          onCancel={() => { setAddModal(null); setDupError(''); }}
          title="Add this to your Habit Board"
        />
      )}
    </div>
  );
}
