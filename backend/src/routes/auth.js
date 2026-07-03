import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { EMAIL, USERNAME, passwordIssue } from '../utils/validate.js';

const router = Router();

function publicUser(row) {
  return { id: row.id, username: row.username, email: row.email, role: row.role || 'user' };
}

// POST /api/auth/register  { username, email, password }
router.post('/register', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');

    if (!USERNAME.test(username)) {
      return res.status(400).json({
        error:
          'Username must be 3-50 characters (letters, numbers, dot, dash, underscore).',
      });
    }
    if (!EMAIL.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) return res.status(400).json({ error: pwIssue });

    const existing = await query(
      'SELECT 1 FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($2)',
      [username, email]
    );
    if (existing.rowCount > 0) {
      return res
        .status(409)
        .json({ error: 'That username or email is already taken.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role`,
      [username, email, passwordHash]
    );

    const user = rows[0];
    req.session.userId = user.id;
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  { username, password }
router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required.' });
    }

    const { rows } = await query(
      'SELECT id, username, email, role, password_hash FROM users WHERE lower(username) = lower($1)',
      [username]
    );
    const user = rows[0];

    // Always run a hash compare to avoid leaking whether the user exists.
    const hash = user ? user.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidina';
    const ok = await bcrypt.compare(password, hash);

    if (!user || !ok) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.userId = user.id;
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('anchor.sid');
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [req.session.userId]
    );
    if (!rows[0]) {
      return req.session.destroy(() => res.status(401).json({ error: 'Not authenticated' }));
    }
    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
