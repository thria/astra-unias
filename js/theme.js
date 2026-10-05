// Tema según la hora del día (de quien visita): claro de 7 a 19:59 y oscuro de 20 a 6:59.
// js/boot.js lo aplica antes de pintar; acá se revisa cada minuto para cambiar solo si la página
// queda abierta al llegar las 7 o las 20, y se actualiza el color de la barra del navegador del celular.
(function () {
  var root = document.documentElement;
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var COLORS = { light: '#F8F4EF', dark: '#151211' };
  function apply() {
    var h = new Date().getHours(), mode = (h >= 7 && h < 20) ? 'light' : 'dark';
    if (root.dataset.theme !== mode) root.dataset.theme = mode;
    if (themeColor) themeColor.setAttribute('content', COLORS[mode]);
  }
  apply();
  setInterval(apply, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) apply(); }); // al volver a la pestaña
})();

// Encabezado flotante: vidrio transparente con textos claros mientras está sobre la foto del inicio.
// Además, "cortina": mientras la página sube encima de la portada fija, la portada se oscurece (--cover de 0 a 1).
(function () {
  var header = document.querySelector('.site-header--floating');
  var hero = document.querySelector('.hero');
  var sheet = document.querySelector('.page-sheet');
  if (!header || !hero) return;
  var bar = header.querySelector('.site-header__inner'), queued = false;
  function update() {
    queued = false;
    var edge = sheet ? sheet.getBoundingClientRect().top : hero.getBoundingClientRect().bottom;
    header.classList.toggle('is-over-hero', edge > bar.getBoundingClientRect().bottom);
    var h = window.innerHeight || 1;
    hero.style.setProperty('--cover', Math.min(1, Math.max(0, 1 - edge / h)).toFixed(3));
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
