import { t, tp, content } from '../i18n.js';
import { state } from '../store.js';
import { icon, directionIcon } from '../icons.js';
import { esc } from '../ui.js';
import { lessonCard, nextLesson } from '../learn.js';
import { bindFavorites } from '../favorites.js';

const POPULAR = ['first-prompt', 'study-tutor', 'writing-edit', 'slides-outline'];

function personalBlock(lessons) {
  if (!state.user) return '';
  const next = nextLesson(lessons);
  const name = esc(state.user.name);
  if (!next) {
    return `<section class="section" style="padding:2rem 0"><div class="wrap"><div class="continue">
      <div><span class="eyebrow">${esc(t('home.personal.eyebrow', { name }))}</span><h3>${esc(t('home.personal.allDone'))}</h3></div>
      <a class="btn" href="/practice">${esc(t('nav.practice'))}${icon('arrowRight')}</a></div></div></section>`;
  }
  const { lesson, reason } = next;
  return `<section class="section" style="padding:2rem 0" aria-labelledby="next-title"><div class="wrap"><div class="continue reveal">
    <div><span class="eyebrow">${esc(t('home.personal.eyebrow', { name }))}</span>
      <h3 id="next-title" style="margin-bottom:.25rem">${esc(lesson.title)}</h3>
      <p class="muted small" style="margin:0">${esc(t(`home.personal.${reason}`))}</p></div>
    <a class="btn btn-primary" href="/lessons/${esc(lesson.id)}">${esc(reason === 'continue' ? t('action.continue') : t('action.start'))}${icon('arrowRight')}</a>
  </div></div></section>`;
}

export default {
  title: () => t('meta.tagline'),
  async render() {
    const [lessons, directions, toolText] = await Promise.all([content('lessons'), content('directions'), content('tools')]);
    const toolBase = await (await fetch('/content/tools.json')).json();
    const popular = POPULAR.map((id) => lessons.find((l) => l.id === id)).filter(Boolean);
    const startHref = state.user?.plan ? '/lessons' : '/start';
    const counts = Object.fromEntries(Object.keys(directions).map((d) => [d, lessons.filter((l) => l.direction === d).length]));

    return `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <span class="eyebrow">${esc(t('home.eyebrow'))}</span>
          <h1>${t('home.title')}</h1>
          <p class="lead">${esc(t('home.lead'))}</p>
          <div class="btn-row">
            <a class="btn btn-primary" href="${startHref}">${esc(t('home.ctaStart'))}${icon('arrowRight')}</a>
            <a class="btn" href="#directions">${esc(t('home.ctaDirection'))}</a>
          </div>
          <div class="hero-note">
            <span>${icon('clock')}${esc(t('home.note.pace'))}</span>
            <span>${icon('checkCircle')}${esc(t('home.note.free'))}</span>
            <span>${icon('shield')}${esc(t('home.note.safe'))}</span>
          </div>
        </div>
        <figure class="demo" aria-label="${esc(t('home.demo.label'))}" style="margin:0">
          <div class="demo-row on"><span class="demo-num">1</span><div><div class="demo-label">${esc(t('home.demo.before'))}</div><div class="demo-prompt bad">${esc(t('home.demo.bad'))}</div></div></div>
          <div class="demo-row on"><span class="demo-num">2</span><div><div class="demo-label">${esc(t('home.demo.after'))}</div><div class="demo-prompt">${t('home.demo.good')}</div></div></div>
          <div class="demo-row"><span class="demo-num">3</span><div><div class="demo-label">${esc(t('home.demo.check'))}</div><div class="muted small">${esc(t('home.demo.checkText'))}</div></div></div>
          <figcaption class="demo-foot"><span>${esc(t('home.demo.progress'))}</span><span class="bar" aria-hidden="true"><i style="--v:66%"></i></span><span>2/3</span></figcaption>
        </figure>
      </div>
    </section>

    ${personalBlock(lessons)}

    <section class="section" id="directions" aria-labelledby="dir-title">
      <div class="wrap">
        <div class="section-head"><div><span class="eyebrow">${esc(t('home.dir.eyebrow'))}</span><h2 id="dir-title">${esc(t('home.dir.title'))}</h2></div>
          <a href="/lessons">${esc(t('home.dir.all'))}</a></div>
        <div class="directions reveal">
          ${Object.entries(directions).map(([id, d]) => `<a class="direction" href="/lessons?dir=${id}">${icon(directionIcon[id])}<span><b>${esc(d.name)}</b><small>${esc(counts[id] ? tp('unit.lessons', counts[id]) : d.desc)}</small></span></a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="pop-title">
      <div class="wrap">
        <div class="section-head"><div><span class="eyebrow">${esc(t('home.pop.eyebrow'))}</span><h2 id="pop-title">${esc(t('home.pop.title'))}</h2></div>
          <a href="/lessons">${esc(t('home.pop.all'))}</a></div>
        <div class="grid grid-4">${popular.map((l) => lessonCard(l, directions)).join('')}</div>
      </div>
    </section>

    <section class="section" aria-labelledby="how-title">
      <div class="wrap">
        <span class="eyebrow">${esc(t('home.how.eyebrow'))}</span>
        <h2 id="how-title" style="margin-bottom:2rem">${esc(t('home.how.title'))}</h2>
        <div class="how">
          ${[1, 2, 3].map((n) => `<div class="reveal"><span class="n">0${n}</span><h3>${esc(t(`home.how.${n}.title`))}</h3><p class="muted">${esc(t(`home.how.${n}.text`))}</p></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="tools-title">
      <div class="wrap">
        <div class="section-head"><div><span class="eyebrow">${esc(t('home.tools.eyebrow'))}</span><h2 id="tools-title">${esc(t('home.tools.title'))}</h2></div>
          <a href="/catalog">${esc(t('home.tools.all', { n: toolBase.tools.length }))}</a></div>
        <div class="grid grid-3">
          ${toolBase.categories.map((c) => {
            const items = toolBase.tools.filter((x) => x.category === c);
            return `<a class="card link-card reveal" href="/catalog?cat=${c}" style="text-decoration:none;color:inherit">
              <div class="card-icon">${icon(directionIcon[c] || 'chat')}</div>
              <h3>${esc(toolText.categories[c])}</h3>
              <p>${esc(items.map((x) => x.name).join(' · '))}</p></a>`;
          }).join('')}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="safe-title">
      <div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:2rem;align-items:center">
        <div><span class="eyebrow">${esc(t('home.safe.eyebrow'))}</span><h2 id="safe-title">${esc(t('home.safe.title'))}</h2>
          <p class="muted">${esc(t('home.safe.text'))}</p><a class="btn" href="/safety">${icon('shield')}${esc(t('home.safe.cta'))}</a></div>
        <ul class="list-check reveal">
          ${[1, 2, 3, 4].map((n) => `<li>${icon('check')}<span>${esc(t(`home.safe.${n}`))}</span></li>`).join('')}
        </ul>
      </div>
    </section>`;
  },
  mount(el) { return bindFavorites(el); },
};
