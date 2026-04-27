import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Journal from './pages/Journal.jsx';
import Mindfulness from './pages/Mindfulness.jsx';
import HabitBoard from './pages/HabitBoard.jsx';
import Insight from './pages/Insight.jsx';
import { api } from './lib/api.js';
import './App.css';

function localDateString(date) {
  const d = date || new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function getNotifiedKey(habitId, key) {
  return 'serenity_notified:' + habitId + ':' + key;
}
function wasAlreadyNotified(habitId, key) {
  return sessionStorage.getItem(getNotifiedKey(habitId, key)) === '1';
}
function markNotified(habitId, key) {
  sessionStorage.setItem(getNotifiedKey(habitId, key), '1');
}

// ── Notification toast — clickable, scrolls to specific habit ────────────
function NotificationToast({ message, habitId, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [onClose]);

  function handleClick() {
    onClose();
    // Pass habitId in router state so HabitBoard can scroll to it
    navigate('/habits', { state: { scrollToHabitId: habitId } });
  }

  return (
    <div className="global-toast fade-in" onClick={handleClick} title="Click to go to this habit">
      <span className="global-toast-icon">🔔</span>
      <div className="global-toast-body">
        <span className="global-toast-text">{message}</span>
        <span className="global-toast-hint">Tap to go to this habit →</span>
      </div>
      <button
        className="global-toast-close"
        onClick={e => { e.stopPropagation(); onClose(); }}
      >✕</button>
    </div>
  );
}

// ── Global reminder hook ──────────────────────────────────────────────────
function useGlobalReminders(onNotify) {
  useEffect(() => {
    async function checkReminders() {
      try {
        const result = await api.habits.list();
        const habits = result?.habits;
        if (!habits?.length) return;

        const now        = new Date();
        const currentDay = now.getDay();
        const hh         = String(now.getHours()).padStart(2, '0');
        const mm         = String(now.getMinutes()).padStart(2, '0');
        const currentTime = hh + ':' + mm;
        const today      = localDateString(now);

        habits.forEach(h => {
          const s = h.schedule;
          if (!s || !s.targetTime) return;

          const dayMatch =
            s.dayOfWeek === null ||
            s.dayOfWeek === undefined ||
            Number(s.dayOfWeek) === currentDay;
          if (!dayMatch) return;

          const checkedToday = (h.checkIns || []).some(
            c => c.date === today && c.completed
          );
          if (checkedToday) return;

          const [tH, tM] = s.targetTime.split(':').map(Number);
          const [cH, cM] = currentTime.split(':').map(Number);
          const diff = cH * 60 + cM - (tH * 60 + tM);
          if (diff < 0 || diff >= 2) return;

          const dedupeKey = today + ':' + currentTime;
          if (wasAlreadyNotified(h.id, dedupeKey)) return;
          markNotified(h.id, dedupeKey);

          onNotify({ habitId: h.id, message: 'Time for "' + h.name + '"! 🌿' });
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[Serenity reminders]', err.message);
        }
      }
    }

    const initialTimer = setTimeout(checkReminders, 2000);
    const interval = setInterval(checkReminders, 60000);
    return () => { clearTimeout(initialTimer); clearInterval(interval); };
  }, [onNotify]);
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ habitId, message }) => {
    setToasts(prev => {
      if (prev.some(t => t.habitId === habitId)) return prev;
      return [...prev, { id: habitId + '-' + Date.now(), habitId, message }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useGlobalReminders(addToast);

  return (
    <>
      <div className="global-toast-container">
        {toasts.map(t => (
          <NotificationToast
            key={t.id}
            message={t.message}
            habitId={t.habitId}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="journal"     element={<Journal />} />
          <Route path="mindfulness" element={<Mindfulness />} />
          <Route path="habits"      element={<HabitBoard />} />
          <Route path="insight"     element={<Insight />} />
        </Route>
      </Routes>
    </>
  );
}
