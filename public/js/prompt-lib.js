// Prompt library: data loading, search, tool matching and the subtopic card component.
import { t, lang, content } from './i18n.js';
import { state } from './store.js';
import { icon } from './icons.js';
import { esc, levelBars, copyText } from './ui.js';

const cache = new Map();
const getJSON = (url) => {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }).catch((e) => { cache.delete(url); throw e; }));
  return cache.get(url);
};

export const KINDS = ['short', 'detailed', 'refine', 'check'];
export const RESULTS = ['explanation', 'list', 'table', 'plan', 'text', 'quiz', 'image', 'code'];
export const CAPS = ['chat', 'sources', 'own-docs', 'translate', 'image-gen', 'video', 'tts', 'music', 'code-ide', 'slides', 'notes'];
const CREATIVE = new Set(['images', 'design', 'video', 'audio', 'music']);
const SENSITIVE = new Set(['habits', 'everyday', 'career']);

/** Loads the structure, names in the current language, tool list and capability profiles. */
export async function loadLibrary() {
  const [index, names, tools, profiles, toolText] = await Promise.all([
    getJSON('/content/prompts/index.json'), content('prompts/index'), getJSON('/content/tools.json'),
    getJSON('/content/tool-profiles.json'), content('tools'),
  ]);
  return { index, names, tools: tools.tools, profiles, toolText };
}

/** Loads prompts of one category: shared metadata + texts in the current language. */
export async function loadCategory(cid) {
  const [meta, texts] = await Promise.all([getJSON(`/content/prompts/${cid}.json`), getJSON(`/content/${lang()}/prompts/${cid}.json`)]);
  return { meta, texts };
}

export async function loadAllCategories(lib) {
  const ids = lib.index.categories.filter((c) => c.prompts > 0).map((c) => c.id);
  const loaded = await Promise.all(ids.map(loadCategory));
  return Object.fromEntries(ids.map((id, i) => [id, loaded[i]]));
}

/** Tools whose verified capabilities include at least one of the needs. */
export function toolsFor(lib, needs) {
  return lib.tools.filter((tool) => {
    const can = lib.profiles.tools[tool.id]?.can || [];
    // Coding assistants also chat, but only about code: recommend them for coding tasks only.
    if (can.includes('code-ide') && !needs.includes('code-ide')) return false;
    return can.some((c) => needs.includes(c));
  });
}

/** Groups a category's prompts by subtopic. */
export function bySubtopic(cat) {
  const map = new Map();
  for (const m of cat.meta) {
    if (!map.has(m.subtopic)) map.set(m.subtopic, []);
    map.get(m.subtopic).push(m);
  }
  return map;
}

// ---------- Search ("I need to…") ----------
const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е');
const words = (s) => norm(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
/**
 * How many query words match the start of some word in the text
 * (light stemming: long words lose their last two letters, so "доклада" finds "доклад").
 */
export function score(query, haystack) {
  const hay = words(haystack);
  return words(query).filter((w) => {
    const stem = w.length > 5 ? w.slice(0, Math.max(4, w.length - 2)) : w;
    return hay.some((h) => h.startsWith(stem));
  }).length;
}
/** Minimum score for a result: all words for 1–2 word queries, otherwise at least half of them. */
export const minScore = (query) => {
  const n = words(query).length;
  return n <= 2 ? n : Math.ceil(n / 2);
};
export const matches = (query, haystack) => score(query, haystack) >= minScore(query);

// ---------- Placeholders ----------
const PLACEHOLDER = /\[([^\]]+)\]/g;
export const placeholders = (text) => [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1]))];
export function fill(text, values) {
  return text.replace(PLACEHOLDER, (all, name) => (values[name]?.trim() ? values[name].trim() : all));
}
// Rough check for personal data typed into fields (email, phone, 12-digit ID).
const PII = /[^\s@]+@[^\s@]+\.[^\s@]+|(?:\+?\d[\s()-]*){10,}|парол|password|құпиясөз|ИИН|ЖСН|\bIIN\b/i;

// ---------- Card ----------
function toolChips(lib, needs, max = 5) {
  const list = toolsFor(lib, needs);
  if (!list.length) return '';
  return `<div class="meta"><span>${esc(t('prompts.tools'))}</span>${list.slice(0, max).map((x) => `<a class="tag" href="/prompts?tool=${esc(x.id)}">${esc(x.name)}</a>`).join('')}${list.length > max ? `<span class="small muted">+${list.length - max}</span>` : ''}</div>`;
}

