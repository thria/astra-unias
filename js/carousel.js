// Carrusel de trabajos: las flechas avanzan de a una foto; al llegar al final vuelve al principio.
// El desplazamiento usa scroll nativo con "scroll-snap", así que en el celular se desliza con el dedo.
// Además avanza solo cada pocos segundos, y se pausa mientras la persona lo está mirando de cerca
// (mouse encima, dedo, teclado) o cuando no está en pantalla.
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var AUTOPLAY_MS = 3500;
  var RESUME_AFTER_MS = 8000; // después de que la persona lo toca, espera un rato antes de seguir solo

  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel__track');
    var prev = carousel.querySelector('.carousel__btn--prev');
    var next = carousel.querySelector('.carousel__btn--next');
    if (!track || !prev || !next) return;

    var smooth = reduceMotion ? 'auto' : 'smooth';

    function step() {
      var item = track.firstElementChild;
      if (!item) return 0;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item.getBoundingClientRect().width + gap;
    }

    function maxScroll() {
      return track.scrollWidth - track.clientWidth;
    }

    function goNext() {
      var atEnd = track.scrollLeft >= maxScroll() - 4;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step(), behavior: smooth });
    }

    function goPrev() {
      var atStart = track.scrollLeft <= 4;
      track.scrollTo({ left: atStart ? maxScroll() : track.scrollLeft - step(), behavior: smooth });
    }

    next.addEventListener('click', function () { pauseFor(RESUME_AFTER_MS); goNext(); });
    prev.addEventListener('click', function () { pauseFor(RESUME_AFTER_MS); goPrev(); });

    // ---- Avance automático ----
    if (reduceMotion) return;

    var hovering = false;
    var focused = false;
    var onScreen = false;
    var pausedUntil = 0;

    function pauseFor(ms) { pausedUntil = Date.now() + ms; }

    carousel.addEventListener('mouseenter', function () { hovering = true; });
    carousel.addEventListener('mouseleave', function () { hovering = false; });
    carousel.addEventListener('focusin', function () { focused = true; });
    carousel.addEventListener('focusout', function () { focused = false; });
    track.addEventListener('pointerdown', function () { pauseFor(RESUME_AFTER_MS); });
    track.addEventListener('wheel', function () { pauseFor(RESUME_AFTER_MS); }, { passive: true });
    track.addEventListener('touchstart', function () { pauseFor(RESUME_AFTER_MS); }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (onScreen) pauseFor(1600); // deja terminar la entrada de las fotos antes de empezar
      }, { threshold: 0.4 }).observe(carousel);
    } else {
      onScreen = true;
    }

    setInterval(function () {
      if (!onScreen || hovering || focused || document.hidden || Date.now() < pausedUntil) return;
      goNext();
    }, AUTOPLAY_MS);
  });
})();
