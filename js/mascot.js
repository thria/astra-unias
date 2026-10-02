// Estrellita: la gatita de Astra (personaje propio, estilo kawaii) que aparece abajo a la derecha
// con un globo de diálogo, al estilo de Clippy. Da tips de uñas y comenta la sección que se está mirando.
// - Tocarla: muestra otro tip.  - "Ocultar": la achica y deja de hablar sola (se recuerda en este navegador).
// - Con "reducir movimiento" no se anima, pero sigue funcionando.
(function () {
  var STORAGE_KEY = 'astra-mascot-hidden';
  var FIRST_DELAY = 4500;   // espera a que termine la animación de entrada
  var BUBBLE_TIME = 9000;   // cuánto queda visible cada mensaje
  var IDLE_TIP_EVERY = 35000;

  var GREETING = '¡Hola! Soy Estrellita, la gatita de Astra. Tocame y te cuento tips para tus uñas.';

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

  // Lo que dice al llegar a cada sección (una sola vez por visita)
  var SECTION_TIPS = {
    'sobre-mi': 'Rena hace 4 años que se dedica a las uñas. ¡Estás en buenas manos!',
    trabajos: 'Tocá cualquier foto para verla en Instagram. Hay más de 280 trabajos.',
    'local-titulo': 'El estudio está por Plaza Belgrano, en La Plata. La dirección exacta te la pasa al reservar.',
    servicios: '¿No sabés cuál elegir? Mirá «¿Cuál me conviene?». ¡Y girá las uñas 3D!',
    opiniones: 'Pasá el mouse por las opiniones para frenarlas y leerlas tranquila.',
    agenda: 'Elegí un día con puntitos y tocá un horario libre para pedir tu turno.'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hidden = false;
  try { hidden = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}

  // ---- Dibujo de la gatita (SVG) ----
  var CAT_SVG =
    '<svg class="mascot__cat" viewBox="0 0 120 124" aria-hidden="true">' +
      '<g class="mascot__tail"><path class="mascot__tail-line" d="M88 104c14-2 22-10 20-22-1-7-8-8-9-2"/>' +
        '<path class="mascot__tail-fill" d="M88 104c14-2 22-10 20-22-1-7-8-8-9-2"/></g>' +
      '<ellipse class="mascot__fur" cx="60" cy="100" rx="29" ry="20"/>' +
      '<ellipse class="mascot__fur" cx="45" cy="117" rx="9" ry="5"/>' +
      '<ellipse class="mascot__fur" cx="75" cy="117" rx="9" ry="5"/>' +
      '<g class="mascot__head">' +
        '<path class="mascot__fur" d="M22 46 26 12 48 30Z"/>' +
        '<path class="mascot__fur" d="M98 46 94 12 72 30Z"/>' +
        '<path class="mascot__ear-in" d="M28 36 30 20 40 29Z"/>' +
        '<path class="mascot__ear-in" d="M92 36 90 20 80 29Z"/>' +
        '<ellipse class="mascot__fur" cx="60" cy="56" rx="41" ry="32"/>' +
        '<path class="mascot__star" d="M90 10c.6 4.4 3.2 7.1 8 8-4.8.9-7.4 3.6-8 8-.6-4.4-3.2-7.1-8-8 4.8-.9 7.4-3.6 8-8Z"/>' +
        '<g class="mascot__eyes"><ellipse cx="45" cy="56" rx="4" ry="5.5"/><ellipse cx="75" cy="56" rx="4" ry="5.5"/>' +
          '<circle class="mascot__shine" cx="46.4" cy="54" r="1.4"/><circle class="mascot__shine" cx="76.4" cy="54" r="1.4"/></g>' +
        '<ellipse class="mascot__cheek" cx="34" cy="67" rx="7" ry="4"/><ellipse class="mascot__cheek" cx="86" cy="67" rx="7" ry="4"/>' +
        '<ellipse class="mascot__nose" cx="60" cy="64" rx="3" ry="2.2"/>' +
        '<path class="mascot__line" d="M55 68q2.5 3 5 0q2.5 3 5 0"/>' +
        '<path class="mascot__line" d="M14 58h12M13 65l13-2M98 63l13 2M94 58h12"/>' +
      '</g>' +
      // patita con un frasquito de esmalte
      '<rect class="mascot__polish" x="80" y="88" width="13" height="16" rx="3"/>' +
      '<rect class="mascot__polish-cap" x="83" y="80" width="7" height="9" rx="1.5"/>' +
      '<ellipse class="mascot__fur" cx="82" cy="98" rx="7" ry="6"/>' +
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
    '<button type="button" class="mascot__button" aria-label="Estrellita, la gatita de Astra: tocala para un tip de uñas">' + CAT_SVG + '</button>';
  document.body.appendChild(root);

  var bubble = root.querySelector('.mascot__bubble');
  var text = root.querySelector('.mascot__text');
  var catButton = root.querySelector('.mascot__button');
  var tipIndex = Math.floor(Math.random() * TIPS.length);
  var hideTimer = null;
  var lastSpoke = 0;

  function say(message, stay) {
    text.textContent = message;
    bubble.hidden = false;
    root.classList.remove('is-talking');
    void root.offsetWidth; // reinicia la animación del globo
    root.classList.add('is-talking');
    lastSpoke = Date.now();
    clearTimeout(hideTimer);
    if (!stay) hideTimer = setTimeout(function () { bubble.hidden = true; root.classList.remove('is-talking'); }, BUBBLE_TIME);
  }

  function nextTip(stay) {
    tipIndex = (tipIndex + 1) % TIPS.length;
    say(TIPS[tipIndex], stay);
  }

  catButton.addEventListener('click', function () {
    if (hidden) {
      hidden = false;
      root.classList.remove('is-hidden');
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      say(GREETING, true);
      return;
    }
    nextTip(true);
  });
  root.querySelector('.mascot__more').addEventListener('click', function () { nextTip(true); });
  root.querySelector('.mascot__close').addEventListener('click', function () {
    hidden = true;
    bubble.hidden = true;
    root.classList.add('is-hidden');
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    catButton.focus();
  });

  // Aparece después de la animación de entrada y saluda (si no estaba oculta)
  setTimeout(function () {
    root.classList.add('is-in');
    if (!hidden) say(GREETING);
  }, reduceMotion ? 800 : FIRST_DELAY);

  // Comentarios según la sección que se está mirando (una vez cada una)
  if ('IntersectionObserver' in window) {
    var spoken = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || hidden || !root.classList.contains('is-in')) return;
        var id = entry.target.id;
        if (spoken[id] || !SECTION_TIPS[id]) return;
        if (Date.now() - lastSpoke < 4000) return; // no pisar un mensaje recién dicho
        spoken[id] = true;
        say(SECTION_TIPS[id]);
      });
    }, { rootMargin: '-40% 0px -40% 0px' }); // cuenta cuando la sección pasa por el centro de la pantalla
    Object.keys(SECTION_TIPS).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // Cada tanto, si no habló hace rato, tira un tip
  setInterval(function () {
    if (hidden || document.hidden || !bubble.hidden) return;
    if (Date.now() - lastSpoke > IDLE_TIP_EVERY) nextTip(false);
  }, 5000);
})();
