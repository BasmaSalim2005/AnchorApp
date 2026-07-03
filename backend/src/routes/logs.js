import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidDate } from '../utils/validate.js';

const router = Router();
router.use(requireAuth);

function mapLog(row) {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: typeof row.log_date === 'string' ? row.log_date : toDateStr(row.log_date),
    completed: row.completed,
    quantity: row.quantity === null ? null : Number(row.quantity),
  };
}

function toDateStr(d) {
  const dt = new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!isValidDate(from) || !isValidDate(to)) {
      return res.status(400).json({ error: 'Provide valid "from" and "to" dates (YYYY-MM-DD).' });
    }
    const { rows } = await query(
      `SELECT * FROM habit_logs
       WHERE user_id = $1 AND log_date BETWEEN $2 AND $3
       ORDER BY log_date ASC`,
      [req.session.userId, from, to]
    );
    res.json({ logs: rows.map(mapLog) });
  } catch (err) {
    next(err);
  }
});

// GET /api/logs/year/:year
router.get('/year/:year', async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    if (!Number.isInteger(year) || year < 1970 || year > 3000) {
      return res.status(400).json({ error: 'Invalid year.' });
    }
    const { rows } = await query(
      `SELECT * FROM habit_logs
       WHERE user_id = $1
         AND log_date >= make_date($2, 1, 1)
         AND log_date <  make_date($2 + 1, 1, 1)
       ORDER BY log_date ASC`,
      [req.session.userId, year]
    );
    res.json({ logs: rows.map(mapLog) });
  } catch (err) {
    next(err);
  }
});

// POST /api/logs  { habitId, date, completed?, quantity? }
// Upserts the log for that habit/day. If completed=false it stores the row
// (useful to record an explicit "skipped"), but the toggle endpoint below is simpler.
router.post('/', async (req, res, next) => {
  try {
    const habitId = String(req.body.habitId || '');
    const date = String(req.body.date || '');
    if (!habitId || !isValidDate(date)) {
      return res.status(400).json({ error: 'habitId and a valid date are required.' });
    }

    const owns = await query(
      'SELECT 1 FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, req.session.userId]
    );
    if (owns.rowCount === 0) return res.status(404).json({ error: 'Habit not found.' });

    const completed = req.body.completed === undefined ? true : Boolean(req.body.completed);
    let quantity = null;
    if (req.body.quantity != null && req.body.quantity !== '') {
      quantity = Number(req.body.quantity);
      if (Number.isNaN(quantity) || quantity < 0) {
        return res.status(400).json({ error: 'Quantity must be a positive number.' });
      }
    }

    const { rows } = await query(
      `INSERT INTO habit_logs (habit_id, user_id, log_date, completed, quantity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (habit_id, log_date)
       DO UPDATE SET completed = EXCLUDED.completed,
                     quantity  = EXCLUDED.quantity,
                     updated_at = now()
       RETURNING *`,
      [habitId, req.session.userId, date, completed, quantity]
    );
    res.json({ log: mapLog(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /api/logs/toggle  { habitId, date }
// Marks the day complete if not logged, removes the log if already complete.
router.post('/toggle', async (req, res, next) => {
  try {
    const habitId = String(req.body.habitId || '');
    const date = String(req.body.date || '');
    if (!habitId || !isValidDate(date)) {
      return res.status(400).json({ error: 'habitId and a valid date are required.' });
    }

    const owns = await query(
      'SELECT 1 FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, req.session.userId]
    );
    if (owns.rowCount === 0) return res.status(404).json({ error: 'Habit not found.' });

    const existing = await query(
      'SELECT id FROM habit_logs WHERE habit_id = $1 AND log_date = $2',
      [habitId, date]
    );

    if (existing.rowCount > 0) {
      await query('DELETE FROM habit_logs WHERE id = $1', [existing.rows[0].id]);
      return res.json({ completed: false });
    }

    const { rows } = await query(
      `INSERT INTO habit_logs (habit_id, user_id, log_date, completed)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [habitId, req.session.userId, date]
    );
    res.json({ completed: true, log: mapLog(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/logs?habitId=&date=
router.delete('/', async (req, res, next) => {
  try {
    const habitId = String(req.query.habitId || '');
    const date = String(req.query.date || '');
    if (!habitId || !isValidDate(date)) {
      return res.status(400).json({ error: 'habitId and a valid date are required.' });
    }
    await query(
      'DELETE FROM habit_logs WHERE habit_id = $1 AND log_date = $2 AND user_id = $3',
      [habitId, date, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
