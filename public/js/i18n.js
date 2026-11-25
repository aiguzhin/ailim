// Interface translations and per-language content.
// To add a language: add it to /content/languages.json, then create
// /i18n/<code>.json and /content/<code>/*.json with the same keys and IDs as Russian.

let languages = [];
let dict = {};
let fallback = {};
let current = 'ru';
const contentCache = new Map();

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export async function initI18n() {
  languages = await getJSON('/content/languages.json');
  fallback = await getJSON('/i18n/ru.json');
  const saved = safeGet('lang');
  const browser = (navigator.language || 'ru').slice(0, 2);
  const wanted = saved || (browser === 'kk' ? 'kk' : browser === 'en' ? 'en' : 'ru');
  await setLang(wanted, { persist: false });
}

export async function setLang(code, { persist = true } = {}) {
  if (!languages.some((l) => l.code === code)) code = 'ru';
  dict = code === 'ru' ? fallback : await getJSON(`/i18n/${code}.json`);
  current = code;
  document.documentElement.lang = code;
  if (persist) safeSet('lang', code);
  return code;
}

export const lang = () => current;
export const getLanguages = () => languages;

/** t('key', {n: 3}) — replaces {n}. Falls back to Russian, then to the key itself. */
export function t(key, vars) {
  let s = dict[key] ?? fallback[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Simple plural helper using Intl.PluralRules; keys like "x.one", "x.few", "x.many", "x.other". */
export function tp(key, n) {
  const rule = new Intl.PluralRules(current).select(n);
  const k = dict[`${key}.${rule}`] !== undefined ? `${key}.${rule}` : `${key}.other`;
  return t(k, { n });
}

/** Loads /content/<lang>/<name>.json, cached per language. */
export async function content(name) {
  const key = `${current}/${name}`;
  if (!contentCache.has(key)) contentCache.set(key, getJSON(`/content/${current}/${name}.json`).catch((e) => { contentCache.delete(key); throw e; }));
  return contentCache.get(key);
}

export function formatDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const locale = current === 'kk' ? 'kk-KZ' : current === 'en' ? 'en-GB' : 'ru-RU';
  return new Intl.DateTimeFormat(locale, opts).format(new Date(iso));
}

function safeGet(k) { try { return localStorage.getItem(`ailim.${k}`); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(`ailim.${k}`, v); } catch { /* ignore */ } }
export { safeGet, safeSet };
