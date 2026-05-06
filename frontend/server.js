// frontend/server.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app  = express();
const PORT = process.env.PORT || 3001;
const BACKEND = process.env.BACKEND_URL || 'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net';
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

// Proxy /api/* → backend (mirrors your vite.config.js proxy)
app.use('/api', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
}));

// Serve built React app
app.use(express.static(dist));

// React Router fallback — all routes return index.html
app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));