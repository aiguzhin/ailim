// Delegated handler for bookmark buttons ([data-fav]) on any page.
import { toggleFavorite, state } from './store.js';
import { t } from './i18n.js';
import { toast, errorText } from './ui.js';
import { go } from './nav.js';

export function bindFavorites(root) {
  const onClick = async (e) => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    if (!state.user) { go(`/login?next=${encodeURIComponent(location.pathname)}`); return; }
    btn.disabled = true;
    try {
      const on = await toggleFavorite(btn.dataset.fav);
      btn.setAttribute('aria-pressed', String(on));
      btn.title = on ? t('fav.removeShort') : t('fav.addShort');
      toast(on ? t('toast.favAdded') : t('toast.favRemoved'));
    } catch (err) {
      toast(errorText(err), 'error');
    } finally {
      btn.disabled = false;
    }
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
