import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app     = express();
const PORT    = process.env.PORT || 3000;
const BACKEND = process.env.BACKEND_URL || 'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const staticDir  = __dirname;

// ── Proxy ──────────────────────────────────────────────────────────────────
// Choose the pathRewrite that matches your backend:
//
//   Backend has /api prefix → pathRewrite: { '^/api': '/api' }
//   Backend has no prefix   → pathRewrite: { '^/api': '' }

app.use('/api', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  pathRewrite: { '^/api': '/api' },   // ← adjust this line
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ message: 'Backend unavailable' });
    },
  },
}));

// ── Static files ────────────────────────────────────────────────────────────
app.use(express.static(staticDir));

// ── React Router fallback ───────────────────────────────────────────────────
app.get('*', (_, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));