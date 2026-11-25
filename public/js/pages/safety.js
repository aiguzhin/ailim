import { t, content } from '../i18n.js';
import { icon } from '../icons.js';
import { esc } from '../ui.js';

/** Renders a text page from /content/<lang>/pages.json (used by Safety and Privacy). */
export function textPage(key, iconNames = []) {
  return {
    title: () => t(`nav.${key}`),
    async render() {
      const page = (await content('pages'))[key];
      return `
      <div class="page-head"><div class="wrap">
        <span class="eyebrow">${esc(page.eyebrow)}</span>
        <h1>${esc(page.title)}</h1>
        <p>${esc(page.lead)}</p>
      </div></div>
      <div class="wrap" style="padding-bottom:4rem">
        <div class="grid grid-2">
          ${page.sections.map((s, i) => `<section class="card reveal" aria-labelledby="sec-${i}">
            <div class="card-icon">${icon(iconNames[i] || 'info')}</div>
            <h2 id="sec-${i}" style="font-size:1.25rem">${esc(s.title)}</h2>
            ${s.text ? `<p>${esc(s.text)}</p>` : ''}
            ${s.items ? `<ul class="list-check" style="margin:0">${s.items.map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
          </section>`).join('')}
        </div>
        ${page.footer ? `<p class="muted" style="margin-top:2rem;max-width:70ch">${esc(page.footer)}</p>` : ''}
      </div>`;
    },
  };
}

export default textPage('safety', ['lock', 'alert', 'study', 'image', 'shield', 'user']);
