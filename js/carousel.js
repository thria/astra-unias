// Carrusel de trabajos: las flechas avanzan de a una foto; al llegar al final vuelve al principio.
// El desplazamiento usa scroll nativo con "scroll-snap", así que en el celular se desliza con el dedo.
(function () {
  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel__track');
    var prev = carousel.querySelector('.carousel__btn--prev');
    var next = carousel.querySelector('.carousel__btn--next');
    if (!track || !prev || !next) return;

    var smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    function step() {
      var item = track.firstElementChild;
      if (!item) return 0;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item.getBoundingClientRect().width + gap;
    }

    function maxScroll() {
      return track.scrollWidth - track.clientWidth;
    }

    next.addEventListener('click', function () {
      var atEnd = track.scrollLeft >= maxScroll() - 4;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step(), behavior: smooth });
    });

    prev.addEventListener('click', function () {
      var atStart = track.scrollLeft <= 4;
      track.scrollTo({ left: atStart ? maxScroll() : track.scrollLeft - step(), behavior: smooth });
    });
  });
})();