/**
 * Subtopic card: four prompt kinds as tabs, fill-in fields, copy / edit / favourite,
 * "check the answer" and "be careful with data" notes, links to lesson and tools.
 */
export function subtopicCard(lib, cid, sid, prompts, texts, { activeKind = 'detailed', showCategory = false } = {}) {
  const full = `${cid}.${sid}`;
  const cat = lib.index.categories.find((c) => c.id === cid);
  const name = lib.names.subtopics[full];
  const first = prompts.find((p) => p.kind === activeKind) || prompts[0];
  const lvl = Math.min(...prompts.map((p) => p.level));
  return `<article class="card prompt-card reveal" id="p-${esc(full.replace('.', '-'))}" data-sub="${esc(full)}">
    <header class="prompt-head">
      <div>
        ${showCategory ? `<a class="small muted" href="/prompts/${esc(cid)}">${esc(lib.names.categories[cid])}</a>` : ''}
        <h3>${esc(name)}</h3>
        <div class="meta"><span>${levelBars(lvl)}</span><span class="tag">${esc(t(`prompts.result.${first.result}`))}</span></div>
      </div>
    </header>
    <div class="kind-tabs" role="tablist" aria-label="${esc(t('prompts.kindsLabel', { name }))}">
      ${prompts.map((p) => `<button type="button" role="tab" data-kind="${p.kind}" aria-selected="${p.id === first.id}" tabindex="${p.id === first.id ? 0 : -1}" title="${esc(t(`prompts.kindHint.${p.kind}`))}">${esc(t(`prompts.kind.${p.kind}`))}</button>`).join('')}
    </div>
    <div class="prompt-panel" role="tabpanel" data-panel>${panelHtml(lib, cid, first, texts)}</div>
    <details class="hint"><summary>${icon('checkCircle')}${esc(t('prompts.verify'))}</summary><p class="small">${esc(texts.verify[full] || '')}</p></details>
    <details class="hint"><summary>${icon('lock')}${esc(t('prompts.caution'))}</summary><p class="small">${esc(t('prompts.cautionText'))}${CREATIVE.has(cid) ? ` ${esc(t('prompts.cautionCreative'))}` : ''}${SENSITIVE.has(cid) ? ` ${esc(t('prompts.cautionSerious'))}` : ''}</p></details>
    ${cat?.lesson ? `<a class="small" href="/lessons/${esc(cat.lesson)}">${icon('study').replace('<svg', '<svg style="width:15px;height:15px;display:inline;vertical-align:-2px"')} ${esc(t('prompts.lesson'))}</a>` : ''}
  </article>`;
}

export function panelHtml(lib, cid, p, texts) {
  const text = texts.prompts[p.id];
  const fields = placeholders(text);
  const fav = state.favorites.has(`prompt:${p.id}`);
  const tip = cid === 'images' && p.result === 'image' ? t('prompts.imageLangTip') : '';
  return `
    ${p.needs.includes('chat') && cid === 'images' ? `<p class="small muted" style="margin:0">${icon('info').replace('<svg', '<svg style="width:15px;height:15px;display:inline;vertical-align:-2px"')} ${esc(t('prompts.forChat'))}</p>` : ''}
    ${toolChips(lib, p.needs)}
    ${fields.length ? `<fieldset class="fill"><legend class="small label">${esc(t('prompts.fill'))}</legend>
      ${fields.map((f, i) => `<label class="fill-field"><span>${esc(f)}</span><input type="text" data-ph="${esc(f)}" maxlength="400" autocomplete="off" ${i === 0 ? '' : ''}></label>`).join('')}
      <p class="small muted" style="margin:0">${esc(t('prompts.fillHint'))}</p></fieldset>` : ''}
    <div class="pii" aria-live="polite"></div>
    <div class="prompt-box" data-prompt="${esc(p.id)}">
      <header><span>${esc(t('prompts.ready'))}</span>
        <span class="btn-row" style="gap:.25rem">
          <button class="btn btn-ghost btn-sm" type="button" data-p-edit aria-pressed="false">${icon('edit')}${esc(t('action.edit'))}</button>
          <button class="btn btn-ghost btn-sm" type="button" data-p-copy>${icon('copy')}${esc(t('action.copy'))}</button>
          ${state.user ? `<button class="btn btn-ghost btn-sm fav-btn" type="button" data-fav="prompt:${esc(p.id)}" aria-pressed="${fav}" aria-label="${esc(t('fav.label', { name: lib.names.subtopics[`${cid}.${p.subtopic}`] }))}">${icon('bookmark')}</button>` : ''}
        </span></header>
      <pre data-text>${esc(text)}</pre>
    </div>
    ${tip && tip !== 'prompts.imageLangTip' ? `<p class="small muted" style="margin:0">${esc(tip)}</p>` : ''}`;
}

