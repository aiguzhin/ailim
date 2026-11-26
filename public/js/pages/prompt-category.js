// /prompts/:cat — all subtopics of one category with their four prompts.
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, emptyState, reviewNote } from '../ui.js';
import { bindFavorites } from '../favorites.js';
import { loadLibrary, loadCategory, bySubtopic, toolsFor, subtopicCard, bindPromptCards } from '../prompt-lib.js';

let lib; let cat; let current;
const STORE = 'ailim_web_project';
const STAGES = ['idea', 'structure', 'layout', 'style', 'code', 'review', 'publish'];
const SITES = ['portfolio', 'blog', 'catalog', 'landing', 'shop', 'education', 'service'];
const TOOL_TYPES = ['chat', 'image-gen', 'prototype', 'site-builder', 'project-edit'];
const APPLIES = ['new', 'existing'];

// Project details live only in this tab (sessionStorage) and never leave the browser.
const shared = {};
function loadShared() {
  try { Object.assign(shared, JSON.parse(sessionStorage.getItem(STORE) || '{}')); } catch { /* storage unavailable */ }
}
function saveShared() {
  try { sessionStorage.setItem(STORE, JSON.stringify(shared)); } catch { /* storage unavailable */ }
}

function select(id, label, any, options) {
  return `<label class="filter-field"><span class="small label">${esc(label)}</span>
    <select id="${id}"><option value="">${esc(any)}</option>${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>`;
}

function projectPanel() {
  const names = cat.texts.shared || [];
  return `<details class="card project-panel" open>
    <summary><strong>${esc(t('prompts.web.project'))}</strong></summary>
    <p class="small muted">${esc(t('prompts.web.projectHint'))}</p>
    <div class="project-grid">${names.map((n) => `<label class="fill-field"><span>${esc(n)}</span><input type="text" data-shared="${esc(n)}" maxlength="400" autocomplete="off" value="${esc(shared[n] || '')}"></label>`).join('')}</div>
    <button class="btn btn-ghost btn-sm" type="button" data-clear-project>${esc(t('prompts.web.projectClear'))}</button>
  </details>
  <div class="filters web-filters" style="margin:1rem 0 .5rem">
    ${select('w-stage', t('prompts.web.stage'), t('prompts.web.anyStage'), STAGES.map((x) => [x, t(`stage.${x}`)]))}
    ${select('w-site', t('prompts.web.site'), t('prompts.web.anySite'), SITES.map((x) => [x, t(`site.${x}`)]))}
    ${select('w-tool', t('prompts.web.toolType'), t('prompts.web.anyToolType'), TOOL_TYPES.map((x) => [x, t(`toolType.${x}`)]))}
    ${select('w-applies', t('prompts.web.applies'), t('prompts.web.anyApplies'), APPLIES.map((x) => [x, t(`applies.${x}`)]))}
    <button class="btn btn-ghost btn-sm" type="button" data-web-reset>${esc(t('filter.reset'))}</button>
  </div>
  <p class="small muted result-count" id="web-count" aria-live="polite"></p>`;
}

