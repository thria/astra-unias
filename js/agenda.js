// Agenda de turnos con forma de widget: vista por semana o por mes (lunes a domingo) con las próximas 4 semanas.
// Cada día muestra un puntito si le quedan turnos libres; al tocarlo se ven sus horarios abajo.
// Modo público (index.html): los horarios libres llevan a Instagram y los reservados se ven tachados.
// Modo panel (admin.html, data-agenda-mode="admin"): la dueña toca un horario para reservarlo o liberarlo.
// Los datos se guardan con /api/agenda (ver api/agenda.js). Todo se calcula en hora de Argentina.
(function () {
  var root = document.querySelector('[data-agenda]');
  if (!root) return;

  // Horario de atención: cambiar acá si cambian los días u horarios
  var CONFIG = {
    slotHours: [10, 12, 14, 16, 18], // hora de inicio de cada turno
    workDays: [1, 2, 3, 4, 5, 6],    // 0 = domingo … 6 = sábado
    weeks: 4,                        // cuántas semanas hacia adelante se pueden ver
    bookingUrl: 'https://ig.me/m/astra.unias'
  };

  var isAdmin = root.getAttribute('data-agenda-mode') === 'admin';
  var AR_OFFSET = 3 * 60 * 60 * 1000;
  var DAY = 24 * 60 * 60 * 1000;
  var DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  var grid = root.querySelector('[data-agenda-grid]');
  var detail = root.querySelector('[data-agenda-detail]');
  var monthLabel = root.querySelector('[data-agenda-week]');
  var prevBtn = root.querySelector('[data-agenda-prev]');
  var nextBtn = root.querySelector('[data-agenda-next]');
  var layout = root.querySelector('.agenda__layout');
  var message = root.querySelector('[data-agenda-message]');
  var messageText = root.querySelector('[data-agenda-message-text]');
  var status = root.querySelector('[data-agenda-status]');

  var busy = new Set();
  var months = [];      // meses que abarca el rango visible: [{ y, m }]
  var monthIndex = 0;
  var selected = null;  // inicio del día elegido (ms UTC)
  var view = window.matchMedia('(max-width: 29.99em)').matches ? 'week' : 'month';
  var weekStart = null; // lunes de la semana visible (vista por semana)
  var viewButtons = Array.prototype.slice.call(root.querySelectorAll('[data-agenda-view]'));

  // "Fecha de pared" en Argentina: un Date cuyos getters UTC dan la hora local de AR
  function arWall(utcMs) { return new Date(utcMs - AR_OFFSET); }
  function arToUtc(y, m, d, h) { return Date.UTC(y, m, d, h || 0) + AR_OFFSET; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function slotKey(wall, hour) {
    return wall.getUTCFullYear() + '-' + pad(wall.getUTCMonth() + 1) + '-' + pad(wall.getUTCDate()) + 'T' + pad(hour);
  }

  function todayStart() {
    var w = arWall(Date.now());
    return arToUtc(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
  }
  function rangeEnd() { return todayStart() + CONFIG.weeks * 7 * DAY; }

  // Estado de un día: horarios, cuántos libres y si se puede elegir
  function dayInfo(dayStart) {
    var wall = arWall(dayStart);
    var now = Date.now();
    var info = { start: dayStart, wall: wall, slots: [], free: 0, open: 0, kind: 'free' };
    if (dayStart < todayStart() || dayStart >= rangeEnd()) { info.kind = 'out'; return info; }
    if (CONFIG.workDays.indexOf(wall.getUTCDay()) < 0) { info.kind = 'closed'; return info; }
    CONFIG.slotHours.forEach(function (hour) {
      var key = slotKey(wall, hour);
      var past = arToUtc(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), hour) <= now;
      var taken = busy.has(key);
      info.slots.push({ key: key, time: pad(hour) + ':00', past: past, taken: taken });
      if (!past) { info.open++; if (!taken) info.free++; }
    });
    if (!info.open) info.kind = 'past';
    else if (!info.free) info.kind = 'full';
    return info;
  }

  function fullDate(wall) {
    return DAY_NAMES[wall.getUTCDay()] + ' ' + wall.getUTCDate() + ' de ' + MONTHS[wall.getUTCMonth()];
  }

  // ---- Días (vista por semana o por mes) ----
  function dayCell(dayStart, today) {
    var info = dayInfo(dayStart);
    var d = info.wall.getUTCDate();
    var classes = 'almanac__day is-' + info.kind +
      (info.start === today ? ' is-today' : '') + (info.start === selected ? ' is-selected' : '');
    var selectable = info.kind === 'free' || info.kind === 'full';
    var label = fullDate(info.wall) + ': ' + ({
      free: info.free + (info.free === 1 ? ' turno libre' : ' turnos libres'),
      full: 'completo', closed: 'no se atiende', past: 'ya pasó', out: 'fuera de la agenda'
    })[info.kind];
    return selectable
      ? '<button type="button" class="' + classes + '" data-day="' + info.start + '" aria-pressed="' + (info.start === selected) + '" aria-label="' + label + '">' +
        '<span class="almanac__num">' + d + '</span></button>'
      : '<span class="' + classes + '" aria-label="' + label + '"><span class="almanac__num">' + d + '</span></span>';
  }

  function mondayOf(dayStart) {
    var dow = (arWall(dayStart).getUTCDay() + 6) % 7; // lunes = 0
    return dayStart - dow * DAY;
  }

  function setLabel(y, m) {
    monthLabel.innerHTML = cap(MONTHS[m]) + ' <span class="almanac__year">' + y + '</span>';
  }

  function renderGrid() {
    var today = todayStart();
    var html = '';
    viewButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-agenda-view') === view)); });

    if (view === 'week') {
      if (weekStart == null) weekStart = mondayOf(selected != null ? selected : today);
      for (var i = 0; i < 7; i++) html += dayCell(weekStart + i * DAY, today);
      var mid = arWall(weekStart + 3 * DAY);
      setLabel(mid.getUTCFullYear(), mid.getUTCMonth());
      prevBtn.disabled = weekStart <= mondayOf(today);
      nextBtn.disabled = weekStart + 7 * DAY >= rangeEnd();
      prevBtn.setAttribute('aria-label', 'Semana anterior');
      nextBtn.setAttribute('aria-label', 'Semana siguiente');
    } else {
      var mo = months[monthIndex];
      var firstDow = (new Date(Date.UTC(mo.y, mo.m, 1)).getUTCDay() + 6) % 7; // lunes = 0
      var daysInMonth = new Date(Date.UTC(mo.y, mo.m + 1, 0)).getUTCDate();
      for (var b = 0; b < firstDow; b++) html += '<span class="almanac__day almanac__day--blank" aria-hidden="true"></span>';
      for (var d = 1; d <= daysInMonth; d++) html += dayCell(arToUtc(mo.y, mo.m, d), today);
      setLabel(mo.y, mo.m);
      prevBtn.disabled = monthIndex === 0;
      nextBtn.disabled = monthIndex === months.length - 1;
      prevBtn.setAttribute('aria-label', 'Mes anterior');
      nextBtn.setAttribute('aria-label', 'Mes siguiente');
    }
    grid.innerHTML = html;
  }

  // ---- Horarios del día elegido ----
  function slotHtml(slot, dateText) {
    if (slot.past) return '<li><span class="slot slot--past" aria-label="' + slot.time + ', ya pasó">' + slot.time + '</span></li>';
    if (isAdmin) {
      return '<li><button type="button" class="slot ' + (slot.taken ? 'slot--busy' : 'slot--free') + '" data-slot="' + slot.key + '"' +
        ' aria-pressed="' + slot.taken + '" aria-label="' + dateText + ', ' + slot.time + ': ' +
        (slot.taken ? 'reservado, tocá para liberar' : 'libre, tocá para reservar') + '">' +
        (slot.taken ? '<s>' + slot.time + '</s>' : slot.time) + '</button></li>';
    }
    if (slot.taken) return '<li><span class="slot slot--busy"><s>' + slot.time + '</s><span class="sr-only"> reservado</span></span></li>';
    return '<li><a class="slot slot--free" href="' + CONFIG.bookingUrl + '" target="_blank" rel="noopener" aria-label="' +
      dateText + ', ' + slot.time + ': libre. Pedir este turno por Instagram">' + slot.time + '</a></li>';
  }

  var PENCIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M13.5 6.5l4 4"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function renderDetail() {
    if (selected == null) {
      detail.innerHTML = '<p class="agenda__detail-empty">' + PENCIL + 'Elegí un día para ver sus horarios.</p>';
      return;
    }
    var info = dayInfo(selected);
    var dateText = fullDate(info.wall);
    var openKeys = info.slots.filter(function (s) { return !s.past; }).map(function (s) { return s.key; });
    var noteText = isAdmin
      ? (info.kind === 'full' ? 'Día completo.' : 'Tocá un horario para reservarlo o liberarlo.')
      : info.kind === 'full'
        ? 'Este día ya está completo. Escribime y te aviso si se libera un lugar.'
        : 'Tocá un horario libre para pedirlo.';
    var action = isAdmin
      ? (openKeys.length
        ? '<button type="button" class="agenda__cta" data-day-slots="' + openKeys.join(',') + '" data-day-busy="' + (info.free > 0) + '">' +
          (info.free > 0 ? PLUS + 'Reservar día completo' : 'Liberar día') + '</button>'
        : '')
      : '<a class="agenda__cta" href="' + CONFIG.bookingUrl + '" target="_blank" rel="noopener">' + PLUS + 'Pedir turno</a>';

    detail.innerHTML =
      '<h3 class="agenda__detail-title">' + DAY_NAMES[info.wall.getUTCDay()] + ' <span>' + info.wall.getUTCDate() + ' de ' + MONTHS[info.wall.getUTCMonth()] + '</span></h3>' +
      '<ul class="agenda__slots" role="list">' + info.slots.map(function (s) { return slotHtml(s, dateText); }).join('') + '</ul>' +
      '<div class="agenda__detail-foot"><p class="agenda__detail-note">' + PENCIL + noteText + '</p>' + action + '</div>';
  }

  function render() {
    message.hidden = true;
    if (layout) layout.hidden = false;
    renderGrid();
    renderDetail();
  }

  function showMessage(text) {
    if (layout) layout.hidden = true;
    messageText.textContent = text;
    message.hidden = false;
  }

  function announce(text) { if (status) status.textContent = text; }

  // ---- Rango y día inicial ----
  function setupRange() {
    var start = arWall(todayStart()), end = arWall(rangeEnd() - DAY);
    months = [{ y: start.getUTCFullYear(), m: start.getUTCMonth() }];
    if (end.getUTCMonth() !== start.getUTCMonth() || end.getUTCFullYear() !== start.getUTCFullYear()) {
      months.push({ y: end.getUTCFullYear(), m: end.getUTCMonth() });
    }
    // Arranca en el primer día con turnos libres (o el primero que se pueda ver)
    selected = null;
    for (var t = todayStart(); t < rangeEnd(); t += DAY) {
      var k = dayInfo(t).kind;
      if (k === 'free') { selected = t; break; }
      if (k === 'full' && selected == null) selected = t;
    }
    weekStart = null;
    if (selected != null) {
      var w = arWall(selected);
      monthIndex = Math.max(0, months.findIndex(function (mo) { return mo.y === w.getUTCFullYear() && mo.m === w.getUTCMonth(); }));
    }
  }

  // ---- Eventos ----
  function step(dir) {
    if (view === 'week') weekStart += dir * 7 * DAY;
    else monthIndex = Math.min(months.length - 1, Math.max(0, monthIndex + dir));
    renderGrid();
  }
  prevBtn.addEventListener('click', function () { if (!prevBtn.disabled) step(-1); });
  nextBtn.addEventListener('click', function () { if (!nextBtn.disabled) step(1); });

  // Selector Semana / Mes: la vista nueva arranca en el día elegido
  viewButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      view = btn.getAttribute('data-agenda-view');
      var base = selected != null ? selected : todayStart();
      weekStart = mondayOf(base);
      var w = arWall(base);
      var idx = months.findIndex(function (mo) { return mo.y === w.getUTCFullYear() && mo.m === w.getUTCMonth(); });
      if (idx >= 0) monthIndex = idx;
      if (months.length) renderGrid();
    });
  });

  grid.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-day]');
    if (!btn) return;
    selected = Number(btn.getAttribute('data-day'));
    renderGrid();
    renderDetail();
    // en el celular, llevar la vista a los horarios
    if (window.matchMedia('(max-width: 63.99em)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

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
    detail.addEventListener('click', function (event) {
      var slotBtn = event.target.closest('[data-slot]');
      if (slotBtn) {
        var key = slotBtn.getAttribute('data-slot');
        save([key], !busy.has(key));
        return;
      }
      var dayBtn = event.target.closest('[data-day-slots]');
      if (dayBtn) save(dayBtn.getAttribute('data-day-slots').split(','), dayBtn.getAttribute('data-day-busy') === 'true');
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
        setupRange();
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
