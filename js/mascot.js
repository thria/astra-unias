// Mizu: el gatito de Astra (personaje propio, kawaii sofisticado en pasteles) que aparece abajo a la derecha
// con un globo de diálogo, al estilo de Clippy. Solo habla cuando la tocan: nunca habla sola.
// - Tocarla: la primera vez saluda; después comenta la sección que se está mirando o tira un tip.
// - "Ocultar": la achica (se recuerda en este navegador).
// - Con "reducir movimiento" no se anima, pero sigue funcionando.
(function () {
  var STORAGE_KEY = 'astra-mascot-hidden';
  var FIRST_DELAY = 800;    // sin cinemática: aparece (callada) casi enseguida
  var BUBBLE_TIME = 12000;  // cuánto queda visible cada mensaje

  var GREETING = '¡Hola! Soy Mizu, el gatito de Astra. Tocame y te cuento tips para tus uñas.';

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
    trabajos: 'Tocá cualquier foto para verla en Instagram. Hay más de 280 trabajos.',
    'local-titulo': 'El estudio está por Plaza Belgrano, en La Plata. La dirección exacta te la pasa al reservar.',
    servicios: 'Arrastrá las uñas 3D para girarlas y verlas de cerca.',
    opiniones: 'Estas son algunas opiniones de clientas de Astra. ¡Gracias por tanto amor!',
    agenda: 'Elegí un día con puntitos y tocá un horario libre para pedir tu turno.'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hidden = false;
  try { hidden = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}

  // Mizu: gatito kawaii sofisticado en pasteles (crema, manchas amarillas, rosa). Formas redondeadas,
  // contorno fino color moca, ojos grandes y amables, bigotes finos, moñito rosa con cascabel dorado
  // y la estrellita de Astra junto a la oreja.
  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="mz-iris" cx="50%" cy="70%" r="70%"><stop offset="0" stop-color="#9A5C7A"/><stop offset=".55" stop-color="#4B2A3B"/><stop offset="1" stop-color="#2B1822"/></radialGradient>' +
        '<radialGradient id="mz-ear" cx="50%" cy="80%" r="80%"><stop offset="0" stop-color="#F9B7CB"/><stop offset="1" stop-color="#FBD8E3"/></radialGradient>' +
        '<clipPath id="mz-head-clip"><ellipse cx="58" cy="55" rx="44" ry="36"/></clipPath>' +
      '</defs>' +
      '<g class="mascot__tail">' +
        '<path class="mascot__tail-line" d="M78 114C100 121 113 105 107 90c-4-10-14-9-13-1"/>' +
        '<path class="mascot__tail-fill" d="M78 114C100 121 113 105 107 90c-4-10-14-9-13-1"/>' +
      '</g>' +
      '<ellipse class="mascot__body" cx="56" cy="102" rx="27" ry="22"/>' +
      '<ellipse class="mascot__chest" cx="56" cy="107" rx="12.5" ry="12"/>' +
      '<ellipse class="mascot__body mascot__paw" cx="44" cy="122" rx="8.5" ry="6"/>' +
      '<ellipse class="mascot__body mascot__paw" cx="66" cy="122" rx="8.5" ry="6"/>' +
      '<path class="mascot__toe" d="M41.5 120.5v3M46.5 120.5v3M63.5 120.5v3M68.5 120.5v3"/>' +
      '<g class="mascot__head">' +
        '<path class="mascot__body mascot__ear-patch" d="M18 46C15 26 21 11 30 8c7-2 15 8 22 17Z"/>' +
        '<path class="mascot__body" d="M64 25c7-9 15-19 23-17 9 3 15 18 12 38Z"/>' +
        '<path class="mascot__ear-in" d="M24 38c-1-13 3-21 7-23 4-1 9 4 13 10Z"/>' +
        '<path class="mascot__ear-in" d="M72 25c5-6 10-11 14-10 5 2 8 12 7 24Z"/>' +
        '<ellipse class="mascot__body" cx="58" cy="55" rx="44" ry="36"/>' +
        '<g clip-path="url(#mz-head-clip)"><ellipse class="mascot__patch" cx="28" cy="26" rx="23" ry="15" transform="rotate(-18 28 26)"/>' +
          '</g>' +
        '<ellipse class="mascot__head-line" cx="58" cy="55" rx="44" ry="36"/>' +
        '<path class="mascot__star" d="M106 2c.6 4.4 3.2 7.1 8 8-4.8.9-7.4 3.6-8 8-.6-4.4-3.2-7.1-8-8 4.8-.9 7.4-3.6 8-8Z"/>' +
        '<ellipse class="mascot__blush" cx="29" cy="71" rx="7.5" ry="3.6"/><ellipse class="mascot__blush" cx="87" cy="71" rx="7.5" ry="3.6"/>' +
        '<path class="mascot__whisker" d="M22 64Q11 61 2 62M22 69Q11 69 1 72M94 64Q105 61 114 62M94 69Q105 69 115 72"/>' +
        '<g class="mascot__eyes">' +
          '<ellipse class="mascot__eye" cx="40" cy="57" rx="10" ry="12"/><ellipse class="mascot__eye" cx="76" cy="57" rx="10" ry="12"/>' +
          '<ellipse class="mascot__eye-glow" cx="40" cy="64" rx="6" ry="3"/><ellipse class="mascot__eye-glow" cx="76" cy="64" rx="6" ry="3"/>' +
          '<circle class="mascot__shine" cx="43.5" cy="52" r="3.6"/><circle class="mascot__shine" cx="79.5" cy="52" r="3.6"/>' +
          '<circle class="mascot__shine" cx="36.5" cy="62.5" r="1.6"/><circle class="mascot__shine" cx="72.5" cy="62.5" r="1.6"/>' +
          '<path class="mascot__lash" d="M30 56.5Q29.5 44.5 40 44.5T50 56.5M30.4 51.5 26 48M66 56.5Q65.5 44.5 76 44.5T86 56.5M85.6 51.5 90 48"/>' +
        '</g>' +
        '<path class="mascot__nose" d="M55 66h6c-.8 2.6-2 3.6-3 3.8-1-.2-2.2-1.2-3-3.8Z"/>' +
        '<path class="mascot__mouth" d="M52 72.5c1.6 2.4 4.4 2.4 6 0 1.6 2.4 4.4 2.4 6 0"/>' +
      '</g>' +
      '<path class="mascot__ribbon" d="M35 85.5Q56 95 79 85.5"/>' +
      '<g class="mascot__bow">' +
        '<path d="M57 91.5c-4-4.5-11-5.5-12-2-1 3.6 6 5.6 12 2Z"/><path d="M57 91.5c4-4.5 11-5.5 12-2 1 3.6-6 5.6-12 2Z"/>' +
        '<circle cx="57" cy="91.6" r="2.3"/>' +
      '</g>' +
      '<circle class="mascot__bell" cx="57" cy="98" r="3.4"/>' +
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
    '<button type="button" class="mascot__button" aria-label="Mizu, el gatito de Astra: tocalo para un tip de uñas">' + CAT_SVG + '</button>';
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
})();
