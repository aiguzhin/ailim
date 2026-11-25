import { t, tp, content, formatDate } from '../i18n.js';
import { state } from '../store.js';
import { icon, directionIcon } from '../icons.js';
import { esc, emptyState } from '../ui.js';
import { nextLesson, achievements, lessonStatus, lessonCard } from '../learn.js';
import { bindFavorites } from '../favorites.js';

let data;

function itemTitle(itemId) {
  const [type, id] = itemId.split(':');
  if (type === 'lesson') return { title: data.lessons.find((l) => l.id === id)?.title, href: `/lessons/${id}`, kind: t('kind.lesson') };
  if (type === 'tool') return { title: data.tools.tools.find((x) => x.id === id)?.name, href: `/catalog?q=${encodeURIComponent(data.tools.tools.find((x) => x.id === id)?.name || '')}`, kind: t('kind.tool') };
  if (type === 'task') return { title: data.tasks.find((x) => x.id === id)?.title, href: `/practice#task-${id}`, kind: t('kind.task') };
  return { title: itemId, href: '/', kind: '' };
}

function tabFavorites() {
  const favLessons = data.lessons.filter((l) => state.favorites.has(`lesson:${l.id}`));
  const favTools = data.tools.tools.filter((x) => state.favorites.has(`tool:${x.id}`));
  if (!favLessons.length && !favTools.length) {
    return emptyState({ title: t('empty.favTitle'), text: t('empty.favText'), iconName: 'bookmark',
      action: `<div class="btn-row" style="justify-content:center"><a class="btn btn-sm" href="/lessons">${esc(t('nav.lessons'))}</a><a class="btn btn-sm" href="/catalog">${esc(t('nav.catalog'))}</a></div>` });
  }
  return `${favLessons.length ? `<h3>${esc(t('account.favLessons'))}</h3><div class="grid grid-3" style="margin-bottom:2rem">${favLessons.map((l) => lessonCard(l, data.directions, { reveal: false })).join('')}</div>` : ''}
    ${favTools.length ? `<h3>${esc(t('account.favTools'))}</h3><div class="grid grid-4">${favTools.map((x) => `<div class="card"><div style="display:flex;justify-content:space-between;gap:.5rem;align-items:center">
      <span style="display:flex;gap:.6rem;align-items:center"><span class="card-icon">${icon(directionIcon[x.category])}</span><strong>${esc(x.name)}</strong></span>
      <button class="icon-btn fav-btn" type="button" data-fav="tool:${esc(x.id)}" aria-pressed="true" aria-label="${esc(t('fav.label', { name: x.name }))}">${icon('bookmark')}</button></div>
      <a class="small" href="/catalog?q=${encodeURIComponent(x.name)}">${esc(t('account.openInCatalog'))}</a></div>`).join('')}</div>` : ''}`;
}

