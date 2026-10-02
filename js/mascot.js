// Mizu: el monstruito de Astra (personaje propio: nube esponjosa rosa empolvado con cuernos de uña almendra y zapatillas) que aparece abajo a la derecha
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

  // Mizu: monstruito de Astra. Simple y plano, con la paleta de la página (rosa empolvado, marfil y espresso):
  // cuerpo esponjoso como una nube, dos cuernos con forma de uña almendra (nude con brillo de gel),
  // zapatillas gorditas y caras simples con colmillitos.
  // Caras (data-mood en .mascot): idle · wow · love · gossip · grumpy · shy · think · sleep
  function fluff(cx, cy, rx, ry, n, depth) { // contorno de nube: ondas alrededor de un óvalo
    var d = '', pt = function (a, ex) { return ((cx + (rx + ex) * Math.cos(a)).toFixed(1) + ' ' + (cy + (ry + ex) * Math.sin(a)).toFixed(1)); };
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2 - Math.PI / 2, a1 = (i + 1) / n * Math.PI * 2 - Math.PI / 2;
      if (!i) d = 'M' + pt(a0, 0);
      d += 'Q' + pt((a0 + a1) / 2, depth) + ' ' + pt(a1, 0);
    }
    return d + 'Z';
  }
  var HEART = function (x, y, s) {
    return 'M' + x + ' ' + (y + s * 0.55) + 'C' + (x - s * 1.1) + ' ' + (y - s * 0.1) + ' ' + (x - s * 0.55) + ' ' + (y - s * 0.95) + ' ' + x + ' ' + (y - s * 0.35) +
      'C' + (x + s * 0.55) + ' ' + (y - s * 0.95) + ' ' + (x + s * 1.1) + ' ' + (y - s * 0.1) + ' ' + x + ' ' + (y + s * 0.55) + 'Z';
  };
  // ojo entrecerrado (blanco abajo, párpado recto arriba) con pupila
  var HALF = function (cx, cy, px) {
    return '<path class="mzm-white" d="M' + (cx - 8) + ' ' + cy + 'h16a8 7 0 0 1-16 0Z"/>' +
      '<circle class="mzm-ink" cx="' + (cx + (px || 0)) + '" cy="' + (cy + 3) + '" r="3.3"/>' +
      '<path class="mzm-line" d="M' + (cx - 9.5) + ' ' + cy + 'h19"/>';
  };
  var FANGS = function (y) { return '<path class="mzm-white" d="M53 ' + y + 'l2.4 4 2.4-4ZM62.2 ' + y + 'l2.4 4 2.4-4Z"/>'; };
  var FACES = {
    idle: '<g class="mascot__eyes">' + HALF(47, 66, 1) + HALF(73, 66, 1) + '</g>' +
      '<path class="mzm-line" d="M51 80q9 6 18 0"/>' + FANGS(81.6),
    wow: '<circle class="mzm-white" cx="47" cy="64" r="7.5"/><circle class="mzm-white" cx="73" cy="64" r="7.5"/>' +
      '<circle class="mzm-ink" cx="47" cy="65" r="3.4"/><circle class="mzm-ink" cx="73" cy="65" r="3.4"/>' +
      '<path class="mzm-ink" d="M47 78q13-3 26 0 0 15-13 15T47 78Z"/><path class="mzm-white" d="M50.5 78.6l3 4.2 3-4.6ZM63.5 78.2l3 4.6 3-4.2Z"/>' +
      '<path class="mzm-tongue" d="M53 89q7-5 14 0-3 3.8-7 3.8T53 89Z"/>' +
      '<path class="mzm-mark" d="M103 22v9M110 19v9"/><circle class="mzm-dot" cx="103" cy="36" r="1.9"/><circle class="mzm-dot" cx="110" cy="33" r="1.9"/>',
    love: '<path class="mzm-line mzm-thick" d="M40 67q7-7 14 0M66 67q7-7 14 0"/>' +
      '<ellipse class="mzm-blush" cx="38" cy="76" rx="5.5" ry="3.2"/><ellipse class="mzm-blush" cx="82" cy="76" rx="5.5" ry="3.2"/>' +
      '<path class="mzm-line" d="M50 79q10 7 20 0"/>' + FANGS(81.2) +
      '<path class="mzm-heart" d="' + HEART(106, 24, 7) + '"/><path class="mzm-heart" d="' + HEART(14, 36, 4.5) + '"/>',
    gossip: '<path class="mzm-line mzm-thick" d="M40 66q7-5 14 0"/>' + HALF(73, 65, 4) +
      '<path class="mzm-ink" d="M46 77q14 5 28-2-3 11-14 11T46 77Z"/>' +
      '<path class="mzm-white" d="M49 78.5l3.5 3.5 3.5-2.6 3.5 2.8 3.5-2.8 3.5 2.6 3.5-3.6Z"/>' +
      '<path class="mzm-mark mzm-thin" d="M101 26l7-4M103 33l8 0M101 40l7 4"/>',
    grumpy: '<path class="mzm-white" d="M39 62l16 5a8 7 0 0 1-16-1Z"/><path class="mzm-white" d="M81 62l-16 5a8 7 0 0 0 16-1Z"/>' +
      '<circle class="mzm-ink" cx="48" cy="67" r="3"/><circle class="mzm-ink" cx="72" cy="67" r="3"/>' +
      '<path class="mzm-line mzm-thick" d="M38 61l18 6M82 61l-18 6"/>' +
      '<path class="mzm-ink" d="M48 79h24v7H48Z" rx="2"/><path class="mzm-white" d="M50 80h20v2.6H50Z"/>' +
      '<path class="mzm-mark" d="M100 20l4 4m0-4-4 4M108 30l4 4m0-4-4 4"/>',
    shy: '<path class="mzm-line mzm-thick" d="M41 63l9 4-9 4M79 63l-9 4 9 4"/>' +
      '<path class="mzm-tear" d="M44 72q-2 10 2 20M76 72q2 10-2 20"/>' +
      '<path class="mzm-ink" d="M50 82q10-6 20 0-2 7-10 7T50 82Z"/><path class="mzm-tongue" d="M54 86q6-3 12 0-2 2.6-6 2.6T54 86Z"/>' +
      '<ellipse class="mzm-blush" cx="36" cy="78" rx="5" ry="3"/><ellipse class="mzm-blush" cx="84" cy="78" rx="5" ry="3"/>' +
      '<path class="mzm-drop" d="M104 22c-3 5-4 7-4 9a4 4 0 0 0 8 0c0-2-1-4-4-9Z"/>',
    think: HALF(47, 65, -2) + HALF(73, 65, -2) +
      '<circle class="mzm-glass" cx="47" cy="67" r="9"/><circle class="mzm-glass" cx="73" cy="67" r="9"/><path class="mzm-glass" d="M56 66q4-2 8 0"/>' +
      '<path class="mzm-line" d="M54 82q3-2.4 6 0t6 0"/>' +
      '<path class="mzm-mark" d="M101 17q0-6 6-6t6 5q0 4-6 6v3"/><circle class="mzm-dot" cx="107" cy="31" r="1.9"/>',
    sleep: '<path class="mzm-line mzm-thick" d="M40 66q7 5 14 0M66 66q7 5 14 0"/>' +
      '<ellipse class="mzm-ink" cx="60" cy="82" rx="3" ry="3.6"/>' +
      '<path class="mzm-mark mzm-thin" d="M99 26h7l-7 8h7M108 14h5l-5 6h5"/>'
  };
  var FACES_SVG = Object.keys(FACES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + FACES[k] + '</g>'; }).join('');

  // cuerno con forma de uña almendra: base, brillo de gel y "cutícula"
  var HORN = function (x, y, rot) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">' +
      '<path class="mzm-horn" d="M-7.5 2C-8.5-6-5.5-14 0-18 5.5-14 8.5-6 7.5 2Z"/>' +
      '<path class="mzm-cuticle" d="M-7.5 2C-6-2.5 6-2.5 7.5 2Z"/>' +
      '<path class="mzm-gel" d="M-3.4-2C-4-7-2.6-11.5-.4-14.5"/>' +
      '</g>';
  };
  var SHOE = function (x) {
    return '<path class="mzm-shoe" d="M' + (x - 13) + ' 120c0-8 5-12 13-12s13 4 13 12Z"/>' +
      '<path class="mzm-sole" d="M' + (x - 14) + ' 118.5h28a2.5 2.5 0 0 1 0 5h-28a2.5 2.5 0 0 1 0-5Z"/>' +
      '<path class="mzm-lace" d="M' + (x - 4) + ' 111.5l4 2 4-2"/>';
  };
  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<g class="mascot__head">' +
        HORN(35, 37, -26) + HORN(85, 37, 26) +
        '<path class="mzm-shade" d="' + fluff(61.5, 71, 41, 38, 15, 6) + '"/>' +
        '<path class="mzm-body" d="' + fluff(60, 68.5, 41, 38, 15, 6) + '"/>' +
        FACES_SVG +
      '</g>' +
      SHOE(46) + SHOE(74) +
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
  var hideTimer = null, moodTimer = null;

  // cambia la cara de Mizu (ver FACES)
  // si nadie lo toca por un rato, se queda dormido (cualquier otro ánimo lo despierta y reinicia la cuenta)
  var sleepTimer = null;
  function mood(m) {
    root.dataset.mood = m;
    if (m === 'sleep') return;
    clearTimeout(sleepTimer);
    sleepTimer = setTimeout(function () { if (!root.classList.contains('is-talking')) mood('sleep'); }, 35000);
  }
  mood('idle');

  function say(message, stay, face) {
    mood(face || 'idle');
    text.textContent = message;
    bubble.hidden = false;
    root.classList.remove('is-talking');
    void root.offsetWidth; // reinicia la animación del globo
    root.classList.add('is-talking');
    clearTimeout(hideTimer);
    if (!stay) hideTimer = setTimeout(function () { bubble.hidden = true; root.classList.remove('is-talking'); mood('idle'); }, BUBBLE_TIME);
  }

  function nextTip() {
    tipIndex = (tipIndex + 1) % TIPS.length;
    say(TIPS[tipIndex], false, 'think');
  }

  var greeted = false;
  var spoken = {};
  var currentSection = null; // sección que pasa por el centro de la pantalla

  // Al tocarla: la primera vez saluda; después comenta la sección que se está mirando o tira un tip
  function talk() {
    if (!greeted) { greeted = true; say(GREETING, false, 'love'); return; }
    if (currentSection && SECTION_TIPS[currentSection] && !spoken[currentSection]) {
      spoken[currentSection] = true;
      say(SECTION_TIPS[currentSection], false, 'gossip');
      return;
    }
    nextTip();
  }

  var clicks = []; // si lo tocan muchas veces seguidas, se enoja un poquito (con venita de manga)
  catButton.addEventListener('click', function () {
    if (hidden) {
      hidden = false;
      root.classList.remove('is-hidden');
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
    var now = Date.now();
    clicks = clicks.filter(function (t) { return now - t < 2500; });
    clicks.push(now);
    if (clicks.length >= 4) { clicks = []; say('¡Ey, despacio! Me vas a despeinar.', false, 'grumpy'); return; }
    talk();
  });
  // al pasar el mouse se sorprende (si no está hablando)
  catButton.addEventListener('mouseenter', function () { if (!root.classList.contains('is-talking')) mood('wow'); });
  catButton.addEventListener('mouseleave', function () { if (!root.classList.contains('is-talking')) mood('idle'); });
  root.querySelector('.mascot__more').addEventListener('click', function () { nextTip(); });
  root.querySelector('.mascot__close').addEventListener('click', function () {
    hidden = true;
    bubble.hidden = true;
    root.classList.add('is-hidden');
    clearTimeout(moodTimer);
    mood('shy'); // se pone tímido al esconderse
    moodTimer = setTimeout(function () { mood('idle'); }, 1800);
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
})();
