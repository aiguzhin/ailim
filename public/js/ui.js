import { t } from './i18n.js';
import { icon } from './icons.js';
import { reducedMotion } from './store.js';

/** Escape text for safe insertion into HTML templates. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(message, type = 'success') {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'alert' : 'checkCircle')}<span>${esc(message)}</span>`;
  box.append(el);
  setTimeout(() => el.remove(), type === 'error' ? 6000 : 3200);
}

/** Translates an API error code into a user-facing message. */
export function errorText(err) {
  const code = err?.code || 'server_error';
  const key = `error.${code}`;
  const msg = t(key);
  return msg === key ? t('error.server_error') : msg;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers without async clipboard permission.
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (!ok) { toast(t('toast.copyFailed'), 'error'); return false; }
  }
  toast(t('toast.copied'));
  return true;
}

export function levelBars(level) {
  const label = t(`level.${level}`);
  return `<span class="level" title="${esc(label)}">${[1, 2, 3].map((i) => `<i class="${i <= level ? 'on' : ''}"></i>`).join('')}</span><span>${esc(label)}</span>`;
}

export function emptyState({ title, text, action = '' , iconName = 'search' }) {
  return `<div class="empty">${icon(iconName)}<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>${action}</div>`;
}

export function errorState(err, retry = true) {
  return `<div class="notice error" role="alert">${icon('alert')}<div><p><strong>${esc(t('state.errorTitle'))}</strong></p><p>${esc(errorText(err))}</p>${retry ? `<p><button class="btn btn-sm" data-action="reload">${icon('refresh')}${esc(t('action.retry'))}</button></p>` : ''}</div></div>`;
}

export function notice(type, html) {
  return `<div class="notice ${type}">${icon(type === 'info' ? 'info' : type === 'warn' ? 'alert' : 'alert')}<div>${html}</div></div>`;
}

/** Fade-in for blocks marked .reveal when they scroll into view. */
let observer;
export function observeReveal(root) {
  const items = root.querySelectorAll('.reveal');
  if (reducedMotion() || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  items.forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 6, 5) * 50}ms`; observer.observe(el); });
}

/** Debounce helper for search inputs. */
export function debounce(fn, ms = 180) {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
}

/** Accessible confirm dialog using <dialog>. Resolves with the form data or null. */
export function confirmDialog({ title, text, confirmLabel, danger = false, passwordField = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.setAttribute('aria-labelledby', 'dlg-title');
    d.innerHTML = `<form method="dialog">
      <h2 id="dlg-title" style="font-size:1.3rem">${esc(title)}</h2>
      <p>${esc(text)}</p>
      ${passwordField ? `<div class="field"><label for="dlg-pw">${esc(t('auth.password'))}</label><input id="dlg-pw" name="password" type="password" autocomplete="current-password" required></div>` : ''}
      <div class="btn-row" style="justify-content:flex-end">
        <button class="btn btn-ghost" value="cancel" formnovalidate>${esc(t('action.cancel'))}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" value="ok">${esc(confirmLabel)}</button>
      </div></form>`;
    document.body.append(d);
    d.showModal();
    d.addEventListener('close', () => {
      const ok = d.returnValue === 'ok';
      const pw = d.querySelector('#dlg-pw')?.value;
      d.remove();
      resolve(ok ? { password: pw } : null);
    });
  });
}
