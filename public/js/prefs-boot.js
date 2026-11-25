// Runs before first paint: applies saved theme, text size, motion and language to avoid a flash.
(function () {
  try {
    var root = document.documentElement;
    var get = function (k) { return localStorage.getItem('ailim.' + k); };
    var theme = get('theme') || 'system';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.size = get('textSize') || 'm';
    var motion = get('motion');
    if (motion && motion !== 'system') root.dataset.motion = motion;
    var lang = get('lang');
    if (lang) root.lang = lang;
  } catch (e) { /* storage unavailable: defaults apply */ }
})();
