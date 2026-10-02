// Galería de trabajos: carrusel horizontal "premium", manejado por la persona (sin avance automático).
// - La foto del centro se ve más grande y las de los costados un poco más chicas (según el scroll).
// - Flechas, teclado (← →), puntitos de abajo y deslizar con el dedo. Al llegar a un extremo se queda ahí
//   y la flecha de ese lado se apaga.
// - Desplazamiento propio y suave (0,7 s, frena largo al final); el dedo usa el scroll nativo con "snap".
// - Parallax sutil con el mouse (solo compu): las fotos se corren apenas hacia el lado contrario.
// - Al tocar una foto se abre en grande (lightbox) con flechas, contador "02/05" y link a Instagram.
// Para sumar fotos: copiá un <li class="gallery__item"> en index.html (ver el comentario ahí).
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var DURATION = 700;
  function easeOut(t) { var c = 1 - t; return 1 - c * c * c; } // rápido al empezar, frena suave

  document.querySelectorAll('.carousel').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel__track');
    var prev = carousel.querySelector('.carousel__btn--prev');
    var next = carousel.querySelector('.carousel__btn--next');
    if (!track || !prev || !next) return;
    var items = Array.prototype.slice.call(track.children);
    var active = 0, anim = null;

    // ---- Puntitos (uno por foto) ----
    var dots = document.createElement('div');
    dots.className = 'carousel__dots';
    dots.setAttribute('role', 'group');
    dots.setAttribute('aria-label', 'Elegir trabajo');
    items.forEach(function (item, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel__dot';
      b.setAttribute('aria-label', 'Ir a la foto ' + (i + 1) + ' de ' + items.length);
      b.addEventListener('click', function () { goTo(i); });
      dots.appendChild(b);
    });
    carousel.appendChild(dots);
    var dotButtons = Array.prototype.slice.call(dots.children);

    function maxScroll() { return track.scrollWidth - track.clientWidth; }
    function centerOf(i) { // scroll necesario para que la foto i quede centrada (sin pasarse de los bordes)
      var it = items[i];
      var x = it.offsetLeft - track.offsetLeft - (track.clientWidth - it.offsetWidth) / 2;
      return Math.max(0, Math.min(maxScroll(), x));
    }

    // Desplazamiento propio: el snap se apaga mientras dura para que no "salte"
    function scrollToX(x) {
      if (anim) cancelAnimationFrame(anim.id);
      var from = track.scrollLeft, dist = x - from;
      if (Math.abs(dist) < 1) return;
      if (reduceMotion) { track.scrollLeft = x; return; }
      track.classList.add('is-gliding');
      var start = performance.now();
      anim = {};
      (function frame(now) {
        var t = Math.min(1, (now - start) / DURATION);
        track.scrollLeft = from + dist * easeOut(t);
        if (t < 1) anim.id = requestAnimationFrame(frame);
        else { anim = null; track.classList.remove('is-gliding'); update(); }
      })(start);
    }

    function goTo(i) {
      i = Math.max(0, Math.min(items.length - 1, i));
      // si esa foto no mueve el carrusel (está en un borde), seguir hasta una que sí
      var x = centerOf(i), dir = i >= active ? 1 : -1;
      while (Math.abs(x - track.scrollLeft) < 2 && i + dir >= 0 && i + dir < items.length) { i += dir; x = centerOf(i); }
      active = i;
      scrollToX(x);
      update();
    }
    prev.addEventListener('click', function () { goTo(active - 1); });
    next.addEventListener('click', function () { goTo(active + 1); });
    carousel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
    });

    // ---- Profundidad: la del centro grande, las de los costados más chicas ----
    var queued = false;
    function update() {
      queued = false;
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
      items.forEach(function (it, i) {
        var c = it.offsetLeft - track.offsetLeft + it.offsetWidth / 2;
        var d = Math.abs(c - mid) / it.offsetWidth;
        if (d < bestD) { bestD = d; best = i; }
        var k = Math.min(1, d);
        it.style.setProperty('--depth', (1 - 0.08 * k).toFixed(4));
        it.style.setProperty('--fade', (1 - 0.18 * k).toFixed(3));
      });
      if (!anim) active = best;
      dotButtons.forEach(function (b, i) { b.setAttribute('aria-current', String(i === active)); });
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll() - 2;
    }
    track.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    update();

    // ---- Parallax con el mouse (solo compu): micro desplazamiento opuesto al cursor ----
    if (finePointer && !reduceMotion) {
      var target = 0, current = 0, running = false, MAX = 16;
      var loop = function () {
        current += (target - current) * 0.08; // se acerca de a poco: nunca brusco
        track.style.setProperty('--px', current.toFixed(2) + 'px');
        if (Math.abs(target - current) > 0.05) requestAnimationFrame(loop); else running = false;
      };
      var kick = function () { if (!running) { running = true; requestAnimationFrame(loop); } };
      carousel.addEventListener('mousemove', function (e) {
        var r = carousel.getBoundingClientRect();
        target = -((e.clientX - r.left) / r.width - 0.5) * 2 * MAX;
        kick();
      });
      carousel.addEventListener('mouseleave', function () { target = 0; kick(); });
    }

    // ---- Lightbox ----
    var photos = items.filter(function (it) { return it.querySelector('img'); });
    if (!photos.length) return;
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Trabajo ampliado');
    box.hidden = true;
    box.innerHTML =
      '<button type="button" class="lightbox__close" aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="Foto anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<figure class="lightbox__figure"><img class="lightbox__img" alt=""><figcaption class="lightbox__caption">' +
        '<span class="lightbox__count"></span><a class="lightbox__ig" target="_blank" rel="noopener">Ver en Instagram</a></figcaption></figure>' +
      '<button type="button" class="lightbox__nav lightbox__nav--next" aria-label="Foto siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
    document.body.appendChild(box);
    var bigImg = box.querySelector('.lightbox__img');
    var count = box.querySelector('.lightbox__count');
    var igLink = box.querySelector('.lightbox__ig');
    var shown = 0, opener = null;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    function show(i) {
      shown = (i + photos.length) % photos.length;
      var src = photos[shown].querySelector('img'), link = photos[shown].querySelector('a');
      bigImg.classList.remove('is-in');
      bigImg.onload = function () { bigImg.classList.add('is-in'); };
      bigImg.src = src.getAttribute('src'); // la versión de 960 px
      bigImg.alt = src.alt;
      if (bigImg.complete) requestAnimationFrame(function () { bigImg.classList.add('is-in'); });
      count.textContent = pad(shown + 1) + '/' + pad(photos.length);
      igLink.href = link ? link.href : 'https://www.instagram.com/astra.unias/';
    }
    function open(i) {
      opener = document.activeElement;
      show(i);
      box.hidden = false;
      void box.offsetWidth;
      box.classList.add('is-open');
      document.documentElement.classList.add('has-lightbox');
      box.querySelector('.lightbox__close').focus({ preventScroll: true });
    }
    function close() {
      box.classList.remove('is-open');
      document.documentElement.classList.remove('has-lightbox');
      setTimeout(function () { box.hidden = true; }, reduceMotion ? 0 : 300);
      if (opener) opener.focus({ preventScroll: true });
    }
    photos.forEach(function (it, i) {
      var a = it.querySelector('a');
      if (a) a.addEventListener('click', function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return; // ctrl+clic sigue abriendo Instagram
        e.preventDefault();
        open(i);
      });
    });
    box.querySelector('.lightbox__close').addEventListener('click', close);
    box.querySelector('.lightbox__nav--prev').addEventListener('click', function () { show(shown - 1); });
    box.querySelector('.lightbox__nav--next').addEventListener('click', function () { show(shown + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); }); // clic afuera cierra
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(shown + 1);
      if (e.key === 'ArrowLeft') show(shown - 1);
      if (e.key === 'Tab') { // el foco no sale del lightbox
        var f = box.querySelectorAll('button, a[href]'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // deslizar con el dedo dentro del lightbox
    var sx = null;
    box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 45) show(shown + (dx < 0 ? 1 : -1));
      sx = null;
    }, { passive: true });
  });
})();
