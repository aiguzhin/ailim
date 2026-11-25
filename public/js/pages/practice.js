import { t, content } from '../i18n.js';
import { state, setProgress } from '../store.js';
import { icon } from '../icons.js';
import { esc, levelBars, emptyState, toast, errorText, copyText, debounce, observeReveal } from '../ui.js';

let tasks; let directions;

const isDone = (task) => Boolean(state.progress.get(`task:${task.id}`)?.completed);

function taskHtml(task) {
  const done = isDone(task);
  const head = `<div style="display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start">
      <div><span class="small muted">${esc(directions[task.topic]?.name || '')} · ${esc(t(`practice.type.${task.type}`))}</span><h3 style="margin-top:.2rem">${esc(task.title)}</h3></div>
      ${done ? `<span class="tag done">${icon('check')}${esc(t('status.done'))}</span>` : ''}</div>`;
  const hint = `<details class="hint"><summary>${esc(t('practice.hint'))}</summary><p class="small">${esc(task.hint)}</p></details>`;

  if (task.type === 'choice') {
    return `<article class="card task reveal" id="task-${esc(task.id)}" data-task="${esc(task.id)}">
      ${head}<p style="color:var(--ink)">${esc(task.question)}</p>
      <div class="options" role="group" aria-label="${esc(t('practice.options'))}">
        ${task.options.map((o, i) => `<button class="option" type="button" data-option="${i}">${esc(o.text)}</button>`).join('')}
      </div>
      <div class="feedback" aria-live="polite"></div>
      ${hint}
      <div class="meta">${levelBars(task.level)}</div>
    </article>`;
  }
  return `<article class="card task reveal" id="task-${esc(task.id)}" data-task="${esc(task.id)}">
    ${head}<p style="color:var(--ink)">${esc(task.question)}</p>
    <div class="field" style="margin:0"><label for="ans-${esc(task.id)}">${esc(t('practice.yourPrompt'))}</label>
      <textarea id="ans-${esc(task.id)}" placeholder="${esc(task.placeholder || '')}" data-answer></textarea>
      <span class="hint">${esc(t('practice.privateNote'))}</span></div>
    <fieldset style="border:0;padding:0;margin:0"><legend class="label small" style="margin-bottom:.3rem">${esc(t('practice.selfCheck'))}</legend>
      ${task.checklist.map((c, i) => `<label class="check small"><input type="checkbox" data-check="${i}"><span>${esc(c)}</span></label>`).join('')}
    </fieldset>
    ${hint}
    <details class="hint"><summary>${esc(t('practice.sample'))}</summary>
      <div class="prompt-box" style="margin:.4rem 0 0"><header><span>${esc(t('practice.sampleLabel'))}</span><button class="btn btn-ghost btn-sm" type="button" data-copy-sample>${icon('copy')}${esc(t('action.copy'))}</button></header><pre>${esc(task.sample)}</pre></div></details>
    <div class="card-foot">
      <div class="meta">${levelBars(task.level)}</div>
      <button class="btn btn-primary btn-sm" type="button" data-finish disabled>${icon('check')}${esc(done ? t('practice.doneAgain') : t('practice.markDone'))}</button>
    </div>
  </article>`;
}

async function markDone(task, card) {
  if (!state.user) { toast(t('practice.loginToSave'), 'error'); return; }
  try {
    await setProgress(`task:${task.id}`, { step: 1, completed: true });
    toast(t('toast.taskDone'));
    const head = card.querySelector('h3')?.parentElement?.parentElement;
    if (head && !head.querySelector('.tag.done')) head.insertAdjacentHTML('beforeend', `<span class="tag done">${icon('check')}${esc(t('status.done'))}</span>`);
  } catch (err) { toast(errorText(err), 'error'); }
}

