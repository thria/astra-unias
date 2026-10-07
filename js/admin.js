// Panel de turnos de Astra (/admin). La contraseña se valida en el servidor y solo queda en memoria.
// - Agenda: tocar un horario abre la ficha del turno (clienta, contacto, servicio, diseño, precio, seña, estado).
// - Próximos: los turnos de hoy en adelante, con recordatorio por WhatsApp de un toque.
// - Clientas: se arma sola con las fichas (visitas, total gastado, faltas, notas) y autocompleta al escribir el nombre.
// - Resumen: números del mes y copia de seguridad en planilla.
// Todo lo que escribe la dueña se muestra escapado (nunca como HTML).
(function () {
  var form = document.querySelector('[data-login]');
  var error = document.querySelector('[data-login-error]');
  var agenda = document.querySelector('[data-agenda]');
  var tabs = document.querySelector('[data-admin-tabs]');
  var foot = document.querySelector('[data-admin-foot]');
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  var submit = form.querySelector('button[type="submit"]');
  var status = document.querySelector('[data-agenda-status]');

  var bookings = {};   // ficha de cada turno, por horario ("2026-10-12T14:00")
  var busyList = [];   // horarios ocupados de hoy en adelante (con o sin ficha)
  var STATUS = { pendiente: 'Pendiente', confirmado: 'Confirmado', asistio: 'Vino', 'no-vino': 'No vino' };
  var DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DEPOSIT = 10000;

  // ---- Utilidades ----
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); } // sin tildes ni mayúsculas
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function money(n) { return '$' + Math.round(n || 0).toLocaleString('es-AR'); }
  function announce(t) { if (status) status.textContent = t; }
  function todayKey() { return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10); } // fecha de hoy en Argentina
  function parts(key) { // "2026-10-12T14:00" → fecha de pared
    var d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)));
    return { date: d, time: key.slice(11).replace(/^0/, ''), day: key.slice(0, 10) };
  }
  function dayText(key) { var p = parts(key); return DAYS[p.date.getUTCDay()] + ' ' + p.date.getUTCDate() + ' de ' + MONTHS[p.date.getUTCMonth()]; }
  function shortDate(key) { var p = parts(key); return p.date.getUTCDate() + '/' + (p.date.getUTCMonth() + 1); }
  function clientId(b) {
    var phone = (b.phone || '').replace(/\D/g, '').slice(-8);
    return phone.length >= 6 ? 'tel:' + phone : 'nom:' + norm(b.name);
  }
  // Número para WhatsApp (Argentina): 221 15 555-1234, 0221 555 1234 o +54 9 221 5551234 → 5492215551234
  function waNumber(phone) {
    var d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('54') === 0) { d = d.slice(2); if (d.charAt(0) === '9') d = d.slice(1); }
    if (d.charAt(0) === '0') d = d.slice(1);
    if (d.length === 12 && d.slice(3, 5) === '15') d = d.slice(0, 3) + d.slice(5);       // característica de 3 cifras
    else if (d.length === 12 && d.slice(2, 4) === '15') d = d.slice(0, 2) + d.slice(4);  // de 2 cifras (CABA)
    return d.length === 10 ? '549' + d : '';
  }
  function waLink(key, b) {
    var n = waNumber(b.phone);
    if (!n) return '';
    var first = (b.name || '').trim().split(/\s+/)[0];
    var msg = '¡Hola' + (first ? ' ' + first : '') + '! 💅 Te recuerdo tu turno en Astra el ' + dayText(key).toLowerCase() +
      ' a las ' + parts(key).time + ' h' + (b.service ? ' (' + b.service.toLowerCase() + ')' : '') +
      '. Si necesitás cambiarlo, avisame con 48 h hábiles de anticipación. ¡Te espero!';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg);
  }

  function api(body) {
    return fetch('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': window.astraAdminPassword || '' },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (r.status === 401) throw new Error('La sesión venció. Cerrá sesión y volvé a entrar.');
      if (r.status === 429) throw new Error('Demasiados intentos seguidos. Esperá 15 minutos.');
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || 'No se pudo guardar. Probá de nuevo.'); });
      return r.json();
    });
  }

  // ---- Clientas (se arman con todas las fichas) ----
  function clients() {
    var map = {};
    Object.keys(bookings).sort().forEach(function (key) {
      var b = bookings[key];
      if (!b || !b.name) return;
      var id = clientId(b), c = map[id];
      if (!c) c = map[id] = { name: b.name, phone: '', instagram: '', notes: '', visits: 0, noShows: 0, total: 0, history: [] };
      c.name = b.name; // queda el nombre más reciente
      if (b.phone) c.phone = b.phone;
      if (b.instagram) c.instagram = b.instagram;
      if (b.notes) c.notes = b.notes;
      if (b.status === 'asistio') { c.visits++; c.total += b.price || 0; }
      if (b.status === 'no-vino') c.noShows++;
      c.history.push({ key: key, b: b });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
  }
  function findClient(name) {
    var n = norm(name);
    if (!n) return null;
    return clients().filter(function (c) { return norm(c.name) === n; })[0] || null;
  }
  function historyLine(c) {
    if (!c) return '';
    var last = c.history.filter(function (h) { return h.b.status === 'asistio'; }).pop();
    return c.visits + (c.visits === 1 ? ' visita' : ' visitas') +
      (last ? ' · última: ' + (last.b.service || 'turno') + ' el ' + shortDate(last.key) : '') +
      (c.noShows ? ' · ' + c.noShows + (c.noShows === 1 ? ' falta' : ' faltas') : '') +
      (c.total ? ' · ' + money(c.total) + ' en total' : '');
  }

  // ---- Ficha del turno ----
  var dialog = document.querySelector('[data-booking]');
  var bForm = document.querySelector('[data-booking-form]');
  var bTitle = document.querySelector('[data-booking-title]');
  var bWhen = document.querySelector('[data-booking-when]');
  var bHistory = document.querySelector('[data-booking-history]');
  var bError = document.querySelector('[data-booking-error]');
  var bWhatsapp = document.querySelector('[data-booking-whatsapp]');
  var bFree = document.querySelector('[data-booking-free]');
  var bBlock = document.querySelector('[data-booking-block]');
  var bSave = document.querySelector('[data-booking-save]');
  var suggest = document.querySelector('[data-client-suggest]');
  var nameInput = bForm.elements.name;
  var matches = [], active = -1;
  var currentKey = null;

  // ---- Buscador de clientas ya cargadas (al escribir el nombre) ----
  // Busca sin importar tildes ni mayúsculas, por nombre, teléfono o Instagram; al elegir una se completan
  // sus datos, así no se crean clientas repetidas.
  function closeSuggest() {
    suggest.hidden = true;
    suggest.innerHTML = '';
    nameInput.setAttribute('aria-expanded', 'false');
    nameInput.removeAttribute('aria-activedescendant');
    matches = []; active = -1;
  }
  function renderSuggest() {
    var q = norm(nameInput.value), digits = nameInput.value.replace(/\D/g, '');
    if (!q) return closeSuggest();
    matches = clients().filter(function (c) {
      return norm(c.name).indexOf(q) >= 0 ||
        (digits.length >= 3 && c.phone.replace(/\D/g, '').indexOf(digits) >= 0) ||
        (c.instagram && norm(c.instagram).indexOf(q.replace(/^@/, '')) >= 0);
    }).sort(function (a, b) { // primero las que empiezan con lo escrito
      return (norm(a.name).indexOf(q) === 0 ? 0 : 1) - (norm(b.name).indexOf(q) === 0 ? 0 : 1);
    }).slice(0, 6);
    // si ya está escrita exactamente una clienta elegida, no hace falta la lista
    if (!matches.length || (matches.length === 1 && norm(matches[0].name) === q)) return closeSuggest();
    active = -1;
    suggest.innerHTML = matches.map(function (c, i) {
      var info = [c.phone, c.instagram ? '@' + c.instagram : '', c.visits ? plural(c.visits, 'visita', 'visitas') : 'sin visitas aún']
        .filter(Boolean).join(' · ');
      return '<li role="option" id="sug-' + i + '" data-index="' + i + '" aria-selected="false">' +
        '<strong>' + esc(c.name) + '</strong><span>' + esc(info) + '</span></li>';
    }).join('');
    suggest.hidden = false;
    nameInput.setAttribute('aria-expanded', 'true');
  }
  function highlight(i) {
    active = (i + matches.length) % matches.length;
    Array.prototype.forEach.call(suggest.children, function (li, k) { li.setAttribute('aria-selected', String(k === active)); });
    nameInput.setAttribute('aria-activedescendant', 'sug-' + active);
  }
  function pickClient(c) {
    var f = bForm.elements;
    f.name.value = c.name;
    f.phone.value = c.phone || '';
    f.instagram.value = c.instagram ? '@' + c.instagram : '';
    if (c.notes) f.notes.value = c.notes;
    closeSuggest();
    updateExtras();
    f.service.focus();
  }
  nameInput.addEventListener('keydown', function (e) {
    if (suggest.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pickClient(matches[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSuggest(); }
  });
  nameInput.addEventListener('blur', function () { setTimeout(closeSuggest, 150); });
  // mousedown (antes del blur) para que el toque elija la clienta
  suggest.addEventListener('mousedown', function (e) {
    var li = e.target.closest('[data-index]');
    if (li) { e.preventDefault(); pickClient(matches[+li.getAttribute('data-index')]); }
  });
  function fillOptions() { closeSuggest(); }
  function readForm() {
    var f = bForm.elements;
    return {
      name: f.name.value.trim(), phone: f.phone.value.trim(), instagram: f.instagram.value.trim().replace(/^@/, ''),
      service: f.service.value, price: Number(f.price.value) || 0, design: f.design.value.trim(), notes: f.notes.value.trim(),
      deposit: f.deposit.checked, status: (bForm.querySelector('[name="status"]:checked') || {}).value || 'pendiente'
    };
  }
  function updateExtras() {
    var b = readForm(), c = findClient(b.name), link = currentKey && waLink(currentKey, b);
    bHistory.hidden = !c;
    bHistory.textContent = c ? 'Clienta conocida: ' + historyLine(c) + '.' : '';
    bWhatsapp.hidden = !link;
    if (link) bWhatsapp.href = link;
  }

  function openBooking(key, dateText, time, isBusy) {
    currentKey = key;
    var b = bookings[key] || {}, f = bForm.elements;
    bForm.reset();
    f.name.value = b.name || ''; f.phone.value = b.phone || ''; f.instagram.value = b.instagram ? '@' + b.instagram : '';
    f.service.value = b.service || ''; f.price.value = b.price || ''; f.design.value = b.design || ''; f.notes.value = b.notes || '';
    f.deposit.checked = !!b.deposit;
    var radio = bForm.querySelector('[name="status"][value="' + (b.status || 'pendiente') + '"]');
    if (radio) radio.checked = true;
    bTitle.textContent = isBusy ? (b.name ? 'Turno de ' + b.name : 'Horario bloqueado') : 'Nuevo turno';
    bWhen.textContent = (dateText || dayText(key)) + ' · ' + (time || parts(key).time) + ' h';
    bFree.hidden = !isBusy;
    bBlock.hidden = isBusy;
    bError.hidden = true;
    fillOptions();
    updateExtras();
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '');
    if (!b.name) f.name.focus();
  }
  function closeBooking() { if (dialog.close) dialog.close(); else dialog.removeAttribute('open'); currentKey = null; }
  window.astraOpenBooking = openBooking;

  bForm.addEventListener('input', function (e) {
    if (e.target.name === 'name') { // muestra las clientas parecidas; si coincide exacto, completa lo vacío
      renderSuggest();
      var c = findClient(e.target.value), f = bForm.elements;
      if (c) {
        if (!f.phone.value) f.phone.value = c.phone;
        if (!f.instagram.value && c.instagram) f.instagram.value = '@' + c.instagram;
        if (!f.notes.value) f.notes.value = c.notes;
      }
    }
    updateExtras();
  });
  document.querySelector('[data-booking-close]').addEventListener('click', closeBooking);
  // Escape con la lista de clientas abierta: cierra solo la lista, no la ficha
  dialog.addEventListener('cancel', function (e) { if (!suggest.hidden) { e.preventDefault(); closeSuggest(); } });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeBooking(); }); // tocar afuera cierra

  function busyAction(promise, okText) {
    bError.hidden = true;
    bSave.disabled = true;
    return promise.then(function () {
      closeBooking();
      refreshAll();
      announce(okText);
    }).catch(function (e) {
      bError.textContent = e.message;
      bError.hidden = false;
    }).finally(function () { bSave.disabled = false; });
  }

  bForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = currentKey, data = readForm();
    if (!data.name) { bError.textContent = 'Escribí el nombre de la clienta (o usá "Bloquear sin clienta").'; bError.hidden = false; return; }
    busyAction(api({ action: 'save', slot: key, booking: data }).then(function (r) {
      bookings[key] = r.booking;
      if (busyList.indexOf(key) < 0) busyList.push(key);
      window.astraAgendaSetBusy(key, true);
    }), 'Turno guardado.');
  });
  // "No trabajo en este horario": en la página deja de ofrecerse (no figura como ocupado)
  bBlock.addEventListener('click', function () {
    var key = currentKey;
    closeBooking();
    window.astraSetClosed([key], true, 'Listo: ese horario figura sin atención.');
  });

  // ---- Días que no trabajo (vacaciones, cursos, días libres) ----
  var offForm = document.querySelector('[data-off-form]');
  var offError = document.querySelector('[data-off-error]');
  var offList = document.querySelector('[data-off-list]');
  function addDays(ymd, n) { var d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  // agrupa días seguidos: "12 al 16 de octubre"
  function renderOff() {
    if (!window.astraGetClosed) return;
    var all = window.astraGetClosed(), days = all.filter(function (k) { return k.length === 10; }), ranges = [];
    days.forEach(function (d) {
      var last = ranges[ranges.length - 1];
      if (last && addDays(last.to, 1) === d) last.to = d; else ranges.push({ from: d, to: d });
    });
    var slots = all.filter(function (k) { return k.length > 10; });
    var label = function (r) {
      var a = parts(r.from + 'T00:00'), b = parts(r.to + 'T00:00');
      if (r.from === r.to) return dayText(r.from + 'T00:00');
      return a.date.getUTCDate() + (a.date.getUTCMonth() === b.date.getUTCMonth() ? '' : ' de ' + MONTHS[a.date.getUTCMonth()]) +
        ' al ' + b.date.getUTCDate() + ' de ' + MONTHS[b.date.getUTCMonth()];
    };
    offList.innerHTML = ranges.map(function (r) {
      return '<li><span>' + esc(label(r)) + '</span><button type="button" class="admin-off__remove" data-off-from="' + r.from + '" data-off-to="' + r.to + '">Volver a abrir</button></li>';
    }).concat(slots.map(function (k) {
      return '<li><span>' + esc(dayText(k) + ', ' + parts(k).time + ' h') + '</span><button type="button" class="admin-off__remove" data-off-slot-key="' + k + '">Volver a abrir</button></li>';
    })).join('') || '<li class="admin-empty">No marcaste días ni horarios sin atención.</li>';
  }
  window.astraOnClosedChange = renderOff;

  offForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var from = offForm.from.value, to = offForm.to.value, today = todayKey();
    offError.hidden = true;
    var fail = function (t) { offError.textContent = t; offError.hidden = false; };
    if (!from || !to) return fail('Elegí las dos fechas.');
    if (to < from) return fail('La fecha "hasta" tiene que ser igual o posterior a "desde".');
    if (to < today) return fail('Esas fechas ya pasaron.');
    var days = [];
    for (var d = from < today ? today : from; d <= to && days.length <= 130; d = addDays(d, 1)) days.push(d);
    if (days.length > 130) return fail('Elegí un período de hasta 4 meses.');
    window.astraSetClosed(days, true, 'Listo: esos días figuran sin atención.').then(function (ok) { if (ok) offForm.reset(); });
  });
  offList.addEventListener('click', function (e) {
    var btn = e.target.closest('.admin-off__remove');
    if (!btn) return;
    if (btn.hasAttribute('data-off-slot-key')) { window.astraSetClosed([btn.getAttribute('data-off-slot-key')], false, 'Horario habilitado de nuevo.'); return; }
    var days = [];
    for (var d = btn.getAttribute('data-off-from'); d <= btn.getAttribute('data-off-to'); d = addDays(d, 1)) days.push(d);
    window.astraSetClosed(days, false, 'Días abiertos de nuevo.');
  });
  bFree.addEventListener('click', function () {
    var key = currentKey, b = bookings[key];
    if (b && b.name && !window.confirm('¿Liberar el horario y borrar el turno de ' + b.name + '?')) return;
    busyAction(api({ action: 'remove', slot: key }).then(function () {
      delete bookings[key];
      busyList = busyList.filter(function (k) { return k !== key; });
      window.astraAgendaSetBusy(key, false);
    }), 'Horario liberado.');
  });

  // ---- Próximos turnos ----
  var upcoming = document.querySelector('[data-upcoming]');
  function chip(text, cls) { return '<span class="admin-chip ' + (cls || '') + '">' + esc(text) + '</span>'; }
  // "Desde hoy" o "Mes completo" (con los días que ya pasaron y flechas para cambiar de mes)
  var listMode = 'next', listMonth = todayKey().slice(0, 7);
  var monthBar = document.querySelector('[data-list-month]');
  var monthLabel = document.querySelector('[data-list-month-label]');
  function shiftMonth(ym, n) { var d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-list-mode]'), function (b) {
    b.addEventListener('click', function () {
      listMode = b.getAttribute('data-list-mode');
      Array.prototype.forEach.call(document.querySelectorAll('[data-list-mode]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderUpcoming();
    });
  });
  document.querySelector('[data-list-prev]').addEventListener('click', function () { listMonth = shiftMonth(listMonth, -1); renderUpcoming(); });
  document.querySelector('[data-list-next]').addEventListener('click', function () { listMonth = shiftMonth(listMonth, 1); renderUpcoming(); });

  function renderUpcoming() {
    var today = todayKey();
    monthBar.hidden = listMode !== 'month';
    if (listMode === 'month') monthLabel.textContent = MONTHS[+listMonth.slice(5, 7) - 1].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + listMonth.slice(0, 4);
    var keys = busyList.concat(Object.keys(bookings)).filter(function (k, i, a) {
      if (a.indexOf(k) !== i) return false;
      return listMode === 'month' ? k.slice(0, 7) === listMonth : k.slice(0, 10) >= today;
    }).sort();
    if (!keys.length) {
      upcoming.innerHTML = '<p class="admin-empty">' + (listMode === 'month' ? 'No hay turnos anotados en este mes.' : 'No hay turnos anotados de hoy en adelante.') + '</p>';
      return;
    }
    var head = '';
    if (listMode === 'month') { // cuenta rápida del mes arriba de la lista
      var named = keys.filter(function (k) { return bookings[k] && bookings[k].name; });
      var came = named.filter(function (k) { return bookings[k].status === 'asistio'; }).length;
      var missed = named.filter(function (k) { return bookings[k].status === 'no-vino'; }).length;
      head = '<p class="admin-monthsum">' + plural(named.length, 'turno', 'turnos') + ' · ' + came + ' vinieron · ' + plural(missed, 'falta', 'faltas') + '</p>';
    }
    var html = head || '', lastDay = '';
    keys.forEach(function (key) {
      var b = bookings[key] || {}, day = key.slice(0, 10);
      if (day !== lastDay) { html += '<h3 class="admin-day">' + (day === today ? 'Hoy · ' : '') + esc(dayText(key)) + '</h3>'; lastDay = day; }
      var wa = b.name && day >= today ? waLink(key, b) : ''; // recordatorio solo para los que vienen
      html += '<article class="admin-item' + (day < today ? ' is-past' : '') + '">' +
        '<button type="button" class="admin-item__main" data-open="' + key + '">' +
          '<span class="admin-item__time">' + esc(parts(key).time) + '</span>' +
          '<span class="admin-item__body"><strong>' + esc(b.name || 'Bloqueado') + '</strong>' +
          (b.service ? '<span>' + esc(b.service) + (b.price ? ' · ' + money(b.price) : '') + '</span>' : '') +
          (b.design ? '<span class="admin-item__design">' + esc(b.design) + '</span>' : '') + '</span>' +
        '</button>' +
        '<div class="admin-item__meta">' +
          (b.name ? chip(STATUS[b.status] || 'Pendiente', 'is-' + (b.status || 'pendiente')) + chip(b.deposit ? 'Seña ✓' : 'Sin seña', b.deposit ? 'is-ok' : 'is-warn') : '') +
          (wa ? '<a class="admin-item__wa" href="' + esc(wa) + '" target="_blank" rel="noopener">Recordar por WhatsApp</a>' : '') +
        '</div></article>';
    });
    upcoming.innerHTML = html;
  }
  upcoming.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-open]');
    if (btn) { var k = btn.getAttribute('data-open'); openBooking(k, dayText(k), parts(k).time, true); }
  });

  // ---- Clientas ----
  var clientList = document.querySelector('[data-clients]');
  var search = document.querySelector('[data-client-search]');
  function renderClients() {
    var q = (search.value || '').trim().toLowerCase();
    var list = clients().filter(function (c) {
      return !q || (c.name + ' ' + c.phone + ' ' + c.instagram).toLowerCase().indexOf(q) >= 0;
    });
    if (!list.length) { clientList.innerHTML = '<p class="admin-empty">' + (q ? 'No hay clientas con esa búsqueda.' : 'Todavía no hay clientas: se agregan solas al anotar turnos.') + '</p>'; return; }
    clientList.innerHTML = list.map(function (c) {
      var wa = waNumber(c.phone);
      return '<details class="admin-client"><summary><strong>' + esc(c.name) + '</strong><span>' + esc(historyLine(c) || 'Sin visitas todavía') + '</span></summary>' +
        '<div class="admin-client__body">' +
          '<p>' + (c.phone ? esc(c.phone) : 'Sin teléfono') + (c.instagram ? ' · @' + esc(c.instagram) : '') + '</p>' +
          (c.notes ? '<p class="admin-client__notes">' + esc(c.notes) + '</p>' : '') +
          '<p class="admin-client__links">' + (wa ? '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
          (c.instagram ? '<a href="https://www.instagram.com/' + encodeURIComponent(c.instagram) + '/" target="_blank" rel="noopener">Instagram</a>' : '') + '</p>' +
          '<ul class="admin-client__history">' + c.history.slice().reverse().map(function (h) {
            return '<li><button type="button" data-open="' + h.key + '">' + esc(shortDate(h.key) + ' ' + parts(h.key).time) + ' · ' + esc(h.b.service || 'Turno') +
              (h.b.price ? ' · ' + money(h.b.price) : '') + ' · ' + esc(STATUS[h.b.status] || 'Pendiente') + '</button></li>';
          }).join('') + '</ul>' +
        '</div></details>';
    }).join('');
  }
  search.addEventListener('input', renderClients);
  clientList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-open]');
    if (btn) { var k = btn.getAttribute('data-open'); openBooking(k, dayText(k), parts(k).time, busyList.indexOf(k) >= 0 || !!bookings[k]); }
  });

  // ---- Resumen del mes ----
  var summary = document.querySelector('[data-summary]');
  function renderSummary() {
    var month = todayKey().slice(0, 7), today = todayKey();
    var list = Object.keys(bookings).filter(function (k) { return k.slice(0, 7) === month && bookings[k].name; }).map(function (k) { return { key: k, b: bookings[k] }; });
    var came = list.filter(function (x) { return x.b.status === 'asistio'; });
    var missed = list.filter(function (x) { return x.b.status === 'no-vino'; });
    var ahead = list.filter(function (x) { return x.key.slice(0, 10) >= today && x.b.status !== 'asistio' && x.b.status !== 'no-vino'; });
    var earned = came.reduce(function (s, x) { return s + (x.b.price || 0); }, 0);
    var expected = ahead.reduce(function (s, x) { return s + (x.b.price || 0); }, 0);
    var deposits = list.filter(function (x) { return x.b.deposit; }).length;
    var services = {};
    list.forEach(function (x) { var s = x.b.service || 'Sin especificar'; services[s] = (services[s] || 0) + 1; });
    var m = new Date(); m = MONTHS[+month.slice(5, 7) - 1];
    var tile = function (label, value, note) { return '<div class="admin-stat"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong>' + (note ? '<small>' + esc(note) + '</small>' : '') + '</div>'; };
    summary.innerHTML = '<h3 class="admin-day">Resumen de ' + m + '</h3><div class="admin-stats">' +
      tile('Turnos anotados', String(list.length)) +
      tile('Ingresos (vinieron)', money(earned), plural(came.length, 'turno', 'turnos')) +
      tile('Por cobrar', money(expected), plural(ahead.length, 'turno que viene', 'turnos que vienen')) +
      tile('Señas cobradas', money(deposits * DEPOSIT), plural(deposits, 'seña', 'señas')) +
      tile('Faltas', String(missed.length), list.length ? Math.round(missed.length * 100 / list.length) + '% de los turnos' : '') +
      '</div>' +
      (list.length ? '<h3 class="admin-day">Servicios del mes</h3><ul class="admin-services">' + Object.keys(services).sort(function (a, b) { return services[b] - services[a]; })
        .map(function (s) { return '<li><span>' + esc(s) + '</span><strong>' + services[s] + '</strong></li>'; }).join('') + '</ul>' : '');
  }

  // Copia de seguridad: planilla (CSV con ; para que Excel en español la abra en columnas)
  document.querySelector('[data-export]').addEventListener('click', function () {
    var cell = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['Fecha', 'Hora', 'Clienta', 'WhatsApp', 'Instagram', 'Servicio', 'Diseño', 'Notas', 'Precio', 'Seña', 'Estado']];
    Object.keys(bookings).sort().forEach(function (k) {
      var b = bookings[k];
      rows.push([k.slice(0, 10), parts(k).time, b.name, b.phone, b.instagram ? '@' + b.instagram : '', b.service, b.design, b.notes, b.price || '', b.deposit ? 'Sí' : 'No', STATUS[b.status] || '']);
    });
    var csv = '﻿' + rows.map(function (r) { return r.map(cell).join(';'); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'astra-turnos-' + todayKey() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  // ---- Pestañas ----
  function showTab(name) {
    Array.prototype.forEach.call(tabs.querySelectorAll('[data-tab]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tab') === name)); });
    agenda.hidden = name !== 'agenda';
    panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== name; });
    if (name === 'proximos') renderUpcoming();
    if (name === 'clientas') renderClients();
    if (name === 'resumen') renderSummary();
  }
  tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) showTab(b.getAttribute('data-tab')); });

  function refreshAll() {
    window.astraBookings = bookings;
    if (window.astraAgendaRender) window.astraAgendaRender();
    var open = tabs.querySelector('[aria-pressed="true"]');
    if (open) showTab(open.getAttribute('data-tab'));
  }

  function loadBookings() {
    return api({ action: 'list' }).then(function (r) {
      bookings = r.bookings || {};
      busyList = (r.busy || []).filter(function (k) { return /T\d{2}:\d{2}$/.test(k); }); // solo horarios con el formato actual
      refreshAll();
    }).catch(function (e) { announce(e.message); });
  }

  // ---- Inicio y cierre de sesión ----
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var password = form.password.value;
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Entrando…';

    fetch('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
      body: JSON.stringify({ action: 'login' })
    }).then(function (r) {
      if (r.status === 401) throw new Error('Contraseña incorrecta. Revisala y probá de nuevo.');
      if (r.status === 429) throw new Error('Demasiados intentos seguidos. Por seguridad, esperá 15 minutos y probá de nuevo.');
      if (r.status === 503) return r.json().then(function (d) { throw new Error(d.error); });
      if (!r.ok) throw new Error('No se pudo conectar con la agenda. Probá de nuevo en un rato.');
      window.astraAdminPassword = password;
      form.hidden = true;
      tabs.hidden = false;
      foot.hidden = false;
      showTab('agenda');
      offForm.from.min = offForm.to.min = todayKey(); // no se pueden elegir días que ya pasaron
      window.astraBookings = bookings;
      window.astraAgendaLoad();
      loadBookings();
    }).catch(function (e) {
      error.textContent = e.message;
      error.hidden = false;
    }).finally(function () {
      submit.disabled = false;
      submit.textContent = 'Entrar';
    });
  });

  document.querySelector('[data-logout]').addEventListener('click', function () {
    window.astraAdminPassword = '';
    bookings = {}; busyList = []; window.astraBookings = {};
    form.reset();
    agenda.hidden = true; tabs.hidden = true; foot.hidden = true;
    panels.forEach(function (p) { p.hidden = true; });
    form.hidden = false;
    form.password.focus();
  });
})();
