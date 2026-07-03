import pg from 'pg';
import 'dotenv/config';

const { Pool, types } = pg;

// Return DATE columns (OID 1082) as raw "YYYY-MM-DD" strings instead of letting
// pg convert them to a local-midnight Date, which caused an off-by-one day when
// the value was later formatted in UTC. This keeps habit logs on the correct day.
types.setTypeParser(1082, (value) => value);

if (!process.env.DATABASE_URL) {
  console.warn(
    '[anchor] DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in.'
  );
}

// Decide whether to use SSL. Managed Postgres (Supabase, Neon, Render, RDS, etc.)
// requires SSL. We enable it unless explicitly disabled, so a missing
// DATABASE_SSL env var in production doesn't silently break the connection.
const url = process.env.DATABASE_URL || '';
const sslExplicitlyOff = String(process.env.DATABASE_SSL).toLowerCase() === 'false';
const useSsl =
  !sslExplicitlyOff &&
  (String(process.env.DATABASE_SSL).toLowerCase() === 'true' ||
    process.env.NODE_ENV === 'production' ||
    /sslmode=require/i.test(url) ||
    /supabase\.|neon\.tech|render\.com|amazonaws\.com|heroku/i.test(url));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[anchor] Unexpected Postgres pool error:', err);
});

export const query = (text, params) => pool.query(text, params);
