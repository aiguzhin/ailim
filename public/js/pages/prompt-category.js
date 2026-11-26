// /prompts/:cat — all subtopics of one category with their four prompts.
import { t } from '../i18n.js';
import { icon } from '../icons.js';
import { esc, emptyState, reviewNote } from '../ui.js';
import { bindFavorites } from '../favorites.js';
import { loadLibrary, loadCategory, bySubtopic, toolsFor, subtopicCard, bindPromptCards } from '../prompt-lib.js';

let lib; let cat; let current;

export default {
  title: () => (lib && current ? lib.names.categories[current.id] : t('nav.prompts')),
  async render({ params }) {
    lib = await loadLibrary();
    current = lib.index.categories.find((c) => c.id === params.cat);
    if (!current) {
      return `<div class="wrap page">${emptyState({ title: t('notFound.title'), text: t('prompts.empty.text'), iconName: 'route', action: `<a class="btn" href="/prompts">${esc(t('prompts.back'))}</a>` })}</div>`;
    }
    cat = current.prompts ? await loadCategory(current.id) : null;
    const groups = cat ? bySubtopic(cat) : new Map();
    const tools = toolsFor(lib, current.needs);
    return `
    <div class="page-head"><div class="wrap">
      <a href="/prompts" class="small" style="display:inline-flex;gap:.35rem;align-items:center;margin-bottom:1rem">${icon('arrowLeft').replace('<svg', '<svg style="width:16px;height:16px"')}${esc(t('prompts.back'))}</a>
      <h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem)">${esc(lib.names.categories[current.id])}</h1>
      <p>${esc(t('prompts.catLead', { n: current.subtopics.length }))}</p>
      ${tools.length ? `<div class="meta" style="margin-top:.75rem"><span>${esc(t('prompts.tools'))}</span>${tools.map((x) => `<a class="tag" href="/prompts?tool=${esc(x.id)}">${esc(x.name)}</a>`).join('')}</div>` : ''}
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      ${reviewNote()}
      <nav class="chips subtopic-nav" aria-label="${esc(t('prompts.subtopicsNav'))}">
        ${current.subtopics.map((s) => `<a class="chip" href="#p-${esc(current.id)}-${esc(s)}" style="text-decoration:none">${esc(lib.names.subtopics[`${current.id}.${s}`])}</a>`).join('')}
      </nav>
      ${cat ? `<div class="grid grid-2">${current.subtopics.map((s) => (groups.get(s) ? subtopicCard(lib, current.id, s, groups.get(s), cat.texts) : '')).join('')}</div>`
        : emptyState({ title: t('prompts.inProgress'), text: t('prompts.inProgressText'), iconName: 'clock', action: `<a class="btn btn-sm" href="/prompts">${esc(t('prompts.back'))}</a>` })}
    </div>`;
  },
  mount(el) {
    if (!cat) return null;
    const unCards = bindPromptCards(el, lib, () => cat);
    const unFav = bindFavorites(el);
    return () => { unCards(); unFav(); };
  },
};
