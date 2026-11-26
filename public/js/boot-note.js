// If the app hasn't rendered within 3 seconds, explain the delay in the visitor's language
// instead of showing a silent skeleton (e.g. while the server starts after idle time).
(function () {
  var texts = {
    ru: 'Загружаем сайт… Если сайт давно не открывали, первый запуск может занять до минуты.',
    en: 'Loading… If the site hasn’t been opened for a while, the first start can take up to a minute.',
    kk: 'Сайт жүктелуде… Сайт ұзақ уақыт ашылмаса, алғашқы іске қосу бір минутқа дейін созылуы мүмкін.'
  };
  var lang = 'ru';
  try { lang = localStorage.getItem('ailim.lang') || (navigator.language || 'ru').slice(0, 2); } catch (e) { /* default */ }
  setTimeout(function () {
    var app = document.getElementById('app');
    var note = document.getElementById('boot-note');
    if (note && app && app.getAttribute('aria-busy') === 'true') {
      note.textContent = texts[lang] || texts.ru;
      note.hidden = false;
    }
  }, 3000);
})();
