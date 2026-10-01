// Agenda de turnos: próximas 4 semanas, de lunes a sábado, en hora de Argentina.
// Modo público (index.html): los horarios libres llevan a Instagram y los reservados se ven tachados.
// Modo panel (admin.html, data-agenda-mode="admin"): la dueña toca un horario para reservarlo o liberarlo.
// Los datos se guardan con /api/agenda (ver api/agenda.js).
(function () {
  var root = document.querySelector('[data-agenda]');
  if (!root) return;

  // Horario de atención: cambiar acá si cambian los días u horarios
  var CONFIG = {
    slotHours: [10, 12, 14, 16, 18], // hora de inicio de cada turno
    workDays: [1, 2, 3, 4, 5, 6],    // 0 = domingo … 6 = sábado
    weeks: 4,
    bookingUrl: 'https://ig.me/m/astra.unias'
  };

  var isAdmin = root.getAttribute('data-agenda-mode') === 'admin';
  var AR_OFFSET = 3 * 60 * 60 * 1000;
  var DAY = 24 * 60 * 60 * 1000;
  var DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var daysList = root.querySelector('[data-agenda-days]');
  var weekLabel = root.querySelector('[data-agenda-week]');
  var prevBtn = root.querySelector('[data-agenda-prev]');
  var nextBtn = root.querySelector('[data-agenda-next]');
  var message = root.querySelector('[data-agenda-message]');
  var messageText = root.querySelector('[data-agenda-message-text]');
  var status = root.querySelector('[data-agenda-status]');

  var busy = new Set();
  var week = 0;

  // "Fecha de pared" en Argentina: un Date cuyos getters UTC dan la hora local de AR
  function arWall(utcMs) { return new Date(utcMs - AR_OFFSET); }
  function arToUtc(y, m, d, h) { return Date.UTC(y, m, d, h || 0) + AR_OFFSET; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function slotKey(wall, hour) {
    return wall.getUTCFullYear() + '-' + pad(wall.getUTCMonth() + 1) + '-' + pad(wall.getUTCDate()) + 'T' + pad(hour);
  }

  function firstMonday() {
    var today = arWall(Date.now());
    var dow = today.getUTCDay();
    var diff = dow === 0 ? 1 : 1 - dow; // el domingo ya muestra la semana que empieza
    return arToUtc(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + diff);
  }

  function weekText(firstUtc, lastUtc) {
    var a = arWall(firstUtc), b = arWall(lastUtc);
    var sameMonth = a.getUTCMonth() === b.getUTCMonth();
    return 'Semana del ' + a.getUTCDate() + (sameMonth ? '' : ' de ' + MONTHS[a.getUTCMonth()]) +
      ' al ' + b.getUTCDate() + ' de ' + MONTHS[b.getUTCMonth()];
  }

  function slotHtml(key, time, fullDate, past) {
    var taken = busy.has(key);
    if (past) return '<li><span class="slot slot--past" aria-label="' + time + ', ya pasó">' + time + '</span></li>';

    if (isAdmin) {
      return '<li><button type="button" class="slot ' + (taken ? 'slot--busy' : 'slot--free') + '" data-slot="' + key + '"' +
        ' aria-pressed="' + taken + '" aria-label="' + fullDate + ', ' + time + ': ' + (taken ? 'reservado, tocá para liberar' : 'libre, tocá para reservar') + '">' +
        (taken ? '<s>' + time + '</s>' : time) + '</button></li>';
    }

    if (taken) return '<li><span class="slot slot--busy"><s>' + time + '</s><span class="sr-only"> reservado</span></span></li>';
    return '<li><a class="slot slot--free" href="' + CONFIG.bookingUrl + '" target="_blank" rel="noopener" aria-label="' +
      fullDate + ', ' + time + ': libre. Pedir este turno por Instagram">' + time + '</a></li>';
  }

  function render() {
    var now = Date.now();
    var monday = firstMonday() + week * 7 * DAY;
    var html = '';
    var shownDays = [];

    for (var d = 0; d < 7; d++) {
      var dayStart = monday + d * DAY;
      var wall = arWall(dayStart);
      if (CONFIG.workDays.indexOf(wall.getUTCDay()) < 0) continue;
      shownDays.push(dayStart);

      var fullDate = DAY_NAMES[wall.getUTCDay()] + ' ' + wall.getUTCDate() + ' de ' + MONTHS[wall.getUTCMonth()];
      var slots = '';
      var open = [];   // turnos que todavía no pasaron
      var free = 0;

      CONFIG.slotHours.forEach(function (hour) {
        var key = slotKey(wall, hour);
        var past = arToUtc(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), hour) <= now;
        if (!past) { open.push(key); if (!busy.has(key)) free++; }
        slots += slotHtml(key, pad(hour) + ':00', fullDate, past);
      });

      if (!open.length) continue; // los días que ya pasaron no se muestran

      var tag = free === 0 ? '<span class="agenda__tag">Completo</span>' : '';
      var dayAction = isAdmin
        ? '<button type="button" class="agenda__day-action" data-day="' + open.join(',') + '" data-day-busy="' + (free > 0) + '">' +
          (free > 0 ? 'Reservar día completo' : 'Liberar día') + '</button>'
        : '';

      html += '<li class="agenda__day">' +
        '<h3 class="agenda__day-name">' + DAY_NAMES[wall.getUTCDay()] + ' ' + wall.getUTCDate() + tag + '</h3>' +
        '<ul class="agenda__slots" role="list">' + slots + '</ul>' + dayAction + '</li>';
    }

    if (!html) html = '<li class="agenda__empty">Esta semana ya no quedan turnos. Mirá la semana siguiente.</li>';

    message.hidden = true;
    daysList.innerHTML = html;
    weekLabel.textContent = weekText(shownDays[0], shownDays[shownDays.length - 1]);
    prevBtn.disabled = week === 0;
    nextBtn.disabled = week === CONFIG.weeks - 1;
  }

  function showMessage(text) {
    weekLabel.textContent = 'Agenda';
    daysList.innerHTML = '';
    messageText.textContent = text;
    message.hidden = false;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }

  function announce(text) { if (status) status.textContent = text; }

  prevBtn.addEventListener('click', function () { if (week > 0) { week--; render(); } });
  nextBtn.addEventListener('click', function () { if (week < CONFIG.weeks - 1) { week++; render(); } });

  // ---- Panel de la dueña: tocar para reservar o liberar ----
  function save(slots, makeBusy) {
    var before = new Set(busy);
    slots.forEach(function (s) { makeBusy ? busy.add(s) : busy.delete(s); });
    render(); // se ve al instante; si falla se deshace

    return fetch('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': window.astraAdminPassword || '' },
      body: JSON.stringify({ slots: slots, busy: makeBusy })
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status === 401 ? 'La sesión venció. Volvé a entrar.' : 'No se pudo guardar.');
      announce(makeBusy ? 'Guardado: reservado.' : 'Guardado: liberado.');
    }).catch(function (error) {
      busy = before;
      render();
      announce(error.message + ' Probá de nuevo.');
    });
  }

  if (isAdmin) {
    daysList.addEventListener('click', function (event) {
      var slotBtn = event.target.closest('[data-slot]');
      if (slotBtn) {
        var key = slotBtn.getAttribute('data-slot');
        save([key], !busy.has(key));
        return;
      }
      var dayBtn = event.target.closest('[data-day]');
      if (dayBtn) save(dayBtn.getAttribute('data-day').split(','), dayBtn.getAttribute('data-day-busy') === 'true');
    });
  }

  // ---- Carga inicial ----
  function load() {
    return fetch('/api/agenda', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.configured) {
          showMessage(isAdmin
            ? 'Falta crear la base de datos en Vercel (Storage → Upstash for Redis) para poder guardar los turnos.'
            : 'La agenda online está por estrenarse. Mientras tanto, escribime por Instagram y te paso los horarios libres.');
          return;
        }
        if (data.error) throw new Error(data.error);
        busy = new Set(data.busy || []);
        render();
      })
      .catch(function () {
        showMessage('No se pudo cargar la agenda en este momento. Escribime por Instagram y te paso los horarios libres.');
      });
  }

  // En el panel la carga empieza después de iniciar sesión (ver admin.html)
  if (isAdmin) window.astraAgendaLoad = load;
  else load();
})();
