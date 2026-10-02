// Cinemática de apertura (index.html). Archivo aparte para que la política de seguridad no tenga que permitir scripts incrustados.

// La cinemática espera a que la página esté lista (logo cargado y la web terminada de cargar, como mucho 3 s)
// para verse completa y fluida incluso en celulares lentos. Mientras tanto se ve solo el fondo suave.
// Se saltea con un clic, un toque o cualquier tecla; al terminar se quita del documento.
(function () {
  var intro = document.querySelector('.intro'), root = document.documentElement;
  if (!intro || root.classList.contains('no-intro')) return;
  var started = false, logoReady = false, pageReady = false;
  function start() {
    if (started) return;
    started = true;
    // dos cuadros de espera: el navegador ya pintó todo antes de arrancar las animaciones
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('intro-hold'); }); });
  }
  function check() { if (logoReady && pageReady) start(); }
  var logo = new Image();
  logo.onload = logo.onerror = function () {
    if (logo.decode) logo.decode().then(go, go); else go();
    function go() { logoReady = true; check(); }
  };
  logo.src = 'img/logo-astra.png';
  if (document.readyState === 'complete') pageReady = true;
  else window.addEventListener('load', function () { pageReady = true; check(); });
  setTimeout(start, 3000); // tope: nunca hace esperar más de 3 s
  check();

  function skip() { started = true; root.classList.remove('intro-hold'); root.classList.add('intro-skip'); off(); }
  function off() { intro.removeEventListener('click', skip); document.removeEventListener('keydown', skip); }
  intro.addEventListener('click', skip);
  document.addEventListener('keydown', skip);
  intro.addEventListener('animationend', function (e) {
    if (e.target === intro) { off(); intro.remove(); document.dispatchEvent(new Event('astra:intro-end')); }
  });
})();
