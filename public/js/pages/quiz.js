import { t, content, safeGet, safeSet } from '../i18n.js';
import { state } from '../store.js';
import { icon, directionIcon } from '../icons.js';
import { esc, toast, errorText } from '../ui.js';
import { buildPlan } from '../learn.js';
import { api } from '../api.js';

let quiz; let lessons; let directions;

function questionHtml(i, answers) {
  const q = quiz.questions[i];
  const total = quiz.questions.length;
  const val = answers[q.id];
  const input = q.type === 'multi' ? 'checkbox' : 'radio';
  return `<form id="quiz-form" class="step-panel" novalidate>
    <span class="eyebrow">${esc(t('quiz.question', { n: i + 1, total }))}</span>
    <div class="bar" style="margin-bottom:1.5rem" aria-hidden="true"><i style="--v:${Math.round((i / total) * 100)}%"></i></div>
    <fieldset style="border:0;padding:0;margin:0">
      <legend><h2 style="margin-bottom:.35rem">${esc(q.title)}</h2></legend>
      ${q.hint ? `<p class="muted">${esc(q.hint)}</p>` : ''}
      <div class="grid ${q.type === 'multi' ? 'grid-3' : ''}" style="margin-top:1rem;gap:.5rem">
        ${q.options.map((o) => {
          const checked = q.type === 'multi' ? (val || []).includes(o.value) : val === o.value;
          return `<label class="option check" style="align-items:center"><input type="${input}" name="${q.id}" value="${esc(o.value)}"${checked ? ' checked' : ''}>
            ${q.id === 'goals' ? icon(directionIcon[o.value]).replace('<svg', '<svg style="width:20px;height:20px;color:var(--accent);flex:none"') : ''}<span>${esc(o.label)}</span></label>`;
        }).join('')}
      </div>
    </fieldset>
    <p class="error-text" id="quiz-error" role="alert" style="color:var(--clay);min-height:1.5em;margin-top:.75rem"></p>
    <div class="step-nav">
      <button class="btn btn-ghost" type="button" data-back${i === 0 ? ' disabled' : ''}>${icon('arrowLeft')}${esc(t('action.back'))}</button>
      <button class="btn btn-primary" type="submit">${esc(i === total - 1 ? t('quiz.finish') : t('action.next'))}${icon('arrowRight')}</button>
    </div>
  </form>`;
}

function resultHtml(answers, planIds) {
  const plan = planIds.map((id) => lessons.find((l) => l.id === id)).filter(Boolean);
  return `<div class="step-panel">
    <span class="eyebrow">${esc(t('quiz.resultEyebrow'))}</span>
    <h2>${esc(t('quiz.resultTitle'))}</h2>
    <p class="muted">${esc(quiz.pace[answers.pace] || '')}</p>
    <ol style="list-style:none;padding:0;margin:1.5rem 0;display:grid;gap:.6rem">
      ${plan.map((l, i) => `<li class="card" style="flex-direction:row;align-items:center;gap:1rem;padding:.9rem 1rem">
        <span class="demo-num" aria-hidden="true">${i + 1}</span>
        <div style="flex:1"><a href="/lessons/${esc(l.id)}" style="font-weight:600">${esc(l.title)}</a>
        <div class="meta">${esc(directions[l.direction]?.name || '')} · ${esc(t('time.lesson', { n: l.minutes }))} · ${esc(t('time.task', { n: l.taskMinutes }))}</div></div></li>`).join('')}
    </ol>
    ${state.user
      ? `<div class="notice info">${icon('checkCircle')}<div><p>${esc(t('quiz.savedToProfile'))}</p></div></div>`
      : `<div class="notice info">${icon('info')}<div><p>${esc(t('quiz.guestSave'))}</p><p><a class="btn btn-primary btn-sm" href="/register">${esc(t('nav.register'))}</a></p></div></div>`}
    <div class="step-nav">
      <button class="btn btn-ghost" type="button" data-restart>${icon('refresh')}${esc(t('quiz.restart'))}</button>
      ${plan[0] ? `<a class="btn btn-primary" href="/lessons/${esc(plan[0].id)}">${esc(t('quiz.startFirst'))}${icon('arrowRight')}</a>` : ''}
    </div>
  </div>`;
}

export default {
  title: () => t('nav.start'),
  async render() {
    [quiz, lessons, directions] = await Promise.all([content('quiz'), content('lessons'), content('directions')]);
    const existing = state.user?.plan;
    return `
    <div class="page-head"><div class="narrow">
      <span class="eyebrow">${esc(t('quiz.eyebrow'))}</span>
      <h1>${esc(t('quiz.title'))}</h1>
      <p>${esc(t('quiz.lead'))}</p>
    </div></div>
    <div class="narrow" style="padding-bottom:4rem" id="quiz-root">
      ${existing ? `<div class="notice info" style="margin-bottom:1.5rem">${icon('route')}<div><p>${esc(t('quiz.hasPlan'))} <a href="/account">${esc(t('nav.account'))}</a></p></div></div>` : ''}
      ${questionHtml(0, {})}
    </div>`;
  },
  mount(el) {
    const root = el.querySelector('#quiz-root');
    const answers = {};
    let i = 0;
    const show = () => { root.innerHTML = questionHtml(i, answers); root.querySelector('h2')?.setAttribute('tabindex', '-1'); root.querySelector('h2')?.focus(); };

    const finish = async () => {
      const ids = buildPlan(lessons, answers);
      const plan = { goals: answers.goals, level: answers.experience, lessons: ids };
      if (state.user) {
        try { const { user } = await api('/me', { method: 'PATCH', body: { plan } }); state.user = user; toast(t('toast.planSaved')); }
        catch (err) { toast(errorText(err), 'error'); }
      } else {
        safeSet('plan', JSON.stringify(plan));
      }
      root.innerHTML = resultHtml(answers, ids);
      root.querySelector('h2')?.setAttribute('tabindex', '-1');
      root.querySelector('h2')?.focus();
    };

    root.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = quiz.questions[i];
      const form = new FormData(e.target);
      const values = form.getAll(q.id);
      if (!values.length) { root.querySelector('#quiz-error').textContent = t('quiz.required'); return; }
      answers[q.id] = q.type === 'multi' ? values : values[0];
      if (i < quiz.questions.length - 1) { i += 1; show(); } else finish();
    });
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-back]') && i > 0) { i -= 1; show(); }
      if (e.target.closest('[data-restart]')) { i = 0; Object.keys(answers).forEach((k) => delete answers[k]); show(); }
    });
    return null;
  },
};

/** After sign-in, move a plan made as a guest into the account. */
export async function adoptGuestPlan() {
  const raw = safeGet('plan');
  if (!raw || !state.user || state.user.plan) return;
  try {
    const { user } = await api('/me', { method: 'PATCH', body: { plan: JSON.parse(raw) } });
    state.user = user;
    localStorage.removeItem('ailim.plan');
  } catch { /* keep it for the next attempt */ }
}
