// Mizu: el gatito de Astra (personaje propio, negro y minimalista) que aparece abajo a la derecha
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

  // Mizu: gatito negro minimalista. Silueta redondeada, ojos grandes color crema, orejas por dentro rosas,
  // bigotes finos, un collar rosa muy finito y la estrellita de Astra junto a la oreja.
  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 132" aria-hidden="true">' +
      '<path class="mascot__tail" d="M78 114C100 121 113 105 107 90c-4-10-14-9-13-1"/>' +
      '<ellipse class="mascot__body" cx="56" cy="102" rx="27" ry="22"/>' +
      '<ellipse class="mascot__body mascot__paw" cx="44" cy="122" rx="8.5" ry="6"/>' +
      '<ellipse class="mascot__body mascot__paw" cx="66" cy="122" rx="8.5" ry="6"/>' +
      '<g class="mascot__head">' +
        '<path class="mascot__body" d="M18 46C15 26 21 11 30 8c7-2 15 8 22 17Z"/>' +
        '<path class="mascot__body" d="M64 25c7-9 15-19 23-17 9 3 15 18 12 38Z"/>' +
        '<path class="mascot__ear-in" d="M25 37c-1-12 3-19 6.5-21 3.5-1 8 3.5 12 9Z"/>' +
        '<path class="mascot__ear-in" d="M73 25c4.5-5.5 9.5-10 13-9 4.5 2 7.5 11 6.5 22Z"/>' +
        '<ellipse class="mascot__body" cx="58" cy="55" rx="44" ry="36"/>' +
        '<path class="mascot__star" d="M106 2c.6 4.4 3.2 7.1 8 8-4.8.9-7.4 3.6-8 8-.6-4.4-3.2-7.1-8-8 4.8-.9 7.4-3.6 8-8Z"/>' +
        '<path class="mascot__whisker" d="M22 64Q11 61 2 62M22 69Q11 69 1 72M94 64Q105 61 114 62M94 69Q105 69 115 72"/>' +
        '<g class="mascot__eyes">' +
          '<ellipse class="mascot__eye-ring" cx="40" cy="56" rx="10.5" ry="12.5"/><ellipse class="mascot__eye-ring" cx="76" cy="56" rx="10.5" ry="12.5"/>' +
          '<ellipse class="mascot__eye" cx="41" cy="57.5" rx="7" ry="9.5"/><ellipse class="mascot__eye" cx="75" cy="57.5" rx="7" ry="9.5"/>' +
          '<circle class="mascot__shine" cx="43.5" cy="52.5" r="2.8"/><circle class="mascot__shine" cx="77.5" cy="52.5" r="2.8"/>' +
        '</g>' +
        '<path class="mascot__nose" d="M55.5 67h5c-.7 2.2-1.7 3-2.5 3.2-.8-.2-1.8-1-2.5-3.2Z"/>' +
      '</g>' +
      '<path class="mascot__ribbon" d="M35 85.5Q56 95 79 85.5"/>' +
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
