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
  var MOUTH = '<path class="mzi-line mzi-thin" d="M55 94q2.5 3 5 0 2.5 3 5 0"/>';
  // Cabeza y orejas de cada ánimo (con el trazo de pincel). Los ojos van aparte, nítidos (EYES, más abajo).
  var FACES = {
    idle: head(MOUTH),
    wow: head('<ellipse class="mzi-ink" cx="60" cy="95" rx="2.6" ry="3.2"/>') +
      '<path class="mzi-line mzi-out" d="M104 30v11M112 27v11"/><circle class="mzi-ink mzi-out" cx="104" cy="47" r="2.2"/><circle class="mzi-ink mzi-out" cx="112" cy="44" r="2.2"/>',
    love: head('<path class="mzi-blush" d="M51 96l2-3M54.5 96l2-3M58 96l2-3M61.5 96l2-3M65 96l2-3"/>') +
      STAR(13, 66, 7) + STAR(106, 100, 6) + '<path class="mzi-heart" d="M108 34c-6-4-8-8-5-11 2-2 4-1 5 1 1-2 3-3 5-1 3 3 1 7-5 11Z"/>',
    gossip: head('<path class="mzi-fill" d="M33 75q10-9 22-2-7 11-22 2Z"/><path class="mzi-fill" d="M87 75q-10-9-22-2 7 11 22 2Z"/>' +
      '<circle class="mzi-ink" cx="49.5" cy="74.5" r="4.6"/><circle class="mzi-ink" cx="70.5" cy="74.5" r="4.6"/>' +
      '<circle class="mzi-white" cx="50.8" cy="72.8" r="1.5"/><circle class="mzi-white" cx="71.8" cy="72.8" r="1.5"/>' +
      '<path class="mzi-line mzi-thin" d="M56 89q4 2 8 0"/>',
      '<path class="mzi-fill" d="M27 62 31 18q4-4 8 0l17 29Z"/><path class="mzi-fill" d="M93 62 89 18q-4-4-8 0L64 47Z"/>' +
      '<path class="mzi-ink" d="M33 24q4-3 6 0l8 17-12 9Z"/>') + BURST(14, 60, 10),
    grumpy: head('<path class="mzi-line mzi-thick" d="M36 75h17M67 75h17"/>' +
      '<path class="mzi-ink" d="M38 76a7 6 0 0 0 14 0Z"/><path class="mzi-ink" d="M68 76a7 6 0 0 0 14 0Z"/>' +
      '<path class="mzi-fill" d="M47 87q13 9 26 0-13 3-26 0Z"/><path class="mzi-line mzi-thin" d="M54 89.5v3"/>',
      '<path class="mzi-fill" d="M27 62 31 18q4-4 8 0l17 29Z"/><path class="mzi-fill" d="M70 50q18-22 40-8 2 6-6 8-14-6-28 10Z"/>') +
      '<path class="mzi-line mzi-out" d="M8 50q6 0 6-6M20 44q0 6 6 6M8 56q6 0 6 6M26 56q-6 0-6 6"/>',
    shy: head('<path class="mzi-line mzi-thin" d="M55 97q2.5-2.2 5 0t5 0"/>' +
      '<path class="mzi-fill" d="M34 108q0-9 9-9t9 9Z"/><path class="mzi-fill" d="M68 108q0-9 9-9t9 9Z"/>',
      '<path class="mzi-fill" d="M30 66Q6 62 6 80q2 7 24 0Z"/><path class="mzi-fill" d="M90 66q24-4 24 14-2 7-24 0Z"/>') +
      '<path class="mzi-line mzi-thin mzi-out" d="M104 50v13M110 47v14M116 50v11"/>',
    think: '<path class="mzi-fill" d="M30 80 36 48q4-4 8 0l13 24Z"/><path class="mzi-fill" d="M76 72q16-20 34-10 2 7-6 9-12-4-22 9Z"/>' +
      '<path class="mzi-ink" d="M101 62q6-1 9 0 2 7-6 9-3-3-3-9Z"/>' +
      '<path class="mzi-fill" d="M18 100c-2-18 18-28 42-28s44 10 42 28c-1 10-16 14-42 14s-41-4-42-14Z"/>' +
      '<path class="mzi-fill" d="M54 106h12v5.5H54Z"/><path class="mzi-line mzi-thin" d="M60 106v5.5"/>',
    sleep: '<path class="mzi-ink" d="M44 82Q22 66 10 70q-2 8 24 20Z"/><path class="mzi-fill" d="M38 88Q14 80 8 88q2 8 30 10Z"/>' +
      '<path class="mzi-fill" d="M16 100c-2-14 20-22 46-21 26 1 44 9 42 21-1 9-18 13-44 13s-43-4-44-13Z"/>' +
      '<path class="mzi-line mzi-thick" d="M66 98h13"/>' +
      '<path class="mzi-tongue" d="M84 108q3 9 10 4 1-5-6-6Z"/>' +
      '<path class="mzi-line mzi-out" d="M86 62h9l-9 9h9M100 48h7l-7 7h7"/>'
  };

  // Ojos de anime (nítidos, sin el temblor del pincel): blanco grande, iris oscuro con profundidad,
  // brillo grande + brillitos, reflejo húmedo abajo y pestañas. Opciones:
  //   s (tamaño), look [dx, dy] (hacia dónde mira), small (pupila chiquita, sorpresa),
  //   star (brillo en forma de estrella), sad (vidriosos: lágrimas acumuladas, cejas preocupadas y una gota)
  function animeEye(cx, cy, side, o) {
    o = o || {};
    var s = o.s || 1, dx = (o.look || [0, 0])[0], dy = (o.look || [0, 0])[1], k = o.small ? 0.5 : 1;
    var ix = cx + dx, iy = cy + dy + 1.5 * s, f = function (n) { return n.toFixed(1); };
    // sin contorno alrededor: ojo grande casi negro (solo en la sorpresa se ve el blanco alrededor de la pupila)
    var out = (o.small ? '<ellipse class="mzi-sclera" cx="' + cx + '" cy="' + cy + '" rx="' + f(11 * s) + '" ry="' + f(13 * s) + '"/>' : '') +
      '<ellipse class="mzi-iris" cx="' + f(ix) + '" cy="' + f(iy) + '" rx="' + f(10 * s * k) + '" ry="' + f(12.5 * s * k) + '"/>' +
      '<ellipse class="mzi-pupil" cx="' + f(ix) + '" cy="' + f(iy - 1.5 * s) + '" rx="' + f(5.2 * s * k) + '" ry="' + f(6.8 * s * k) + '"/>';
    if (!o.small) out += '<path class="mzi-gloss" d="M' + f(ix - 6 * s) + ' ' + f(iy + 5 * s) + 'Q' + f(ix) + ' ' + f(iy + 10.5 * s) + ' ' + f(ix + 6 * s) + ' ' + f(iy + 5 * s) + '"/>';
    if (o.star) {
      var sx = ix - 3 * s, sy = iy - 3.5 * s, r = 5 * s;
      out += '<path class="mzi-white" d="M' + f(sx) + ' ' + f(sy - r) + 'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx + r) + ' ' + f(sy) + 'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx) + ' ' + f(sy + r) +
        'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx - r) + ' ' + f(sy) + 'Q' + f(sx) + ' ' + f(sy) + ' ' + f(sx) + ' ' + f(sy - r) + 'Z"/>';
    } else {
      out += '<ellipse class="mzi-white" cx="' + f(ix - 3.4 * s * k) + '" cy="' + f(iy - 4 * s * k) + '" rx="' + f(3.8 * s * k) + '" ry="' + f(4.8 * s * k) + '" transform="rotate(-25 ' + f(ix - 3.4 * s * k) + ' ' + f(iy - 4 * s * k) + ')"/>';
    }
    out += '<circle class="mzi-white" cx="' + f(ix + 3.8 * s * k) + '" cy="' + f(iy + 4.6 * s * k) + '" r="' + f(1.9 * s * k) + '"/>' +
      '<circle class="mzi-white" cx="' + f(ix + 4.6 * s * k) + '" cy="' + f(iy - 4.8 * s * k) + '" r="' + f(1 * s * k) + '"/>';
    if (o.sad) { // ojos vidriosos: lágrimas acumuladas que brillan, más destellos y una gota que se escapa
      out += '<path class="mzi-pool" d="M' + f(cx - 11 * s) + ' ' + f(cy + 3 * s) + 'Q' + cx + ' ' + f(cy + 17 * s) + ' ' + f(cx + 11 * s) + ' ' + f(cy + 3 * s) +
        'Q' + cx + ' ' + f(cy + 8 * s) + ' ' + f(cx - 11 * s) + ' ' + f(cy + 3 * s) + 'Z"/>' +
        '<path class="mzi-wave" d="M' + f(cx - 9.5 * s) + ' ' + f(cy + 5 * s) + 'q2.4-1.8 4.8 0t4.8 0 4.8 0 4.8 0"/>' +
        '<circle class="mzi-white" cx="' + f(ix - 5 * s) + '" cy="' + f(iy + 2 * s) + '" r="' + f(1.3 * s) + '"/>' +
        '<circle class="mzi-white" cx="' + f(ix + 1 * s) + '" cy="' + f(iy - 7 * s) + '" r="' + f(0.9 * s) + '"/>' +
        '<path class="mzi-drop" d="M' + f(cx + side * 12 * s) + ' ' + f(cy + 8 * s) + 'q' + f(side * 2.5) + ' 4 0 6.5q' + f(-side * 2.5) + '-2.5 0-6.5Z"/>' +
        '<path class="mzi-line" d="M' + f(cx - side * 8 * s) + ' ' + f(cy - 20 * s) + 'Q' + cx + ' ' + f(cy - 23 * s) + ' ' + f(cx + side * 9 * s) + ' ' + f(cy - 26 * s) + '"/>';
    }
    // párpado y pestañas: arco grueso arriba con un flequillo hacia afuera
    if (!o.small) out += '<path class="mzi-lash" d="M' + f(cx - 10.5 * s) + ' ' + f(cy - 3 * s) + 'Q' + f(cx - 1) + ' ' + f(cy - 17.5 * s) + ' ' + f(cx + 10.5 * s) + ' ' + f(cy - 3 * s) +
      'M' + f(cx + side * 10.5 * s) + ' ' + f(cy - 3 * s) + 'l' + f(side * 3.5 * s) + ' ' + f(-3 * s) + '"/>';
    return out;
  }
  var pair = function (cy, o, l, r) { return animeEye(l || 45, cy, -1, o) + animeEye(r || 75, cy, 1, o); };
  var EYES = {
    idle: '<g class="mascot__eyes">' + pair(73, { s: 1.25, look: [1, 0] }, 43, 77) + '</g>',
    wow: pair(72, { s: 1.15, small: true }, 44, 76),
    love: pair(73, { s: 1.25, star: true }, 43, 77),
    shy: pair(74, { s: 1.32, sad: true, look: [0, 2] }, 43, 77),
    think: pair(90, { s: 0.85, look: [-2, -3] }, 44, 76)
  };

  var FACES_SVG = Object.keys(FACES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + FACES[k] + '</g>'; }).join('');
  var EYES_SVG = Object.keys(EYES).map(function (k) { return '<g class="mz-face" data-face="' + k + '">' + EYES[k] + '</g>'; }).join('');

  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<defs><filter id="mzi-ink" x="-8%" y="-8%" width="116%" height="116%">' + // trazo de pincel: bordes que tiemblan apenas
        '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="5" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>' +
      '<radialGradient id="mzi-iris-g" cx="50%" cy="85%" r="70%"><stop offset="0" stop-color="#5A3550"/><stop offset=".45" stop-color="#1E1219"/><stop offset="1" stop-color="#0A0608"/></radialGradient>' +
      '</defs>' +
      '<g class="mascot__head"><g filter="url(#mzi-ink)">' + FACES_SVG + '</g>' + EYES_SVG + '</g>' +
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
