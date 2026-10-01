// Agenda de turnos: dibuja las próximas 4 semanas (lunes a sábado) con los horarios
// de inicio de cada turno y tacha los que están ocupados en Google Calendar.
// Los datos vienen de /api/agenda (ver api/agenda.js); todo se calcula en hora de Argentina.
(function () {
  var root = document.querySelector('[data-agenda]');
  if (!root) return;

  // Horario de atención: cambiar acá si cambian los días u horarios
  var CONFIG = {
    slotHours: [10, 12, 14, 16, 18], // hora de inicio de cada turno
    slotMinutes: 120,                // duración de cada turno
    workDays: [1, 2, 3, 4, 5, 6],    // 0 = domingo … 6 = sábado
    weeks: 4,
    bookingUrl: 'https://ig.me/m/astra.unias'
  };

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

  var busy = [];
  var week = 0;

  // "Fecha de pared" en Argentina: un Date cuyos getters UTC dan la hora local de AR
  function arWall(utcMs) { return new Date(utcMs - AR_OFFSET); }
  function arToUtc(year, month, day, hour, minute) { return Date.UTC(year, month, day, hour, minute || 0) + AR_OFFSET; }

  function mondayOfCurrentWeek() {
    var today = arWall(Date.now());
    var dow = today.getUTCDay();
    var diff = dow === 0 ? 1 : 1 - dow; // el domingo ya muestra la semana que empieza
    return arToUtc(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + diff, 0, 0);
  }

  function isBusy(start, end) {
    for (var i = 0; i < busy.length; i++) {
      if (busy[i].start < end && busy[i].end > start) return true;
    }
    return false;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function weekText(firstUtc, lastUtc) {
    var a = arWall(firstUtc), b = arWall(lastUtc);
    var sameMonth = a.getUTCMonth() === b.getUTCMonth();
    return 'Semana del ' + a.getUTCDate() + (sameMonth ? '' : ' de ' + MONTHS[a.getUTCMonth()]) +
      ' al ' + b.getUTCDate() + ' de ' + MONTHS[b.getUTCMonth()];
  }

  function render() {
    var now = Date.now();
    var monday = mondayOfCurrentWeek() + week * 7 * DAY;
    var html = '';
    var shownDays = [];

    for (var d = 0; d < 7; d++) {
      var dayStart = monday + d * DAY;
      var wall = arWall(dayStart);
      if (CONFIG.workDays.indexOf(wall.getUTCDay()) < 0) continue;
      shownDays.push(dayStart);

      var dayLabel = DAY_NAMES[wall.getUTCDay()] + ' ' + wall.getUTCDate();
      var fullDate = DAY_NAMES[wall.getUTCDay()] + ' ' + wall.getUTCDate() + ' de ' + MONTHS[wall.getUTCMonth()];
      var slots = '';
      var free = 0;
      var dayOver = true;

      CONFIG.slotHours.forEach(function (hour) {
        var start = arToUtc(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), hour, 0);
        var end = start + CONFIG.slotMinutes * 60 * 1000;
        var time = pad(hour) + ':00';
        if (start <= now) {
          slots += '<li><span class="slot slot--past" aria-label="' + time + ', ya pasó">' + time + '</span></li>';
        } else if (isBusy(start, end)) {
          dayOver = false;
          slots += '<li><span class="slot slot--busy"><s>' + time + '</s><span class="sr-only"> reservado</span></span></li>';
        } else {
          dayOver = false;
          free++;
          slots += '<li><a class="slot slot--free" href="' + CONFIG.bookingUrl + '" target="_blank" rel="noopener" aria-label="' +
            fullDate + ', ' + time + ': libre. Pedir este turno por Instagram">' + time + '</a></li>';
        }
      });

      if (dayOver) continue; // los días que ya pasaron no se muestran

      var tag = free === 0 ? '<span class="agenda__tag">Completo</span>' : '';

      html += '<li class="agenda__day">' +
        '<h3 class="agenda__day-name">' + dayLabel + tag + '</h3>' +
        '<ul class="agenda__slots" role="list">' + slots + '</ul></li>';
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

  prevBtn.addEventListener('click', function () { if (week > 0) { week--; render(); } });
  nextBtn.addEventListener('click', function () { if (week < CONFIG.weeks - 1) { week++; render(); } });

  fetch('/api/agenda', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.configured) {
        showMessage('La agenda online está por estrenarse. Mientras tanto, escribime por Instagram y te paso los horarios libres.');
        return;
      }
      if (data.error) throw new Error(data.error);
      busy = (data.busy || []).map(function (b) { return { start: Date.parse(b.start), end: Date.parse(b.end) }; });
      render();
    })
    .catch(function () {
      showMessage('No se pudo cargar la agenda en este momento. Escribime por Instagram y te paso los horarios libres.');
    });
})();