/** Wires tabs, fill-in fields, copy and edit inside any container of subtopic cards. */
export function bindPromptCards(root, lib, getCategory) {
  const values = new WeakMap();
  const refresh = (card) => {
    const box = card.querySelector('[data-prompt]');
    const pre = box.querySelector('[data-text]');
    if (!pre) return; // in manual edit mode
    const { texts } = getCategory(card.dataset.sub.split('.')[0]);
    const vals = values.get(card) || {};
    pre.textContent = fill(texts.prompts[box.dataset.prompt], vals);
    const pii = Object.values(vals).some((v) => PII.test(v));
    card.querySelector('.pii').innerHTML = pii ? `<div class="notice warn" role="alert">${icon('alert')}<div><p>${esc(t('builder.piiWarning'))}</p></div></div>` : '';
  };
  const selectKind = (card, btn, focus) => {
    const [cid, sid] = card.dataset.sub.split('.');
    const cat = getCategory(cid);
    const p = cat.meta.find((m) => m.subtopic === sid && m.kind === btn.dataset.kind);
    card.querySelectorAll('[role=tab]').forEach((b) => { const on = b === btn; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    card.querySelector('[data-panel]').innerHTML = panelHtml(lib, cid, p, cat.texts);
    // Keep values typed earlier for placeholders with the same name.
    const vals = values.get(card) || {};
    card.querySelectorAll('[data-ph]').forEach((inp) => { if (vals[inp.dataset.ph]) inp.value = vals[inp.dataset.ph]; });
    refresh(card);
    if (focus) btn.focus();
  };
  const onClick = (e) => {
    const card = e.target.closest('[data-sub]');
    if (!card) return;
    const tab = e.target.closest('[role=tab][data-kind]');
    if (tab) { selectKind(card, tab, false); return; }
    if (e.target.closest('[data-p-copy]')) {
      const box = card.querySelector('[data-prompt]');
      const area = box.querySelector('textarea');
      copyText(area ? area.value : box.querySelector('[data-text]').textContent);
    }
    const edit = e.target.closest('[data-p-edit]');
    if (edit) {
      const box = card.querySelector('[data-prompt]');
      const pre = box.querySelector('[data-text]');
      if (pre) {
        const ta = document.createElement('textarea');
        ta.value = pre.textContent;
        ta.setAttribute('aria-label', t('lesson.editPrompt'));
        pre.replaceWith(ta);
        ta.style.height = `${Math.max(140, ta.scrollHeight + 4)}px`;
        ta.focus();
        edit.setAttribute('aria-pressed', 'true');
      } else {
        const ta = box.querySelector('textarea');
        const p = document.createElement('pre');
        p.dataset.text = '';
        p.textContent = ta.value;
        ta.replaceWith(p);
        edit.setAttribute('aria-pressed', 'false');
      }
    }
  };
  const onInput = (e) => {
    const inp = e.target.closest('[data-ph]');
    if (!inp) return;
    const card = inp.closest('[data-sub]');
    const vals = values.get(card) || {};
    vals[inp.dataset.ph] = inp.value;
    values.set(card, vals);
    refresh(card);
  };
  const onKey = (e) => {
    const tab = e.target.closest('[role=tab][data-kind]');
    if (!tab || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const tabs = [...tab.parentElement.querySelectorAll('[role=tab]')];
    const next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    selectKind(tab.closest('[data-sub]'), next, true);
  };
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  root.addEventListener('keydown', onKey);
  return () => { root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('keydown', onKey); };
}
