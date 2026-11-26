import express from 'express';
import rateLimit from 'express-rate-limit';
import { query, pool } from './db.js';
import { hashPassword, verifyPassword, newToken, sha256, DUMMY_HASH_PROMISE } from './security.js';
import { createSession, destroySession, requireUser, publicUser } from './auth.js';
import { sendResetEmail, mailEnabled } from './mail.js';
import { isKnownItem } from './content-ids.js';

export const api = express.Router();

const LANGS = ['ru', 'en', 'kk'];
const THEMES = ['system', 'light', 'dark'];
const SIZES = ['s', 'm', 'l'];
const MOTIONS = ['system', 'reduce', 'full'];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: 'too_many_requests' }) });

const bad = (res, error, status = 400) => res.status(status).json({ error });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function validPassword(p) {
  return typeof p === 'string' && p.length >= 8 && p.length <= 128;
}
function cleanEmail(e) {
  return typeof e === 'string' ? e.trim().toLowerCase() : '';
}

// ---------- Health ----------
api.get('/health', wrap(async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true, mail: mailEnabled });
}));

// Public site information for the privacy page. Values come from environment variables.
api.get('/site-info', (_req, res) => {
  res.json({
    owner: process.env.SITE_OWNER || '',
    contactEmail: process.env.CONTACT_EMAIL || '',
    issuesUrl: process.env.ISSUES_URL || 'https://github.com/aiguzhin/ailim/issues',
    mail: mailEnabled,
  });
});

// ---------- Auth ----------
api.post('/auth/register', authLimiter, wrap(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const name = String(req.body.name || '').trim().slice(0, 60);
  const lang = LANGS.includes(req.body.lang) ? req.body.lang : 'ru';
  if (!EMAIL_RE.test(email)) return bad(res, 'invalid_email');
  if (!validPassword(req.body.password)) return bad(res, 'weak_password');
  if (!name) return bad(res, 'name_required');

  const hash = await hashPassword(req.body.password);
  try {
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, name, lang) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, hash, name, lang],
    );
    await createSession(res, rows[0].id);
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') return bad(res, 'email_taken', 409);
    throw err;
  }
}));

api.post('/auth/login', authLimiter, wrap(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || '');
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const ok = user ? await verifyPassword(password, user.password_hash)
    : (await verifyPassword(password, await DUMMY_HASH_PROMISE), false);
  if (!ok) return bad(res, 'invalid_credentials', 401);
  await query('UPDATE users SET last_active = now() WHERE id = $1', [user.id]);
  await createSession(res, user.id);
  res.json({ user: publicUser(user) });
}));

api.post('/auth/logout', wrap(async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
}));

api.post('/auth/forgot', authLimiter, wrap(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const lang = LANGS.includes(req.body.lang) ? req.body.lang : 'ru';
  if (!EMAIL_RE.test(email)) return bad(res, 'invalid_email');
  if (!mailEnabled && process.env.NODE_ENV === 'production') return res.json({ ok: false, mail: false });

  const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows[0]) {
    const token = newToken();
    await query('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval \'1 hour\')',
      [sha256(token), rows[0].id]);
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    await sendResetEmail(email, `${base}/reset?token=${token}`, lang);
  }
  // Same answer whether or not the account exists, so emails can't be enumerated.
  res.json({ ok: true, mail: mailEnabled });
}));

api.post('/auth/reset', authLimiter, wrap(async (req, res) => {
  const token = String(req.body.token || '');
  if (!validPassword(req.body.password)) return bad(res, 'weak_password');
  const { rows } = await query(
    'SELECT user_id FROM password_resets WHERE token_hash = $1 AND NOT used AND expires_at > now()', [sha256(token)]);
  if (!rows[0]) return bad(res, 'invalid_token');
  const hash = await hashPassword(req.body.password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].user_id]);
    await client.query('UPDATE password_resets SET used = TRUE WHERE token_hash = $1', [sha256(token)]);
    await client.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].user_id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.json({ ok: true });
}));

// ---------- Current user ----------
api.get('/me', wrap(async (req, res) => {
  if (!req.user) return res.json({ user: null });
  const id = req.user.id;
  const [progress, favorites, history] = await Promise.all([
    query('SELECT item_id, step, completed, updated_at FROM progress WHERE user_id = $1 ORDER BY updated_at DESC', [id]),
    query('SELECT item_id, created_at FROM favorites WHERE user_id = $1 ORDER BY created_at DESC', [id]),
    query(`SELECT item_id, max(viewed_at) AS viewed_at FROM history WHERE user_id = $1
           GROUP BY item_id ORDER BY viewed_at DESC LIMIT 30`, [id]),
  ]);
  await query('UPDATE users SET last_active = now() WHERE id = $1', [id]);
  res.json({
    user: publicUser(req.user),
    progress: progress.rows.map((r) => ({ itemId: r.item_id, step: r.step, completed: r.completed, updatedAt: r.updated_at })),
    favorites: favorites.rows.map((r) => r.item_id),
    history: history.rows.map((r) => ({ itemId: r.item_id, viewedAt: r.viewed_at })),
  });
}));

