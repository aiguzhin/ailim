import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const dir = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. See README.md → "Запуск".');
  process.exit(1);
}

const needsSsl = !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSsl ? { rejectUnauthorized: true } : false,
  max: 5,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => console.error('Postgres pool error:', err.message));

export const query = (text, params) => pool.query(text, params);

export async function migrate() {
  const sql = fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

/** Remove expired sessions and reset tokens. Called periodically. */
export async function cleanup() {
  await pool.query('DELETE FROM sessions WHERE expires_at < now()');
  await pool.query('DELETE FROM password_resets WHERE expires_at < now() OR used');
}
