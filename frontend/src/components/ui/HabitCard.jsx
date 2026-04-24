import { useState } from 'react';
import { api } from '../../lib/api.js';
import './HabitCard.css';

const CATEGORY_ICONS = {
  sleep:        '🌙',
  movement:     '🏃',
  mindfulness:  '🧘',
  nutrition:    '🌱',
  social:       '🤝',
  other:        '✦',
};

export default function HabitCard({ habit, onUpdate }) {
  const [loading,  setLoading]  = useState(false);
  const [reframe,  setReframe]  = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const checkedToday = habit.checkIns?.some(c => c.date === today && c.completed);

  async function handleCheckIn(completed) {
    setLoading(true);
    setReframe(null);
    try {
      const result = await api.habits.checkIn(habit.id, { completed });
      if (result.reframe) setReframe(result.reframe);
      onUpdate?.(result.habit);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const streakWidth = Math.min((habit.streak?.current / 30) * 100, 100);

  return (
    <div className={`habit-card fade-up ${checkedToday ? 'checked' : ''}`}>
      <div className="habit-card-header">
        <span className="habit-icon">{CATEGORY_ICONS[habit.category] ?? '✦'}</span>
        <div className="habit-info">
          <h3 className="habit-name">{habit.name}</h3>
          {habit.goal && <p className="habit-goal">{habit.goal}</p>}
        </div>
        <div className="habit-streak-badge">
          <span className="streak-count">{habit.streak?.current ?? 0}</span>
          <span className="streak-label">day{habit.streak?.current !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Streak bar */}
      <div className="streak-bar-track">
        <div
          className="streak-bar-fill"
          style={{ width: `${streakWidth}%` }}
        />
      </div>

      {/* Reframe message */}
      {reframe && (
        <p className="habit-reframe fade-in">💬 {reframe}</p>
      )}

      {/* Actions */}
      {!checkedToday ? (
        <div className="habit-actions">
          <button
            className="btn-checkin done"
            onClick={() => handleCheckIn(true)}
            disabled={loading}
          >
            {loading ? '…' : '✓ Done'}
          </button>
          <button
            className="btn-checkin missed"
            onClick={() => handleCheckIn(false)}
            disabled={loading}
          >
            Not today
          </button>
        </div>
      ) : (
        <p className="habit-checked-label">✓ Completed today</p>
      )}
    </div>
  );
}
