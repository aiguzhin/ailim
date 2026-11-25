import { initI18n, setLang, lang, t, getLanguages } from './i18n.js';
import { state, loadMe, onChange, savePrefs, reducedMotion } from './store.js';
import { icon } from './icons.js';
import { esc, observeReveal, toast, errorText, errorState } from './ui.js';

import home from './pages/home.js';
import catalog from './pages/catalog.js';
import lessons from './pages/lessons.js';
import lesson from './pages/lesson.js';
import practice from './pages/practice.js';
import builder from './pages/builder.js';
import quiz from './pages/quiz.js';
import safety from './pages/safety.js';
import privacy from './pages/privacy.js';
import { login, register, forgot, reset } from './pages/auth.js';
import account from './pages/account.js';
import settings from './pages/settings.js';
import notFound from './pages/not-found.js';

const routes = [
  ['/', home], ['/catalog', catalog], ['/lessons', lessons], ['/lessons/:id', lesson],
  ['/practice', practice], ['/builder', builder], ['/start', quiz], ['/safety', safety], ['/privacy', privacy],
  ['/login', login], ['/register', register], ['/forgot', forgot], ['/reset', reset],
  ['/account', account], ['/settings', settings],
];

const NAV = [['/catalog', 'nav.catalog'], ['/lessons', 'nav.lessons'], ['/practice', 'nav.practice'], ['/builder', 'nav.builder'], ['/safety', 'nav.safety']];

const app = document.getElementById('app');
let cleanup = null;
let renderId = 0;

