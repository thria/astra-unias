// Mizu: el gatito de Astra (personaje propio: una mancha negra con forma de gato y ojos que lo dicen todo) que aparece abajo a la derecha
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

  // Mizu: una mancha negra con forma de gato (caricatura simple, plana). Todo lo expresan los ojos,
  // con símbolos estilo manga japonés alrededor (!!, ♡, ?, ♪, gotita, Zz) en rosa.
  // Caras (data-mood en .mascot): idle · wow · shy · gossip · love · think · sleep
  var HEART = function (x, y, s) { // corazón centrado en (x, y), de tamaño s
    return 'M' + x + ' ' + (y + s * 0.55) + 'C' + (x - s * 1.1) + ' ' + (y - s * 0.1) + ' ' + (x - s * 0.55) + ' ' + (y - s * 0.95) + ' ' + x + ' ' + (y - s * 0.35) +
      'C' + (x + s * 0.55) + ' ' + (y - s * 0.95) + ' ' + (x + s * 1.1) + ' ' + (y - s * 0.1) + ' ' + x + ' ' + (y + s * 0.55) + 'Z';
  };
  var SPARK = function (x, y, r) { // destellito de 4 puntas
    return 'M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'Z';
  };
  // ojos: blanco + pupila (dx, dy corren la mirada) + brillito
  var EYES = function (o) {
    o = o || {};
    var rx = o.rx || 12, ry = o.ry || 13, pr = o.pr || 6.5, dx = o.dx || 0, dy = o.dy || 0, s = '';
    [45, 75].forEach(function (cx, i) {
      var px = cx + (i ? -2 : 2) + dx, py = 73 + dy;
      s += '<ellipse class="mzc-white" cx="' + cx + '" cy="72" rx="' + rx + '" ry="' + ry + '"/>' +
        '<ellipse class="mzc-ink" cx="' + px + '" cy="' + py + '" rx="' + pr + '" ry="' + (pr * 1.12) + '"/>' +
        '<circle class="mzc-white" cx="' + (px + pr * 0.35) + '" cy="' + (py - pr * 0.45) + '" r="' + (pr * 0.3) + '"/>';
    });
    return s;
  };
  var FACES = {
    idle: '<g class="mascot__eyes">' + EYES() + '</g>',
    wow: EYES({ rx: 13.5, ry: 14.5, pr: 3.4 }) +
      '<path class="mzc-mark" d="M101 12v11M110 9v11"/><circle class="mzc-dot" cx="101" cy="29" r="2"/><circle class="mzc-dot" cx="110" cy="26" r="2"/>',
    shy: EYES({ pr: 5.2, dx: -3, dy: 5 }) +
      '<ellipse class="mzc-blush" cx="36" cy="88" rx="6" ry="3.2"/><ellipse class="mzc-blush" cx="84" cy="88" rx="6" ry="3.2"/>' +
      '<path class="mzc-blush-line" d="M33 86.5l-1.5 3M37 86.5l-1.5 3M81 86.5l1.5 3M85 86.5l1.5 3"/>' +
      '<path class="mzc-drop" d="M106 14c-3.5 6-5 8.5-5 11a5 5 0 0 0 10 0c0-2.5-1.5-5-5-11Z"/>',
    gossip: EYES({ pr: 5.6, dx: 5, dy: 3 }) +
      '<path class="mzc-lid" d="M31 72.5Q45 70 59 72.5V56H31ZM61 72.5Q75 70 89 72.5V56H61Z"/>' +
      '<path class="mzc-mark" d="M103 28V12l8-2v14"/><circle class="mzc-dot" cx="100.5" cy="28.5" r="3"/><circle class="mzc-dot" cx="108.5" cy="24.5" r="3"/>',
    love: '<ellipse class="mzc-white" cx="45" cy="72" rx="12" ry="13"/><ellipse class="mzc-white" cx="75" cy="72" rx="12" ry="13"/>' +
      '<path class="mzc-heart" d="' + HEART(46, 73, 10) + '"/><path class="mzc-heart" d="' + HEART(74, 73, 10) + '"/>' +
      '<path class="mzc-heart" d="' + HEART(106, 18, 7) + '"/><path class="mzc-dot" d="' + SPARK(96, 8, 4.5) + '"/>',
    think: EYES({ pr: 5.8, dx: -3, dy: -5 }) +
      '<path class="mzc-mark" d="M101 13q0-6 6-6t6 5q0 4-6 6v3"/><circle class="mzc-dot" cx="107" cy="27" r="2"/>' +
      '<circle class="mzc-dot" cx="94" cy="34" r="1.6"/><circle class="mzc-dot" cx="99" cy="36" r="1.6"/>',
    sleep: '<path class="mzc-shut" d="M36 72q9 8 18 0M66 72q9 8 18 0"/>' +
      '<path class="mzc-mark mzc-thin" d="M99 20h7l-7 8h7M108 8h5l-5 6h5"/>'
  };
  var FACES_SVG = Object.keys(FACES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + FACES[k] + '</g>'; }).join('');

  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<g class="mascot__head">' +
        '<path class="mzc-body mzc-tail" d="M99 103C113 104 105 87 114 80"/>' +
        '<path class="mzc-body" d="M24 52Q22 24 29 14q4-3 9 1l17 18Z"/><path class="mzc-body" d="M96 52q2-28-5-38-4-3-9 1L65 33Z"/>' +
        '<ellipse class="mzc-body" cx="60" cy="74" rx="46" ry="42"/>' +
        '<path class="mzc-gloss" d="M24 66q3-15 15-23M47 37q6-2 12-1.5"/>' +
        '<path class="mzc-nose" d="M57.5 87.5h5l-2.5 3Z"/>' +
        FACES_SVG +
      '</g>' +
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

  catButton.addEventListener('click', function () {
    if (hidden) {
      hidden = false;
      root.classList.remove('is-hidden');
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
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