function tabHistory() {
  const items = [...state.history];
  for (const [itemId, p] of state.progress) if (!items.some((h) => h.itemId === itemId)) items.push({ itemId, viewedAt: p.updatedAt });
  items.sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt));
  if (!items.length) return emptyState({ title: t('empty.historyTitle'), text: t('empty.historyText'), iconName: 'clock', action: `<a class="btn btn-sm" href="/lessons">${esc(t('nav.lessons'))}</a>` });
  return `<ul class="history">${items.slice(0, 30).map((h) => {
    const info = itemTitle(h.itemId);
    if (!info.title) return '';
    const p = state.progress.get(h.itemId);
    return `<li><span><span class="small muted">${esc(info.kind)}</span><br><a href="${esc(info.href)}">${esc(info.title)}</a>
      ${p?.completed ? ` <span class="tag done">${esc(t('status.done'))}</span>` : p ? ` <span class="tag progress">${esc(t('status.started'))}</span>` : ''}</span>
      <time class="small muted" datetime="${esc(h.viewedAt)}">${esc(formatDate(h.viewedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</time></li>`;
  }).join('')}</ul>`;
}

function tabBadges() {
  const list = achievements(data.lessons, data.tasks);
  return `<div class="badges">${list.map((a) => `<div class="badge${a.earned ? ' earned' : ''}">
    <span class="medal">${icon(a.earned ? 'medal' : 'lock')}</span>
    <span><strong style="display:block">${esc(t(`badge.${a.id}.title`))}</strong><span class="small">${esc(t(`badge.${a.id}.text`))}</span>
    <span class="visually-hidden">${esc(a.earned ? t('badge.earned') : t('badge.locked'))}</span></span></div>`).join('')}</div>`;
}

const TABS = { favorites: tabFavorites, history: tabHistory, badges: tabBadges };

export default {
  requiresAuth: true,
  title: () => t('nav.account'),
  async render({ query }) {
    const [lessons, directions, tasks] = await Promise.all([content('lessons'), content('directions'), content('practice')]);
    const tools = await (await fetch('/content/tools.json')).json();
    data = { lessons, directions, tasks, tools };
    const u = state.user;
    const done = lessons.filter((l) => lessonStatus(l) === 'done').length;
    const started = lessons.filter((l) => lessonStatus(l) === 'started').length;
    const tasksDone = tasks.filter((x) => state.progress.get(`task:${x.id}`)?.completed).length;
    const earned = achievements(lessons, tasks).filter((a) => a.earned).length;
    const next = nextLesson(lessons);
    const tab = TABS[query.get('tab')] ? query.get('tab') : 'favorites';

    const lastProgress = [...state.progress.values()].map((p) => new Date(p.updatedAt)).sort((a, b) => b - a)[0];
    const idleDays = lastProgress ? Math.floor((Date.now() - lastProgress) / 86400_000) : null;
    const reminder = u.reminders && idleDays !== null && idleDays >= 4 && next;

    const plan = (u.plan?.lessons || []).map((id) => lessons.find((l) => l.id === id)).filter(Boolean);
    const planDone = plan.filter((l) => lessonStatus(l) === 'done').length;

    return `
    <div class="page-head"><div class="wrap dash-head">
      <div><span class="eyebrow">${esc(t('account.eyebrow'))}</span><h1 style="font-size:clamp(1.9rem,3.6vw,2.7rem)">${esc(t('account.hello', { name: u.name }))}</h1>
        <p>${esc(t('account.since', { date: formatDate(u.createdAt) }))}</p></div>
      <a class="btn" href="/settings">${icon('sliders')}${esc(t('nav.settings'))}</a>
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      ${reminder ? `<div class="notice info" style="margin-bottom:1.5rem">${icon('clock')}<div><p>${esc(t('account.reminder', { lesson: next.lesson.title }))}</p></div></div>` : ''}
      ${next ? `<div class="continue reveal"><div><span class="eyebrow">${esc(t(`account.next.${next.reason}`))}</span><h2 style="font-size:1.35rem;margin:0">${esc(next.lesson.title)}</h2>
        <p class="muted small" style="margin:.25rem 0 0">${esc(data.directions[next.lesson.direction]?.name)} · ${esc(tp('unit.minutes', next.lesson.minutes))}</p></div>
        <a class="btn btn-primary" href="/lessons/${esc(next.lesson.id)}">${esc(next.reason === 'continue' ? t('action.continue') : t('action.start'))}${icon('arrowRight')}</a></div>`
        : `<div class="continue"><div><h2 style="font-size:1.35rem;margin:0">${esc(t('home.personal.allDone'))}</h2></div><a class="btn" href="/practice">${esc(t('nav.practice'))}</a></div>`}

      <div class="stats">
        <div class="stat"><b>${done}<small class="muted" style="font-size:1rem">/${lessons.length}</small></b><span>${esc(t('account.stat.lessons'))}</span>
          <div class="bar" role="progressbar" aria-label="${esc(t('account.stat.lessons'))}" aria-valuemin="0" aria-valuemax="${lessons.length}" aria-valuenow="${done}"><i style="--v:${Math.round((done / lessons.length) * 100)}%"></i></div></div>
        <div class="stat"><b>${started}</b><span>${esc(t('account.stat.started'))}</span></div>
        <div class="stat"><b>${tasksDone}<small class="muted" style="font-size:1rem">/${tasks.length}</small></b><span>${esc(t('account.stat.tasks'))}</span></div>
        <div class="stat"><b>${earned}</b><span>${esc(t('account.stat.badges'))}</span></div>
      </div>

      <section style="margin-bottom:2.5rem" aria-labelledby="plan-title">
        <div class="section-head" style="margin-bottom:1rem"><h2 id="plan-title" style="font-size:1.4rem">${esc(t('account.plan'))}</h2>
          <a href="/start">${esc(plan.length ? t('account.planRedo') : t('account.planCreate'))}</a></div>
        ${plan.length ? `<p class="muted small">${esc(t('account.planProgress', { n: planDone, total: plan.length }))}</p>
          <ol class="history" style="counter-reset:p">${plan.map((l, i) => `<li><span><span class="muted small">${i + 1}.</span> <a href="/lessons/${esc(l.id)}">${esc(l.title)}</a></span>${lessonStatus(l) === 'done' ? `<span class="tag done">${icon('check')}${esc(t('status.done'))}</span>` : lessonStatus(l) === 'started' ? `<span class="tag progress">${esc(t('status.started'))}</span>` : ''}</li>`).join('')}</ol>`
          : `<div class="notice info">${icon('route')}<div><p>${esc(t('account.noPlan'))}</p><p><a class="btn btn-primary btn-sm" href="/start">${esc(t('account.planCreate'))}</a></p></div></div>`}
      </section>

      <div class="tabs" role="tablist" aria-label="${esc(t('account.sections'))}">
        ${Object.keys(TABS).map((k) => `<button role="tab" type="button" id="tab-${k}" aria-controls="panel" aria-selected="${k === tab}" tabindex="${k === tab ? 0 : -1}" data-tab="${k}">${esc(t(`account.tab.${k}`))}</button>`).join('')}
      </div>
      <div id="panel" role="tabpanel" aria-labelledby="tab-${tab}" tabindex="0">${TABS[tab]()}</div>
    </div>`;
  },
  mount(el) {
    const tabs = [...el.querySelectorAll('[role=tab]')];
    const select = (btn, focus = false) => {
      tabs.forEach((b) => { const on = b === btn; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      const panel = el.querySelector('#panel');
      panel.setAttribute('aria-labelledby', btn.id);
      panel.innerHTML = TABS[btn.dataset.tab]();
      history.replaceState({}, '', `/account?tab=${btn.dataset.tab}`);
      if (focus) btn.focus();
    };
    el.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) select(b); });
    el.querySelector('.tabs').addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight') select(tabs[(i + 1) % tabs.length], true);
      if (e.key === 'ArrowLeft') select(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
    const unFav = bindFavorites(el);
    // Refresh the favourites tab after un-bookmarking so the list stays accurate.
    const onFav = (e) => { if (e.target.closest('[data-fav]') && el.querySelector('#tab-favorites')?.getAttribute('aria-selected') === 'true') setTimeout(() => { el.querySelector('#panel').innerHTML = tabFavorites(); }, 400); };
    el.addEventListener('click', onFav);
    return () => { unFav(); el.removeEventListener('click', onFav); };
  },
};
