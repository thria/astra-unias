// Efectos de "vida" en la página (todos se desactivan con "reducir movimiento"):
//  1. Brillitos y estrellas que flotan suave en el fondo de algunas secciones.
//  2. Secciones que aparecen con un movimiento suave al bajar.
//  3. Opiniones tipo historias de Instagram (barra de progreso, pasan solas).
//  4. El iPad del mapa se endereza mientras bajás.
//  5. Portada con profundidad (inclinación al mouse y parallax).
//  6. Opiniones que se escriben palabra por palabra.
//  7. Línea que une los pasos para pedir turno.
//  8. Botón de turno magnético.
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

    // En el carrusel las fotos aparecen con un pop, una detrás de la otra (rápido)
    Array.prototype.forEach.call(document.querySelectorAll('.carousel__track > *'), function (item, i) {
      item.style.setProperty('--enter-delay', (i * 0.07) + 's');
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
  // Arranca apenas inclinado hacia atrás y, con el scroll, se levanta y queda de frente.
  // El mapa se puede usar siempre: apenas la persona lo toca, hace clic o usa la rueda, el iPad
  // se endereza solo (antes de que el mapa reciba el gesto, así las coordenadas coinciden) y queda
  // derecho hasta que sale de la pantalla.
  var ipad = document.querySelector('.local .ipad');
  if (ipad && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ipadQueued = false, ipadFlat = false;
    var ipadTop = function () { // posición sin el giro (se mide desde el contenedor, que no se transforma)
      return (ipad.offsetParent ? ipad.offsetParent.getBoundingClientRect().top : 0) + ipad.offsetTop;
    };
    var tiltIpad = function () {
      ipadQueued = false;
      var top = ipadTop(), vh = window.innerHeight || 1;
      if (ipadFlat) { // vuelve a animarse recién cuando el iPad salió de la pantalla
        if (top > vh || top + ipad.offsetHeight < 0) { ipadFlat = false; ipad.classList.remove('is-settling'); } else return;
      }
      // 0 = el iPad recién asoma abajo; 1 = su borde de arriba llegó al 12 % de la pantalla (se endereza al final)
      var p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.88)));
      p = p * p * (3 - 2 * p); // arranca y termina suave: primero se aprecia inclinado, después se endereza
      ipad.style.transform = p > 0.995 ? '' :
        'perspective(1500px) translateY(' + ((1 - p) * 1.5).toFixed(2) + 'rem) rotateX(' + ((1 - p) * 16).toFixed(2) + 'deg) scale(' + (0.93 + p * 0.07).toFixed(4) + ')';
    };
    var straighten = function () {
      if (ipadFlat || !ipad.style.transform) { ipadFlat = true; return; }
      ipadFlat = true;
      ipad.classList.add('is-settling');
      ipad.style.transform = '';
    };
    ['pointerdown', 'touchstart', 'wheel', 'focusin'].forEach(function (type) {
      ipad.addEventListener(type, straighten, { capture: true, passive: true });
    });
    window.addEventListener('scroll', function () { if (!ipadQueued) { ipadQueued = true; requestAnimationFrame(tiltIpad); } }, { passive: true });
    window.addEventListener('resize', tiltIpad);
    tiltIpad();
  }

  // ---- 5. Portada con profundidad ----
  // En compu, la foto se inclina hasta 2° hacia el mouse; al bajar, la foto se queda un poco atrás
  // (va más lenta que el texto, que ya sube con la cortina). Solo transform, con frenado suave.
  var heroEl = document.querySelector('.hero');
  var heroStage = document.querySelector('.hero__stage');
  if (heroEl && heroStage) {
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var tX = 0, tY = 0, cX = 0, cY = 0, heroQueued = false;
    var heroFrame = function () {
      heroQueued = false;
      cX += (tX - cX) * 0.08; cY += (tY - cY) * 0.08; // se acerca de a poco: nunca brusco
      var y = Math.min(window.scrollY, window.innerHeight);
      heroStage.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0) rotateX(' + cY.toFixed(3) + 'deg) rotateY(' + cX.toFixed(3) + 'deg)';
      if (Math.abs(tX - cX) > 0.005 || Math.abs(tY - cY) > 0.005) heroRequest();
    };
    var heroRequest = function () { if (!heroQueued) { heroQueued = true; requestAnimationFrame(heroFrame); } };
    if (fine) {
      heroEl.addEventListener('mousemove', function (e) {
        tX = (e.clientX / window.innerWidth - 0.5) * 4;   // ±2°
        tY = (e.clientY / window.innerHeight - 0.5) * -4;
        heroRequest();
      });
      heroEl.addEventListener('mouseleave', function () { tX = 0; tY = 0; heroRequest(); });
    }
    // empieza recién cuando terminó el "foco" de la entrada, para no pisar esa animación
    heroStage.addEventListener('animationend', function () {
      window.addEventListener('scroll', heroRequest, { passive: true });
      heroRequest();
    }, { once: true });
  }

  // ---- 6. Opiniones: la opinión activa se escribe palabra por palabra ----
  // (el CSS anima las palabras y llena las estrellas cuando la tarjeta pasa a ser la activa)
  Array.prototype.forEach.call(document.querySelectorAll('.review blockquote p'), function (p) {
    p.innerHTML = p.textContent.trim().split(/\s+/).map(function (w, i) {
      return '<span class="rw" style="--i:' + i + '">' + w.replace(/[&<>"]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }) + '</span>';
    }).join(' ');
  });
  Array.prototype.forEach.call(document.querySelectorAll('.review__stars'), function (s) {
    Array.prototype.forEach.call(s.children, function (star, n) { star.style.setProperty('--n', n); });
  });

  // ---- 7. Cómo pedir tu turno: una línea fina une los pasos al aparecer ----
  var stepsList = document.querySelector('.steps');
  var measureSteps = function () { // largo de la línea: del primer número al último (vertical en celular, horizontal en compu)
    var lis = stepsList.children, first = lis[0], last = lis[lis.length - 1];
    var row = last.offsetTop === first.offsetTop;
    stepsList.classList.toggle('is-row', row);
    stepsList.style.setProperty('--line-len', (row ? last.offsetLeft - first.offsetLeft : last.offsetTop - first.offsetTop) + 'px');
  };
  if (stepsList && stepsList.children.length > 1) { measureSteps(); window.addEventListener('resize', measureSteps); }
  if (stepsList && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, io) {
      if (!entries[0].isIntersecting) return;
      stepsList.classList.add('is-drawn');
      io.disconnect();
    }, { threshold: 0.35 }).observe(stepsList);
  }

  // ---- 8. Botón "Pedir turno por Instagram" magnético (solo compu) ----
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.booking__cta'), function (b) {
      b.classList.add('is-magnetic');
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        var x = Math.max(-8, Math.min(8, (e.clientX - r.left - r.width / 2) * 0.2));
        var y = Math.max(-6, Math.min(6, (e.clientY - r.top - r.height / 2) * 0.3));
        b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }
})();
