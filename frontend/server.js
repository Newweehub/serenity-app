import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app     = express();
const PORT    = process.env.PORT || 8080;
const BACKEND = process.env.BACKEND_URL || 'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const staticDir  = __dirname;

app.use('/', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  filter: (pathname) => pathname.startsWith('/api'), // only proxy /api/* requests
  on: {
    proxyReq: (proxyReq, req) => {
      // Explicitly forward the user identity headers
      const userId = req.headers['x-user-id'];
      const displayName = req.headers['x-display-name'];
      if (userId) proxyReq.setHeader('x-user-id', userId);
      if (displayName) proxyReq.setHeader('x-display-name', displayName);
      console.log(`Proxy: ${req.method} /api${req.path} → ${BACKEND}/api${req.path} | user: ${userId}`);
    },
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ message: 'Backend unavailable' });
    },
  },
}));

app.use(express.static(staticDir));

app.get('*', (_, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));