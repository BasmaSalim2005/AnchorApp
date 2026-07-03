import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, canViewUser } from '../middleware/auth.js';

// Read-only access to another user's habits and logs.
// Used both by admins (any user) and by share viewers (owners who shared).
const router = Router();
router.use(requireAuth);

function mapHabit(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    frequency: row.frequency,
    targetCount: row.target_count,
    unit: row.unit,
    targetQuantity: row.target_quantity === null ? null : Number(row.target_quantity),
    createdAt: row.created_at,
  };
}

// Guard: ensure the requester is allowed to view :ownerId.
router.use('/:ownerId', async (req, res, next) => {
  try {
    const allowed = await canViewUser(req.session.userId, req.params.ownerId);
    if (!allowed) return res.status(403).json({ error: 'You do not have access to this user.' });
    next();
  } catch (err) {
    next(err);
  }
});

// GET /api/view/:ownerId/profile
router.get('/:ownerId/profile', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.params.ownerId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({
      user: {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        createdAt: rows[0].created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/view/:ownerId/habits
router.get('/:ownerId/habits', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM habits
       WHERE user_id = $1 AND archived = false
       ORDER BY sort_order ASC, created_at ASC`,
      [req.params.ownerId]
    );
    res.json({ habits: rows.map(mapHabit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/view/:ownerId/logs/year/:year
router.get('/:ownerId/logs/year/:year', async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    if (!Number.isInteger(year) || year < 1970 || year > 3000) {
      return res.status(400).json({ error: 'Invalid year.' });
    }
    const { rows } = await query(
      `SELECT id, habit_id, log_date, completed, quantity FROM habit_logs
       WHERE user_id = $1
         AND log_date >= make_date($2, 1, 1)
         AND log_date <  make_date($2 + 1, 1, 1)
       ORDER BY log_date ASC`,
      [req.params.ownerId, year]
    );
    res.json({
      logs: rows.map((r) => ({
        habitId: r.habit_id,
        date: r.log_date,
        completed: r.completed,
        quantity: r.quantity === null ? null : Number(r.quantity),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
