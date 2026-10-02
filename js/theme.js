// Selector de tema: claro u oscuro. Mientras la persona no elija, la página sigue al dispositivo;
// cuando elige, se recuerda en este navegador.
(function () {
  var root = document.documentElement;
  var picker = document.querySelector('.theme-switch');
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  var COLORS = { light: '#FFF7F9', dark: '#1C1217' };
  if (!picker) return;
  var options = Array.prototype.slice.call(picker.querySelectorAll('[data-theme-mode]'));

  function currentTheme() { return root.dataset.theme || (systemDark.matches ? 'dark' : 'light'); }

  function syncUi() {
    var mode = currentTheme();
    picker.setAttribute('data-mode', mode);
    options.forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-theme-mode') === mode)); });
    if (themeColor) themeColor.setAttribute('content', COLORS[currentTheme()]);
  }

  function choose(mode) {
    root.dataset.theme = mode;
    try { localStorage.setItem('astra-theme', mode); } catch (e) {}
    syncUi();
  }

  options.forEach(function (b) {
    b.addEventListener('click', function () { choose(b.getAttribute('data-theme-mode')); });
  });
  // Flechas del teclado para moverse entre las dos opciones (como un grupo de radio)
  picker.addEventListener('keydown', function (e) {
    var i = options.indexOf(document.activeElement);
    if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault();
    var next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
    next.focus();
    choose(next.getAttribute('data-theme-mode'));
  });

  systemDark.addEventListener('change', syncUi);
  syncUi();
})();

// Encabezado flotante: vidrio transparente con textos claros mientras está sobre la foto del inicio
(function () {
  var header = document.querySelector('.site-header--floating');
  var hero = document.querySelector('.hero');
  if (!header || !hero) return;
  var bar = header.querySelector('.site-header__inner'), queued = false;
  function update() {
    queued = false;
    header.classList.toggle('is-over-hero', hero.getBoundingClientRect().bottom > bar.getBoundingClientRect().bottom);
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
