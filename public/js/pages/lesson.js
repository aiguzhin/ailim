import { t, content } from '../i18n.js';
import { state, setProgress, resetProgress, recordView } from '../store.js';
import { icon, directionIcon } from '../icons.js';
import { esc, levelBars, toast, errorText, emptyState, reviewNote } from '../ui.js';
import { favButton, lessonStatus, timeMeta } from '../learn.js';
import { bindFavorites } from '../favorites.js';
import { promptBox, bindPromptBoxes } from '../prompt-box.js';

let ctx;

function stepHtml(lesson, i) {
  const last = lesson.steps.length;
  if (i === last) {
    return `<div class="step-panel">
      <span class="eyebrow">${esc(t('lesson.stepOf', { n: last + 1, total: last + 1 }))}</span>
      <h2>${esc(t('lesson.practiceTitle'))}</h2>
      <div class="notice info" style="margin-bottom:1.25rem">${icon('flag')}<div><p><strong>${esc(t('lesson.task'))}</strong></p><p>${esc(lesson.task)}</p></div></div>
      <h3>${esc(t('lesson.takeaway'))}</h3>
      <p>${esc(lesson.takeaway)}</p>
      <p class="muted small">${esc(t('lesson.verifyReminder'))}</p>
      ${ctx?.promptCats?.length ? `<p>${icon('copy').replace('<svg', '<svg style="width:16px;height:16px;display:inline;vertical-align:-3px"')} ${esc(t('lesson.prompts'))} ${ctx.promptCats.map((c) => `<a href="/prompts/${esc(c.id)}">${esc(c.name)}</a>`).join(', ')}</p>` : ''}
    </div>`;
  }
  const s = lesson.steps[i];
  return `<div class="step-panel">
    <span class="eyebrow">${esc(t('lesson.stepOf', { n: i + 1, total: last + 1 }))}</span>
    <h2>${esc(s.title)}</h2>
    ${(s.body || []).map((p) => `<p>${esc(p)}</p>`).join('')}
    ${s.list ? `<ul class="list-check">${s.list.map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
    ${s.bad ? promptBox(s.bad, { bad: true }) : ''}
    ${s.prompt ? promptBox(s.prompt, { label: s.bad ? t('lesson.strong') : t('lesson.example') }) : ''}
  </div>`;
}

function asideHtml(lesson, current, maxSeen) {
  const items = [...lesson.steps.map((s) => s.title), t('lesson.practiceTitle')];
  return `<nav class="lesson-aside" aria-label="${esc(t('lesson.steps'))}"><ol>
    ${items.map((title, i) => `<li><button type="button" data-step="${i}"${i === current ? ' aria-current="step"' : ''} class="${i <= maxSeen ? 'seen' : ''}">
      <span class="dot" aria-hidden="true">${i < maxSeen || (i <= maxSeen && i !== current) ? '✓' : i + 1}</span><span class="step-title">${esc(title)}</span>
      <span class="visually-hidden">${esc(t('lesson.stepOf', { n: i + 1, total: items.length }))}</span></button></li>`).join('')}
  </ol></nav>`;
}

function navHtml(lesson, i) {
  const last = lesson.steps.length;
  const done = lessonStatus(lesson) === 'done';
  return `<div class="step-nav">
    <button class="btn btn-ghost" type="button" data-go="${i - 1}"${i === 0 ? ' disabled' : ''}>${icon('arrowLeft')}${esc(t('action.back'))}</button>
    <span class="muted small" id="save-status" aria-live="polite" style="align-self:center"></span>
    ${i < last
      ? `<button class="btn btn-primary" type="button" data-go="${i + 1}">${esc(t('action.next'))}${icon('arrowRight')}</button>`
      : done
        ? `<span class="btn-row"><a class="btn" href="/practice?topic=${esc(lesson.direction)}">${esc(t('lesson.toPractice'))}</a><a class="btn btn-primary" href="/lessons">${esc(t('lesson.toLessons'))}${icon('arrowRight')}</a></span>`
        : `<button class="btn btn-primary" type="button" data-complete>${icon('check')}${esc(t('lesson.complete'))}</button>`}
  </div>`;
}

export default {
  title: ({ params }) => ctx?.lesson?.title || t('nav.lessons'),
  async render({ params, query }) {
    const [lessons, directions] = await Promise.all([content('lessons'), content('directions')]);
    const lesson = lessons.find((l) => l.id === params.id);
    if (!lesson) {
      ctx = null;
      return `<div class="wrap page">${emptyState({ title: t('empty.lessonMissing'), text: t('empty.lessonMissingText'), action: `<a class="btn" href="/lessons">${esc(t('lesson.toLessons'))}</a>`, iconName: 'flag' })}</div>`;
    }
    const saved = state.progress.get(`lesson:${lesson.id}`);
    const total = lesson.steps.length;
    const startAt = query.get('step') !== null ? Math.min(total, Math.max(0, Number(query.get('step')) || 0)) : Math.min(total, saved?.step || 0);
    let promptCats = [];
    try {
      const [pIndex, pNames] = await Promise.all([fetch('/content/prompts/index.json').then((r) => r.json()), content('prompts/index')]);
      promptCats = pIndex.categories.filter((c) => c.lesson === lesson.id && c.prompts).map((c) => ({ id: c.id, name: pNames.categories[c.id] }));
    } catch { /* links to prompts are optional */ }
    ctx = { promptCats, lesson, step: startAt, maxSeen: Math.max(startAt, saved?.completed ? total : saved?.step || 0), directions };
    const dir = directions[lesson.direction];

    return `
    <div class="page-head"><div class="wrap">
      <a href="/lessons?dir=${esc(lesson.direction)}" class="small" style="display:inline-flex;gap:.35rem;align-items:center;margin-bottom:1rem">${icon('arrowLeft').replace('<svg', '<svg style="width:16px;height:16px"')}${esc(dir?.name || t('nav.lessons'))}</a>
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start">
        <h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem);max-width:22ch">${esc(lesson.title)}</h1>
        ${state.user ? favButton(`lesson:${lesson.id}`, lesson.title) : ''}
      </div>
      <div class="meta" style="margin:.25rem 0 1rem"><span>${icon(directionIcon[lesson.direction])}${esc(dir?.name || '')}</span>${timeMeta(lesson)}<span>${levelBars(lesson.level)}</span></div>
      <p class="goal" style="border-left:3px solid var(--saffron);padding-left:1rem"><strong>${esc(t('lesson.goal'))}:</strong> ${esc(lesson.goal)}</p>
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      ${!state.user ? `<div class="notice info" style="margin-bottom:1.5rem">${icon('info')}<div><p>${esc(t('lesson.guest'))} <a href="/login?next=${encodeURIComponent(location.pathname)}">${esc(t('nav.login'))}</a></p><p class="small">${esc(t('guest.storage'))}</p></div></div>` : ''}
      ${reviewNote()}
      ${saved?.completed ? `<div class="notice info" style="margin-bottom:1.5rem">${icon('checkCircle')}<div><p>${esc(t('lesson.alreadyDone'))} <button class="btn btn-ghost btn-sm" type="button" data-reset-progress>${esc(t('lesson.restart'))}</button></p></div></div>` : ''}
      <div class="lesson-layout">
        <div id="lesson-aside">${asideHtml(lesson, ctx.step, ctx.maxSeen)}</div>
        <div class="lesson-body"><div id="step">${stepHtml(lesson, ctx.step)}</div><div id="step-nav">${navHtml(lesson, ctx.step)}</div></div>
      </div>
    </div>`;
  },
  mount(el, { rerender }) {
    if (!ctx) return null;
    const { lesson } = ctx;
    recordView(`lesson:${lesson.id}`);
    const itemId = `lesson:${lesson.id}`;

    const show = async (i) => {
      ctx.step = i;
      ctx.maxSeen = Math.max(ctx.maxSeen, i);
      el.querySelector('#step').innerHTML = stepHtml(lesson, i);
      el.querySelector('#step-nav').innerHTML = navHtml(lesson, i);
      el.querySelector('#lesson-aside').innerHTML = asideHtml(lesson, i, ctx.maxSeen);
      el.querySelector('#step h2')?.setAttribute('tabindex', '-1');
      el.querySelector('#step h2')?.focus({ preventScroll: true });
      el.querySelector('.lesson-layout').scrollIntoView({ block: 'start' });
      history.replaceState({}, '', `/lessons/${lesson.id}?step=${i}`);
      if (state.user && !state.progress.get(itemId)?.completed) {
        const status = el.querySelector('#save-status');
        try {
          await setProgress(itemId, { step: i });
          if (status) status.textContent = t('lesson.saved');
        } catch (err) {
          if (status) status.textContent = '';
          toast(errorText(err), 'error');
        }
      }
    };

    const onClick = async (e) => {
      const go = e.target.closest('[data-go]') || e.target.closest('[data-step]');
      if (go && !go.disabled) { show(Number(go.dataset.go ?? go.dataset.step)); return; }
      const complete = e.target.closest('[data-complete]');
      if (complete) {
        if (!state.user) {
          toast(t('lesson.loginToSave'), 'error');
          return;
        }
        complete.setAttribute('aria-busy', 'true');
        try {
          await setProgress(itemId, { step: lesson.steps.length, completed: true });
          toast(t('toast.lessonDone'));
          el.querySelector('#step-nav').innerHTML = navHtml(lesson, ctx.step);
        } catch (err) {
          complete.removeAttribute('aria-busy');
          toast(errorText(err), 'error');
        }
      }
      if (e.target.closest('[data-reset-progress]')) {
        try { await resetProgress(itemId); toast(t('toast.progressReset')); history.replaceState({}, '', `/lessons/${lesson.id}`); rerender(); }
        catch (err) { toast(errorText(err), 'error'); }
      }
    };
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight' && ctx.step < lesson.steps.length) show(ctx.step + 1);
      if (e.key === 'ArrowLeft' && ctx.step > 0) show(ctx.step - 1);
    };
    el.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    const unFav = bindFavorites(el);
    const unPb = bindPromptBoxes(el);
    return () => { el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); unFav(); unPb(); };
  },
};
