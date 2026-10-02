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
  // Caras de Mizu (data-mood en .mascot): idle (contento) · wow (sorprendido) · shy (tímido)
  // gossip (chismoso) · love (enamorado) · think (pensativo). Todas sobre la "máscara" más clara de la cara.
  var HEART = function (x, y, s) { // corazón centrado en (x, y), de tamaño s
    return 'M' + x + ' ' + (y + s * 0.55) + 'C' + (x - s * 1.1) + ' ' + (y - s * 0.1) + ' ' + (x - s * 0.55) + ' ' + (y - s * 0.95) + ' ' + x + ' ' + (y - s * 0.35) +
      'C' + (x + s * 0.55) + ' ' + (y - s * 0.95) + ' ' + (x + s * 1.1) + ' ' + (y - s * 0.1) + ' ' + x + ' ' + (y + s * 0.55) + 'Z';
  };
  var RINGS = '<ellipse class="mascot__eye-ring" cx="44.5" cy="58" rx="12.5" ry="13.5"/><ellipse class="mascot__eye-ring" cx="75.5" cy="58" rx="12.5" ry="13.5"/>';
  var NOSE = '<path class="mascot__nose" d="M58 68.5h4c-.6 1.8-1.3 2.5-2 2.6-.7-.1-1.4-.8-2-2.6Z"/>';
  var SMILE = '<path class="mascot__mouth" d="M53.5 73.5Q60 74.6 66.5 73.5 65 83 60 83t-6.5-9.5Z"/><ellipse class="mascot__tongue" cx="60.5" cy="80.6" rx="3.6" ry="2.2"/>';
  var FACES = {
    idle:
      '<g class="mascot__eyes">' + RINGS +
        '<circle class="mascot__eye" cx="46.5" cy="60" r="8.8"/><circle class="mascot__eye" cx="73.5" cy="60" r="8.8"/>' +
        '<circle class="mascot__shine" cx="49.5" cy="56" r="3.1"/><circle class="mascot__shine" cx="76.5" cy="56" r="3.1"/>' +
        '<circle class="mascot__shine" cx="43.5" cy="64" r="1.4"/><circle class="mascot__shine" cx="70.5" cy="64" r="1.4"/>' +
      '</g>' + NOSE + SMILE + '<path class="mascot__fang" d="M55.6 73.9l1.5 3.2 1.4-3.1Z"/>',
    wow:
      '<ellipse class="mascot__eye-ring" cx="44.5" cy="57" rx="13.5" ry="14.5"/><ellipse class="mascot__eye-ring" cx="75.5" cy="57" rx="13.5" ry="14.5"/>' +
      '<circle class="mascot__eye" cx="44.5" cy="57.5" r="5"/><circle class="mascot__eye" cx="75.5" cy="57.5" r="5"/>' +
      '<circle class="mascot__shine" cx="46.3" cy="55.6" r="1.8"/><circle class="mascot__shine" cx="77.3" cy="55.6" r="1.8"/>' +
      NOSE + '<ellipse class="mascot__mouth" cx="60" cy="77.5" rx="3.6" ry="4.6"/>' +
      '<path class="mz-mark" d="M13 13v11"/><circle class="mz-mark-dot" cx="13" cy="30" r="2"/>',
    shy:
      RINGS +
      '<circle class="mascot__eye" cx="44.5" cy="63.5" r="7.5"/><circle class="mascot__eye" cx="75.5" cy="63.5" r="7.5"/>' +
      '<circle class="mascot__shine" cx="46.8" cy="61" r="2"/><circle class="mascot__shine" cx="77.8" cy="61" r="2"/>' +
      '<path class="mz-lid" clip-path="url(#mz-rings)" d="M31 53.5Q44.5 47.5 58 53.5V43H31ZM62 53.5Q75.5 47.5 89 53.5V43H62Z"/>' +
      '<path class="mz-dark" d="M31.5 53.5Q44.5 47.5 57.5 53.5M62.5 53.5Q75.5 47.5 88.5 53.5"/>' +
      NOSE + '<path class="mz-dark" d="M54 77q1.5-1.8 3-0t3 0 3 0 3 0"/>' +
      '<path class="mz-blush" d="M34 74l-2 3.5M38 74l-2 3.5M42 74l-2 3.5M78 74l2 3.5M82 74l2 3.5M86 74l2 3.5"/>' +
      '<path class="mz-drop" d="M14 16c-3 5-4 7-4 9a4 4 0 0 0 8 0c0-2-1-4-4-9Z"/>',
    gossip:
      RINGS +
      '<circle class="mascot__eye" cx="50" cy="61" r="7.5"/><circle class="mascot__eye" cx="81" cy="60" r="7.5"/>' +
      '<circle class="mascot__shine" cx="52.4" cy="58.4" r="2"/><circle class="mascot__shine" cx="83.4" cy="57.4" r="2"/>' +
      '<path class="mz-lid" clip-path="url(#mz-rings)" d="M31 58.5H58V43H31ZM62 52H89V43H62Z"/>' +
      '<path class="mz-dark" d="M31.5 58.5H57.5M62.5 52Q75.5 49 88.5 52"/>' +
      NOSE + '<path class="mz-dark mz-thick" d="M54 76.5Q62 80.5 67 73.5"/><path class="mascot__fang" d="M57.2 77.6l1.4 3 1.4-2.7Z"/>',
    love:
      RINGS +
      '<path class="mz-heart" d="' + HEART(44.5, 59, 9) + '"/><path class="mz-heart" d="' + HEART(75.5, 59, 9) + '"/>' +
      '<circle class="mascot__shine" cx="41.5" cy="55.5" r="1.8"/><circle class="mascot__shine" cx="72.5" cy="55.5" r="1.8"/>' +
      NOSE + SMILE +
      '<path class="mz-heart" d="' + HEART(14, 22, 6) + '"/>',
    think:
      '<ellipse class="mascot__eye-ring" cx="44.5" cy="58" rx="12.5" ry="13.5"/><ellipse class="mascot__eye-ring" cx="75.5" cy="59" rx="11" ry="12"/>' +
      '<circle class="mascot__eye" cx="41.5" cy="53" r="7.5"/><circle class="mascot__eye" cx="72.5" cy="54.5" r="6.5"/>' +
      '<circle class="mascot__shine" cx="43.8" cy="50.4" r="2"/><circle class="mascot__shine" cx="74.6" cy="52.2" r="1.8"/>' +
      NOSE + '<path class="mz-dark" d="M55 77q2.5-2.5 5 0t5 0"/>' +
      '<path class="mz-mark" d="M8 16q0-6 6-6t6 5q0 4-6 6v3"/><circle class="mz-mark-dot" cx="14" cy="29" r="2"/>'
  };
  var FACES_SVG = Object.keys(FACES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + FACES[k] + '</g>'; }).join('');
  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="mz-fur" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#3A2C34"/><stop offset="1" stop-color="#140D11"/></radialGradient>' +
        '<clipPath id="mz-rings"><ellipse cx="44.5" cy="58" rx="12.5" ry="13.5"/><ellipse cx="75.5" cy="58" rx="12.5" ry="13.5"/></clipPath>' +
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
        FACES_SVG +
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
