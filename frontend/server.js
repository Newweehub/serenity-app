import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app     = express();
const PORT    = process.env.PORT || 8080;
const BACKEND = process.env.BACKEND_URL ||
  'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── 1. Always pass /.auth/* through untouched ─────────────────────────────
// Easy Auth handles /.auth/login, /.auth/logout, /.auth/me, /.auth/callback
// Do NOT proxy or block these — Azure intercepts them before Node sees them
// This app.use is just a safety no-op so nothing below accidentally catches them
app.use('/.auth', (req, res, next) => next());

// Temporary debug — remove after confirming proxy works
app.get('/api/debug-proxy', (req, res) => {
  res.json({
    message: 'Proxy reached Node successfully',
    headers: {
      principalId:   req.headers['x-ms-client-principal-id'] || 'MISSING',
      principal:     req.headers['x-ms-client-principal'] ? 'present' : 'MISSING',
      cookie:        req.headers.cookie ? 'present' : 'MISSING',
    }
  });
});

// ── 2. Proxy /api/* to backend ────────────────────────────────────────────
app.use(
  '/api',
  createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Azure injects x-ms-client-principal as a base64 token on the REQUEST
        // that hits this Node server (when Easy Auth is in "Require auth" mode).
        // Forward every x-ms-* header the platform injected.
        const msHeaders = [
          'x-ms-client-principal-id',
          'x-ms-client-principal-name',
          'x-ms-client-principal',
          'x-ms-token-aad-id-token',
        ];
        msHeaders.forEach(h => {
          if (req.headers[h]) proxyReq.setHeader(h, req.headers[h]);
        });

        // Also forward our own app headers
        if (req.headers['x-user-id'])     proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        if (req.headers['x-display-name']) proxyReq.setHeader('x-display-name', req.headers['x-display-name']);

        console.log(`→ ${req.method} /api${req.path} | principal: ${req.headers['x-ms-client-principal-id'] || 'MISSING'}`);
      },
      error: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(502).json({ message: 'Backend unavailable' });
      },
    },
  })
);

// ── 3. Static files ───────────────────────────────────────────────────────
app.use(express.static(__dirname));

// ── 4. SPA fallback ───────────────────────────────────────────────────────
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend on port ${PORT}`));