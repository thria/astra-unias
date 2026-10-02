// Mizu: el monstruito de Astra (bolita peluda negra, petisa y simpática, con 6 caras según lo que pasa) que aparece abajo a la derecha
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

  // Mizu: monstruito de peluche. Cuerpo rechoncho en forma de huevo, pelo negro suave (textura y borde
  // esponjoso con un filtro SVG), carita y pancita color crema, orejas de felpa rosa, bracitos y patitas
  // acolchados, ojitos de botón y cachetes rosados. Volumen con luces suaves, sin contornos.
  // Caras (data-mood en .mascot): idle · wow · shy · gossip · love · think · sleep
  var HEART = function (x, y, s) { // corazón centrado en (x, y), de tamaño s
    return 'M' + x + ' ' + (y + s * 0.55) + 'C' + (x - s * 1.1) + ' ' + (y - s * 0.1) + ' ' + (x - s * 0.55) + ' ' + (y - s * 0.95) + ' ' + x + ' ' + (y - s * 0.35) +
      'C' + (x + s * 0.55) + ' ' + (y - s * 0.95) + ' ' + (x + s * 1.1) + ' ' + (y - s * 0.1) + ' ' + x + ' ' + (y + s * 0.55) + 'Z';
  };
  var EYES = function (dy, rx, ry, dx) { // ojitos de botón con brillo
    dx = dx || 0;
    return '<ellipse class="mzp-eye" cx="' + (49 + dx) + '" cy="' + (57 + dy) + '" rx="' + rx + '" ry="' + ry + '"/>' +
      '<ellipse class="mzp-eye" cx="' + (71 + dx) + '" cy="' + (57 + dy) + '" rx="' + rx + '" ry="' + ry + '"/>' +
      '<circle class="mzp-shine" cx="' + (50.3 + dx) + '" cy="' + (55.3 + dy) + '" r="1.25"/><circle class="mzp-shine" cx="' + (72.3 + dx) + '" cy="' + (55.3 + dy) + '" r="1.25"/>';
  };
  var FACES = {
    idle: '<g class="mascot__eyes">' + EYES(0, 3.6, 4.4) + '</g><path class="mzp-line" d="M56 64.5q4 3.6 8 0"/>',
    wow: EYES(-0.5, 4, 5) + '<ellipse class="mzp-eye" cx="60" cy="67" rx="2.4" ry="3"/>' +
      '<path class="mzp-mark" d="M14 13v10"/><circle class="mzp-mark-dot" cx="14" cy="28.5" r="1.9"/>',
    shy: EYES(2.5, 3.1, 3.7) + '<path class="mzp-line" d="M57 66q3 2.2 6 0"/>' +
      '<path class="mzp-blush-line" d="M39 66l-1.6 3M42.5 66l-1.6 3M77.5 66l1.6 3M81 66l1.6 3"/>',
    gossip: '<path class="mzp-eye" d="M45.5 57a3.6 3.6 0 0 0 7.2 0Z"/><path class="mzp-eye" d="M67.5 56a3.6 3.6 0 0 0 7.2 0Z"/>' +
      '<path class="mzp-line" d="M44.5 57h9M66.5 54q4.5-2.2 9 0"/><path class="mzp-line" d="M55 64.5q6 3.5 10.5-2"/>',
    love: '<path class="mzp-line mzp-thick" d="M45 58q4-5 8 0M67 58q4-5 8 0"/>' +
      '<path class="mzp-eye" d="M55 62.5q5 7.5 10 0Z"/><ellipse class="mzp-tongue" cx="60" cy="66.2" rx="2.6" ry="1.5"/>' +
      '<path class="mzp-heart" d="' + HEART(14, 22, 6) + '"/>',
    think: EYES(-2.5, 3.4, 4.2, -1.5) + '<path class="mzp-line" d="M56 66q2-2 4 0t4 0"/>' +
      '<path class="mzp-mark" d="M9 16q0-6 6-6t6 5q0 4-6 6v3"/><circle class="mzp-mark-dot" cx="15" cy="29" r="1.9"/>',
    sleep: '<path class="mzp-line mzp-thick" d="M45 57q4 4 8 0M67 57q4 4 8 0"/><ellipse class="mzp-eye" cx="60" cy="66" rx="1.8" ry="2.2"/>' +
      '<path class="mzp-mark mzp-z" d="M8 24h6l-6 6h6M16 13h4.5l-4.5 4.5h4.5"/>'
  };
  var FACES_SVG = Object.keys(FACES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + FACES[k] + '</g>'; }).join('');

  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<defs>' +
        // pelo de peluche: borde apenas desparejo + pelusitas claras encima
        '<filter id="mzp-plush" x="-10%" y="-10%" width="120%" height="120%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
          '<feTurbulence type="fractalNoise" baseFrequency="1.1 1.4" numOctaves="2" seed="8" result="g"/>' +
          '<feColorMatrix in="g" type="matrix" values="0 0 0 0 1  0 0 0 0 0.92  0 0 0 0 0.95  0.4 0 0 0 -0.2" result="gw"/>' +
          '<feComposite in="gw" in2="d" operator="in" result="tex"/>' +
          '<feMerge><feMergeNode in="d"/><feMergeNode in="tex"/></feMerge>' +
        '</filter>' +
        '<radialGradient id="mzp-fur" cx="36%" cy="28%" r="80%"><stop offset="0" stop-color="#4A3B44"/><stop offset=".55" stop-color="#261C22"/><stop offset="1" stop-color="#140E12"/></radialGradient>' +
        '<radialGradient id="mzp-cream" cx="45%" cy="35%" r="75%"><stop offset="0" stop-color="#FFF6EE"/><stop offset="1" stop-color="#EBD3C4"/></radialGradient>' +
        '<radialGradient id="mzp-felt" cx="50%" cy="70%" r="80%"><stop offset="0" stop-color="#F9B7CB"/><stop offset="1" stop-color="#E890AE"/></radialGradient>' +
      '</defs>' +
      '<ellipse class="mzp-shadow" cx="60" cy="126.5" rx="34" ry="3.8"/>' +
      '<g filter="url(#mzp-plush)">' +
        '<ellipse class="mzp-fur" cx="44" cy="118" rx="12.5" ry="8"/><ellipse class="mzp-fur" cx="76" cy="118" rx="12.5" ry="8"/>' +
        '<ellipse class="mzp-pad" cx="44" cy="120" rx="6" ry="3.4"/><ellipse class="mzp-pad" cx="76" cy="120" rx="6" ry="3.4"/>' +
      '</g>' +
      '<g class="mascot__head">' +
        '<g filter="url(#mzp-plush)">' +
          '<path class="mzp-fur" d="M27 42C23 23 28 10 36 9c6 0 12 9 16 17Z"/><path class="mzp-fur" d="M93 42c4-19-1-32-9-33-6 0-12 9-16 17Z"/>' +
          '<path class="mzp-felt" d="M31 35c-2-11 1-18 5-19 4 0 7 5 10 10Z"/><path class="mzp-felt" d="M89 35c2-11-1-18-5-19-4 0-7 5-10 10Z"/>' +
          '<path class="mzp-fur" d="M60 19C89 19 103 44 103 71c0 28-17 48-43 48S17 99 17 71C17 44 31 19 60 19Z"/>' +
          '<path class="mzp-fur" d="M53 23q3-7 7-1 3-7 7 0"/>' +
          '<ellipse class="mzp-cream" cx="60" cy="59" rx="25.5" ry="20.5"/>' +
          '<ellipse class="mzp-cream" cx="60" cy="98" rx="17" ry="14"/>' +
        '</g>' +
        '<ellipse class="mzp-rim" cx="60" cy="59" rx="25.5" ry="20.5"/>' +
        '<ellipse class="mzp-blush" cx="41.5" cy="65" rx="5" ry="3"/><ellipse class="mzp-blush" cx="78.5" cy="65" rx="5" ry="3"/>' +
        '<path class="mascot__star" d="M103 8c.5 3.6 2.6 5.8 6.5 6.5-3.9.7-6 2.9-6.5 6.5-.5-3.6-2.6-5.8-6.5-6.5 3.9-.7 6-2.9 6.5-6.5Z"/>' +
        FACES_SVG +
      '</g>' +
      '<g class="mascot__arm--l"><g filter="url(#mzp-plush)"><ellipse class="mzp-fur" cx="22" cy="84" rx="8.5" ry="12.5" transform="rotate(22 22 84)"/>' +
        '<ellipse class="mzp-pad" cx="19" cy="93" rx="4.2" ry="3.2" transform="rotate(22 19 93)"/></g></g>' +
      '<g class="mascot__arm--wave"><g filter="url(#mzp-plush)"><ellipse class="mzp-fur" cx="98" cy="84" rx="8.5" ry="12.5" transform="rotate(-22 98 84)"/>' +
        '<ellipse class="mzp-pad" cx="101" cy="93" rx="4.2" ry="3.2" transform="rotate(-22 101 93)"/></g></g>' +
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