export default {
  title: () => t('nav.practice'),
  async render({ query }) {
    [tasks, directions] = await Promise.all([content('practice'), content('directions')]);
    const topics = [...new Set(tasks.map((x) => x.topic))];
    const done = tasks.filter(isDone).length;
    return `
    <div class="page-head"><div class="wrap">
      <span class="eyebrow">${esc(t('practice.eyebrow'))}</span>
      <h1>${esc(t('practice.title'))}</h1>
      <p>${esc(t('practice.lead'))}</p>
      ${state.user ? `<p class="small muted" style="margin-top:1rem">${esc(t('practice.doneCount', { n: done, total: tasks.length }))}</p>` : ''}
    </div></div>
    <div class="narrow" style="padding-bottom:4rem">
      ${!state.user ? `<div class="notice info" style="margin-bottom:1.5rem">${icon('info')}<div><p>${esc(t('practice.guest'))} <a href="/login?next=/practice">${esc(t('nav.login'))}</a></p></div></div>` : ''}
      <div class="toolbar">
        <div class="search">${icon('search')}<label class="visually-hidden" for="pr-q">${esc(t('practice.search'))}</label><input id="pr-q" type="search" placeholder="${esc(t('practice.search'))}" autocomplete="off"></div>
        <div class="filters">
          <label class="visually-hidden" for="pr-topic">${esc(t('filter.topic'))}</label>
          <select id="pr-topic"><option value="">${esc(t('filter.anyTopic'))}</option>${topics.map((x) => `<option value="${x}"${query.get('topic') === x ? ' selected' : ''}>${esc(directions[x]?.name || x)}</option>`).join('')}</select>
          <label class="visually-hidden" for="pr-level">${esc(t('filter.level'))}</label>
          <select id="pr-level"><option value="">${esc(t('filter.anyLevel'))}</option>${[1, 2, 3].map((l) => `<option value="${l}">${esc(t(`level.${l}`))}</option>`).join('')}</select>
          ${state.user ? `<label class="visually-hidden" for="pr-status">${esc(t('filter.status'))}</label><select id="pr-status"><option value="">${esc(t('filter.anyStatus'))}</option><option value="todo">${esc(t('filter.status.todo'))}</option><option value="done">${esc(t('filter.status.done'))}</option></select>` : ''}
        </div>
      </div>
      <p class="result-count" id="pr-count" aria-live="polite"></p>
      <div class="grid" id="pr-list"></div>
    </div>`;
  },
  mount(el) {
    const q = el.querySelector('#pr-q'); const topic = el.querySelector('#pr-topic');
    const level = el.querySelector('#pr-level'); const status = el.querySelector('#pr-status');
    const list = el.querySelector('#pr-list'); const count = el.querySelector('#pr-count');

    const update = () => {
      const needle = q.value.trim().toLowerCase();
      const items = tasks.filter((x) => (!topic.value || x.topic === topic.value)
        && (!level.value || x.level === Number(level.value))
        && (!status?.value || (status.value === 'done') === isDone(x))
        && (!needle || [x.title, x.question, x.hint].join(' ').toLowerCase().includes(needle)));
      count.textContent = t('practice.count', { n: items.length });
      list.innerHTML = items.length ? items.map(taskHtml).join('') : emptyState({ title: t('empty.tasksTitle'), text: t('empty.tasksText') });
      observeReveal(list);
    };
    [topic, level, status].forEach((s) => s?.addEventListener('change', update));
    q.addEventListener('input', debounce(update));

    el.addEventListener('click', (e) => {
      const card = e.target.closest('[data-task]');
      if (!card) return;
      const task = tasks.find((x) => x.id === card.dataset.task);
      const opt = e.target.closest('[data-option]');
      if (opt && !opt.disabled) {
        const chosen = task.options[Number(opt.dataset.option)];
        const fb = card.querySelector('.feedback');
        if (chosen.correct) {
          card.querySelectorAll('[data-option]').forEach((b, i) => { b.disabled = true; if (task.options[i].correct) b.classList.add('correct'); });
          fb.innerHTML = `<div class="notice info">${icon('checkCircle')}<div><p><strong>${esc(t('practice.correct'))}</strong> ${esc(chosen.why)}</p></div></div>`;
          markDone(task, card);
        } else {
          opt.classList.add('wrong'); opt.disabled = true;
          fb.innerHTML = `<div class="notice warn">${icon('alert')}<div><p><strong>${esc(t('practice.tryAgain'))}</strong> ${esc(chosen.why)}</p></div></div>`;
        }
      }
      if (e.target.closest('[data-copy-sample]')) copyText(task.sample);
      if (e.target.closest('[data-finish]')) markDone(task, card);
    });
    el.addEventListener('input', (e) => {
      const card = e.target.closest('[data-task]');
      if (!card || !card.querySelector('[data-finish]')) return;
      const text = card.querySelector('[data-answer]').value.trim();
      const all = [...card.querySelectorAll('[data-check]')].every((c) => c.checked);
      card.querySelector('[data-finish]').disabled = !(text.length >= 15 && all);
    });
    update();
    return null;
  },
};
