// Función de Vercel: lee el calendario público de Google Calendar (formato iCal)
// y devuelve SOLO los intervalos ocupados de las próximas semanas. Nunca envía títulos ni detalles.
//
// Configuración: en Vercel → Settings → Environment Variables, crear GOOGLE_CALENDAR_ID
// con el "ID del calendario" (Google Calendar → Configuración del calendario → Integrar el calendario).
// El calendario tiene que ser público, alcanza con "Ver solo libre/ocupado (ocultar detalles)".

const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina: UTC-3 todo el año
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 35;

module.exports = async function handler(req, res) {
  const calendarId = (process.env.GOOGLE_CALENDAR_ID || '').trim();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!calendarId) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(JSON.stringify({ configured: false, busy: [] }));
    return;
  }

  const url = 'https://calendar.google.com/calendar/ical/' + encodeURIComponent(calendarId) + '/public/basic.ics';

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'astra-agenda' } });
    if (!response.ok) throw new Error('Google Calendar respondió ' + response.status);
    const ics = await response.text();

    const now = Date.now();
    const busy = busyIntervals(ics, now - DAY_MS, now + WINDOW_DAYS * DAY_MS);

    // Se guarda 5 minutos en la red de Vercel: los cambios del calendario tardan como máximo eso en verse.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(JSON.stringify({ configured: true, updated: new Date(now).toISOString(), busy }));
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).send(JSON.stringify({ configured: true, error: 'No se pudo leer el calendario', busy: [] }));
  }
};

// ---------------------------------------------------------------------------
// Lectura de iCal (sin librerías)
// ---------------------------------------------------------------------------

function busyIntervals(ics, windowStart, windowEnd) {
  const events = parseEvents(ics);

  // Las instancias modificadas de un evento repetido (RECURRENCE-ID) reemplazan a la original
  const overridden = {};
  events.forEach(function (e) {
    if (e.recurrenceId != null) (overridden[e.uid] = overridden[e.uid] || []).push(e.recurrenceId);
  });

  const out = [];
  events.forEach(function (e) {
    if (e.cancelled || e.transparent || e.start == null) return;
    const duration = Math.max(0, e.end - e.start);
    const skip = new Set((e.exdates || []).concat(e.recurrenceId == null ? overridden[e.uid] || [] : []));
    const starts = e.rrule ? expandRule(e.start, e.rrule, windowEnd) : [e.start];

    starts.forEach(function (start) {
      if (skip.has(start)) return;
      const end = start + duration;
      if (end > windowStart && start < windowEnd) out.push({ start: new Date(start).toISOString(), end: new Date(end).toISOString() });
    });
  });

  return out.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
}

function parseEvents(ics) {
  const lines = ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let current = null;

  lines.forEach(function (line) {
    if (line === 'BEGIN:VEVENT') { current = { exdates: [] }; return; }
    if (line === 'END:VEVENT') {
      if (current) {
        if (current.end == null) current.end = current.allDay ? current.start + DAY_MS : current.start;
        events.push(current);
      }
      current = null;
      return;
    }
    if (!current) return;

    const colon = line.indexOf(':');
    if (colon < 0) return;
    const head = line.slice(0, colon).split(';');
    const name = head[0].toUpperCase();
    const params = head.slice(1).join(';').toUpperCase();
    const value = line.slice(colon + 1).trim();

    switch (name) {
      case 'UID': current.uid = value; break;
      case 'DTSTART': current.start = parseDate(value, params); current.allDay = isDateOnly(value, params); break;
      case 'DTEND': current.end = parseDate(value, params); break;
      case 'DURATION': current.durationMs = parseDuration(value); break;
      case 'RRULE': current.rrule = parseRule(value); break;
      case 'EXDATE': value.split(',').forEach(function (v) { current.exdates.push(parseDate(v, params)); }); break;
      case 'RECURRENCE-ID': current.recurrenceId = parseDate(value, params); break;
      case 'STATUS': current.cancelled = value.toUpperCase() === 'CANCELLED'; break;
      case 'TRANSP': current.transparent = value.toUpperCase() === 'TRANSPARENT'; break;
    }
    if (current.durationMs != null && current.start != null && current.end == null) current.end = current.start + current.durationMs;
  });

  return events;
}

function isDateOnly(value, params) {
  return params.indexOf('VALUE=DATE') >= 0 && params.indexOf('VALUE=DATE-TIME') < 0 || /^\d{8}$/.test(value);
}

// Devuelve milisegundos UTC. Fechas sin "Z" (con TZID o sin zona) se toman en hora de Argentina.
function parseDate(value, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  if (m[7] === 'Z') return utc;
  return utc + AR_OFFSET_MS;
}

function parseDuration(value) {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value);
  if (!m) return 0;
  return ((+(m[1] || 0) * 7 + +(m[2] || 0)) * 86400 + +(m[3] || 0) * 3600 + +(m[4] || 0) * 60 + +(m[5] || 0)) * 1000;
}

function parseRule(value) {
  const rule = {};
  value.split(';').forEach(function (part) {
    const kv = part.split('=');
    rule[kv[0].toUpperCase()] = kv[1];
  });
  return {
    freq: rule.FREQ,
    interval: Math.max(1, parseInt(rule.INTERVAL || '1', 10)),
    count: rule.COUNT ? parseInt(rule.COUNT, 10) : null,
    until: rule.UNTIL ? parseDate(rule.UNTIL, '') : null,
    byDay: rule.BYDAY ? rule.BYDAY.split(',').map(function (d) { return d.slice(-2); }) : null
  };
}

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Expande una regla de repetición (diaria, semanal, mensual o anual) hasta el fin de la ventana.
function expandRule(start, rule, windowEnd) {
  const out = [];
  const limit = rule.until != null ? Math.min(rule.until, windowEnd) : windowEnd;
  const maxCount = rule.count || Infinity;
  const local = new Date(start - AR_OFFSET_MS); // fecha "de pared" en Argentina
  let produced = 0;

  function push(t) {
    if (produced >= maxCount || t > limit) return false;
    if (t >= start) { out.push(t); produced++; }
    return true;
  }

  for (let i = 0; i < 2000 && produced < maxCount; i++) {
    let base;
    if (rule.freq === 'DAILY') {
      base = start + i * rule.interval * DAY_MS;
      if (!push(base)) break;
    } else if (rule.freq === 'WEEKLY') {
      const weekStart = start + i * rule.interval * 7 * DAY_MS;
      if (weekStart > limit) break;
      const days = rule.byDay || [WEEKDAYS[local.getUTCDay()]];
      const startDow = local.getUTCDay();
      const ordered = days.map(function (d) { return (WEEKDAYS.indexOf(d) - startDow + 7) % 7; }).sort(function (a, b) { return a - b; });
      for (let k = 0; k < ordered.length; k++) {
        if (!push(weekStart + ordered[k] * DAY_MS)) break;
      }
    } else if (rule.freq === 'MONTHLY' || rule.freq === 'YEARLY') {
      const months = rule.freq === 'MONTHLY' ? i * rule.interval : i * rule.interval * 12;
      const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + months, local.getUTCDate(),
        local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds()));
      if (d.getUTCDate() !== local.getUTCDate()) continue; // ej. día 31 en meses cortos
      base = d.getTime() + AR_OFFSET_MS;
      if (!push(base)) break;
    } else {
      out.push(start);
      break;
    }
  }
  return out;
}

module.exports.busyIntervals = busyIntervals;
