// All API calls go through this module.
// userId is read from localStorage (set after login / dev setup).

const BASE = '/api';

function getUserId() {
  return localStorage.getItem('serenity_user_id') || 'dev-user-001';
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

const get  = (path)        => request('GET',   path);
const post = (path, body)  => request('POST',  path, body);
const patch = (path, body) => request('PATCH', path, body);

// ── Chat ────────────────────────────────────────────────────────────────────
export const api = {
  chat: {
    send:       (message, history)  => post('/chat', { message, history }),
    sendJournal: (message, history) => post('/chat/journal', { message, history }),
    endSession: (history)           => post('/chat', { message: '', history, endSession: true }),
  },

  // ── Journal ───────────────────────────────────────────────────────────────
  journal: {
    list:      (limit = 20, offset = 0) => get(`/journal?limit=${limit}&offset=${offset}`),
    get:       (id)                     => get(`/journal/${id}`),
    create:    (data)                   => post('/journal', data),
    getPrompt: (timeOfDay = 'anytime')  => get(`/journal/prompt?timeOfDay=${timeOfDay}`),
  },

  // ── Habits ────────────────────────────────────────────────────────────────
  habits: {
    list:         ()              => get('/habits'),
    create:       (data)          => post('/habits', data),
    checkIn:      (id, data)      => post(`/habits/${id}/checkin`, data),
    updateStatus:   (id, status)  => patch(`/habits/${id}/status`, { status }),
    updateSchedule: (id, data)    => patch(`/habits/${id}/schedule`, data),
    suggest:      (message)       => post('/habits/suggest', { message }),
  },

  // ── Insights ──────────────────────────────────────────────────────────────
  insights: {
    get: (period = 'week') => get(`/insights?period=${period}`),
  },

  // ── Search ────────────────────────────────────────────────────────────────
  search: {
    query: (q, top = 5) => get(`/search?q=${encodeURIComponent(q)}&top=${top}`),
  },

  // ── User ──────────────────────────────────────────────────────────────────
  user: {
    me:                () =>            get('/users/me'),
    updatePreferences: (prefs) =>       patch('/users/me/preferences', prefs),
  },
};
