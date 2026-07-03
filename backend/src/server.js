import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import connectPgSimple from 'connect-pg-simple';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { pool } from './db/pool.js';
import authRoutes from './routes/auth.js';
import habitRoutes from './routes/habits.js';
import logRoutes from './routes/logs.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Behind a proxy (e.g. on a host) secure cookies need this.
app.set('trust proxy', 1);

const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origins,
    credentials: true,
  })
);

app.use(express.json());

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({ pool, tableName: 'session' }),
    name: 'anchor.sid',
    secret: process.env.SESSION_SECRET || 'anchor-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: String(process.env.SESSION_SECURE).toLowerCase() === 'true' || isProd,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'anchor' }));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/logs', logRoutes);

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------------------------------------------------------------------------
// Serve the built Angular app (single-origin production deploy).
// Set CLIENT_DIST to override, otherwise use the sibling frontend build.
// ---------------------------------------------------------------------------
const clientDist =
  process.env.CLIENT_DIST ||
  resolve(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser');

if (existsSync(join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // SPA fallback: send index.html for any non-API route.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
  console.log(`[anchor] Serving frontend from ${clientDist}`);
} else {
  console.log('[anchor] No frontend build found — running API only.');
}

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[anchor] Error:', err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`[anchor] API listening on http://localhost:${PORT}`);
});
