import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { HEX_COLOR, TIME, FREQUENCIES } from '../utils/validate.js';

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
    reminderEnabled: row.reminder_enabled,
    reminderTime: row.reminder_time ? String(row.reminder_time).slice(0, 5) : null,
    archived: row.archived,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

// Validate + normalise an incoming habit payload. Returns { value } or { error }.
function parseHabit(body, { partial = false } = {}) {
  const out = {};

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return { error: 'Habit name is required.' };
    if (name.length > 120) return { error: 'Habit name is too long.' };
    out.name = name;
  }

  if (!partial || body.color !== undefined) {
    const color = String(body.color || '').trim();
    if (!HEX_COLOR.test(color)) return { error: 'Color must be a hex value like #C8102E.' };
    out.color = color;
  }

  if (!partial || body.icon !== undefined) {
    out.icon = String(body.icon || 'anchor').trim().slice(0, 40) || 'anchor';
  }

  if (!partial || body.frequency !== undefined) {
    const frequency = String(body.frequency || 'daily');
    if (!FREQUENCIES.includes(frequency)) {
      return { error: 'Frequency must be daily, weekly or monthly.' };
    }
    out.frequency = frequency;
  }

  if (!partial || body.targetCount !== undefined) {
    const n = Number(body.targetCount ?? 1);
    if (!Number.isInteger(n) || n < 1 || n > 366) {
      return { error: 'Target count must be a whole number between 1 and 366.' };
    }
    out.targetCount = n;
  }

  if (!partial || body.unit !== undefined) {
    const unit = body.unit == null ? null : String(body.unit).trim().slice(0, 30);
    out.unit = unit || null;
  }

  if (!partial || body.targetQuantity !== undefined) {
    if (body.targetQuantity == null || body.targetQuantity === '') {
      out.targetQuantity = null;
    } else {
      const q = Number(body.targetQuantity);
      if (Number.isNaN(q) || q < 0) return { error: 'Target quantity must be a positive number.' };
      out.targetQuantity = q;
    }
  }

  if (!partial || body.reminderEnabled !== undefined) {
    out.reminderEnabled = Boolean(body.reminderEnabled);
  }

  if (!partial || body.reminderTime !== undefined) {
    if (!body.reminderTime) {
      out.reminderTime = null;
    } else {
      const t = String(body.reminderTime).slice(0, 5);
      if (!TIME.test(t)) return { error: 'Reminder time must be in HH:MM format.' };
      out.reminderTime = t;
    }
  }

  return { value: out };
}

// GET /api/habits
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM habits
       WHERE user_id = $1 AND archived = false
       ORDER BY sort_order ASC, created_at ASC`,
      [req.session.userId]
    );
    res.json({ habits: rows.map(mapHabit) });
  } catch (err) {
    next(err);
  }
});

// POST /api/habits
router.post('/', async (req, res, next) => {
  try {
    const { value, error } = parseHabit(req.body);
    if (error) return res.status(400).json({ error });

    const { rows: orderRows } = await query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM habits WHERE user_id = $1',
      [req.session.userId]
    );
    const sortOrder = orderRows[0].next;

    const { rows } = await query(
      `INSERT INTO habits
         (user_id, name, color, icon, frequency, target_count, unit,
          target_quantity, reminder_enabled, reminder_time, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.session.userId,
        value.name,
        value.color,
        value.icon,
        value.frequency,
        value.targetCount,
        value.unit,
        value.targetQuantity,
        value.reminderEnabled,
        value.reminderTime,
        sortOrder,
      ]
    );
    res.status(201).json({ habit: mapHabit(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/habits/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { value, error } = parseHabit(req.body, { partial: true });
    if (error) return res.status(400).json({ error });

    const fields = Object.keys(value);
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    const columnMap = {
      name: 'name',
      color: 'color',
      icon: 'icon',
      frequency: 'frequency',
      targetCount: 'target_count',
      unit: 'unit',
      targetQuantity: 'target_quantity',
      reminderEnabled: 'reminder_enabled',
      reminderTime: 'reminder_time',
    };

    const sets = [];
    const params = [];
    let i = 1;
    for (const field of fields) {
      sets.push(`${columnMap[field]} = $${i++}`);
      params.push(value[field]);
    }
    params.push(req.params.id, req.session.userId);

    const { rows } = await query(
      `UPDATE habits SET ${sets.join(', ')}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Habit not found.' });
    res.json({ habit: mapHabit(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/habits/reorder  { ids: [...] }
router.put('/order/reorder', async (req, res, next) => {
  const client = await (await import('../db/pool.js')).pool.connect();
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    await client.query('BEGIN');
    for (let idx = 0; idx < ids.length; idx++) {
      await client.query(
        'UPDATE habits SET sort_order = $1 WHERE id = $2 AND user_id = $3',
        [idx, ids[idx], req.session.userId]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/habits/:id  (hard delete; cascades to logs)
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Habit not found.' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
