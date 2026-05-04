import 'dotenv/config';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { authMiddleware } from './middleware/auth.js';
import chatRoutes from './routes/chat.js';
import journalRoutes from './routes/journal.js';
import habitRoutes from './routes/habits.js';
import insightRoutes from './routes/insights.js';
import searchRoutes from './routes/search.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Global middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ── CORS for local dev ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-user-id,x-ms-client-principal-id');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Health check (no auth) ─────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'serenity', version: '1.0.0', timestamp: new Date().toISOString() }));

// ── Protected routes ───────────────────────────────────────────────────────
// authMiddleware validates the userId header / token on every route below
app.use('/api', authMiddleware);

app.use('/api/chat',     chatRoutes);
app.use('/api/journal',  journalRoutes);
app.use('/api/habits',   habitRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/search',   searchRoutes);
app.use('/api/users',    userRoutes);

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🌿 Serenity backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

export default app;
