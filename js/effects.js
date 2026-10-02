// Efectos de "vida" en la página (todos se desactivan con "reducir movimiento"):
//  1. Brillitos y estrellas que flotan suave en el fondo de algunas secciones.
//  2. Secciones que aparecen con un movimiento suave al bajar.
//  3. Opiniones de clientas que pasan solas en una franja continua.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---- 1. Brillitos ----
  var STAR = 'M12 0c.9 6.6 4.8 10.6 12 12-7.2 1.4-11.1 5.4-12 12-.9-6.6-4.8-10.6-12-12C7.2 10.6 11.1 6.6 12 0Z';
  var SPOTS = [ // posición (izq %, arriba %), tamaño en px, duración y retraso de la animación
    [4, 14, 18, 7, 0], [92, 10, 12, 9, 1.5], [8, 72, 10, 8, 3], [95, 58, 22, 10, 0.8], [50, 4, 9, 6.5, 2.2], [86, 88, 14, 8.5, 4]
  ];

  ['#sobre-mi', '#trabajos', '#servicios', '#opiniones', '#agenda'].forEach(function (selector, s) {
    var section = document.querySelector(selector);
    if (!section) return;
    var layer = document.createElement('div');
    layer.className = 'sparkles';
    layer.setAttribute('aria-hidden', 'true');
    SPOTS.forEach(function (spot, i) {
      // cada sección usa las posiciones un poco corridas para que no se repita el patrón
      var left = (spot[0] + s * 7) % 100;
      var el = document.createElement('span');
      el.className = 'sparkle-float' + (i % 3 === 0 ? ' sparkle-float--rose' : '');
      el.style.cssText = 'left:' + left + '%;top:' + spot[1] + '%;width:' + spot[2] + 'px;height:' + spot[2] + 'px;' +
        'animation-duration:' + spot[3] + 's,' + (spot[3] * 0.6).toFixed(1) + 's;animation-delay:-' + spot[4] + 's,-' + spot[4] + 's';
      el.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + STAR + '"/></svg>';
      layer.appendChild(el);
    });
    section.classList.add('has-sparkles');
    section.prepend(layer);
  });

  // ---- 2. Aparecer al bajar ----
  if ('IntersectionObserver' in window) {
    var targets = document.querySelectorAll(
      'main > section:not(.hero) .section__head, .about .filete, .about__copy, .carousel, .service-card, ' +
      '.local__text, .local .filete, .agenda, .steps li, .booking__cta'
    );
    document.documentElement.classList.add('reveal-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add('reveal');
      // las tarjetas y pasos que están en fila aparecen uno detrás de otro
      var siblings = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) { return c.matches('.service-card, .steps li'); }) : [];
      var index = siblings.indexOf(el);
      if (index > 0) el.style.transitionDelay = (index * 0.09) + 's';
      io.observe(el);
    });

    // En el carrusel las fotos entran de izquierda a derecha, una detrás de la otra
    Array.prototype.forEach.call(document.querySelectorAll('.carousel__track > *'), function (item, i) {
      item.style.setProperty('--enter-delay', (i * 0.12) + 's');
    });
  }

  // ---- 3. Opiniones que pasan solas ----
  var list = document.querySelector('.reviews');
  if (list && list.children.length > 1) {
    var originals = Array.prototype.slice.call(list.children);
    originals.forEach(function (item) {
      var copy = item.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true'); // la copia es solo visual para que la franja no se corte
      list.appendChild(copy);
    });
    var wrap = document.createElement('div');
    wrap.className = 'reviews-marquee';
    list.parentNode.insertBefore(wrap, list);
    wrap.appendChild(list);
    list.classList.add('reviews--marquee');
    // velocidad pareja sin importar cuántas opiniones haya: ~9 s por opinión
    list.style.animationDuration = (originals.length * 9) + 's';
  }
})();
