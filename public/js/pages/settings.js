import { t, lang, getLanguages } from '../i18n.js';
import { state, getPrefs, savePrefs, clearUser } from '../store.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc, toast, errorText, confirmDialog } from '../ui.js';
import { go } from '../nav.js';
import { changeLanguage } from '../main.js';

function radios(name, values, current, labelKey) {
  return `<div class="seg" role="radiogroup" aria-label="${esc(t(labelKey))}">${values.map((v) => `
    <label class="chip" style="display:inline-flex;gap:.4rem;align-items:center"><input type="radio" name="${name}" value="${v}"${v === current ? ' checked' : ''} style="accent-color:var(--accent)"><span>${esc(t(`settings.${name}.${v}`))}</span></label>`).join('')}</div>`;
}

export default {
  title: () => t('nav.settings'),
  async render() {
    const u = state.user;
    const p = u ? { theme: u.theme, textSize: u.textSize, motion: u.motion } : getPrefs();
    return `
    <div class="page-head"><div class="wrap"><span class="eyebrow">${esc(t('settings.eyebrow'))}</span><h1>${esc(t('settings.title'))}</h1>
      <p>${esc(u ? t('settings.leadUser') : t('settings.leadGuest'))}</p></div></div>
    <div class="wrap" style="padding-bottom:4rem">
      <section class="settings-section" aria-labelledby="s-display">
        <div><h2 id="s-display" style="font-size:1.2rem">${esc(t('settings.display'))}</h2><p>${esc(t('settings.displayHint'))}</p></div>
        <div>
          <div class="field"><label for="set-lang">${esc(t('settings.language'))}</label>
            <select id="set-lang" style="max-width:280px">${getLanguages().map((l) => `<option value="${l.code}"${l.code === lang() ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
          <div class="field"><span class="label">${esc(t('settings.themeLabel'))}</span>${radios('theme', ['system', 'light', 'dark'], p.theme, 'settings.themeLabel')}</div>
          <div class="field"><span class="label">${esc(t('settings.sizeLabel'))}</span>${radios('textSize', ['s', 'm', 'l'], p.textSize, 'settings.sizeLabel')}</div>
          <div class="field"><span class="label">${esc(t('settings.motionLabel'))}</span>${radios('motion', ['system', 'reduce', 'full'], p.motion || 'system', 'settings.motionLabel')}</div>
        </div>
      </section>
      ${u ? `
      <section class="settings-section" aria-labelledby="s-profile">
        <div><h2 id="s-profile" style="font-size:1.2rem">${esc(t('settings.profile'))}</h2><p>${esc(t('settings.profileHint'))}</p></div>
        <form id="profile-form" novalidate style="max-width:440px">
          <div class="field"><label for="p-name">${esc(t('auth.name'))}</label><input id="p-name" type="text" maxlength="60" required value="${esc(u.name)}"></div>
          <div class="field"><label for="p-email">${esc(t('auth.email'))}</label><input id="p-email" type="email" value="${esc(u.email)}" readonly aria-describedby="p-email-hint"><span class="hint" id="p-email-hint">${esc(t('settings.emailReadonly'))}</span></div>
          <label class="check"><input type="checkbox" id="p-rem"${u.reminders ? ' checked' : ''}><span>${esc(t('settings.reminders'))}<br><span class="small muted">${esc(t('settings.remindersHint'))}</span></span></label>
          <button class="btn btn-primary" type="submit" style="margin-top:.75rem">${esc(t('action.save'))}</button>
        </form>
      </section>
      <section class="settings-section" aria-labelledby="s-password">
        <div><h2 id="s-password" style="font-size:1.2rem">${esc(t('settings.password'))}</h2><p>${esc(t('auth.passwordHint'))}</p></div>
        <form id="pw-form" novalidate style="max-width:440px">
          <div class="field"><label for="pw-cur">${esc(t('settings.currentPassword'))}</label><input id="pw-cur" type="password" autocomplete="current-password" required></div>
          <div class="field"><label for="pw-new">${esc(t('auth.newPassword'))}</label><input id="pw-new" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></div>
          <button class="btn" type="submit">${esc(t('settings.changePassword'))}</button>
        </form>
      </section>
      <section class="settings-section" aria-labelledby="s-data">
        <div><h2 id="s-data" style="font-size:1.2rem">${esc(t('settings.data'))}</h2><p>${esc(t('settings.dataHint'))} <a href="/privacy">${esc(t('nav.privacy'))}</a></p></div>
        <div class="btn-row" style="align-items:flex-start">
          <a class="btn" href="/api/me/export" data-native download>${icon('download')}${esc(t('settings.export'))}</a>
          <button class="btn" type="button" id="logout">${icon('logout')}${esc(t('settings.logout'))}</button>
          <button class="btn btn-danger" type="button" id="delete">${icon('trash')}${esc(t('settings.delete'))}</button>
        </div>
      </section>`
      : `<section class="settings-section"><div><h2 style="font-size:1.2rem">${esc(t('settings.profile'))}</h2></div>
         <div><p>${esc(t('settings.guestProfile'))}</p><p class="small muted">${esc(t('guest.storage'))}</p><div class="btn-row"><a class="btn btn-primary" href="/login?next=/settings">${esc(t('nav.login'))}</a><a class="btn" href="/register">${esc(t('nav.register'))}</a></div></div></section>`}
    </div>`;
  },
  mount(el) {
    const savePref = async (patch) => {
      try { await savePrefs(patch); toast(t('toast.settingsSaved')); } catch (err) { toast(errorText(err), 'error'); }
    };
    el.querySelector('#set-lang').addEventListener('change', (e) => changeLanguage(e.target.value));
    el.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', () => savePref({ [r.name]: r.value })));

    el.querySelector('#profile-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = el.querySelector('#p-name');
      if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); name.focus(); toast(t('error.name_required'), 'error'); return; }
      name.removeAttribute('aria-invalid');
      try {
        const { user } = await api('/me', { method: 'PATCH', body: { name: name.value, reminders: el.querySelector('#p-rem').checked } });
        state.user = user;
        toast(t('toast.profileSaved'));
      } catch (err) { toast(errorText(err), 'error'); }
    });

    el.querySelector('#pw-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = el.querySelector('#pw-cur'); const next = el.querySelector('#pw-new');
      if (!cur.value) { cur.focus(); toast(t('error.required'), 'error'); return; }
      if (next.value.length < 8) { next.focus(); toast(t('error.weak_password'), 'error'); return; }
      try {
        await api('/me/password', { method: 'POST', body: { current: cur.value, next: next.value } });
        cur.value = ''; next.value = '';
        toast(t('toast.passwordChanged'));
      } catch (err) { toast(errorText(err), 'error'); }
    });

    el.querySelector('#logout')?.addEventListener('click', async () => {
      try { await api('/auth/logout', { method: 'POST', body: {} }); } catch { /* the cookie will expire anyway */ }
      clearUser();
      toast(t('toast.signedOut'));
      go('/');
    });

    el.querySelector('#delete')?.addEventListener('click', async () => {
      const res = await confirmDialog({ title: t('settings.deleteTitle'), text: t('settings.deleteText'), confirmLabel: t('settings.deleteConfirm'), danger: true, passwordField: true });
      if (!res) return;
      try {
        await api('/me', { method: 'DELETE', body: { password: res.password || '' } });
        clearUser();
        toast(t('toast.accountDeleted'));
        go('/');
      } catch (err) { toast(errorText(err), 'error'); }
    });
    return null;
  },
};
