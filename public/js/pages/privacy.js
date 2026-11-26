import { t, content } from '../i18n.js';
import { api } from '../api.js';
import { icon } from '../icons.js';
import { esc } from '../ui.js';

const ICONS = ['user', 'lock', 'clock', 'download', 'route', 'shield'];

export default {
  title: () => t('nav.privacy'),
  async render() {
    const page = (await content('pages')).privacy;
    let info = { owner: '', contactEmail: '', issuesUrl: '' };
    try { info = await api('/site-info'); } catch { /* the contact block falls back to generic text */ }
    const email = info.contactEmail
      ? `<a href="mailto:${esc(info.contactEmail)}">${esc(info.contactEmail)}</a>`
      : esc(t('privacy.noEmail'));
    return `
    <div class="page-head"><div class="wrap">
      <span class="eyebrow">${esc(page.eyebrow)}</span>
      <h1>${esc(page.title)}</h1>
      <p>${esc(page.lead)}</p>
    </div></div>
    <div class="wrap" style="padding-bottom:4rem">
      <section class="card reveal" aria-labelledby="contact" style="margin-bottom:1.5rem">
        <h2 id="contact" style="font-size:1.25rem">${esc(t('privacy.contactTitle'))}</h2>
        <dl class="contact-list">
          <div><dt>${esc(t('privacy.owner'))}</dt><dd>${esc(info.owner || t('privacy.ownerDefault'))}</dd></div>
          <div><dt>${esc(t('privacy.dataQuestions'))}</dt><dd>${email}</dd></div>
          <div><dt>${esc(t('privacy.bugs'))}</dt><dd>${info.issuesUrl ? `<a href="${esc(info.issuesUrl)}" target="_blank" rel="noopener noreferrer">${esc(t('privacy.bugsLink'))}</a> <span class="small muted">${esc(t('privacy.bugsNote'))}</span>` : '—'}</dd></div>
        </dl>
      </section>
      <div class="grid grid-2">
        ${page.sections.map((s, i) => `<section class="card reveal" aria-labelledby="sec-${i}">
          <div class="card-icon">${icon(ICONS[i] || 'info')}</div>
          <h2 id="sec-${i}" style="font-size:1.25rem">${esc(s.title)}</h2>
          ${s.text ? `<p>${esc(s.text)}</p>` : ''}
          ${s.items ? `<ul class="list-check" style="margin:0">${s.items.map((x) => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
        </section>`).join('')}
      </div>
      <p class="muted small" style="margin-top:2rem">${esc(page.footer || '')}</p>
    </div>`;
  },
};
