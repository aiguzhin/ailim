import { query } from './db.js';
import { newToken, sha256 } from './security.js';

export const SESSION_COOKIE = 'ailim_sid';
const SESSION_DAYS = 30;
const isProd = process.env.NODE_ENV === 'production';

export async function createSession(res, userId) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [sha256(token), userId, expires]);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true, secure: isProd, sameSite: 'lax', expires, path: '/',
  });
}

export async function destroySession(req, res) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** Attaches req.user if a valid session cookie is present. */
export async function loadUser(req, _res, next) {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (token) {
      const { rows } = await query(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [sha256(token)],
      );
      req.user = rows[0] || null;
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  next();
}

/**
 * CSRF protection for cookie-based sessions: state-changing requests must be JSON
 * and come from our own origin. Combined with SameSite=Lax cookies.
 */
export function sameOriginOnly(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (origin && new URL(origin).host !== host) return res.status(403).json({ error: 'bad_origin' });
  if (!req.is('application/json')) return res.status(415).json({ error: 'json_required' });
  next();
}

export function publicUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, lang: u.lang, theme: u.theme,
    textSize: u.text_size, motion: u.motion, reminders: u.reminders, plan: u.plan,
    createdAt: u.created_at, lastActive: u.last_active,
  };
}
