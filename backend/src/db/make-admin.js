// Promote a user to admin (or demote back to user).
// Usage:
//   node src/db/make-admin.js <username>            -> makes them an admin
//   node src/db/make-admin.js <username> user       -> demotes to regular user
import { pool } from './pool.js';

const username = process.argv[2];
const role = process.argv[3] === 'user' ? 'user' : 'admin';

if (!username) {
  console.error('Usage: node src/db/make-admin.js <username> [user|admin]');
  process.exit(1);
}

const { rows } = await pool.query(
  'UPDATE users SET role = $1 WHERE lower(username) = lower($2) RETURNING username, role',
  [role, username]
);

if (rows[0]) {
  console.log(`[anchor] ${rows[0].username} is now: ${rows[0].role}`);
} else {
  console.log(`[anchor] No user found with username "${username}".`);
}
await pool.end();