function match(pathname) {
  for (const [pattern, page] of routes) {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}/?$`);
    const m = pathname.match(re);
    if (m) return { page, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return { page: notFound, params: {} };
}

export function navigate(to, { replace = false } = {}) {
  if (to === location.pathname + location.search) return render();
  history[replace ? 'replaceState' : 'pushState']({}, '', to);
  render();
}

async function render({ keepScroll = false } = {}) {
  const id = ++renderId;
  const url = new URL(location.href);
  const { page, params } = match(url.pathname);
  const query = url.searchParams;

  if (page.requiresAuth && !state.user) {
    return navigate(`/login?next=${encodeURIComponent(url.pathname + url.search)}`, { replace: true });
  }

  cleanup?.(); cleanup = null;
  app.setAttribute('aria-busy', 'true');
  let html;
  try {
    html = await page.render({ params, query });
  } catch (err) {
    console.error(err);
    html = `<div class="wrap page">${errorState(err)}</div>`;
  }
  if (id !== renderId) return; // a newer navigation started

  app.innerHTML = html;
  app.removeAttribute('aria-busy');
  if (!reducedMotion()) { app.classList.remove('page-enter'); void app.offsetWidth; app.classList.add('page-enter'); }
  document.title = page.title ? `${page.title({ params })} — Ailim` : `Ailim — ${t('meta.tagline')}`;
  renderChrome();
  try { cleanup = page.mount?.(app, { params, query, rerender: () => render({ keepScroll: true }) }) || null; } catch (err) { console.error(err); }
  observeReveal(app);
  if (!keepScroll) {
    if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }
}

// ---------- Header & footer ----------
function renderChrome() {
  const path = location.pathname;
  const current = (href) => (path === href || path.startsWith(`${href}/`) ? ' aria-current="page"' : '');
  const u = state.user;
  const langs = getLanguages().map((l) => `<button type="button" data-lang="${l.code}" aria-pressed="${l.code === lang()}" lang="${l.code}" title="${esc(l.name)}">${esc(l.short)}</button>`).join('');

  document.getElementById('site-header').innerHTML = `
    <div class="wrap header-row">
      <a class="brand" href="/" aria-label="Ailim — ${esc(t('nav.home'))}">${icon('logo')}<span>ailim</span></a>
      <nav class="main-nav" id="main-nav" aria-label="${esc(t('a11y.mainNav'))}">
        ${NAV.map(([href, key]) => `<a href="${href}"${current(href)}>${esc(t(key))}</a>`).join('')}
      </nav>
      <div class="header-tools">
        <div class="lang-switch" role="group" aria-label="${esc(t('a11y.language'))}">${langs}</div>
        ${u
          ? `<a class="btn btn-ghost btn-sm" href="/account"${current('/account')} aria-label="${esc(t('nav.account'))}"><span class="avatar" aria-hidden="true">${esc((u.name || u.email)[0].toUpperCase())}</span><span class="header-account-label">${esc(t('nav.account'))}</span></a>`
          : `<a class="btn btn-sm" href="/login">${icon('user')}<span class="header-account-label">${esc(t('nav.login'))}</span></a>`}
        <button class="icon-btn menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="${esc(t('a11y.menu'))}">${icon('menu')}</button>
      </div>
    </div>`;

  document.getElementById('site-footer').innerHTML = `
    <div class="wrap footer-grid">
      <div>
        <a class="brand" href="/" style="margin-bottom:.75rem">${icon('logo')}<span>ailim</span></a>
        <p style="max-width:38ch">${esc(t('footer.about'))}</p>
        <p class="small">© ${new Date().getFullYear()} Ailim</p>
      </div>
      <div><h4>${esc(t('footer.learn'))}</h4><ul>
        <li><a href="/start">${esc(t('nav.start'))}</a></li><li><a href="/lessons">${esc(t('nav.lessons'))}</a></li>
        <li><a href="/practice">${esc(t('nav.practice'))}</a></li><li><a href="/builder">${esc(t('nav.builder'))}</a></li></ul></div>
      <div><h4>${esc(t('footer.site'))}</h4><ul>
        <li><a href="/catalog">${esc(t('nav.catalog'))}</a></li><li><a href="/safety">${esc(t('nav.safety'))}</a></li>
        <li><a href="/privacy">${esc(t('nav.privacy'))}</a></li><li><a href="/settings">${esc(t('nav.settings'))}</a></li></ul></div>
    </div>`;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

// ---------- Global events ----------
document.addEventListener('click', async (e) => {
  const a = e.target.closest('a[href]');
  if (a && a.origin === location.origin && !a.target && !a.hasAttribute('download') && !a.dataset.native
      && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
    if (a.pathname.startsWith('/api/')) return;
    e.preventDefault();
    closeMenu();
    if (a.pathname === location.pathname && a.hash) { document.getElementById(a.hash.slice(1))?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }); return; }
    navigate(a.pathname + a.search + a.hash);
    return;
  }
  const langBtn = e.target.closest('[data-lang]');
  if (langBtn) {
    await changeLanguage(langBtn.dataset.lang);
    return;
  }
  if (e.target.closest('.menu-toggle')) {
    const nav = document.getElementById('main-nav');
    const open = nav.classList.toggle('open');
    e.target.closest('.menu-toggle').setAttribute('aria-expanded', String(open));
    return;
  }
  if (e.target.closest('[data-action="reload"]')) render({ keepScroll: true });
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
function closeMenu() {
  document.getElementById('main-nav')?.classList.remove('open');
  document.querySelector('.menu-toggle')?.setAttribute('aria-expanded', 'false');
}

export async function changeLanguage(code) {
  if (code === lang()) return;
  try {
    await setLang(code);
    if (state.user) await savePrefs({ lang: code });
    await render({ keepScroll: true });
  } catch (err) {
    toast(errorText(err), 'error');
  }
}

window.addEventListener('popstate', () => render());
window.addEventListener('ailim:navigate', () => render());

// Keep the UI in sync when the user signs in or out.
let lastUserId;
onChange((s) => { if (s.user?.id !== lastUserId) { lastUserId = s.user?.id; renderChrome(); } });

// ---------- Boot ----------
(async function boot() {
  try {
    await initI18n();
  } catch (err) {
    app.innerHTML = '<div class="wrap page"><p>Не удалось загрузить сайт. Обновите страницу. / Failed to load. Please refresh.</p></div>';
    return;
  }
  await loadMe();
  lastUserId = state.user?.id;
  if (state.user?.lang && state.user.lang !== lang()) await setLang(state.user.lang);
  await render();
})();

