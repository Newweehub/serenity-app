// All API calls go through this module.
// userId is read from localStorage (set after login / dev setup).

const BASE = '/api';

// Cache the user info so we don't call /.auth/me on every request
let authCache = null;

async function getAuthInfo() {
  if (authCache) return authCache;
  try {
    const res = await fetch('/.auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    authCache = data[0] ?? null; // first identity provider
    return authCache;
  } catch {
    return null;
  }
}

// No redirect here — Easy Auth handles unauthenticated users at the platform level.
// The redirect guard was causing a race condition: getUserId() ran before
// initAuthFromEasyAuth() finished populating localStorage, triggering an
// infinite login loop (visible as cancelled 'aad' requests in DevTools).
function getUserId() {
  return localStorage.getItem('serenity_user_id') || 'dev-user-001';
}

export async function initAuthFromEasyAuth() {
  if (window.location.hostname === 'localhost') return;

  try {
    const res = await fetch('/.auth/me');
    if (!res.ok) return;

    const data = await res.json();
    const identity = data[0];
    if (!identity) return;

    // Azure Easy Auth returns userId directly as the OID
    const userId = identity.userId;

    // Get display name — try name claim first, then email prefix
    const claims = identity.user_claims || [];
    const get = (typ) => claims.find(c => c.typ === typ)?.val;

    const displayName =
      get('name') ||
      get('preferred_username')?.split('@')[0] ||
      get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name') ||
      'User';

    if (userId) {
      localStorage.setItem('serenity_user_id', userId);
      console.log('EasyAuth: userId =', userId);
    }
    if (displayName) {
      localStorage.setItem('serenity_display_name', displayName);
    }
  } catch (err) {
    console.warn('EasyAuth not available:', err.message);
  }
}

function getDisplayName() {
  return localStorage.getItem('serenity_display_name') || '';
}

async function request(method, path, body) {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': getUserId(),
  };
  const displayName = getDisplayName();
  if (displayName) headers['x-display-name'] = displayName;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
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
    send:        (message, history) => post('/chat', { message, history }),
    sendJournal: (message, history) => post('/chat/journal', { message, history }),
    endSession:  (history)          => post('/chat', { message: '', history, endSession: true }),
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
    list:           ()           => get('/habits'),
    create:         (data)       => post('/habits', data),
    checkIn:        (id, data)   => post(`/habits/${id}/checkin`, data),
    updateStatus:   (id, status) => patch(`/habits/${id}/status`, { status }),
    updateSchedule: (id, data)   => patch(`/habits/${id}/schedule`, data),
    update:         (id, data)   => patch(`/habits/${id}`, data),
    suggest:        (message)    => post('/habits/suggest', { message }),
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
    me:                () =>        get('/users/me'),
    updatePreferences: (prefs) =>   patch('/users/me/preferences', prefs),
  },
};