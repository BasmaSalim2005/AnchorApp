import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  console.log('[anchor] Running migration...');
  await pool.query(sql);
  console.log('[anchor] Migration complete. Tables are ready.');
}

migrate()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[anchor] Migration failed:', err.message);
    pool.end();
    process.exit(1);
  });
