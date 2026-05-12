import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app     = express();
const PORT    = process.env.PORT || 8080;
const BACKEND = process.env.BACKEND_URL;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!BACKEND) {
  console.error('FATAL: BACKEND_URL environment variable is not set');
  process.exit(1);
}

// ── Resolve identity from Easy Auth session cookie ────────────────────────
// Called server-side before every /api request.
// This is the only reliable way to get the userId — the browser's localStorage
// value never arrives as a header because api.js sets x-user-id but the proxy
// must explicitly forward it. Reading from /.auth/me server-side bypasses that.
async function resolveUserId(req) {
  try {
    // x-ms-client-principal-id is injected by Easy Auth when platform.enabled=true
    // Try it first (zero cost, no extra request)
    const principalId = req.headers['x-ms-client-principal-id'];
    if (principalId) return { userId: principalId, displayName: req.headers['x-ms-client-principal-name'] || '' };

    // Fallback: call /.auth/me with the session cookie forwarded
    const cookie = req.headers['cookie'] || '';
    if (!cookie) return null;

    const authRes = await fetch(`https://${req.headers.host}/.auth/me`, {
      headers: { cookie },
    });
    if (!authRes.ok) return null;

    const data = await authRes.json();
    const identity = data[0];
    if (!identity?.userId) return null;

    const claims = identity.user_claims || [];
    const getClaim = (typ) => claims.find(c => c.typ === typ)?.val;
    const displayName =
      getClaim('name') ||
      getClaim('preferred_username')?.split('@')[0] ||
      identity.userDetails ||
      'User';

    return { userId: identity.userId, displayName };
  } catch (err) {
    console.warn('[proxy] resolveUserId error:', err.message);
    return null;
  }
}

// ── Debug endpoint — remove after confirming everything works ─────────────
app.get('/api/debug-proxy', async (req, res) => {
  const identity = await resolveUserId(req);
  res.json({
    message: 'Proxy reached Node successfully',
    resolvedIdentity: identity,
    rawHeaders: {
      principalId:   req.headers['x-ms-client-principal-id'] || 'MISSING',
      principal:     req.headers['x-ms-client-principal'] ? 'present' : 'MISSING',
      xUserId:       req.headers['x-user-id'] || 'MISSING',
      cookie:        req.headers['cookie'] ? 'present' : 'MISSING',
    },
  });
});

// ── Inject identity then proxy /api/* to backend ──────────────────────────
app.use('/api', async (req, res, next) => {
  const identity = await resolveUserId(req);

  if (identity) {
    req.headers['x-user-id']      = identity.userId;
    req.headers['x-display-name'] = identity.displayName;
    console.log(`[proxy] ${req.method} ${req.path} | userId: ${identity.userId}`);
  } else {
    console.warn(`[proxy] ${req.method} ${req.path} | userId: MISSING — no session`);
  }

  next();
}, createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      // Explicitly set the headers on the outgoing request to the backend
      if (req.headers['x-user-id'])
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      if (req.headers['x-display-name'])
        proxyReq.setHeader('x-display-name', req.headers['x-display-name']);
      if (req.headers['x-ms-client-principal-id'])
        proxyReq.setHeader('x-ms-client-principal-id', req.headers['x-ms-client-principal-id']);
    },
    error: (err, req, res) => {
      console.error('[proxy] error:', err.message);
      res.status(502).json({ message: 'Backend unavailable' });
    },
  },
}));

// ── Static files ──────────────────────────────────────────────────────────
app.use(express.static(__dirname));

// ── SPA fallback ──────────────────────────────────────────────────────────
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend on port ${PORT} → backend: ${BACKEND}`));