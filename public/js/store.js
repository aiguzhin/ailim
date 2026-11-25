// App state: the signed-in user and their learning data, plus display preferences.
import { api } from './api.js';
import { safeGet, safeSet } from './i18n.js';

const listeners = new Set();

export const state = {
  user: null,
  progress: new Map(), // itemId -> { step, completed, updatedAt }
  favorites: new Set(),
  history: [],
  loaded: false,
};

export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn(state));

export async function loadMe() {
  try {
    const data = await api('/me');
    applyMe(data);
  } catch {
    // Offline / server down: continue as guest; pages show their own errors when needed.
    applyMe({ user: null });
  }
}

export function applyMe(data) {
  state.user = data.user || null;
  state.progress = new Map((data.progress || []).map((p) => [p.itemId, p]));
  state.favorites = new Set(data.favorites || []);
  state.history = data.history || [];
  state.loaded = true;
  if (state.user) {
    applyPrefs({ theme: state.user.theme, textSize: state.user.textSize, motion: state.user.motion });
  }
  emit();
}

export function clearUser() {
  applyMe({ user: null });
}

// ---------- Preferences (theme, text size, motion) ----------
const media = window.matchMedia('(prefers-color-scheme: dark)');
export function getPrefs() {
  return {
    theme: safeGet('theme') || 'system',
    textSize: safeGet('textSize') || 'm',
    motion: safeGet('motion') || 'system',
  };
}
export function applyPrefs(p) {
  const root = document.documentElement;
  if (p.theme) {
    safeSet('theme', p.theme);
    const dark = p.theme === 'dark' || (p.theme === 'system' && media.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#11181f' : '#f6f4ee');
  }
  if (p.textSize) { safeSet('textSize', p.textSize); root.dataset.size = p.textSize; }
  if (p.motion) {
    safeSet('motion', p.motion);
    if (p.motion === 'system') delete root.dataset.motion; else root.dataset.motion = p.motion;
  }
}
media.addEventListener('change', () => applyPrefs({ theme: getPrefs().theme }));

/** Save preferences locally and, for a signed-in user, in their profile. */
export async function savePrefs(p) {
  applyPrefs(p);
  if (state.user) {
    const { user } = await api('/me', { method: 'PATCH', body: p });
    state.user = user;
    emit();
  }
}

export const reducedMotion = () => {
  const m = document.documentElement.dataset.motion;
  if (m === 'reduce') return true;
  if (m === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// ---------- Learning data ----------
export async function setProgress(itemId, { step = 0, completed = false }) {
  const saved = await api(`/progress/${encodeURIComponent(itemId)}`, { method: 'PUT', body: { step, completed } });
  state.progress.set(itemId, saved);
  emit();
  return saved;
}

export async function resetProgress(itemId) {
  await api(`/progress/${encodeURIComponent(itemId)}`, { method: 'DELETE', body: {} });
  state.progress.delete(itemId);
  emit();
}

export async function toggleFavorite(itemId) {
  const on = !state.favorites.has(itemId);
  await api(`/favorites/${encodeURIComponent(itemId)}`, { method: on ? 'PUT' : 'DELETE', body: {} });
  if (on) state.favorites.add(itemId); else state.favorites.delete(itemId);
  emit();
  return on;
}

export function recordView(itemId) {
  if (!state.user) return;
  api('/history', { method: 'POST', body: { itemId } })
    .then(() => {
      state.history = [{ itemId, viewedAt: new Date().toISOString() }, ...state.history.filter((h) => h.itemId !== itemId)];
    })
    .catch(() => { /* history is best-effort */ });
}

export const isDone = (itemId) => Boolean(state.progress.get(itemId)?.completed);
