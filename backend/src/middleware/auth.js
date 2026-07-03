import { query } from '../db/pool.js';

export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

// Loads the current user's role from the DB and enforces admin access.
export async function requireAdmin(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { rows } = await query('SELECT role FROM users WHERE id = $1', [
      req.session.userId,
    ]);
    if (!rows[0] || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.userRole = 'admin';
    next();
  } catch (err) {
    next(err);
  }
}

// Returns true if the requester may view the owner's habits/logs:
// the owner themselves, an admin, or a user the owner has shared with.
export async function canViewUser(requesterId, ownerId) {
  if (requesterId === ownerId) return true;
  const admin = await query('SELECT 1 FROM users WHERE id = $1 AND role = $2', [
    requesterId,
    'admin',
  ]);
  if (admin.rowCount > 0) return true;
  const share = await query(
    'SELECT 1 FROM habit_shares WHERE owner_id = $1 AND viewer_id = $2',
    [ownerId, requesterId]
  );
  return share.rowCount > 0;
}
