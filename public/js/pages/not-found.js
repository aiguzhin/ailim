import { t } from '../i18n.js';
import { esc, emptyState } from '../ui.js';

export default {
  title: () => t('notFound.title'),
  async render() {
    return `<div class="narrow page">${emptyState({
      title: t('notFound.title'), text: t('notFound.text'), iconName: 'route',
      action: `<div class="btn-row" style="justify-content:center"><a class="btn btn-primary" href="/">${esc(t('nav.home'))}</a><a class="btn" href="/lessons">${esc(t('nav.lessons'))}</a></div>`,
    })}</div>`;
  },
};
