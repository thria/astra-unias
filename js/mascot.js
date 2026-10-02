// Mizu: el gato monstruito de Astra (personaje propio, estilo coreano minimalista, con 6 caras) que aparece abajo a la derecha
// con un globo de diálogo, al estilo de Clippy. Solo habla cuando la tocan: nunca habla sola.
// - Tocarla: la primera vez saluda; después comenta la sección que se está mirando o tira un tip.
// - "Ocultar": la achica (se recuerda en este navegador).
// - Con "reducir movimiento" no se anima, pero sigue funcionando.
(function () {
  var STORAGE_KEY = 'astra-mascot-hidden';
  var FIRST_DELAY = 800;    // sin cinemática: aparece (callada) casi enseguida
  var BUBBLE_TIME = 12000;  // cuánto queda visible cada mensaje

  var GREETING = '¡Hola! Soy Mizu, el gatito monstruo de Astra. Tocame y te cuento tips para tus uñas.';

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

  // Mizu: gato monstruito en estilo coreano minimalista (tipo Kakao / Line Friends).
  // Bolita rosa pastel con contorno negro grueso, orejas suaves con amarillo por dentro, panza blanca,
  // bracitos y patitas cortas, un mechón despeinado (imperfección linda) y la estrellita de Astra.
  // Tiene 6 caras que cambian según lo que pasa (data-mood en .mascot):
  //   idle (contento) · wow (sorprendido) · shy (tímido) · gossip (chismoso) · love (enamorado) · think (pensativo)
  var HEART = function (x, y, s) { // corazón centrado en (x, y), de tamaño s
    return 'M' + x + ' ' + (y + s * 0.55) + 'C' + (x - s * 1.1) + ' ' + (y - s * 0.1) + ' ' + (x - s * 0.55) + ' ' + (y - s * 0.95) + ' ' + x + ' ' + (y - s * 0.35) +
      'C' + (x + s * 0.55) + ' ' + (y - s * 0.95) + ' ' + (x + s * 1.1) + ' ' + (y - s * 0.1) + ' ' + x + ' ' + (y + s * 0.55) + 'Z';
  };
  var FACES = {
    idle:
      '<g class="mascot__eyes"><ellipse class="mz-ink" cx="44" cy="58" rx="5.5" ry="7"/><ellipse class="mz-ink" cx="76" cy="58" rx="5.5" ry="7"/>' +
      '<circle class="mz-white" cx="45.8" cy="55.4" r="1.9"/><circle class="mz-white" cx="77.8" cy="55.4" r="1.9"/></g>' +
      '<path class="mz-line" d="M54 69.5q6 6 12 0"/>',
    wow:
      '<circle class="mz-white mz-out" cx="44" cy="57" r="9"/><circle class="mz-white mz-out" cx="76" cy="57" r="9"/>' +
      '<circle class="mz-ink" cx="44" cy="58" r="4.6"/><circle class="mz-ink" cx="76" cy="58" r="4.6"/>' +
      '<circle class="mz-white" cx="45.6" cy="56.2" r="1.5"/><circle class="mz-white" cx="77.6" cy="56.2" r="1.5"/>' +
      '<path class="mz-line" d="M35 42l9-3M85 42l-9-3"/>' +
      '<ellipse class="mz-ink" cx="60" cy="74" rx="4" ry="5"/>' +
      '<path class="mz-line" d="M107 22v9"/><circle class="mz-ink" cx="107" cy="36" r="1.8"/>',
    shy:
      '<ellipse class="mz-ink" cx="43" cy="61" rx="4" ry="5"/><ellipse class="mz-ink" cx="73" cy="61" rx="4" ry="5"/>' +
      '<path class="mz-line" d="M53 72q2.3-2.2 4.6 0t4.6 0t4.6 0"/>' +
      '<path class="mz-line mz-thin" d="M27 67l-2 4M31.5 67l-2 4M36 67l-2 4M84 67l2 4M88.5 67l2 4M93 67l2 4"/>' +
      '<path class="mz-white mz-out" d="M103 30c-3 5-4 7-4 9a4 4 0 0 0 8 0c0-2-1-4-4-9Z"/>',
    gossip:
      '<path class="mz-ink" d="M38 58a6 6 0 0 0 12 0Z"/><path class="mz-ink" d="M70 58a6 6 0 0 0 12 0Z"/>' +
      '<path class="mz-line" d="M37 57.5h14M69 57.5h14M70 46q6-4 12 0"/>' +
      '<path class="mz-line" d="M53 71q8 4.5 14-3"/><path class="mz-white mz-out mz-thin" d="M57 72.4l1.6 3.4 1.6-3"/>',
    love:
      '<path class="mz-heart mz-out" d="' + HEART(44, 59, 9) + '"/><path class="mz-heart mz-out" d="' + HEART(76, 59, 9) + '"/>' +
      '<path class="mz-ink mz-out" d="M52.5 68.5q7.5 11 15 0Z"/><ellipse class="mz-tongue" cx="60" cy="74.2" rx="3.4" ry="1.9"/>' +
      '<path class="mz-heart mz-out mz-thin" d="' + HEART(106, 26, 5.5) + '"/>',
    think:
      '<ellipse class="mz-ink" cx="46" cy="55" rx="5" ry="6.5"/><ellipse class="mz-ink" cx="78" cy="55" rx="3.8" ry="5"/>' +
      '<path class="mz-line" d="M70 44l12 2"/>' +
      '<path class="mz-line" d="M54 72q3-3 6 0t6 0"/>' +
      '<path class="mz-line" d="M101 19q0-6 6-6t6 5q0 4-6 6v3"/><circle class="mz-ink" cx="107" cy="31.5" r="1.8"/>'
  };
  var faces = Object.keys(FACES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + FACES[k] + '</g>'; }).join('');

  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<path class="mz-tail-line" d="M82 114Q103 117 106 97"/>' +
      '<path class="mz-tail" d="M82 114Q103 117 106 97"/>' +
      '<ellipse class="mz-pink mz-out" cx="60" cy="100" rx="29" ry="21"/>' +
      '<ellipse class="mz-white" cx="60" cy="104" rx="14" ry="11"/>' +
      '<ellipse class="mz-pink mz-out" cx="48" cy="120" rx="9" ry="6"/><ellipse class="mz-pink mz-out" cx="72" cy="120" rx="9" ry="6"/>' +
      '<g class="mascot__arm--l"><ellipse class="mz-pink mz-out" cx="32" cy="98" rx="6" ry="9" transform="rotate(30 32 98)"/></g>' +
      '<g class="mascot__arm--wave"><ellipse class="mz-pink mz-out" cx="88" cy="98" rx="6" ry="9" transform="rotate(-30 88 98)"/></g>' +
      '<g class="mascot__head">' +
        '<path class="mz-pink mz-out" d="M21 42Q18 15 33 12q10 1 19 14Z"/><path class="mz-pink mz-out" d="M99 42q3-27-12-30-10 1-19 14Z"/>' +
        '<path class="mz-yellow" d="M27 35q-1-14 7-16 6 1 11 8Z"/><path class="mz-yellow" d="M93 35q1-14-7-16-6 1-11 8Z"/>' +
        '<ellipse class="mz-pink mz-out" cx="60" cy="56" rx="44" ry="37"/>' +
        '<path class="mz-line" d="M55 20q3-8 9-4"/>' +
        '<path class="mz-yellow mz-out mz-thin" d="M13 1c.6 4.4 3.2 7.1 8 8-4.8.9-7.4 3.6-8 8-.6-4.4-3.2-7.1-8-8 4.8-.9 7.4-3.6 8-8Z"/>' +
        '<ellipse class="mz-blush" cx="31" cy="70" rx="6.5" ry="3.6"/><ellipse class="mz-blush" cx="89" cy="70" rx="6.5" ry="3.6"/>' +
        faces +
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
  function mood(m) { root.dataset.mood = m; }
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
