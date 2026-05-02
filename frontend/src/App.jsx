import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Journal from './pages/Journal.jsx';
import Mindfulness from './pages/Mindfulness.jsx';
import HabitBoard from './pages/HabitBoard.jsx';
import Insight from './pages/Insight.jsx';
import Settings from './pages/Settings.jsx';
import { api } from './lib/api.js';
import { useTTSContext } from './context/TTSContext.jsx';
import './App.css';

// ── Dev login gate (local only) ───────────────────────────────────────────
function DevLoginGate({ children }) {
  const isLocalhost = window.location.hostname === 'localhost';
  const hasUserId   = !!localStorage.getItem('serenity_user_id');
  const [name,   setName]   = useState('');
  const [userId, setUserId] = useState('');

  if (!isLocalhost || hasUserId) return children;

  function handleLogin(e) {
    e.preventDefault();
    if (!userId.trim()) return;
    localStorage.setItem('serenity_user_id', userId.trim());
    window.location.reload();
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--warm-white)', padding:'20px' }}>
      <div style={{ background:'white', border:'2px solid var(--sage-light)', borderRadius:'var(--radius-lg)', padding:'36px 32px', maxWidth:'360px', width:'100%', display:'flex', flexDirection:'column', gap:'16px' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'32px' }}>🌿</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:300, color:'var(--forest)', marginTop:'8px' }}>Welcome to Serenity</h1>
          <p style={{ fontSize:'13px', color:'var(--ink-faint)', marginTop:'6px' }}>Local dev mode — enter a name and user ID to begin</p>
        </div>
        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          <input style={{ padding:'10px 14px', border:'1.5px solid var(--sage-light)', borderRadius:'var(--radius-md)', fontSize:'14px' }}
            placeholder="Your name (e.g. Mia)" value={name} onChange={e => setName(e.target.value)} />
          <input style={{ padding:'10px 14px', border:'1.5px solid var(--sage-light)', borderRadius:'var(--radius-md)', fontSize:'14px' }}
            placeholder="User ID (e.g. user-001)" value={userId} onChange={e => setUserId(e.target.value)} required />
          <button type="submit" style={{ padding:'10px', background:'var(--forest)', color:'var(--parchment)', borderRadius:'var(--radius-xl)', fontSize:'14px', fontWeight:500 }}>
            Enter Serenity
          </button>
        </form>
        <p style={{ fontSize:'11px', color:'var(--ink-faint)', textAlign:'center', lineHeight:1.5 }}>
          On Azure, Microsoft login handles this automatically via Azure Static Web Apps authentication.
        </p>
      </div>
    </div>
  );
}

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
// ── Stop TTS on page navigation ──────────────────────────────────────────────
function RouteChangeStopper() {
  const location = useLocation();
  const { stop, speaking } = useTTSContext();

  useEffect(() => {
    if (speaking) stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}

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
    <DevLoginGate>
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
      <RouteChangeStopper />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="journal"     element={<Journal />} />
          <Route path="mindfulness" element={<Mindfulness />} />
          <Route path="habits"      element={<HabitBoard />} />
          <Route path="insight"     element={<Insight />} />
          <Route path="settings"    element={<Settings />} />
        </Route>
      </Routes>
    </DevLoginGate>
  );
}
