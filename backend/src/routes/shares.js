import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// POST /api/shares  { viewerUsername }
// The current user (owner) grants a viewer read-only access to their habits.
router.post('/', async (req, res, next) => {
  try {
    const viewerUsername = String(req.body.viewerUsername || '').trim();
    if (!viewerUsername) {
      return res.status(400).json({ error: 'Enter the username to share with.' });
    }
    const { rows } = await query(
      'SELECT id, username FROM users WHERE lower(username) = lower($1)',
      [viewerUsername]
    );
    const viewer = rows[0];
    if (!viewer) return res.status(404).json({ error: 'No user with that username.' });
    if (viewer.id === req.session.userId) {
      return res.status(400).json({ error: 'You cannot share with yourself.' });
    }
    await query(
      `INSERT INTO habit_shares (owner_id, viewer_id, created_by)
       VALUES ($1, $2, $1)
       ON CONFLICT (owner_id, viewer_id) DO NOTHING`,
      [req.session.userId, viewer.id]
    );
    res.status(201).json({ ok: true, viewer: { id: viewer.id, username: viewer.username } });
  } catch (err) {
    next(err);
  }
});

// GET /api/shares/out — people who can view MY habits.
router.get('/out', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.created_at, v.id AS viewer_id, v.username AS viewer_username
       FROM habit_shares s
       JOIN users v ON v.id = s.viewer_id
       WHERE s.owner_id = $1
       ORDER BY s.created_at DESC`,
      [req.session.userId]
    );
    res.json({ shares: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/shares/in — people who shared THEIR habits with me (I can view them).
router.get('/in', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.created_at,
              o.id AS owner_id, o.username AS owner_username,
              COUNT(DISTINCT h.id) FILTER (WHERE h.archived = false) AS habit_count
       FROM habit_shares s
       JOIN users o ON o.id = s.owner_id
       LEFT JOIN habits h ON h.user_id = o.id
       WHERE s.viewer_id = $1
       GROUP BY s.id, o.id
       ORDER BY o.username ASC`,
      [req.session.userId]
    );
    res.json({
      shares: rows.map((r) => ({
        id: r.id,
        ownerId: r.owner_id,
        ownerUsername: r.owner_username,
        habitCount: Number(r.habit_count),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/shares/:id — owner revokes, or viewer opts out.
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM habit_shares WHERE id = $1 AND (owner_id = $2 OR viewer_id = $2)',
      [req.params.id, req.session.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Share not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
