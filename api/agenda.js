// Función de Vercel para la agenda de turnos.
//   GET  /api/agenda → lista de horarios reservados (público, sin datos personales)
//   POST /api/agenda → la dueña marca o libera un horario (requiere contraseña)
//
// Configuración en Vercel (una sola vez):
//   1. Storage → crear una base "Upstash for Redis" (gratis) y conectarla al proyecto.
//      Vercel agrega solo las variables KV_REST_API_URL y KV_REST_API_TOKEN.
//   2. Settings → Environment Variables → ADMIN_PASSWORD = la contraseña del panel /admin.

const KEY = 'astra:reservados';
const SLOT_FORMAT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/; // ej. 2026-10-06T11:30 = 6 de octubre, turno de las 11:30
const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
const crypto = require('crypto');
const MAX_FAILS = 8;          // contraseñas incorrectas permitidas por IP...
const LOCK_SECONDS = 15 * 60;  // ...antes de bloquearla 15 minutos
const MAX_SLOTS = 62;          // un pedido no puede tocar más de un mes de horarios a la vez

function storage() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token: token } : null;
}

async function redis(db, command) {
  const response = await fetch(db.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + db.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!response.ok) throw new Error('Redis respondió ' + response.status);
  return (await response.json()).result;
}

// Fecha de hoy en Argentina con el formato de los turnos, para descartar los que ya pasaron
function todayKey() {
  return new Date(Date.now() - AR_OFFSET_MS).toISOString().slice(0, 10) + 'T00';
}

function passwordMatches(given) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(status).send(JSON.stringify(body));
}

// IP de quien hace el pedido (Vercel la pasa en x-forwarded-for); solo caracteres seguros para usarla de clave
function clientIp(req) {
  const raw = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'desconocida').split(',')[0].trim();
  return raw.replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45) || 'desconocida';
}

// El pedido tiene que venir de esta misma página (si el navegador manda Origin, debe coincidir con el sitio)
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  const db = storage();
  const adminReady = Boolean(process.env.ADMIN_PASSWORD);

  if (req.method === 'POST' && (!db || !adminReady)) {
    return send(res, 503, {
      error: !db
        ? 'Falta crear la base de datos en Vercel (Storage → Upstash for Redis).'
        : 'Falta cargar la contraseña en Vercel (variable ADMIN_PASSWORD).'
    });
  }
  if (!db) return send(res, 200, { configured: false, adminReady: adminReady, busy: [] });

  try {
    if (req.method === 'GET') {
      const all = (await redis(db, ['SMEMBERS', KEY])) || [];
      const today = todayKey();
      return send(res, 200, { configured: true, adminReady: adminReady, busy: all.filter(function (s) { return s >= today; }).sort() });
    }

    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Pedido no permitido' });
      const body = readBody(req);

      // Bloqueo por intentos fallidos: después de MAX_FAILS contraseñas mal desde la misma IP,
      // esa IP no puede probar más durante 15 minutos (protege contra quien intente adivinarla)
      const failKey = 'astra:fallos:' + clientIp(req);
      const fails = Number(await redis(db, ['GET', failKey])) || 0;
      if (fails >= MAX_FAILS) {
        res.setHeader('Retry-After', String(LOCK_SECONDS));
        return send(res, 429, { error: 'Demasiados intentos. Esperá 15 minutos.' });
      }

      if (!passwordMatches(req.headers['x-admin-password'])) {
        await redis(db, ['INCR', failKey]);
        await redis(db, ['EXPIRE', failKey, LOCK_SECONDS]);
        await new Promise(function (r) { setTimeout(r, 800); }); // además frena intentos repetidos
        return send(res, 401, { error: 'Contraseña incorrecta' });
      }
      if (fails) await redis(db, ['DEL', failKey]);

      if (body.action === 'login') return send(res, 200, { ok: true });

      const slots = Array.isArray(body.slots) ? body.slots : [];
      if (!slots.length || slots.length > MAX_SLOTS || !slots.every(function (s) { return SLOT_FORMAT.test(s); }) || typeof body.busy !== 'boolean') {
        return send(res, 400, { error: 'Pedido inválido' });
      }

      await redis(db, [body.busy ? 'SADD' : 'SREM', KEY].concat(slots));

      // Limpieza: borra los turnos de días anteriores a hoy
      const all = (await redis(db, ['SMEMBERS', KEY])) || [];
      const today = todayKey();
      const old = all.filter(function (s) { return s < today; });
      if (old.length) await redis(db, ['SREM', KEY].concat(old));

      return send(res, 200, { ok: true, busy: all.filter(function (s) { return s >= today; }).sort() });
    }

    res.setHeader('Allow', 'GET, POST');
    return send(res, 405, { error: 'Método no permitido' });
  } catch (error) {
    return send(res, 502, { configured: true, error: 'No se pudo acceder a la agenda', busy: [] });
  }
};
