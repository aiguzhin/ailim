// Thin JSON client for the Ailim API. Throws ApiError with a translatable code.
// If the server is waking up after idle time (slow answer or 502/503/504),
// a calm notice is shown and the request is retried for up to about a minute.
import { t } from './i18n.js';

export class ApiError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}

const SLOW_MS = 4000;
const RETRY_STATUSES = new Set([502, 503, 504]);
const MAX_WAIT_MS = 75_000;
let pending = 0;

function wakeNotice(show) {
  let el = document.getElementById('wake-notice');
  if (!show) { if (el && --pending <= 0) { pending = 0; el.hidden = true; } return; }
  pending += 1;
  if (!el) {
    el = document.createElement('div');
    el.id = 'wake-notice';
    el.className = 'wake-notice';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.innerHTML = `<span class="wake-dot" aria-hidden="true"></span><span>${t('wake.text')}</span>`;
  el.hidden = false;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function api(path, { method = 'GET', body } = {}) {
  const started = Date.now();
  let shown = false;
  const timer = setTimeout(() => { shown = true; wakeNotice(true); }, SLOW_MS);
  try {
    for (let attempt = 0; ; attempt += 1) {
      let res;
      try {
        res = await fetch(`/api${path}`, {
          method,
          credentials: 'same-origin',
          headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch {
        // Network error: retry while the server may be starting, then give up.
        if (Date.now() - started < MAX_WAIT_MS && attempt < 8) {
          if (!shown) { shown = true; wakeNotice(true); }
          await sleep(Math.min(2000 * (attempt + 1), 8000));
          continue;
        }
        throw new ApiError('network_error', 0);
      }
      if (RETRY_STATUSES.has(res.status) && Date.now() - started < MAX_WAIT_MS) {
        if (!shown) { shown = true; wakeNotice(true); }
        await sleep(Math.min(2000 * (attempt + 1), 8000));
        continue;
      }
      let data = null;
      try { data = await res.json(); } catch { /* empty or non-JSON body */ }
      if (!res.ok) throw new ApiError(data?.error || (RETRY_STATUSES.has(res.status) ? 'server_waking' : 'server_error'), res.status);
      return data;
    }
  } finally {
    clearTimeout(timer);
    if (shown) wakeNotice(false);
  }
}
