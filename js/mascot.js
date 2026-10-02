// Mizu: el gatito de Astra (personaje propio dibujado a mano, estilo garabato de tinta, con caras de manga) que aparece abajo a la derecha
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

  // Mizu: gatito dibujado a mano (estilo garabato de tinta): cabeza blanca con trazo negro grueso e
  // irregular (filtro SVG que "tiembla" el borde, como pincel), caras y símbolos de manga.
  // Cada ánimo es un dibujo completo (cambian también las orejas y la postura de la cabeza):
  //   idle · wow (mouse encima) · love (saludo, ojos brillantes) · gossip (ojos afilados + chispa)
  //   grumpy (si lo tocan muchas veces seguidas, con venita 💢) · shy (al ocultarse, ojos llorosos)
  //   think (tips: espía desde abajo con dientes) · sleep (acostado con la lengua afuera, zzz)
  var HEAD = 'M22 84C18 58 36 45 60 45s42 13 38 39c-2 16-16 24-38 24S24 100 22 84Z';
  var EARS = '<path class="mzi-fill" d="M27 62 31 18q4-4 8 0l17 29Z"/><path class="mzi-fill" d="M93 62 89 18q-4-4-8 0L64 47Z"/>' +
    '<path class="mzi-line mzi-thin" d="M35 28l5 13M85 28l-5 13"/>';
  var head = function (inner, ears) { return (ears === undefined ? EARS : ears) + '<path class="mzi-fill" d="' + HEAD + '"/>' + inner; };
  var STAR = function (x, y, r) { // destello de 4 puntas
    return '<path class="mzi-ink mzi-out" d="M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) +
      'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'Z"/>';
  };
  var BURST = function (x, y, r) { // estallido de 8 puntas
    var d = '';
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2, rr = i % 2 ? r * 0.38 : r;
      d += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1);
    }
    return '<path class="mzi-ink mzi-out" d="' + d + 'Z"/>';
  };
  var MOUTH = '<path class="mzi-line mzi-thin" d="M55 88q2.5 3 5 0 2.5 3 5 0"/>';
  var FACES = {
    idle: head('<g class="mascot__eyes"><ellipse class="mzi-ink" cx="47" cy="76" rx="5" ry="6.5"/><ellipse class="mzi-ink" cx="73" cy="76" rx="5" ry="6.5"/>' +
      '<circle class="mzi-white" cx="48.6" cy="73.6" r="1.8"/><circle class="mzi-white" cx="74.6" cy="73.6" r="1.8"/></g>' + MOUTH),
    wow: head('<circle class="mzi-fill" cx="46" cy="75" r="9.5"/><circle class="mzi-fill" cx="74" cy="75" r="9.5"/>' +
      '<circle class="mzi-ink" cx="46" cy="75" r="3.4"/><circle class="mzi-ink" cx="74" cy="75" r="3.4"/>' +
      '<ellipse class="mzi-ink" cx="60" cy="91" rx="2.6" ry="3.2"/>') +
      '<path class="mzi-line mzi-out" d="M104 30v11M112 27v11"/><circle class="mzi-ink mzi-out" cx="104" cy="47" r="2.2"/><circle class="mzi-ink mzi-out" cx="112" cy="44" r="2.2"/>',
    love: head('<circle class="mzi-ink" cx="46" cy="76" r="10"/><circle class="mzi-ink" cx="74" cy="76" r="10"/>' +
      '<circle class="mzi-white" cx="43" cy="72.5" r="4"/><circle class="mzi-white" cx="71" cy="72.5" r="4"/>' +
      '<circle class="mzi-white" cx="49.5" cy="80" r="2.4"/><circle class="mzi-white" cx="77.5" cy="80" r="2.4"/>' +
      '<path class="mzi-line mzi-thin" d="M38 64.5l-2-3.5M44 62.5l-.5-4M50 63.5l1.5-3.5M70 63.5l-1.5-3.5M76 62.5l.5-4M82 64.5l2-3.5"/>' +
      '<path class="mzi-blush" d="M53 90l2-3M56.5 90l2-3M60 90l2-3M63.5 90l2-3"/>') +
      STAR(13, 66, 7) + STAR(106, 100, 6) + '<path class="mzi-heart" d="M108 34c-6-4-8-8-5-11 2-2 4-1 5 1 1-2 3-3 5-1 3 3 1 7-5 11Z"/>',
    gossip: head('<path class="mzi-fill" d="M33 75q10-9 22-2-7 11-22 2Z"/><path class="mzi-fill" d="M87 75q-10-9-22-2 7 11 22 2Z"/>' +
      '<circle class="mzi-ink" cx="49.5" cy="74.5" r="4.6"/><circle class="mzi-ink" cx="70.5" cy="74.5" r="4.6"/>' +
      '<path class="mzi-line mzi-thin" d="M56 89q4 2 8 0"/>',
      '<path class="mzi-fill" d="M27 62 31 18q4-4 8 0l17 29Z"/><path class="mzi-fill" d="M93 62 89 18q-4-4-8 0L64 47Z"/>' +
      '<path class="mzi-ink" d="M33 24q4-3 6 0l8 17-12 9Z"/>') + BURST(14, 60, 10),
    grumpy: head('<path class="mzi-line mzi-thick" d="M36 75h17M67 75h17"/>' +
      '<path class="mzi-ink" d="M38 76a7 6 0 0 0 14 0Z"/><path class="mzi-ink" d="M68 76a7 6 0 0 0 14 0Z"/>' +
      '<path class="mzi-fill" d="M47 87q13 9 26 0-13 3-26 0Z"/><path class="mzi-line mzi-thin" d="M54 89.5v3"/>',
      '<path class="mzi-fill" d="M27 62 31 18q4-4 8 0l17 29Z"/><path class="mzi-fill" d="M70 50q18-22 40-8 2 6-6 8-14-6-28 10Z"/>') +
      '<path class="mzi-line mzi-out" d="M8 50q6 0 6-6M20 44q0 6 6 6M8 56q6 0 6 6M26 56q-6 0-6 6"/>',
    shy: head('<circle class="mzi-ink" cx="46" cy="76" r="10.5"/><circle class="mzi-ink" cx="74" cy="76" r="10.5"/>' +
      '<circle class="mzi-white" cx="42.5" cy="72" r="4.6"/><circle class="mzi-white" cx="70.5" cy="72" r="4.6"/>' +
      '<circle class="mzi-white" cx="49.5" cy="80.5" r="2"/><circle class="mzi-white" cx="77.5" cy="80.5" r="2"/>' +
      '<path class="mzi-tear" d="M38 86q8 4 16 0M66 86q8 4 16 0"/>' +
      '<path class="mzi-fill" d="M34 108q0-9 9-9t9 9Z"/><path class="mzi-fill" d="M68 108q0-9 9-9t9 9Z"/>',
      '<path class="mzi-fill" d="M30 66Q6 62 6 80q2 7 24 0Z"/><path class="mzi-fill" d="M90 66q24-4 24 14-2 7-24 0Z"/>') +
      '<path class="mzi-line mzi-thin mzi-out" d="M104 50v13M110 47v14M116 50v11"/>',
    think: '<path class="mzi-fill" d="M30 80 36 48q4-4 8 0l13 24Z"/><path class="mzi-fill" d="M76 72q16-20 34-10 2 7-6 9-12-4-22 9Z"/>' +
      '<path class="mzi-ink" d="M101 62q6-1 9 0 2 7-6 9-3-3-3-9Z"/>' +
      '<path class="mzi-fill" d="M18 100c-2-18 18-28 42-28s44 10 42 28c-1 10-16 14-42 14s-41-4-42-14Z"/>' +
      '<path class="mzi-line mzi-thick" d="M38 94h16M66 94h16"/>' +
      '<path class="mzi-fill" d="M54 103h12v6H54Z"/><path class="mzi-line mzi-thin" d="M60 103v6"/>',
    sleep: '<path class="mzi-ink" d="M44 82Q22 66 10 70q-2 8 24 20Z"/><path class="mzi-fill" d="M38 88Q14 80 8 88q2 8 30 10Z"/>' +
      '<path class="mzi-fill" d="M16 100c-2-14 20-22 46-21 26 1 44 9 42 21-1 9-18 13-44 13s-43-4-44-13Z"/>' +
      '<path class="mzi-line mzi-thick" d="M66 98h13"/>' +
      '<path class="mzi-tongue" d="M84 108q3 9 10 4 1-5-6-6Z"/>' +
      '<path class="mzi-line mzi-out" d="M86 62h9l-9 9h9M100 48h7l-7 7h7"/>'
  };
  var FACES_SVG = Object.keys(FACES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + FACES[k] + '</g>'; }).join('');

  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<defs><filter id="mzi-ink" x="-8%" y="-8%" width="116%" height="116%">' + // trazo de pincel: bordes que tiemblan apenas
        '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="5" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs>' +
      '<g class="mascot__head" filter="url(#mzi-ink)">' + FACES_SVG + '</g>' +
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
