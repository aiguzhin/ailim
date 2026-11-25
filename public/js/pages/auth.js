import { t, lang, setLang } from '../i18n.js';
import { state, loadMe } from '../store.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc, errorText, toast, notice } from '../ui.js';
import { go } from '../nav.js';
import { adoptGuestPlan } from './quiz.js';

function pwField(id, label, autocomplete, hint = '') {
  return `<div class="field"><label for="${id}">${esc(label)}</label>
    <div class="pw-wrap"><input id="${id}" name="${id}" type="password" autocomplete="${autocomplete}" required minlength="${autocomplete === 'new-password' ? 8 : 1}" maxlength="128"${hint ? ` aria-describedby="${id}-hint"` : ''}>
      <button class="icon-btn" type="button" data-toggle-pw="${id}" aria-label="${esc(t('auth.showPassword'))}" aria-pressed="false">${icon('eye')}</button></div>
    ${hint ? `<span class="hint" id="${id}-hint">${esc(hint)}</span>` : ''}</div>`;
}

function shell(title, lead, body, foot = '') {
  return `<div class="auth wrap"><div class="card">
    <h1>${esc(title)}</h1>${lead ? `<p class="muted">${esc(lead)}</p>` : ''}
    <div id="form-msg" role="alert"></div>
    ${body}</div>${foot ? `<p class="small" style="text-align:center;margin-top:1rem">${foot}</p>` : ''}</div>`;
}

function bindPwToggles(el) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-toggle-pw]');
    if (!b) return;
    const input = el.querySelector(`#${b.dataset.togglePw}`);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(show));
    b.setAttribute('aria-label', t(show ? 'auth.hidePassword' : 'auth.showPassword'));
    b.innerHTML = icon(show ? 'eyeOff' : 'eye');
  });
}

/** Wires a form: client-side validation, busy state, error message, success callback. */
function handleForm(el, onSubmit) {
  const form = el.querySelector('form');
  const msg = el.querySelector('#form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.innerHTML = '';
    form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    const invalid = [...form.elements].find((i) => i.willValidate && !i.checkValidity());
    if (invalid) {
      invalid.setAttribute('aria-invalid', 'true');
      invalid.focus();
      const key = invalid.type === 'email' ? 'error.invalid_email'
        : invalid.type === 'checkbox' ? 'error.consent_required'
          : invalid.validity.tooShort ? 'error.weak_password' : 'error.required';
      msg.innerHTML = `<div class="notice error" style="margin-bottom:1rem">${icon('alert')}<div><p>${esc(t(key))}</p></div></div>`;
      return;
    }
    const btn = form.querySelector('[type=submit]');
    btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(form)), msg);
    } catch (err) {
      msg.innerHTML = `<div class="notice error" style="margin-bottom:1rem">${icon('alert')}<div><p>${esc(errorText(err))}</p></div></div>`;
      msg.querySelector('.notice')?.focus?.();
    } finally {
      btn.removeAttribute('aria-busy'); btn.disabled = false;
    }
  });
  bindPwToggles(el);
}

function safeNext(query) {
  const next = query.get('next') || '/account';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/account';
}

async function afterSignIn(query) {
  await loadMe();
  if (state.user.lang && state.user.lang !== lang()) await setLang(state.user.lang);
  await adoptGuestPlan();
  toast(t('toast.signedIn', { name: state.user.name }));
  go(safeNext(query), { replace: true });
}

export const login = {
  title: () => t('nav.login'),
  async render({ query }) {
    if (state.user) { queueMicrotask(() => go('/account', { replace: true })); return ''; }
    return shell(t('auth.loginTitle'), t('auth.loginLead'), `
      <form novalidate>
        <div class="field"><label for="email">${esc(t('auth.email'))}</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254"></div>
        ${pwField('password', t('auth.password'), 'current-password')}
        <p class="small" style="margin-top:-.5rem"><a href="/forgot">${esc(t('auth.forgotLink'))}</a></p>
        <button class="btn btn-primary" type="submit" style="width:100%">${esc(t('auth.loginBtn'))}</button>
      </form>`, `${esc(t('auth.noAccount'))} <a href="/register${query.get('next') ? `?next=${encodeURIComponent(query.get('next'))}` : ''}">${esc(t('nav.register'))}</a>`);
  },
  mount(el, { query }) {
    if (!el.querySelector('form')) return null;
    handleForm(el, async (data) => {
      await api('/auth/login', { method: 'POST', body: { email: data.email, password: data.password } });
      await afterSignIn(query);
    });
    el.querySelector('#email').focus();
    return null;
  },
};

