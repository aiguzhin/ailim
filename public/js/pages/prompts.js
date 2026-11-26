// /prompts — overview, "I need to…" search, filters and per-tool view of the prompt library.
import { t, formatDate } from '../i18n.js';
import { icon, directionIcon } from '../icons.js';
import { esc, emptyState, debounce, observeReveal, reviewNote } from '../ui.js';
import { bindFavorites } from '../favorites.js';
import { loadLibrary, loadAllCategories, bySubtopic, toolsFor, score, minScore, subtopicCard, bindPromptCards, RESULTS, CAPS } from '../prompt-lib.js';

let lib; let cats;
const PAGE = 24;

function select(id, label, any, options, value) {
  return `<label class="visually-hidden" for="${id}">${esc(label)}</label>
    <select id="${id}"><option value="">${esc(any)}</option>${options.map(([v, l]) => `<option value="${esc(v)}"${String(value) === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}

function toolBlock(toolId) {
  const tool = lib.tools.find((x) => x.id === toolId);
  const prof = lib.profiles.tools[toolId];
  if (!tool || !prof) return '';
  const fits = lib.index.categories.filter((c) => c.needs.some((n) => prof.can.includes(n)));
  const notFor = lib.index.categories.filter((c) => !c.needs.some((n) => prof.can.includes(n)) && c.needs.length);
  const alts = (c) => toolsFor(lib, c.needs).filter((x) => x.id !== toolId).slice(0, 3).map((x) => x.name).join(', ');
  return `<section class="card tool-profile" aria-labelledby="tool-title" style="margin-bottom:1.5rem">
    <h2 id="tool-title" style="font-size:1.3rem">${esc(t('prompts.toolPage.title', { tool: tool.name }))}</h2>
    <p>${esc(lib.toolText.text[toolId]?.purpose || '')}</p>
    <div><span class="label small">${esc(t('prompts.toolPage.can'))}</span>
      <ul class="list-check small" style="margin:.35rem 0 0">${prof.can.map((c) => `<li>${icon('check')}<span>${esc(t(`cap.${c}`))}</span></li>`).join('')}</ul></div>
    <p class="small muted" style="margin:0">${esc(t('prompts.toolPage.checked', { date: formatDate(lib.profiles.checked) }))} ${esc(t('facts.sources'))}
      ${prof.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(s.url).hostname)}<span class="visually-hidden"> ${esc(t('a11y.newTab'))}</span></a>`).join(', ')}</p>
    <p class="small" style="margin:0"><a href="/catalog?q=${encodeURIComponent(tool.name)}">${esc(t('prompts.toolPage.inCatalog'))}</a></p>
    ${notFor.length ? `<details class="hint"><summary>${esc(t('prompts.toolPage.notFor'))} (${notFor.length})</summary>
      <ul class="small" style="margin:.4rem 0 0;padding-left:1.1rem">${notFor.map((c) => `<li>${esc(lib.names.categories[c.id])}${alts(c) ? ` — ${esc(t('prompts.toolPage.alt', { tools: alts(c) }))}` : ''}</li>`).join('')}</ul></details>` : ''}
    <p class="small muted" style="margin:0">${esc(t('prompts.toolPage.fits', { n: fits.length }))}</p>
  </section>`;
}

function categoryTiles() {
  return `<div class="grid grid-3">${lib.index.categories.map((c) => `
    <a class="card link-card reveal cat-tile" href="/prompts/${esc(c.id)}" style="text-decoration:none;color:inherit">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
        <span class="card-icon">${icon(c.icon || 'chat')}</span>
        ${c.prompts ? `<span class="tag done">${esc(t('prompts.countIn', { n: c.prompts }))}</span>` : `<span class="tag">${esc(t('prompts.inProgress'))}</span>`}
      </div>
      <h3>${esc(lib.names.categories[c.id])}</h3>
      <p class="small">${esc(c.subtopics.slice(0, 4).map((s) => lib.names.subtopics[`${c.id}.${s}`]).join(' · '))}…</p>
    </a>`).join('')}</div>`;
}

export default {
  title: () => t('nav.prompts'),
  async render({ query }) {
    lib = await loadLibrary();
    cats = await loadAllCategories(lib);
    const totalPrompts = lib.index.categories.reduce((n, c) => n + c.prompts, 0);
    const totalSubs = lib.index.categories.reduce((n, c) => n + c.subtopics.length, 0);
    const toolId = query.get('tool') || '';
    return `
    <div class="page-head"><div class="wrap">
      <span class="eyebrow">${esc(t('prompts.eyebrow'))}</span>
      <h1>${esc(t('prompts.title'))}</h1>
      <p>${esc(t('prompts.lead'))}</p>
      <p class="small muted" style="margin-top:.75rem">${esc(t('prompts.stats', { c: lib.index.categories.length, s: totalSubs, p: totalPrompts }))}</p>
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      ${reviewNote()}
      <div class="need-box">
        <label for="need" class="label">${esc(t('prompts.need.label'))}</label>
        <div class="search">${icon('search')}<input id="need" type="search" autocomplete="off" placeholder="${esc(t('prompts.need.placeholder'))}" value="${esc(query.get('q') || '')}"></div>
      </div>
      <div class="filters" style="margin:1rem 0 1.5rem">
        ${select('f-cat', t('filter.category'), t('prompts.filters.anyCategory'), lib.index.categories.filter((c) => c.prompts).map((c) => [c.id, lib.names.categories[c.id]]), query.get('cat') || '')}
        ${select('f-level', t('filter.level'), t('filter.anyLevel'), [1, 2, 3].map((l) => [l, t(`level.${l}`)]), query.get('level') || '')}
        ${select('f-result', t('prompts.filters.result'), t('prompts.filters.anyResult'), RESULTS.map((r) => [r, t(`prompts.result.${r}`)]), query.get('result') || '')}
        ${select('f-tool', t('prompts.filters.tool'), t('prompts.filters.anyTool'), lib.tools.map((x) => [x.id, x.name]), toolId)}
        ${select('f-aud', t('prompts.filters.audience'), t('prompts.filters.anyAudience'), Object.entries(lib.names.audiences), query.get('aud') || '')}
        <button class="btn btn-ghost btn-sm" type="button" data-reset>${esc(t('filter.reset'))}</button>
      </div>
      <div id="tool-block">${toolId ? toolBlock(toolId) : ''}</div>
      <div id="results" aria-live="polite"></div>
    </div>`;
  },
  mount(el, { query }) {
    const q = el.querySelector('#need');
    const f = { cat: el.querySelector('#f-cat'), level: el.querySelector('#f-level'), result: el.querySelector('#f-result'), tool: el.querySelector('#f-tool'), aud: el.querySelector('#f-aud') };
    const results = el.querySelector('#results');
    let limit = PAGE;

    const update = (resetLimit = true) => {
      if (resetLimit) limit = PAGE;
      const text = q.value.trim();
      const active = text || Object.values(f).some((s) => s.value);
      const params = new URLSearchParams();
      if (text) params.set('q', text);
      for (const [k, s] of Object.entries(f)) if (s.value) params.set(k, s.value);
      history.replaceState({}, '', `/prompts${params.size ? `?${params}` : ''}`);
      el.querySelector('#tool-block').innerHTML = f.tool.value ? toolBlock(f.tool.value) : '';

      if (!active) { results.innerHTML = categoryTiles(); observeReveal(results); return; }

      const toolCan = f.tool.value ? lib.profiles.tools[f.tool.value]?.can || [] : null;
      const found = [];
      const pending = [];
      for (const c of lib.index.categories) {
        if (f.cat.value && c.id !== f.cat.value) continue;
        if (f.aud.value && !c.audiences.includes(f.aud.value)) continue;
        const cat = cats[c.id];
        const groups = cat ? bySubtopic(cat) : new Map();
        for (const sid of c.subtopics) {
          const full = `${c.id}.${sid}`;
          const hay = [lib.names.categories[c.id], lib.names.subtopics[full]];
          const prompts = groups.get(sid) || [];
          if (!prompts.length) {
            if (text && !f.level.value && !f.result.value && !toolCan && score(text, hay.join(' ')) >= minScore(text)) pending.push(full);
            continue;
          }
          const ok = prompts.filter((p) => (!f.level.value || p.level === Number(f.level.value))
            && (!f.result.value || p.result === f.result.value)
            && (!toolCan || p.needs.some((n) => toolCan.includes(n))));
          if (!ok.length) continue;
          let rank = 0;
          if (text) {
            // Matches in the topic name count more than matches inside prompt texts.
            rank = score(text, hay.join(' ')) * 2 + score(text, ok.map((p) => cat.texts.prompts[p.id]).join(' '));
            if (score(text, [...hay, ...ok.map((p) => cat.texts.prompts[p.id])].join(' ')) < minScore(text)) continue;
          }
          found.push({ cid: c.id, sid, prompts, rank });
        }
      }
      if (text) found.sort((a, b) => b.rank - a.rank);
      // Tools that suit the best matches, most frequent first.
      const freq = new Map();
      for (const r of found.slice(0, 4)) for (const tool of toolsFor(lib, [...new Set(r.prompts.flatMap((p) => p.needs))])) freq.set(tool.id, (freq.get(tool.id) || 0) + 1);
      const rec = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => lib.tools.find((x) => x.id === id));

      results.innerHTML = `
        <p class="result-count">${esc(t('prompts.found', { n: found.length }))}</p>
        ${text && rec.length ? `<div class="notice info" style="margin-bottom:1.25rem">${icon('route')}<div><p><strong>${esc(t('prompts.need.tools'))}</strong> ${rec.map((x) => `<a href="/prompts?tool=${esc(x.id)}">${esc(x.name)}</a>`).join(', ')}</p></div></div>` : ''}
        ${found.length ? `<div class="grid grid-2">${found.slice(0, limit).map((r) => subtopicCard(lib, r.cid, r.sid, r.prompts, cats[r.cid].texts, { showCategory: true })).join('')}</div>
          ${found.length > limit ? `<p style="text-align:center;margin-top:1.5rem"><button class="btn" type="button" data-more>${esc(t('prompts.more', { n: found.length - limit }))}</button></p>` : ''}`
          : emptyState({ title: t('prompts.empty.title'), text: t('prompts.empty.text'), action: `<button class="btn btn-sm" type="button" data-reset>${esc(t('filter.reset'))}</button>` })}
        ${pending.length ? `<div style="margin-top:2rem"><h2 style="font-size:1.1rem">${esc(t('prompts.pendingTitle'))}</h2>
          <ul class="small" style="padding-left:1.1rem">${pending.slice(0, 12).map((full) => `<li>${esc(lib.names.categories[full.split('.')[0]])}: ${esc(lib.names.subtopics[full])}</li>`).join('')}</ul></div>` : ''}`;
      observeReveal(results);
    };

    q.addEventListener('input', debounce(() => update()));
    Object.values(f).forEach((s) => s.addEventListener('change', () => update()));
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-reset]')) { q.value = ''; Object.values(f).forEach((s) => { s.value = ''; }); update(); q.focus(); }
      if (e.target.closest('[data-more]')) { limit += PAGE; update(false); }
    });
    update();
    void query;
    const unCards = bindPromptCards(el, lib, (cid) => cats[cid]);
    const unFav = bindFavorites(el);
    return () => { unCards(); unFav(); };
  },
};
