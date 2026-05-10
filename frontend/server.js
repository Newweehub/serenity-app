import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const app    = express();
const PORT   = process.env.PORT || 8080;
const BACKEND = process.env.BACKEND_URL || 'https://serenity-backend-c4cxeedyfahpfpac.southeastasia-01.azurewebsites.net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Proxy /api/* to backend — must come BEFORE the auth check
app.use(
  createProxyMiddleware({
    target: BACKEND,
    changeOrigin: true,
    pathFilter: '/api',            // v3 syntax (fix from earlier)
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward identity headers to backend
        const principalId = req.headers['x-ms-client-principal-id'];
        const userId      = req.headers['x-user-id'];
        const displayName = req.headers['x-display-name'];
        if (principalId) proxyReq.setHeader('x-ms-client-principal-id', principalId);
        if (userId)      proxyReq.setHeader('x-user-id', userId);
        if (displayName) proxyReq.setHeader('x-display-name', displayName);
      },
      error: (err, req, res) => {
        res.status(502).json({ message: 'Backend unavailable' });
      },
    },
  })
);

// 2. Auth check — redirect to Microsoft login if no session
//    This only runs for non-/api requests (proxy above handles /api)
app.use((req, res, next) => {
  // /.auth/* paths must always pass through (login/logout/callback/me)
  if (req.path.startsWith('/.auth')) return next();

  // Check for Easy Auth session cookie (set by Azure after login)
  const hasSession = req.headers['x-ms-client-principal-id'] ||
                     req.headers['x-ms-client-principal'];

  if (!hasSession) {
    // Redirect to Microsoft login, come back to the original path
    const returnUrl = encodeURIComponent(req.originalUrl);
    return res.redirect(`/.auth/login/aad?post_login_redirect_uri=${returnUrl}`);
  }

  next();
});

// 3. Static files
app.use(express.static(__dirname));

// 4. SPA fallback
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT}`));