export const register = {
  title: () => t('nav.register'),
  async render() {
    if (state.user) { queueMicrotask(() => go('/account', { replace: true })); return ''; }
    return shell(t('auth.registerTitle'), t('auth.registerLead'), `
      <form novalidate>
        <div class="field"><label for="name">${esc(t('auth.name'))}</label><input id="name" name="name" type="text" autocomplete="nickname" required maxlength="60" aria-describedby="name-hint"><span class="hint" id="name-hint">${esc(t('auth.nameHint'))}</span></div>
        <div class="field"><label for="email">${esc(t('auth.email'))}</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254"></div>
        ${pwField('password', t('auth.password'), 'new-password', t('auth.passwordHint'))}
        <label class="check small" style="margin-bottom:1rem"><input type="checkbox" name="consent" required><span>${t('auth.consent', { link: `<a href="/privacy" target="_blank" rel="noopener">${esc(t('nav.privacy'))}</a>` })}</span></label>
        <button class="btn btn-primary" type="submit" style="width:100%">${esc(t('auth.registerBtn'))}</button>
      </form>`, `${esc(t('auth.haveAccount'))} <a href="/login">${esc(t('nav.login'))}</a>`);
  },
  mount(el, { query }) {
    if (!el.querySelector('form')) return null;
    handleForm(el, async (data) => {
      await api('/auth/register', { method: 'POST', body: { name: data.name, email: data.email, password: data.password, lang: lang() } });
      await afterSignIn(query);
    });
    el.querySelector('#name').focus();
    return null;
  },
};

export const forgot = {
  title: () => t('auth.forgotTitle'),
  async render() {
    return shell(t('auth.forgotTitle'), t('auth.forgotLead'), `
      <form novalidate>
        <div class="field"><label for="email">${esc(t('auth.email'))}</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254"></div>
        <button class="btn btn-primary" type="submit" style="width:100%">${esc(t('auth.forgotBtn'))}</button>
      </form>`, `<a href="/login">${esc(t('auth.backToLogin'))}</a>`);
  },
  mount(el) {
    handleForm(el, async (data, msg) => {
      const res = await api('/auth/forgot', { method: 'POST', body: { email: data.email, lang: lang() } });
      msg.innerHTML = res.mail
        ? `<div style="margin-bottom:1rem">${notice('info', `<p>${esc(t('auth.forgotSent'))}</p>`)}</div>`
        : `<div style="margin-bottom:1rem">${notice('warn', `<p>${esc(t('auth.mailNotConfigured'))}</p>`)}</div>`;
    });
    return null;
  },
};

export const reset = {
  title: () => t('auth.resetTitle'),
  async render({ query }) {
    if (!query.get('token')) {
      return shell(t('auth.resetTitle'), '', notice('error', `<p>${esc(t('error.invalid_token'))}</p><p><a href="/forgot">${esc(t('auth.forgotTitle'))}</a></p>`));
    }
    return shell(t('auth.resetTitle'), t('auth.resetLead'), `
      <form novalidate>
        ${pwField('password', t('auth.newPassword'), 'new-password', t('auth.passwordHint'))}
        ${pwField('confirm', t('auth.confirmPassword'), 'new-password')}
        <button class="btn btn-primary" type="submit" style="width:100%">${esc(t('auth.resetBtn'))}</button>
      </form>`);
  },
  mount(el, { query }) {
    if (!el.querySelector('form')) return null;
    handleForm(el, async (data, msg) => {
      if (data.password !== data.confirm) {
        msg.innerHTML = `<div class="notice error" style="margin-bottom:1rem">${icon('alert')}<div><p>${esc(t('error.password_mismatch'))}</p></div></div>`;
        return;
      }
      await api('/auth/reset', { method: 'POST', body: { token: query.get('token'), password: data.password } });
      toast(t('toast.passwordReset'));
      go('/login', { replace: true });
    });
    return null;
  },
};
