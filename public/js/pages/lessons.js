import { t, content } from '../i18n.js';
import { state } from '../store.js';
import { icon } from '../icons.js';
import { esc, emptyState, debounce, observeReveal } from '../ui.js';
import { lessonCard, lessonStatus } from '../learn.js';
import { bindFavorites } from '../favorites.js';

let lessons; let directions;

export default {
  title: () => t('nav.lessons'),
  async render({ query }) {
    [lessons, directions] = await Promise.all([content('lessons'), content('directions')]);
    const dir = query.get('dir') || '';
    const done = lessons.filter((l) => lessonStatus(l) === 'done').length;
    return `
    <div class="page-head"><div class="wrap">
      <span class="eyebrow">${esc(t('lessons.eyebrow'))}</span>
      <h1>${esc(t('lessons.title'))}</h1>
      <p>${esc(t('lessons.lead'))}</p>
      ${state.user ? `<div style="max-width:360px;margin-top:1.25rem"><div class="meta" style="justify-content:space-between"><span>${esc(t('lessons.progress'))}</span><span>${done}/${lessons.length}</span></div>
        <div class="bar" style="margin-top:.4rem" role="progressbar" aria-valuemin="0" aria-valuemax="${lessons.length}" aria-valuenow="${done}" aria-label="${esc(t('lessons.progress'))}"><i style="--v:${Math.round((done / lessons.length) * 100)}%"></i></div></div>` : ''}
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      ${!state.user ? `<div class="notice info" style="margin-bottom:1.5rem">${icon('info')}<div><p>${esc(t('lessons.guest'))} <a href="/register">${esc(t('nav.register'))}</a></p></div></div>` : ''}
      <div class="toolbar">
        <div class="search">${icon('search')}<label class="visually-hidden" for="les-q">${esc(t('lessons.search'))}</label>
          <input id="les-q" type="search" placeholder="${esc(t('lessons.search'))}" value="${esc(query.get('q') || '')}" autocomplete="off"></div>
        <div class="filters">
          <label class="visually-hidden" for="les-level">${esc(t('filter.level'))}</label>
          <select id="les-level"><option value="">${esc(t('filter.anyLevel'))}</option>${[1, 2, 3].map((l) => `<option value="${l}"${query.get('level') == l ? ' selected' : ''}>${esc(t(`level.${l}`))}</option>`).join('')}</select>
          ${state.user ? `<label class="visually-hidden" for="les-status">${esc(t('filter.status'))}</label>
          <select id="les-status"><option value="">${esc(t('filter.anyStatus'))}</option>
            ${['new', 'started', 'done', 'fav'].map((s) => `<option value="${s}"${query.get('status') === s ? ' selected' : ''}>${esc(t(`filter.status.${s}`))}</option>`).join('')}</select>` : ''}
        </div>
      </div>
      <div class="chips" role="group" aria-label="${esc(t('filter.direction'))}">
        <button class="chip" type="button" data-dir="" aria-pressed="${!dir}">${esc(t('filter.all'))}</button>
        ${Object.entries(directions).map(([id, d]) => `<button class="chip" type="button" data-dir="${id}" aria-pressed="${dir === id}">${esc(d.name)}</button>`).join('')}
      </div>
      <p class="result-count" id="les-count" aria-live="polite"></p>
      <div class="grid grid-3" id="les-list"></div>
    </div>`;
  },
  mount(el, { query }) {
    let dir = query.get('dir') || '';
    const q = el.querySelector('#les-q');
    const level = el.querySelector('#les-level');
    const status = el.querySelector('#les-status');
    const list = el.querySelector('#les-list');
    const count = el.querySelector('#les-count');

    const update = () => {
      const needle = q.value.trim().toLowerCase();
      const items = lessons.filter((l) => {
        if (dir && l.direction !== dir) return false;
        if (level.value && l.level !== Number(level.value)) return false;
        if (status?.value === 'fav' && !state.favorites.has(`lesson:${l.id}`)) return false;
        if (status?.value && status.value !== 'fav' && lessonStatus(l) !== status.value) return false;
        if (!needle) return true;
        const hay = [l.title, l.summary, l.goal, directions[l.direction]?.name, ...l.steps.flatMap((s) => [s.title, ...(s.body || [])])].join(' ').toLowerCase();
        return hay.includes(needle);
      });
      count.textContent = t('lessons.count', { n: items.length });
      list.innerHTML = items.length ? items.map((l) => lessonCard(l, directions)).join('')
        : `<div style="grid-column:1/-1">${emptyState({ title: t('empty.lessonsTitle'), text: t('empty.lessonsText'), action: `<button class="btn btn-sm" type="button" data-reset>${esc(t('filter.reset'))}</button>` })}</div>`;
      observeReveal(list);
      const params = new URLSearchParams();
      if (dir) params.set('dir', dir);
      if (needle) params.set('q', q.value.trim());
      if (level.value) params.set('level', level.value);
      if (status?.value) params.set('status', status.value);
      history.replaceState({}, '', `/lessons${params.size ? `?${params}` : ''}`);
    };
    q.addEventListener('input', debounce(update));
    level.addEventListener('change', update);
    status?.addEventListener('change', update);
    el.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-dir]');
      if (chip) {
        dir = chip.dataset.dir;
        el.querySelectorAll('[data-dir]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        update();
      }
      if (e.target.closest('[data-reset]')) {
        q.value = ''; level.value = ''; dir = ''; if (status) status.value = '';
        el.querySelectorAll('[data-dir]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.dir === '')));
        update();
      }
    });
    update();
    return bindFavorites(el);
  },
};