export default {
  title: () => (lib && current ? lib.names.categories[current.id] : t('nav.prompts')),
  async render({ params }) {
    lib = await loadLibrary();
    current = lib.index.categories.find((c) => c.id === params.cat);
    if (!current) {
      return `<div class="wrap page">${emptyState({ title: t('notFound.title'), text: t('prompts.empty.text'), iconName: 'route', action: `<a class="btn" href="/prompts">${esc(t('prompts.back'))}</a>` })}</div>`;
    }
    cat = current.prompts ? await loadCategory(current.id) : null;
    if (current.project) loadShared();
    const groups = cat ? bySubtopic(cat) : new Map();
    const tools = toolsFor(lib, current.needs);
    return `
    <div class="page-head"><div class="wrap">
      <a href="/prompts" class="small" style="display:inline-flex;gap:.35rem;align-items:center;margin-bottom:1rem">${icon('arrowLeft').replace('<svg', '<svg style="width:16px;height:16px"')}${esc(t('prompts.back'))}</a>
      <h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem)">${esc(lib.names.categories[current.id])}</h1>
      <p>${esc(t(current.kinds ? 'prompts.catLeadWeb' : 'prompts.catLead', { n: current.subtopics.length }))}</p>
      ${tools.length ? `<div class="meta" style="margin-top:.75rem"><span>${esc(t('prompts.tools'))}</span>${tools.map((x) => `<a class="tag" href="/prompts?tool=${esc(x.id)}">${esc(x.name)}</a>`).join('')}</div>` : ''}
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      ${reviewNote()}
      ${cat && current.project ? projectPanel() : ''}
      <nav class="chips subtopic-nav" aria-label="${esc(t('prompts.subtopicsNav'))}">
        ${current.subtopics.map((s) => `<a class="chip" href="#p-${esc(current.id)}-${esc(s)}" style="text-decoration:none">${esc(lib.names.subtopics[`${current.id}.${s}`])}</a>`).join('')}
      </nav>
      ${cat ? `<div class="grid grid-2" id="cards">${current.subtopics.map((s) => (groups.get(s) ? subtopicCard(lib, current.id, s, groups.get(s), cat.texts) : '')).join('')}</div>`
        : emptyState({ title: t('prompts.inProgress'), text: t('prompts.inProgressText'), iconName: 'clock', action: `<a class="btn btn-sm" href="/prompts">${esc(t('prompts.back'))}</a>` })}
    </div>`;
  },
  mount(el) {
    if (!cat) return null;
    const unCards = bindPromptCards(el, lib, () => cat, { shared: current.project ? shared : null });
    const unFav = bindFavorites(el);
    if (!current.project) return () => { unCards(); unFav(); };

    const f = { stage: el.querySelector('#w-stage'), site: el.querySelector('#w-site'), tool: el.querySelector('#w-tool'), applies: el.querySelector('#w-applies') };
    const cards = [...el.querySelectorAll('#cards [data-sub]')];
    const has = (card, key, v) => (card.dataset[key] || '').split(' ').includes(v);
    const applyFilters = () => {
      let n = 0;
      for (const card of cards) {
        const ok = (!f.stage.value || has(card, 'stage', f.stage.value))
          && (!f.site.value || has(card, 'sites', 'all') || has(card, 'sites', f.site.value))
          && (!f.tool.value || has(card, 'needs', f.tool.value))
          && (!f.applies.value || has(card, 'applies', f.applies.value) || has(card, 'applies', 'both'));
        card.hidden = !ok;
        if (ok) n += 1;
      }
      el.querySelector('#web-count').textContent = t('prompts.web.found', { n });
      el.querySelector('#web-empty')?.remove();
      if (!n) el.querySelector('#cards').insertAdjacentHTML('afterend', `<div id="web-empty">${emptyState({ title: t('prompts.empty.title'), text: t('prompts.empty.text'), action: `<button class="btn btn-sm" type="button" data-web-reset>${esc(t('filter.reset'))}</button>` })}</div>`);
    };
    const onChange = (e) => { if (e.target.closest('.web-filters')) applyFilters(); };
    const onInput = (e) => {
      const inp = e.target.closest('[data-shared]');
      if (!inp) return;
      if (inp.value) shared[inp.dataset.shared] = inp.value; else delete shared[inp.dataset.shared];
      saveShared();
      unCards.sync();
    };
    const onClick = (e) => {
      if (e.target.closest('[data-web-reset]')) { Object.values(f).forEach((s) => { s.value = ''; }); applyFilters(); }
      if (e.target.closest('[data-clear-project]')) {
        Object.keys(shared).forEach((k) => delete shared[k]);
        saveShared();
        el.querySelectorAll('[data-shared]').forEach((i) => { i.value = ''; });
        unCards.sync();
      }
    };
    el.addEventListener('change', onChange);
    el.addEventListener('input', onInput);
    el.addEventListener('click', onClick);
    applyFilters();
    return () => { unCards(); unFav(); el.removeEventListener('change', onChange); el.removeEventListener('input', onInput); el.removeEventListener('click', onClick); };
  },
};
