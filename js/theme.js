// Botón de tema claro/oscuro.
// Por defecto la página sigue el tema del dispositivo; si la persona elige uno, se recuerda.
(function () {
  var root = document.documentElement;
  var button = document.querySelector('.theme-toggle');
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  var COLORS = { light: '#FFF7F9', dark: '#1C1217' };

  function currentTheme() {
    return root.dataset.theme || (systemDark.matches ? 'dark' : 'light');
  }

  function syncUi() {
    var theme = currentTheme();
    button.setAttribute('aria-label', theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro');
    if (themeColor) themeColor.setAttribute('content', COLORS[theme]);
  }

  button.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('astra-theme', next); } catch (e) {}
    syncUi();
  });

  systemDark.addEventListener('change', syncUi);
  syncUi();
})();
