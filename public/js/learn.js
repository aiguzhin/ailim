// Learning helpers shared by pages: lesson status, next step, achievements, cards.
import { state } from './store.js';
import { t } from './i18n.js';
import { icon, directionIcon } from './icons.js';
import { esc, levelBars } from './ui.js';

export function lessonStatus(lesson) {
  const p = state.progress.get(`lesson:${lesson.id}`);
  if (!p) return 'new';
  return p.completed ? 'done' : 'started';
}

/** Suggests the lesson to continue or start next. */
export function nextLesson(lessons) {
  const started = [...state.progress.entries()]
    .filter(([id, p]) => id.startsWith('lesson:') && !p.completed)
    .sort((a, b) => new Date(b[1].updatedAt) - new Date(a[1].updatedAt));
  if (started.length) {
    const l = lessons.find((x) => `lesson:${x.id}` === started[0][0]);
    if (l) return { lesson: l, reason: 'continue' };
  }
  const plan = state.user?.plan?.lessons || [];
  for (const id of plan) {
    const l = lessons.find((x) => x.id === id);
    if (l && lessonStatus(l) !== 'done') return { lesson: l, reason: 'plan' };
  }
  const l = lessons.find((x) => lessonStatus(x) !== 'done');
  return l ? { lesson: l, reason: 'next' } : null;
}

/** Builds a learning plan from diagnostic answers. */
export function buildPlan(lessons, { goals = [], experience = 'new' }) {
  const ids = [];
  if (experience !== 'regular') ids.push('first-prompt');
  ids.push('check-answers');
  const chosen = lessons.filter((l) => goals.includes(l.direction)).sort((a, b) => a.level - b.level);
  for (const l of chosen) if (!ids.includes(l.id)) ids.push(l.id);
  if (experience === 'regular' && !ids.includes('first-prompt')) ids.push('first-prompt');
  return ids.slice(0, 8);
}

export function achievements(lessons, tasks) {
  const doneLessons = lessons.filter((l) => lessonStatus(l) === 'done');
  const doneTasks = tasks.filter((x) => state.progress.get(`task:${x.id}`)?.completed);
  const dirs = new Set(doneLessons.map((l) => l.direction));
  return [
    { id: 'first', earned: doneLessons.length >= 1 },
    { id: 'three', earned: doneLessons.length >= 3 },
    { id: 'basics', earned: ['first-prompt', 'check-answers'].every((id) => lessons.some((l) => l.id === id && lessonStatus(l) === 'done')) },
    { id: 'practice', earned: doneTasks.length >= 3 },
    { id: 'explorer', earned: dirs.size >= 4 },
    { id: 'plan', earned: Boolean(state.user?.plan) },
    { id: 'collector', earned: state.favorites.size >= 5 },
    { id: 'all', earned: lessons.length > 0 && doneLessons.length === lessons.length },
  ];
}

export function favButton(itemId, name) {
  const on = state.favorites.has(itemId);
  return `<button class="icon-btn fav-btn" type="button" data-fav="${esc(itemId)}" aria-pressed="${on}"
    aria-label="${esc(t('fav.label', { name }))}" title="${esc(on ? t('fav.removeShort') : t('fav.addShort'))}">${icon('bookmark')}</button>`;
}

export function statusTag(lesson) {
  const s = lessonStatus(lesson);
  if (s === 'done') return `<span class="tag done">${icon('check')}${esc(t('status.done'))}</span>`;
  if (s === 'started') return `<span class="tag progress">${esc(t('status.started'))}</span>`;
  return '';
}

/** Reading time and practice-task time shown separately, so titles and durations never contradict. */
export function timeMeta(lesson) {
  return `<span title="${esc(t('time.lessonHint'))}">${icon('clock')}${esc(t('time.lesson', { n: lesson.minutes }))}</span>`
    + (lesson.taskMinutes ? `<span title="${esc(t('time.taskHint'))}">${icon('flag')}${esc(t('time.task', { n: lesson.taskMinutes }))}</span>` : '');
}

export function lessonCard(lesson, directions, { reveal = true } = {}) {
  const dir = directions[lesson.direction];
  return `<article class="card link-card${reveal ? ' reveal' : ''}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
      <div class="card-icon">${icon(directionIcon[lesson.direction] || 'basics')}</div>
      ${statusTag(lesson)}
    </div>
    <span class="small muted">${esc(dir?.name || '')}</span>
    <h3><a href="/lessons/${esc(lesson.id)}">${esc(lesson.title)}</a></h3>
    <p>${esc(lesson.summary)}</p>
    <div class="card-foot">
      <div class="meta">${timeMeta(lesson)}<span>${levelBars(lesson.level)}</span></div>
      ${state.user ? favButton(`lesson:${lesson.id}`, lesson.title) : ''}
    </div>
  </article>`;
}
