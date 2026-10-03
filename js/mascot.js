// Mizu: el monstruito de Astra (personaje propio: bolita peluda negra, petisa y simpática) que aparece abajo a la derecha
// con un globo de diálogo, al estilo de Clippy. Solo habla cuando la tocan: nunca habla sola.
// - Tocarla: la primera vez saluda; después comenta la sección que se está mirando o tira un tip.
// - "Ocultar": la achica (se recuerda en este navegador).
// - Con "reducir movimiento" no se anima, pero sigue funcionando.
(function () {
  var STORAGE_KEY = 'astra-mascot-hidden';
  var FIRST_DELAY = 800;    // sin cinemática: aparece (callada) casi enseguida
  var BUBBLE_TIME = 12000;  // cuánto queda visible cada mensaje

  var GREETING = '¡Hola! Soy Mizu, el monstruito de Astra. Tocame y te cuento tips para tus uñas.';

  var TIPS = [
    'Usá aceite de cutículas todas las noches: ayuda a que la uña crezca más sana.',
    'Para lavar los platos o limpiar, usá guantes: tu semipermanente va a durar mucho más.',
    'No uses las uñas como herramienta para abrir latas o despegar cosas. ¡Cuidalas!',
    'No te arranques el esmalte: retiralo en el estudio así no se lastima tu uña natural.',
    'Después de lavarte las manos, poné un poquito de crema. Tus manos te lo agradecen.',
    'Si tus uñas se quiebran seguido, el capping las protege mientras crecen.',
    '¿Tenés una idea o una foto de Pinterest? Traela y armamos tu diseño juntas.',
    'Las press on se pueden volver a usar si las guardás en su cajita.',
    'Los días con puntitos en la agenda todavía tienen turnos libres.'
  ];

  // Lo que comenta de cada sección si la tocan mientras se mira esa parte (una vez cada una)
  var SECTION_TIPS = {
    'sobre-mi': 'Rena hace 4 años que se dedica a las uñas. ¡Estás en buenas manos!',
    trabajos: 'Tocá cualquier foto para verla de cerca. Hay más de 280 trabajos en Instagram.',
    'local-titulo': 'El estudio está por Plaza Belgrano, en La Plata. La dirección exacta te la pasa al reservar.',
    servicios: 'Arrastrá las uñas 3D para girarlas y verlas de cerca.',
    opiniones: 'Estas son algunas opiniones de clientas de Astra. ¡Gracias por tanto amor!',
    agenda: 'Elegí un día con puntitos y tocá un horario libre para pedir tu turno.'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hidden = false;
  try { hidden = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}

  // Mizu: monstruito peludo, rechoncho y petiso (más bolita que gato). Negro con una "máscara" más clara
  // en la cara, ojos enormes, boca abierta sonriente con un colmillito, orejitas con rosa por dentro,
  // bracitos cortos y patitas. El contorno de pelo se arma con ondas alrededor de un óvalo.
  function fluff(cx, cy, rx, ry, n, depth) {
    var d = '', pt = function (a, ex) { return ((cx + (rx + ex) * Math.cos(a)).toFixed(1) + ' ' + (cy + (ry + ex) * Math.sin(a)).toFixed(1)); };
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      if (!i) d = 'M' + pt(a0, 0);
      d += 'Q' + pt((a0 + a1) / 2, depth) + ' ' + pt(a1, 0);
    }
    return d + 'Z';
  }
  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="mz-fur" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#3A2C34"/><stop offset="1" stop-color="#140D11"/></radialGradient>' +
        '<radialGradient id="mz-iris" cx="45%" cy="65%" r="70%"><stop offset="0" stop-color="#7A3F5E"/><stop offset=".6" stop-color="#2E1624"/><stop offset="1" stop-color="#140910"/></radialGradient>' +
      '</defs>' +
      '<rect class="mascot__leg" x="40" y="98" width="15" height="22" rx="6"/>' +
      '<rect class="mascot__leg" x="65" y="98" width="15" height="22" rx="6"/>' +
      '<g class="mascot__head">' +
        '<path class="mascot__ear" d="M22 44C18 26 22 12 30 9c6-2 13 9 18 19Z"/>' +
        '<path class="mascot__ear" d="M72 28c5-10 12-21 18-19 8 3 12 17 8 35Z"/>' +
        '<path class="mascot__ear-in" d="M28 36c-2-11 1-19 4-21 3-1 8 5 11 11Z"/>' +
        '<path class="mascot__ear-in" d="M77 26c3-6 8-12 11-11 3 2 6 10 4 21Z"/>' +
        '<path class="mascot__fur" d="' + fluff(60, 66, 45, 41, 26, 5) + '"/>' +
        '<ellipse class="mascot__mask" cx="60" cy="61" rx="33" ry="24"/>' +
        '<path class="mascot__star" d="M106 4c.6 4.4 3.2 7.1 8 8-4.8.9-7.4 3.6-8 8-.6-4.4-3.2-7.1-8-8 4.8-.9 7.4-3.6 8-8Z"/>' +
        '<g class="mascot__eyes">' +
          '<ellipse class="mascot__eye-ring" cx="44.5" cy="58" rx="12.5" ry="13.5"/><ellipse class="mascot__eye-ring" cx="75.5" cy="58" rx="12.5" ry="13.5"/>' +
          '<circle class="mascot__eye" cx="46.5" cy="60" r="8.8"/><circle class="mascot__eye" cx="73.5" cy="60" r="8.8"/>' +
          '<circle class="mascot__shine" cx="49.5" cy="56" r="3.1"/><circle class="mascot__shine" cx="76.5" cy="56" r="3.1"/>' +
          '<circle class="mascot__shine" cx="43.5" cy="64" r="1.4"/><circle class="mascot__shine" cx="70.5" cy="64" r="1.4"/>' +
        '</g>' +
        '<path class="mascot__nose" d="M58 68.5h4c-.6 1.8-1.3 2.5-2 2.6-.7-.1-1.4-.8-2-2.6Z"/>' +
        '<path class="mascot__mouth" d="M53.5 73.5Q60 74.6 66.5 73.5 65 83 60 83t-6.5-9.5Z"/>' +
        '<ellipse class="mascot__tongue" cx="60.5" cy="80.6" rx="3.6" ry="2.2"/>' +
        '<path class="mascot__fang" d="M55.6 73.9l1.5 3.2 1.4-3.1Z"/>' +
      '</g>' +
      '<g class="mascot__arm--l"><ellipse class="mascot__arm" cx="11" cy="82" rx="6.5" ry="10.5" transform="rotate(28 11 82)"/></g>' +
      '<g class="mascot__arm--wave"><ellipse class="mascot__arm" cx="109" cy="82" rx="6.5" ry="10.5" transform="rotate(-28 109 82)"/></g>' +
    '</svg>';


  var root = document.createElement('div');
  root.className = 'mascot' + (hidden ? ' is-hidden' : '');
  root.innerHTML =
    '<div class="mascot__bubble" role="status" hidden>' +
      '<p class="mascot__text"></p>' +
      '<div class="mascot__actions">' +
        '<button type="button" class="mascot__more">Otro tip</button>' +
        '<button type="button" class="mascot__close">Ocultar</button>' +
      '</div>' +
    '</div>' +
    '<button type="button" class="mascot__button" aria-label="Mizu, el monstruito de Astra: tocalo para un tip de uñas">' + CAT_SVG + '</button>';
  document.body.appendChild(root);

  var bubble = root.querySelector('.mascot__bubble');
  var text = root.querySelector('.mascot__text');
  var catButton = root.querySelector('.mascot__button');
  var tipIndex = Math.floor(Math.random() * TIPS.length);
  var hideTimer = null;

  function say(message, stay) {
    text.textContent = message;
    bubble.hidden = false;
    root.classList.remove('is-talking');
    void root.offsetWidth; // reinicia la animación del globo
    root.classList.add('is-talking');
    clearTimeout(hideTimer);
    if (!stay) hideTimer = setTimeout(function () { bubble.hidden = true; root.classList.remove('is-talking'); }, BUBBLE_TIME);
  }

  function nextTip() {
    tipIndex = (tipIndex + 1) % TIPS.length;
    say(TIPS[tipIndex]);
  }

  var greeted = false;
  var spoken = {};
  var currentSection = null; // sección que pasa por el centro de la pantalla

  // Al tocarla: la primera vez saluda; después comenta la sección que se está mirando o tira un tip
  function talk() {
    if (!greeted) { greeted = true; say(GREETING); return; }
    if (currentSection && SECTION_TIPS[currentSection] && !spoken[currentSection]) {
      spoken[currentSection] = true;
      say(SECTION_TIPS[currentSection]);
      return;
    }
    nextTip();
  }

  catButton.addEventListener('click', function () {
    if (hidden) {
      hidden = false;
      root.classList.remove('is-hidden');
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
    talk();
  });
  root.querySelector('.mascot__more').addEventListener('click', function () { nextTip(); });
  root.querySelector('.mascot__close').addEventListener('click', function () {
    hidden = true;
    bubble.hidden = true;
    root.classList.add('is-hidden');
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    catButton.focus();
  });

  // Aparece callada después de la animación de entrada: habla solo cuando la tocan
  // (si la cinemática sigue en pantalla, por ejemplo en un celular lento, espera a que termine)
  function appear() { root.classList.add('is-in'); }
  if (document.querySelector('.intro') && !document.documentElement.classList.contains('no-intro')) {
    document.addEventListener('astra:intro-end', function () { setTimeout(appear, 500); }, { once: true });
  } else {
    setTimeout(appear, FIRST_DELAY);
  }

  // Recuerda qué sección se está mirando, para comentarla si la tocan
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) currentSection = entry.target.id; });
    }, { rootMargin: '-40% 0px -40% 0px' }); // cuenta cuando la sección pasa por el centro de la pantalla
    Object.keys(SECTION_TIPS).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // Celular: al bajar leyendo se esconde hacia abajo (no tapa el texto); al subir o al llegar al final, vuelve
  if (window.matchMedia('(max-width: 48em)').matches) {
    var lastY = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY, atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 80;
        if (Math.abs(y - lastY) < 12 && !atEnd) return; // movimientos mínimos: no cambia
        root.classList.toggle('is-tucked', y > lastY && y > 200 && !atEnd);
        lastY = y;
      });
    }, { passive: true });
  }
})();
