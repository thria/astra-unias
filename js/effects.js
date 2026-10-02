// Efectos de "vida" en la página (todos se desactivan con "reducir movimiento"):
//  1. Brillitos y estrellas que flotan suave en el fondo de algunas secciones.
//  2. Secciones que aparecen con un movimiento suave al bajar.
//  3. Opiniones tipo historias de Instagram (barra de progreso, pasan solas).
//  4. El iPad del mapa se endereza mientras bajás.
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
      'main > section:not(.hero) .section__head, .about__photo, .about__copy, .carousel, .service-card, ' +
      '.local__text, .agenda, .steps li, .booking__cta'
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

  // ---- 3. Opiniones tipo historias de Instagram ----
  // Barra de progreso arriba (un segmento por opinión) que avanza sola y pasa a la siguiente tarjeta.
  // Se pausa al pasar el mouse, al tocar o al usar el teclado; si la persona desliza, la barra la sigue.
  var stories = document.querySelector('[data-stories]');
  if (stories) {
    var track = stories.querySelector('.stories__track');
    var cards = Array.prototype.slice.call(track.children);
    var bar = stories.querySelector('.stories__progress');
    var segs = cards.map(function () { var s = document.createElement('span'); bar.appendChild(s); return s; });
    var autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current = -1, programmatic = 0, onScreen = false, holds = 0;

    var show = function (i, scroll) {
      current = (i + cards.length) % cards.length;
      segs.forEach(function (s, k) {
        s.classList.remove('is-active');
        s.classList.toggle('is-done', k < current);
      });
      void bar.offsetWidth; // reinicia la animación del segmento activo
      segs[current].classList.add('is-active');
      cards.forEach(function (c, k) { c.classList.toggle('is-active', k === current); });
      if (scroll) {
        programmatic = Date.now();
        track.scrollTo({ left: cards[current].offsetLeft - cards[0].offsetLeft, behavior: autoplay ? 'smooth' : 'auto' });
      }
    };
    var paused = function () { return !autoplay || !onScreen || holds > 0 || document.hidden; };
    var sync = function () { stories.classList.toggle('is-paused', paused()); };

    // al terminar de llenarse el segmento, pasa a la siguiente (y al final vuelve a la primera)
    bar.addEventListener('animationend', function () { show(current + 1, true); });

    stories.querySelector('.stories__btn--prev').addEventListener('click', function () { show(current - 1, true); });
    stories.querySelector('.stories__btn--next').addEventListener('click', function () { show(current + 1, true); });

    // si la persona desliza, la barra sigue a la tarjeta que quedó al principio
    var scrollTimer;
    track.addEventListener('scroll', function () {
      if (Date.now() - programmatic < 900) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var x = track.scrollLeft + cards[0].offsetLeft, best = 0;
        cards.forEach(function (c, k) { if (Math.abs(c.offsetLeft - x) < Math.abs(cards[best].offsetLeft - x)) best = k; });
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 4 && best < current) return; // al final del todo
        if (best !== current) show(best, false);
      }, 120);
    }, { passive: true });

    var hold = function (on) { holds = Math.max(0, holds + (on ? 1 : -1)); sync(); };
    stories.addEventListener('mouseenter', function () { hold(true); });
    stories.addEventListener('mouseleave', function () { hold(false); });
    stories.addEventListener('focusin', function () { hold(true); });
    stories.addEventListener('focusout', function () { hold(false); });
    track.addEventListener('touchstart', function () { hold(true); }, { passive: true });
    track.addEventListener('touchend', function () { setTimeout(function () { hold(false); }, 1500); }, { passive: true });
    document.addEventListener('visibilitychange', sync);
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(current + (e.key === 'ArrowRight' ? 1 : -1), true); }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(stories);
    } else {
      onScreen = true;
    }
    if (!autoplay) segs.forEach(function (s) { s.style.setProperty('--story-time', '0s'); });
    show(0, false);
    sync();
  }

  // ---- 4. El iPad del mapa se endereza al bajar ----
  // Arranca más chico e inclinado hacia atrás (como apoyado en una mesa) y, con el scroll,
  // se levanta y queda de frente. Sube y baja junto con el scroll. Al llegar, queda sin transformar
  // para que el mapa responda bien al mouse y al dedo.
  var ipad = document.querySelector('.local .ipad');
  if (ipad && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ipadQueued = false;
    var tiltIpad = function () {
      ipadQueued = false;
      // posición sin el giro (se mide desde el contenedor, que no se transforma)
      var top = (ipad.offsetParent ? ipad.offsetParent.getBoundingClientRect().top : 0) + ipad.offsetTop;
      var vh = window.innerHeight || 1;
      // 0 = el iPad recién asoma abajo; 1 = su borde de arriba llegó al 22 % de la pantalla
      var p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.78)));
      p = 1 - Math.pow(1 - p, 2); // frena suave al final
      if (p > 0.995) { ipad.style.transform = ''; ipad.classList.remove('is-tilting'); return; }
      ipad.classList.add('is-tilting');
      ipad.style.transform = 'perspective(1500px) translateY(' + ((1 - p) * 4).toFixed(2) + 'rem) rotateX(' + ((1 - p) * 42).toFixed(2) + 'deg) scale(' + (0.8 + p * 0.2).toFixed(4) + ')';
    };
    window.addEventListener('scroll', function () { if (!ipadQueued) { ipadQueued = true; requestAnimationFrame(tiltIpad); } }, { passive: true });
    window.addEventListener('resize', tiltIpad);
    tiltIpad();
  }
})();