api.patch('/me', requireUser, wrap(async (req, res) => {
  const b = req.body;
  const sets = [];
  const vals = [];
  const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (b.name !== undefined) {
    const name = String(b.name).trim().slice(0, 60);
    if (!name) return bad(res, 'name_required');
    add('name', name);
  }
  if (b.lang !== undefined) { if (!LANGS.includes(b.lang)) return bad(res, 'invalid_value'); add('lang', b.lang); }
  if (b.theme !== undefined) { if (!THEMES.includes(b.theme)) return bad(res, 'invalid_value'); add('theme', b.theme); }
  if (b.textSize !== undefined) { if (!SIZES.includes(b.textSize)) return bad(res, 'invalid_value'); add('text_size', b.textSize); }
  if (b.motion !== undefined) { if (!MOTIONS.includes(b.motion)) return bad(res, 'invalid_value'); add('motion', b.motion); }
  if (b.reminders !== undefined) add('reminders', Boolean(b.reminders));
  if (b.plan !== undefined) {
    const plan = b.plan === null ? null : {
      goals: Array.isArray(b.plan.goals) ? b.plan.goals.slice(0, 10).map(String) : [],
      level: String(b.plan.level || '').slice(0, 20),
      lessons: Array.isArray(b.plan.lessons) ? b.plan.lessons.slice(0, 20).map(String) : [],
    };
    add('plan', plan);
  }
  if (!sets.length) return bad(res, 'nothing_to_update');
  vals.push(req.user.id);
  const { rows } = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
  res.json({ user: publicUser(rows[0]) });
}));

api.post('/me/password', requireUser, authLimiter, wrap(async (req, res) => {
  if (!(await verifyPassword(String(req.body.current || ''), req.user.password_hash))) return bad(res, 'wrong_password', 403);
  if (!validPassword(req.body.next)) return bad(res, 'weak_password');
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(req.body.next), req.user.id]);
  res.json({ ok: true });
}));

api.get('/me/export', requireUser, wrap(async (req, res) => {
  const id = req.user.id;
  const [p, f, h] = await Promise.all([
    query('SELECT item_id, step, completed, updated_at FROM progress WHERE user_id = $1', [id]),
    query('SELECT item_id, created_at FROM favorites WHERE user_id = $1', [id]),
    query('SELECT item_id, viewed_at FROM history WHERE user_id = $1 ORDER BY viewed_at DESC', [id]),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="ailim-my-data.json"');
  res.json({ profile: publicUser(req.user), progress: p.rows, favorites: f.rows, history: h.rows });
}));

api.delete('/me', requireUser, authLimiter, wrap(async (req, res) => {
  if (!(await verifyPassword(String(req.body.password || ''), req.user.password_hash))) return bad(res, 'wrong_password', 403);
  // ON DELETE CASCADE removes sessions, progress, favourites, history and reset tokens.
  await query('DELETE FROM users WHERE id = $1', [req.user.id]);
  res.clearCookie('ailim_sid', { path: '/' });
  res.json({ ok: true });
}));

// ---------- Progress, favourites, history ----------
function itemParam(req, res) {
  const itemId = String(req.params.itemId || req.body.itemId || '');
  if (!isKnownItem(itemId)) { bad(res, 'unknown_item', 404); return null; }
  return itemId;
}

api.put('/progress/:itemId', requireUser, wrap(async (req, res) => {
  const itemId = itemParam(req, res); if (!itemId) return;
  const step = Math.max(0, Math.min(50, Number.parseInt(req.body.step, 10) || 0));
  const completed = Boolean(req.body.completed);
  const { rows } = await query(
    `INSERT INTO progress (user_id, item_id, step, completed) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, item_id) DO UPDATE
       SET step = EXCLUDED.step, completed = progress.completed OR EXCLUDED.completed, updated_at = now()
     RETURNING item_id, step, completed, updated_at`,
    [req.user.id, itemId, step, completed]);
  const r = rows[0];
  res.json({ itemId: r.item_id, step: r.step, completed: r.completed, updatedAt: r.updated_at });
}));

api.delete('/progress/:itemId', requireUser, wrap(async (req, res) => {
  const itemId = itemParam(req, res); if (!itemId) return;
  await query('DELETE FROM progress WHERE user_id = $1 AND item_id = $2', [req.user.id, itemId]);
  res.json({ ok: true });
}));

api.put('/favorites/:itemId', requireUser, wrap(async (req, res) => {
  const itemId = itemParam(req, res); if (!itemId) return;
  await query('INSERT INTO favorites (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, itemId]);
  res.json({ ok: true });
}));

api.delete('/favorites/:itemId', requireUser, wrap(async (req, res) => {
  const itemId = itemParam(req, res); if (!itemId) return;
  await query('DELETE FROM favorites WHERE user_id = $1 AND item_id = $2', [req.user.id, itemId]);
  res.json({ ok: true });
}));

api.post('/history', requireUser, wrap(async (req, res) => {
  const itemId = itemParam(req, res); if (!itemId) return;
  await query('INSERT INTO history (user_id, item_id) VALUES ($1, $2)', [req.user.id, itemId]);
  // Keep the history table small: last 200 views per user.
  await query(`DELETE FROM history WHERE user_id = $1 AND id NOT IN
               (SELECT id FROM history WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 200)`, [req.user.id]);
  res.json({ ok: true });
}));

api.use((_req, res) => bad(res, 'not_found', 404));
