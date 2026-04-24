import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import './Insight.css';

const PERIODS = ['week', 'month', 'year'];

const TREND_DISPLAY = {
  improving: { label: 'Improving',  icon: '↑', color: 'var(--forest-light)' },
  stable:    { label: 'Stable',     icon: '→', color: 'var(--amber-warm)'   },
  declining: { label: 'Declining',  icon: '↓', color: 'var(--blush)'        },
};

export default function Insight() {
  const [period, setPeriod] = useState('week');

  const { data, loading, error, refetch } = useApi(
    () => api.insights.get(period),
    [period]
  );

  const report = data?.report;
  const trend  = TREND_DISPLAY[report?.moodTrend] ?? TREND_DISPLAY.stable;

  return (
    <div className="insight-page">

      {/* Period tabs */}
      <div className="period-tabs fade-up">
        {PERIODS.map(p => (
          <button
            key={p}
            className={`period-tab ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            This {p}
          </button>
        ))}
      </div>

      {loading && (
        <div className="insight-loading stagger">
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: i === 1 ? 100 : 72 }} />
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

          {/* Headline card */}
          <div className="insight-card headline-card fade-up">
            <div className="headline-top">
              <span className="headline-icon">🌿</span>
              <span className="headline-period">Your {period}</span>
            </div>
            <h2 className="headline-text">{report.headline}</h2>
          </div>

          {/* Stats row */}
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

          {/* Patterns */}
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

          {/* Suggestion */}
          {report.suggestion && (
            <div className="insight-card suggestion-card fade-up">
              <div className="suggestion-label">✦ One small step</div>
              <p className="suggestion-body">{report.suggestion}</p>
            </div>
          )}

          <p className="generated-at fade-up">
            Generated {new Date(report.generatedAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>

        </div>
      )}
    </div>
  );
}
