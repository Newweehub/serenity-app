import { useState } from 'react';
import '../ui/ConfirmModal.css';
import './AddHabitModal.css';

export const DAYS = [
  { label: 'Every day', value: null },
  { label: 'Sunday',    value: 0 },
  { label: 'Monday',    value: 1 },
  { label: 'Tuesday',   value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday',  value: 4 },
  { label: 'Friday',    value: 5 },
  { label: 'Saturday',  value: 6 },
];

const CATEGORIES = ['sleep', 'movement', 'mindfulness', 'nutrition', 'social', 'other'];

export function dayLabel(dayOfWeek) {
  if (dayOfWeek === null || dayOfWeek === undefined) return 'Every day';
  return DAYS.find(d => d.value === dayOfWeek)?.label ?? 'Every day';
}

export function formatTime12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Shared AddHabitModal — used by HabitBoard, Mindfulness, and Insight pages.
 *
 * Props:
 *   defaultValues: { name, category, goal, dayOfWeek, time, exerciseId }
 *   onSave(fields):  called with { name, category, goal, dayOfWeek, time }
 *   onCancel():      close modal
 *   dupError:        string | '' — shown as a warning at the top
 *   title:           optional modal title override
 */
export default function AddHabitModal({ defaultValues = {}, onSave, onCancel, dupError = '', title = 'Add to Habit Board' }) {
  const [name,      setName]      = useState(defaultValues.name      ?? '');
  const [category,  setCategory]  = useState(defaultValues.category  ?? 'mindfulness');
  const [goal,      setGoal]      = useState(defaultValues.goal       ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(defaultValues.dayOfWeek ?? null);
  const [time,      setTime]      = useState(defaultValues.time       ?? '08:00');
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), category, goal: goal.trim(), dayOfWeek, time });
    setSaving(false);
  }

  const preview = name.trim()
    ? `"${name.trim()}" — ${dayLabel(dayOfWeek)} at ${formatTime12(time)}`
    : `Schedule: ${dayLabel(dayOfWeek)} at ${formatTime12(time)}`;

  return (
    <div className="modal-backdrop fade-in" onClick={onCancel}>
      <div className="modal-box add-habit-modal fade-up" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>

        {dupError && <p className="dup-warning">⚠️ {dupError}</p>}

        <div className="ahm-field">
          <label className="ahm-label">Habit name</label>
          <input className="ahm-input" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning breathing exercise" />
        </div>

        <div className="ahm-field">
          <label className="ahm-label">Category</label>
          <select className="ahm-select" value={category}
            onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="ahm-field">
          <label className="ahm-label">Goal <span className="ahm-optional">(optional)</span></label>
          <input className="ahm-input" value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="What do you want to achieve?" />
        </div>

        <div className="ahm-schedule-row">
          <div className="ahm-field">
            <label className="ahm-label">📅 Day</label>
            <select className="ahm-select"
              value={String(dayOfWeek ?? 'null')}
              onChange={e => setDayOfWeek(e.target.value === 'null' ? null : Number(e.target.value))}>
              {DAYS.map(d => (
                <option key={String(d.value)} value={String(d.value)}>{d.label}</option>
              ))}
            </select>
          </div>
          <div className="ahm-field">
            <label className="ahm-label">🕐 Time</label>
            <input type="time" className="ahm-input" value={time}
              onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <p className="ahm-preview">{preview}</p>

        <div className="modal-actions">
          <button className="modal-btn confirm" onClick={handleSave}
            disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Add habit'}
          </button>
          <button className="modal-btn cancel" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
