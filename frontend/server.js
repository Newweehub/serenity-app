// frontend/server.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app     = express();
const PORT    = process.env.PORT || 3001;
const BACKEND = process.env.BACKEND_URL || 'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net';

// ← Fix: serve from current directory, not ./dist
// When deployed, server.js sits alongside index.html in /home/site/wwwroot/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = __dirname;   // was: path.join(__dirname, 'dist')

// Proxy /api/* → backend
app.use('/api', createProxyMiddleware({
  target: BACKEND,
  changeOrigin: true,
}));

// Serve static files
app.use(express.static(staticDir));

// React Router fallback
app.get('*', (_, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));