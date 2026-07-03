import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users — all users with signup date, role and stats.
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at,
              COUNT(DISTINCT h.id) FILTER (WHERE h.archived = false) AS habit_count,
              COUNT(DISTINCT l.id) AS completion_count,
              MAX(l.log_date) AS last_activity
       FROM users u
       LEFT JOIN habits h ON h.user_id = u.id
       LEFT JOIN habit_logs l ON l.user_id = u.id AND l.completed = true
       GROUP BY u.id
       ORDER BY u.created_at ASC`
    );
    res.json({
      users: rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        role: r.role,
        createdAt: r.created_at,
        habitCount: Number(r.habit_count),
        completionCount: Number(r.completion_count),
        lastActivity: r.last_activity,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/role  { role }
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const role = String(req.body.role || '');
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "user" or "admin".' });
    }
    if (req.params.id === req.session.userId) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }
    const { rows } = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      [role, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:id — removes a user and all their data.
router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.session.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account here.' });
    }
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/shares — all sharing links across the app.
router.get('/shares', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.created_at,
              o.id AS owner_id, o.username AS owner_username,
              v.id AS viewer_id, v.username AS viewer_username
       FROM habit_shares s
       JOIN users o ON o.id = s.owner_id
       JOIN users v ON v.id = s.viewer_id
       ORDER BY s.created_at DESC`
    );
    res.json({ shares: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/shares  { ownerUsername, viewerUsername }
// Admin links any two accounts: viewer can see owner's habits.
router.post('/shares', async (req, res, next) => {
  try {
    const ownerUsername = String(req.body.ownerUsername || '').trim();
    const viewerUsername = String(req.body.viewerUsername || '').trim();
    if (!ownerUsername || !viewerUsername) {
      return res.status(400).json({ error: 'Both owner and viewer usernames are required.' });
    }
    const { rows } = await query(
      'SELECT id, username FROM users WHERE lower(username) IN (lower($1), lower($2))',
      [ownerUsername, viewerUsername]
    );
    const owner = rows.find((u) => u.username.toLowerCase() === ownerUsername.toLowerCase());
    const viewer = rows.find((u) => u.username.toLowerCase() === viewerUsername.toLowerCase());
    if (!owner || !viewer) {
      return res.status(404).json({ error: 'One or both usernames were not found.' });
    }
    if (owner.id === viewer.id) {
      return res.status(400).json({ error: 'Owner and viewer must be different people.' });
    }
    await query(
      `INSERT INTO habit_shares (owner_id, viewer_id, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (owner_id, viewer_id) DO NOTHING`,
      [owner.id, viewer.id, req.session.userId]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/shares/:id
router.delete('/shares/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM habit_shares WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
