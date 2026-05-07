import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app     = express();
const PORT    = process.env.PORT || 3001;
const BACKEND = process.env.BACKEND_URL || 'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const staticDir  = __dirname;

app.use('/api', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },  // strip /api → backend re-adds it via its own mount
  on: {
    error: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ message: 'Backend unavailable' });
    },
    proxyReq: (proxyReq, req) => {
      console.log(`Proxy: ${req.method} ${req.path} → ${BACKEND}${proxyReq.path}`);
    },
  },
}));

app.use(express.static(staticDir));

app.get('*', (_, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));