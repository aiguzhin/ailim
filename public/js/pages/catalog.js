import { t, content, formatDate } from '../i18n.js';
import { state, recordView } from '../store.js';
import { icon, directionIcon } from '../icons.js';
import { esc, levelBars, emptyState, copyText, debounce, notice, observeReveal } from '../ui.js';
import { favButton } from '../learn.js';
import { bindFavorites } from '../favorites.js';

let data;

function toolCard(tool, text, catName) {
  const id = `tool:${tool.id}`;
  return `<article class="card reveal" id="tool-${esc(tool.id)}">
    <div style="display:flex;gap:.75rem;align-items:flex-start">
      <div class="card-icon">${icon(directionIcon[tool.category] || 'chat')}</div>
      <div style="flex:1;min-width:0"><h3>${esc(tool.name)}</h3><span class="small muted">${esc(tool.maker)} · ${esc(catName)}</span></div>
      ${state.user ? favButton(id, tool.name) : ''}
    </div>
    <p>${esc(text.purpose)}</p>
    <div class="meta"><span>${levelBars(tool.level)}</span></div>
    <div><span class="label small">${esc(t('catalog.tasks'))}</span>
      <ul class="list-check small" style="margin:.35rem 0 0">${text.tasks.map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul></div>
    <div class="prompt-box" style="margin:.25rem 0 0">
      <header><span>${esc(t('catalog.example'))}</span>
        <button class="btn btn-ghost btn-sm" type="button" data-copy="${esc(tool.id)}">${icon('copy')}${esc(t('action.copy'))}</button></header>
      <pre>${esc(text.prompt)}</pre>
    </div>
    <div class="card-foot">
      <a class="btn btn-sm" href="${esc(tool.url)}" target="_blank" rel="noopener noreferrer" data-visit="${esc(id)}">${esc(t('catalog.official'))}${icon('external')}<span class="visually-hidden">${esc(t('a11y.newTab'))}</span></a>
    </div>
  </article>`;
}

function filtered(q, cat, level, onlyFav) {
  const needle = q.trim().toLowerCase();
  return data.base.tools.filter((tool) => {
    const text = data.text.text[tool.id];
    if (cat && tool.category !== cat) return false;
    if (level && tool.level !== Number(level)) return false;
    if (onlyFav && !state.favorites.has(`tool:${tool.id}`)) return false;
    if (!needle) return true;
    return [tool.name, tool.maker, text.purpose, ...text.tasks].join(' ').toLowerCase().includes(needle);
  });
}

export default {
  title: () => t('nav.catalog'),
  async render({ query }) {
    const [base, text] = await Promise.all([fetch('/content/tools.json').then((r) => r.json()), content('tools')]);
    data = { base, text };
    const cat = query.get('cat') || '';
    return `
    <div class="page-head"><div class="wrap">
      <span class="eyebrow">${esc(t('catalog.eyebrow'))}</span>
      <h1>${esc(t('catalog.title'))}</h1>
      <p>${esc(t('catalog.lead'))}</p>
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      ${notice('warn', `<p>${esc(t('catalog.disclaimer', { date: formatDate(base.updated) }))}</p>`)}
      <div style="height:1.5rem"></div>
      <div class="toolbar">
        <div class="search">${icon('search')}<label class="visually-hidden" for="tool-q">${esc(t('catalog.search'))}</label>
          <input id="tool-q" type="search" placeholder="${esc(t('catalog.search'))}" value="${esc(query.get('q') || '')}" autocomplete="off"></div>
        <div class="filters">
          <label class="visually-hidden" for="tool-level">${esc(t('filter.level'))}</label>
          <select id="tool-level"><option value="">${esc(t('filter.anyLevel'))}</option>${[1, 2, 3].map((l) => `<option value="${l}"${query.get('level') == l ? ' selected' : ''}>${esc(t(`level.${l}`))}</option>`).join('')}</select>
          ${state.user ? `<label class="check" style="padding:0 .25rem"><input type="checkbox" id="tool-fav"${query.get('fav') ? ' checked' : ''}><span>${esc(t('filter.onlyFav'))}</span></label>` : ''}
        </div>
      </div>
      <div class="chips" role="group" aria-label="${esc(t('filter.category'))}">
        <button class="chip" type="button" data-cat="" aria-pressed="${!cat}">${esc(t('filter.all'))}</button>
        ${base.categories.map((c) => `<button class="chip" type="button" data-cat="${c}" aria-pressed="${cat === c}">${esc(text.categories[c])}</button>`).join('')}
      </div>
      <p class="result-count" id="tool-count" aria-live="polite"></p>
      <div class="grid grid-3" id="tool-list"></div>
    </div>`;
  },
  mount(el, { query }) {
    let cat = query.get('cat') || '';
    const q = el.querySelector('#tool-q');
    const level = el.querySelector('#tool-level');
    const fav = el.querySelector('#tool-fav');
    const list = el.querySelector('#tool-list');
    const count = el.querySelector('#tool-count');

    const update = () => {
      const items = filtered(q.value, cat, level.value, fav?.checked);
      count.textContent = t('catalog.count', { n: items.length });
      list.innerHTML = items.length
        ? items.map((tool) => toolCard(tool, data.text.text[tool.id], data.text.categories[tool.category])).join('')
        : `<div style="grid-column:1/-1">${emptyState({ title: t('empty.toolsTitle'), text: fav?.checked ? t('empty.favTools') : t('empty.toolsText'),
            action: `<button class="btn btn-sm" type="button" data-reset>${esc(t('filter.reset'))}</button>` })}</div>`;
      observeReveal(list);
      const params = new URLSearchParams();
      if (cat) params.set('cat', cat);
      if (q.value.trim()) params.set('q', q.value.trim());
      if (level.value) params.set('level', level.value);
      if (fav?.checked) params.set('fav', '1');
      history.replaceState({}, '', `/catalog${params.size ? `?${params}` : ''}`);
    };

    q.addEventListener('input', debounce(update));
    level.addEventListener('change', update);
    fav?.addEventListener('change', update);
    el.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-cat]');
      if (chip) {
        cat = chip.dataset.cat;
        el.querySelectorAll('[data-cat]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        update();
      }
      const copy = e.target.closest('[data-copy]');
      if (copy) copyText(data.text.text[copy.dataset.copy].prompt);
      const visit = e.target.closest('[data-visit]');
      if (visit) recordView(visit.dataset.visit);
      if (e.target.closest('[data-reset]')) {
        q.value = ''; level.value = ''; cat = ''; if (fav) fav.checked = false;
        el.querySelectorAll('[data-cat]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === '')));
        update();
      }
    });
    update();
    return bindFavorites(el);
  },
};
