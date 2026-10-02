// Uñas en 3D para la sección Servicios (Three.js r128 + OrbitControls).
// - Las librerías se descargan recién cuando la sección está por aparecer.
// - Cada tarjeta con [data-model] recibe su modelo: semi, capping, softgel o presson.
// - Las uñas van sobre la punta de un dedo (en press on, un set en abanico) para que se lean como uñas reales.
// - Semipermanente, capping y soft gel: uña con lúnula, cutícula y texturas PBR (color, rugosidad y relieve),
//   en un estudio de foto oscuro con luz de 3 puntos, sombras suaves y reflejos en tira sobre el gel.
// - El modelo se balancea suave (no gira 360°, así nunca queda de canto). También se puede girar a mano.
// - Mouse: arrastrar para girar, Ctrl + rueda para acercar (la rueda sola sigue bajando la página).
// - Celular: un dedo baja la página normal; dos dedos giran y acercan.
(function () {
  var containers = Array.prototype.slice.call(document.querySelectorAll('[data-model]'));
  if (!containers.length) return;

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Huella de cada librería: si el archivo del CDN fuera alterado, el navegador no lo ejecuta
  var INTEGRITY = {};
  INTEGRITY[THREE_URL] = 'sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu';
  INTEGRITY[CONTROLS_URL] = 'sha384-wagZhIFgY4hD+7awjQjR4e2E294y6J2HSnd8eTNc15ZubTeQeVRZwhQJ+W6hnBsf';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      if (INTEGRITY[src]) { s.integrity = INTEGRITY[src]; s.crossOrigin = 'anonymous'; }
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function webglAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function srgb(hex) { return new window.THREE.Color(hex).convertSRGBToLinear(); }

  // ---------------------------------------------------------------------------
  // Geometrías
  // ---------------------------------------------------------------------------

  // Uña simple (la usa el set de press on): contorno extruido y curvado.
  // bend = radio de la curva a lo ancho (similar al del dedo, para que "abrace" la punta).
  function nailGeometry(o) {
    var THREE = window.THREE;
    var len = o.length, w = o.width / 2, t = o.thickness;
    var tipCtrl = w * (0.12 + 0.62 * o.roundness);
    var shape = new THREE.Shape();
    shape.moveTo(-w * 0.9, 0);
    shape.quadraticCurveTo(0, -w * 0.62, w * 0.9, 0);                       // base (cutícula)
    shape.bezierCurveTo(w * 1.04, len * 0.45, tipCtrl, len * 0.97, 0, len); // lateral derecho hasta la punta
    shape.bezierCurveTo(-tipCtrl, len * 0.97, -w * 1.04, len * 0.45, -w * 0.9, 0);

    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: t, bevelEnabled: true, bevelThickness: t * 0.7, bevelSize: t * 0.6, bevelSegments: 6, curveSegments: 48
    });

    // Curva a lo ancho que sigue al dedo, y la punta que baja apenas (como una uña de verdad)
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      var drop = y > o.freeEdgeFrom ? Math.pow((y - o.freeEdgeFrom) / len, 2) * 0.35 : 0;
      pos.setZ(i, z - (x * x) / (2 * o.bend) - drop);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Uña realista (semipermanente, capping, soft gel). Formas: 'round', 'squoval' o 'almond'.
  // Tiene pequeñas imperfecciones a propósito (un lateral apenas más ancho, la punta corrida un pelito)
  // y UV de 0 a 1 (u: de borde a borde, v: de la cutícula a la punta) para pintarle texturas.
  function realNailShape(o) {
    var THREE = window.THREE;
    var len = o.length, w = o.width / 2, a = o.asym || 0, tx = o.tipShift || 0;
    var wl = w * (1 - a), wr = w * (1 + a);
    var s = new THREE.Shape();
    s.moveTo(-wl * 0.9, 0);
    s.quadraticCurveTo(tx * 0.5, -w * 0.6, wr * 0.9, 0); // base, bajo la cutícula
    if (o.shape === 'squoval') {
      s.bezierCurveTo(wr * 1.04, len * 0.42, wr * 1.01, len * 0.76, wr * 0.93, len * 0.92);
      s.bezierCurveTo(wr * 0.84, len * 1.0, wr * 0.4, len * 1.005, tx, len * 1.005);
      s.bezierCurveTo(-wl * 0.4, len * 1.005, -wl * 0.84, len * 1.0, -wl * 0.93, len * 0.92);
      s.bezierCurveTo(-wl * 1.01, len * 0.76, -wl * 1.04, len * 0.42, -wl * 0.9, 0);
    } else {
      var tip = o.shape === 'almond' ? 0.3 : 0.78;
      s.bezierCurveTo(wr * 1.05, len * 0.45, wr * tip, len * 0.98, tx, len);
      s.bezierCurveTo(-wl * tip, len * 0.98, -wl * 1.05, len * 0.45, -wl * 0.9, 0);
    }
    return s;
  }

  // Malla propia (no ExtrudeGeometry: sus caras planas atraviesan la curva y el dedo se asoma).
  // Anillos concéntricos desde el centro hasta el contorno por arriba, canto redondeado y vuelta por abajo.
  function realNail(o) {
    var THREE = window.THREE;
    var shape = realNailShape(o), T = o.thickness * 1.7, rad = T / 2;
    var outline = shape.getSpacedPoints(180);
    outline.pop();
    var N = outline.length, C = new THREE.Vector2(0, o.length * 0.4);
    var TOP = 22, RIM = 8, rows = [];
    for (var j = 0; j <= TOP; j++) rows.push({ r: Math.sin(j / TOP * Math.PI / 2), out: 0, z: T });
    for (var j2 = 1; j2 < RIM; j2++) { var a = j2 / RIM * Math.PI; rows.push({ r: 1, out: Math.sin(a) * rad, z: rad + Math.cos(a) * rad }); }
    for (var j3 = TOP; j3 >= 0; j3--) rows.push({ r: Math.sin(j3 / TOP * Math.PI / 2), out: 0, z: 0 });

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    outline.forEach(function (p) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    var W = maxX - minX, L = maxY - minY;
    var positions = [], uvs = [], index = [];
    rows.forEach(function (row) {
      for (var k = 0; k < N; k++) {
        var p = outline[k], dx = p.x - C.x, dy = p.y - C.y, d = Math.hypot(dx, dy) || 1;
        var x = C.x + dx * row.r + dx / d * row.out, y = C.y + dy * row.r + dy / d * row.out;
        positions.push(x, y, nailSurfaceZ(o, x, y, row.z));
        uvs.push(Math.min(1, Math.max(0, (x - minX) / W)), Math.min(1, Math.max(0, (y - minY) / L)));
      }
    });
    for (var i = 0; i < rows.length - 1; i++) {
      for (var k2 = 0; k2 < N; k2++) {
        var a0 = i * N + k2, a1 = i * N + (k2 + 1) % N, b0 = a0 + N, b1 = a1 + N;
        index.push(a0, b0, a1, a1, b0, b1); // normales hacia afuera
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return { geo: geo, shape: shape, W: W, L: L, minY: minY };
  }

  // Curva a lo ancho (abraza el dedo) y el borde libre que baja apenas hacia la punta
  function nailSurfaceZ(o, x, y, z) {
    var drop = y > o.freeEdgeFrom ? Math.pow((y - o.freeEdgeFrom) / o.length, 2) * 0.3 : 0;
    return z - (x * x) / (2 * o.bend) - drop;
  }

  // Pliegue de piel (cutícula y laterales) que rodea la base de la uña: un tubo que se afina en las puntas
  function cuticleFold(o, nail, material) {
    var THREE = window.THREE;
    var pts = nail.shape.getSpacedPoints(400);
    pts.pop(); // el último repite el primero
    var up = o.foldUp, i1 = 0, i2 = pts.length - 1;
    while (i1 < pts.length && pts[i1].y < up) i1++;      // sube por el lateral derecho
    while (i2 > 0 && pts[i2].y < up) i2--;                // baja por el lateral izquierdo
    var path = pts.slice(i2 + 1).concat(pts.slice(0, i1));
    var top = o.thickness * 1.7, n = path.length;
    var curvePts = path.map(function (p, k) {
      var prev = path[Math.max(0, k - 1)], next = path[Math.min(n - 1, k + 1)];
      var dx = next.x - prev.x, dy = next.y - prev.y, d = Math.hypot(dx, dy) || 1;
      var off = 0.012; // apenas por fuera del contorno, tapando el canto de la uña
      var x = p.x + (dy / d) * off, y = p.y - (dx / d) * off;
      var s = k / (n - 1), ends = Math.min(s, 1 - s);
      var sink = 0.05 * (1 - Math.min(1, ends / 0.2)); // en las puntas se hunde en la piel
      return new THREE.Vector3(x, y, nailSurfaceZ(o, x, y, top) - 0.032 - sink);
    });
    var curve = new THREE.CatmullRomCurve3(curvePts);
    var SEG = 120, RAD = 14;
    var geo = new THREE.TubeGeometry(curve, SEG, 1, RAD, false);
    var pos = geo.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
    for (var i = 0; i <= SEG; i++) {
      var s = i / SEG, ends = Math.min(s, 1 - s);
      var k = Math.min(1, ends / 0.28); k = k * k * (3 - 2 * k);
      var r = 0.012 + (o.foldRadius - 0.012) * k;
      curve.getPointAt(s, c);
      for (var j = 0; j <= RAD; j++) {
        var idx = i * (RAD + 1) + j;
        v.fromBufferAttribute(pos, idx).sub(c).multiplyScalar(r);
        v.z *= 0.8; // pliegue un poco aplanado
        pos.setXYZ(idx, c.x + v.x, c.y + v.y, c.z + v.z);
      }
    }
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Dedo: superficie de revolución con la punta redondeada, un poco aplanado (más ancho que alto).
  // La costura de la textura queda abajo (phiStart = PI), lejos de la uña.
  function fingerGeometry() {
    var THREE = window.THREE;
    var profile = [
      [0.0, -3.2], [0.66, -3.2], [0.68, -2.0], [0.68, -0.6], [0.67, 0.2], [0.64, 0.6],
      [0.57, 0.92], [0.46, 1.16], [0.32, 1.32], [0.17, 1.4], [0.0, 1.43]
    ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    // perfil suavizado y con muchos anillos, para poder acomodar la piel debajo de la uña
    var smoothProfile = new THREE.SplineCurve(profile).getSpacedPoints(90);
    var geo = new THREE.LatheGeometry(smoothProfile, 72, Math.PI);
    geo.scale(1, 1, 0.8);
    return geo;
  }

  // ---------------------------------------------------------------------------
  // Texturas procedurales (PBR): color, rugosidad y relieve
  // ---------------------------------------------------------------------------
  function valueNoise(seed) {
    var N = 256, g = new Float32Array(N * N), s = seed >>> 0 || 1;
    for (var i = 0; i < N * N; i++) { s = (s * 1664525 + 1013904223) >>> 0; g[i] = s / 4294967296; }
    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var x0 = xi & 255, y0 = yi & 255, x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
      var sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      var a = g[y0 * N + x0], b = g[y0 * N + x1], c = g[y1 * N + x0], d = g[y1 * N + x1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }
  function fbm(noise, x, y, oct) {
    var sum = 0, amp = 0.5, f = 1, tot = 0;
    for (var k = 0; k < oct; k++) { sum += amp * noise(x * f, y * f); tot += amp; amp *= 0.5; f *= 2; }
    return sum / tot;
  }
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function hexRgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  function stopsAt(stops, v) { // valor de un degradado [[v, valor], ...] en v
    if (v <= stops[0][0]) return stops[0][1];
    for (var k = 0; k < stops.length - 1; k++) {
      var a = stops[k], b = stops[k + 1];
      if (v <= b[0]) {
        var f = smooth(a[0], b[0], v);
        return typeof a[1] === 'number' ? a[1] + (b[1] - a[1]) * f : mix(a[1], b[1], f);
      }
    }
    return stops[stops.length - 1][1];
  }

  // Pinta un canvas píxel por píxel. fn(u, v, x, y) devuelve [r, g, b] (0-255).
  function canvasTexture(w, h, fn, srgbColor) {
    var THREE = window.THREE;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var col = fn((x + 0.5) / w, 1 - (y + 0.5) / h, x, y), i = (y * w + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    var tex = new THREE.CanvasTexture(c);
    if (srgbColor) tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }
  // Mapa de normales a partir de un mapa de alturas
  function normalTexture(w, h, height, strength) {
    var at = function (x, y) { return height[((y + h) % h) * w + ((x + w) % w)]; };
    return canvasTexture(w, h, function (u, v, x, y) {
      var nx = (at(x - 1, y) - at(x + 1, y)) * strength, ny = (at(x, y + 1) - at(x, y - 1)) * strength;
      var l = Math.hypot(nx, ny, 1);
      return [(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
    });
  }

  // Texturas de la uña. Capas: lecho rosado con estrías finas → lúnula → borde libre blanco natural →
  // esmalte/gel (con un margen apenas irregular en la cutícula) → sombra suave donde la tapa el pliegue.
  function nailTextures(spec, nail) {
    var w = 256, h = 512, W = nail.W, L = nail.L;
    var noise = valueNoise(spec.seed), height = new Float32Array(w * h);
    var bed = hexRgb(spec.bed || '#e4a99c'), lunula = hexRgb('#efd2c9'), freeEdge = hexRgb('#fbf4ee');
    var polish = spec.polish && spec.polish.map(function (s) { return [s[0], hexRgb(s[1])]; });
    var lunulaTop = spec.lunula / L, foldV = spec.foldUp / L;

    var map = canvasTexture(w, h, function (u, v, x, y) {
      var X = u * W, Y = v * L;
      var streak = fbm(noise, X * 16, Y * 1.1, 3);          // estrías a lo largo
      var fine = noise(X * 70 + 31, Y * 70);               // textura muy fina
      var c = bed.map(function (ch) { return ch * (0.95 + 0.1 * streak); });
      // un poco más claro hacia los costados del lecho
      c = mix(c, [250, 220, 212], 0.25 * Math.pow(Math.abs(u - 0.5) * 2, 3));
      // lúnula: media luna clara en la base, de borde suave
      var lu = (u - 0.5) / 0.34, lv = v / lunulaTop, ld = lu * lu + lv * lv;
      c = mix(c, lunula, 0.8 * (1 - smooth(0.6, 1.05, ld)));
      // borde libre natural (con la "línea de sonrisa" que sube por los costados)
      if (spec.freeEdge < 1) {
        var vb = spec.freeEdge - 0.07 * Math.pow((u - 0.5) * 2, 2) + 0.006 * (noise(X * 12, 7.7) - 0.5);
        c = mix(c, freeEdge, smooth(vb - 0.01, vb + 0.014, v));
      }
      // esmalte o gel
      if (polish) {
        var margin = spec.margin + 0.008 * (fbm(noise, X * 9, 3.3, 2) - 0.5);
        var cover = smooth(margin, margin + 0.01, v) * stopsAt(spec.opacity, v);
        var pc = stopsAt(polish, v);
        var apex = 1 - 0.07 * (1 - Math.pow((u - 0.5) * 2, 2)) * smooth(0.15, 0.6, v); // más denso en el centro
        pc = pc.map(function (ch) { return ch * apex * (0.985 + 0.03 * streak); });
        c = mix(c, pc, cover);
      }
      // sombra de contacto junto al pliegue de piel (cutícula y laterales)
      var side = Math.min(u, 1 - u) * W, base = v * L;
      var ao = 1 - 0.32 * Math.exp(-base / 0.05) - (v < foldV ? 0.2 * Math.exp(-side / 0.035) * (1 - smooth(foldV * 0.7, foldV, v)) : 0);
      c = c.map(function (ch) { return Math.min(255, ch * ao * (0.99 + 0.02 * fine)); });
      height[y * w + x] = streak * (polish ? 0.35 : 1) + 0.25 * fine;
      return c;
    }, true);

    var rough = canvasTexture(w, h, function (u, v) {
      var r = 200 + 55 * fbm(noise, u * W * 40, v * L * 40, 2);
      return [r, r, r];
    });

    return { map: map, rough: rough, normal: normalTexture(w, h, height, spec.relief || 2.2) };
  }

  // Piel: tono cálido con leves manchitas, más rosada en la yema, y poros finos en el relieve
  var skinTextures = null; // se calculan una sola vez para los tres dedos
  function skinMaterials() {
    var THREE = window.THREE;
    if (!skinTextures) {
      var w = 512, h = 512, noise = valueNoise(7), height = new Float32Array(w * h);
      var base = hexRgb('#dfa486'), flush = hexRgb('#d68676');
      var map = canvasTexture(w, h, function (u, v, x, y) {
        var blot = fbm(noise, u * 9, v * 9, 3), pore = noise(u * 200, v * 200);
        var c = mix(base, flush, 0.25 * blot + 0.45 * smooth(0.55, 1, v));
        height[y * w + x] = pore * 0.6 + blot * 0.4;
        return c.map(function (ch) { return ch * (0.97 + 0.04 * pore); });
      }, true);
      skinTextures = { map: map, normal: normalTexture(w, h, height, 1.4) };
    }
    var skin = new THREE.MeshPhysicalMaterial({
      map: skinTextures.map, normalMap: skinTextures.normal, normalScale: new THREE.Vector2(0.12, 0.12),
      roughness: 0.58, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5,
      sheen: srgb('#ffd6c8'), emissive: srgb('#7a2a1e'), emissiveIntensity: 0.07, envMapIntensity: 0.5
    });
    // el pliegue de la cutícula: la misma piel, apenas más rosada
    var fold = skin.clone();
    fold.color = srgb('#fae4dc');
    return { skin: skin, fold: fold };
  }

  // ---------------------------------------------------------------------------
  // Materiales
  // ---------------------------------------------------------------------------
  function gel(options) {
    var THREE = window.THREE;
    if (options.color != null) options.color = srgb(options.color);
    return new THREE.MeshPhysicalMaterial(Object.assign({
      roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.7
    }, options));
  }

  // Material PBR de la uña: color + rugosidad + relieve en la base y en la capa de brillo (clearcoat)
  function nailMaterial(spec, nail) {
    var THREE = window.THREE, t = nailTextures(spec, nail);
    return new THREE.MeshPhysicalMaterial({
      map: t.map, roughness: spec.roughness, roughnessMap: t.rough, metalness: 0,
      normalMap: t.normal, normalScale: new THREE.Vector2(0.25, 0.25),
      clearcoat: spec.clearcoat, clearcoatRoughness: spec.clearcoatRoughness,
      clearcoatNormalMap: t.normal, clearcoatNormalScale: new THREE.Vector2(spec.coatRelief, spec.coatRelief),
      envMapIntensity: spec.env || 1
    });
  }

  // Baja la piel que queda debajo de la uña (el lecho ungueal), así la uña apoya sin que el dedo la atraviese
  function seatFinger(geo, nailGroup, o, nail) {
    var THREE = window.THREE;
    nailGroup.updateMatrix();
    var m = nailGroup.matrix, inv = m.clone().invert();
    var pos = geo.attributes.position, p = new THREE.Vector3(), half = nail.W / 2;
    for (var i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      if (p.z < 0.05) continue; // la parte de abajo del dedo no se toca
      p.applyMatrix4(inv);
      // pasado el pliegue lateral, la yema también baja a los costados para no asomar sobre el borde de la uña
      var ax = Math.abs(p.x), wide = smooth(o.foldUp * 0.8, o.foldUp, p.y);
      var edge0 = half * 0.8 + wide * (half * 0.2 + 0.1), edge1 = half + 0.06 + wide * 0.26;
      if (p.y < nail.minY - 0.04 || p.y > nail.minY + nail.L || ax > edge1) continue;
      var under = nailSurfaceZ(o, p.x, p.y, 0) - 0.015;
      if (p.z <= under) continue;
      var k = 1 - smooth(edge0, edge1, ax);
      p.z += (under - p.z) * k;
      p.applyMatrix4(m);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    geo.computeVertexNormals();
  }

  // Dedo con su uña: la uña se apoya sobre la cara superior del dedo, con la cutícula encima
  function realFinger(o) {
    var THREE = window.THREE;
    var mats = skinMaterials();
    var group = new THREE.Group();
    var finger = new THREE.Mesh(fingerGeometry(), mats.skin);
    finger.castShadow = true;
    finger.receiveShadow = true;
    group.add(finger);

    var nail = realNail(o);
    var mesh = new THREE.Mesh(nail.geo, nailMaterial(o, nail));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    var nailGroup = new THREE.Group();
    nailGroup.add(mesh);
    nailGroup.add(cuticleFold(o, nail, mats.fold));
    nailGroup.position.set(0, -0.32, 0.58); // sobre la cara superior del dedo
    nailGroup.rotation.x = -0.1;            // acompaña la curva hacia la punta
    seatFinger(finger.geometry, nailGroup, o, nail);
    group.add(nailGroup);
    group.rotation.set(-0.6, 0, o.tilt || 0); // dedo inclinado, con la uña mirando a la cámara
    group.position.y = -0.8;
    return group;
  }

  var REAL_NAIL = { width: 0.96, bend: 0.5, thickness: 0.042, foldUp: 0.85, foldRadius: 0.034 };

  // ---------------------------------------------------------------------------
  // Modelos de cada servicio
  // ---------------------------------------------------------------------------
  var MODELS = {
    // Semipermanente: uña natural corta y redondeada, rosa intenso brillante recién hecha.
    // Se ve un hilito de uña natural (con la lúnula) entre la cutícula y el esmalte.
    semi: function () {
      return realFinger(Object.assign({}, REAL_NAIL, {
        shape: 'round', length: 1.48, width: 0.9, asym: 0.015, tipShift: 0.008, freeEdgeFrom: 1.15, tilt: 0.06, seed: 11,
        lunula: 0.3, freeEdge: 0.86, margin: 0.06,
        polish: [[0, '#ff6fb5'], [1, '#ff5fab']], opacity: [[0, 1], [1, 1]],
        roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.07, coatRelief: 0.06, env: 1
      }));
    },

    // Capping: gel sobre la uña natural, de beige suave en la base a blanco puro en la punta (baby boomer).
    // La base es apenas translúcida y deja ver la lúnula.
    capping: function () {
      return realFinger(Object.assign({}, REAL_NAIL, {
        shape: 'squoval', length: 1.72, width: 0.92, asym: -0.012, tipShift: -0.006, freeEdgeFrom: 1.2, tilt: -0.05, seed: 23,
        lunula: 0.32, freeEdge: 0.8, margin: 0.06,
        polish: [[0.1, '#d8a98f'], [0.5, '#e6c2ad'], [0.95, '#ffffff']], opacity: [[0, 0.7], [0.3, 0.92], [0.6, 1]],
        roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.05, coatRelief: 0.05, env: 1
      }));
    },

    // Soft gel: extensión almendra larga, rosa pastel con acabado satinado (brillo suave, no espejado)
    softgel: function () {
      return realFinger(Object.assign({}, REAL_NAIL, {
        shape: 'almond', length: 2.45, width: 0.88, asym: 0.01, tipShift: 0.012, freeEdgeFrom: 1.05, tilt: 0.08, seed: 37,
        lunula: 0.3, freeEdge: 1, margin: 0.07,
        polish: [[0, '#ffa3cc'], [1, '#ff9ac7']], opacity: [[0, 0.82], [0.25, 1]],
        roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.3, coatRelief: 0.12, env: 0.9
      }));
    },

    // Press on: set de 5 uñas almendra en abanico, negras y nude, con adornos en relieve como en la vida real:
    // grietas y bandas cromadas, cruz gótica, estrellitas abombadas, tachas y puntitos de gel negro.
    presson: function () {
      var THREE = window.THREE;
      var group = new THREE.Group();
      var NUDE = '#d9bfb0', BLACK = '#141013';
      var T = 0.05, BEND = 0.55;

      var chrome = new THREE.MeshStandardMaterial({ color: srgb('#eceef3'), metalness: 1, roughness: 0.07, envMapIntensity: 1.9 });
      var blackGel = new THREE.MeshPhysicalMaterial({ color: srgb('#0f0c0e'), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1 });

      // Diseño pintado debajo del gel: u (0 = borde izq, 1 = borde der) y v (0 = cutícula, 1 = punta)
      function design(base, draw) {
        var c = document.createElement('canvas');
        c.width = 256; c.height = 512;
        var g = c.getContext('2d');
        g.fillStyle = base; g.fillRect(0, 0, 256, 512);
        if (draw) draw(g, function (u, v) { return [u * 256, (1 - v) * 512]; });
        var tex = new THREE.CanvasTexture(c);
        tex.encoding = THREE.sRGBEncoding;
        return tex;
      }
      function blob(g, P, u, v, r) { // sombra negra difuminada (efecto aura)
        var q = P(u, v);
        var grad = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], r);
        grad.addColorStop(0, 'rgba(20,16,19,0.95)'); grad.addColorStop(0.45, 'rgba(20,16,19,0.75)'); grad.addColorStop(1, 'rgba(20,16,19,0)');
        g.fillStyle = grad; g.beginPath(); g.arc(q[0], q[1], r, 0, Math.PI * 2); g.fill();
      }

      var sizes = [[1.5, 0.62], [1.72, 0.68], [1.95, 0.76], [1.72, 0.68], [1.55, 0.64]];
      var textures = [
        design(BLACK),
        design(NUDE),
        design(NUDE, function (g, P) {
          blob(g, P, 0.1, 0.62, 52); blob(g, P, 0.9, 0.46, 56); blob(g, P, 0.3, 0.88, 40);
          blob(g, P, 0.8, 0.8, 38); blob(g, P, 0.16, 0.28, 34);
        }),
        design(BLACK),
        design(NUDE)
      ];

      var nails = sizes.map(function (s, i) {
        var tex = textures[i];
        tex.repeat.set(1 / s[1], 1 / s[0]);   // del contorno de la uña (x, y) a la imagen (u, v)
        tex.offset.set(0.5, 0);
        var mesh = new THREE.Mesh(
          nailGeometry({ length: s[0], width: s[1], roundness: 0.3, thickness: T, bend: BEND, freeEdgeFrom: 99 }),
          gel({ color: '#ffffff', map: tex, roughness: 0.12, envMapIntensity: 0.6 })
        );
        mesh.userData = { len: s[0], width: s[1] };
        var angle = (i - 2) * 0.42;
        mesh.position.set(Math.sin(angle) * 1.25, Math.cos(angle) * 1.25 - 2.0, Math.abs(i - 2) * -0.06);
        mesh.rotation.z = -angle;
        group.add(mesh);
        return mesh;
      });

      // ---- Ayudas para apoyar adornos sobre la superficie curva de la uña ----
      function surface(x, y, lift) { return new THREE.Vector3(x, y, 1.7 * T - (x * x) / (2 * BEND) + (lift || 0)); }
      function uv(nail, u, v) { return [(u - 0.5) * nail.userData.width, v * nail.userData.len]; }
      function place(nail, obj, u, v, lift) {
        var p = uv(nail, u, v);
        obj.position.copy(surface(p[0], p[1], lift));
        obj.rotation.y = Math.atan(p[0] / BEND); // acompaña la curva de la uña
        nail.add(obj);
      }
      // Línea en relieve (tubo) que sigue la superficie
      function ridge(nail, pts, radius, material) {
        var curve = new THREE.CatmullRomCurve3(pts.map(function (q) { var p = uv(nail, q[0], q[1]); return surface(p[0], p[1], radius * 0.4); }));
        var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 12, radius, 10, false), material);
        nail.add(tube);
        pts.forEach(function (q, k) { // puntas redondeadas
          if (k !== 0 && k !== pts.length - 1) return;
          var cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), material);
          var p = uv(nail, q[0], q[1]);
          cap.position.copy(surface(p[0], p[1], radius * 0.4));
          nail.add(cap);
        });
      }
      function puffy(shape, depth, bevel) { // pieza abombada: poco espesor y mucho bisel redondeado
        var geo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.7, bevelSegments: 8, curveSegments: 24 });
        geo.computeVertexNormals();
        return geo;
      }
      function sparkleStar(r) { // estrellita de 4 puntas con lados curvos hacia adentro
        var s = new THREE.Shape(), inner = r * 0.16;
        for (var k = 0; k < 4; k++) {
          var a = k * Math.PI / 2 + Math.PI / 2, b = a + Math.PI / 4, c = a + Math.PI / 2;
          if (!k) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          s.quadraticCurveTo(Math.cos(b) * inner, Math.sin(b) * inner, Math.cos(c) * r, Math.sin(c) * r);
        }
        return new THREE.Mesh(puffy(s, 0.004, r * 0.22), chrome);
      }

      // 1. Negra con diseño neo tribal (cybersigilism, gótico y2k): columna central afilada y espinas curvas
      //    simétricas que se abren hacia los costados, todo en cromo en relieve que copia la curva de la uña.
      function chromePiece(nail, shape) {
        var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.009, bevelSegments: 5, curveSegments: 28 });
        var pos = geo.attributes.position;
        for (var i = 0; i < pos.count; i++) { // apoyar la pieza sobre la superficie curva
          var x = pos.getX(i), y = pos.getY(i);
          pos.setZ(i, pos.getZ(i) + 1.7 * T - (x * x) / (2 * BEND) + 0.012);
        }
        geo.computeVertexNormals();
        nail.add(new THREE.Mesh(geo, chrome));
      }
      function tribal(nail) {
        var W = nail.userData.width, L = nail.userData.len;
        var X = function (u) { return (u - 0.5) * W; }, Y = function (v) { return v * L; };
        // Columna central: hoja larga y afilada en ambas puntas
        var spine = new THREE.Shape();
        spine.moveTo(X(0.5), Y(0.08));
        spine.quadraticCurveTo(X(0.555), Y(0.45), X(0.5), Y(0.93));
        spine.quadraticCurveTo(X(0.445), Y(0.45), X(0.5), Y(0.08));
        chromePiece(nail, spine);
        // Espina curva (media luna): nace en la columna y termina en punta
        function thorn(rootV, half, tipU, tipV, cU, cV, d, mirror) {
          var m = function (u) { return mirror ? 1 - u : u; };
          var s = new THREE.Shape();
          s.moveTo(X(m(0.5)), Y(rootV + half));
          s.quadraticCurveTo(X(m(cU)), Y(cV + d), X(m(tipU)), Y(tipV));
          s.quadraticCurveTo(X(m(cU - 0.04)), Y(cV - d), X(m(0.5)), Y(rootV - half));
          chromePiece(nail, s);
        }
        [
          [0.66, 0.024, 0.69, 0.87, 0.82, 0.66, 0.026],  // sube hacia la punta
          [0.47, 0.026, 0.88, 0.43, 0.78, 0.57, 0.03], // sale al costado con gancho
          [0.31, 0.024, 0.8, 0.12, 0.84, 0.33, 0.026],  // baja hacia la cutícula
          [0.2, 0.02, 0.64, 0.05, 0.6, 0.18, 0.02]     // espinita chica en la base
        ].forEach(function (t) {
          thorn(t[0], t[1], t[2], t[3], t[4], t[5], t[6], false);
          thorn(t[0], t[1], t[2], t[3], t[4], t[5], t[6], true);
        });
        // Puntitos cromados entre las espinas, como en los diseños tribales
        [[0.66, 0.6], [0.72, 0.3]].forEach(function (p) {
          [p[0], 1 - p[0]].forEach(function (u) {
            var b = new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 10), chrome);
            b.scale.z = 0.7;
            place(nail, b, u, p[1], 0.008);
          });
        });
      }
      tribal(nails[0]);

      // 2. Nude con dos bandas cromadas y una cruz gótica
      function band(v, bow, u0, u1) { var pts = []; for (var k = 0; k <= 8; k++) { var f = k / 8; pts.push([u0 + (u1 - u0) * f, v + Math.sin(f * Math.PI) * bow]); } return pts; }
      ridge(nails[1], band(0.2, 0.05, 0.14, 0.86), 0.024, chrome);
      ridge(nails[1], band(0.7, -0.05, 0.3, 0.7), 0.022, chrome);
      var cross = new THREE.Group();
      var crossShape = new THREE.Shape(); // cruz con brazos que se ensanchan en las puntas
      crossShape.moveTo(-0.022, 0.05);
      [[-0.1, 0.05], [-0.13, 0.075], [-0.1, 0.1], [-0.022, 0.1], [-0.022, 0.17], [-0.045, 0.2], [0, 0.23], [0.045, 0.2],
       [0.022, 0.17], [0.022, 0.1], [0.1, 0.1], [0.13, 0.075], [0.1, 0.05], [0.022, 0.05], [0.022, -0.17], [0.05, -0.21],
       [0, -0.25], [-0.05, -0.21], [-0.022, -0.17], [-0.022, 0.05]].forEach(function (p) { crossShape.lineTo(p[0], p[1]); });
      cross.add(new THREE.Mesh(puffy(crossShape, 0.006, 0.016), chrome));
      // remates redondos (trébol) y piedrita central
      [[0, 0.25, 0.022], [-0.15, 0.075, 0.02], [0.15, 0.075, 0.02], [0, -0.27, 0.024], [0, 0.075, 0.026]].forEach(function (b) {
        var ball = new THREE.Mesh(new THREE.SphereGeometry(b[2], 20, 14), chrome);
        ball.position.set(b[0], b[1], 0.02);
        cross.add(ball);
      });
      cross.scale.setScalar(1.35);
      place(nails[1], cross, 0.5, 0.47, 0.006);

      // 3. Nude con aura negra y estrellitas abombadas
      place(nails[2], sparkleStar(0.19), 0.55, 0.5, 0.012);
      place(nails[2], sparkleStar(0.1), 0.4, 0.75, 0.01);

      // 4. Negra con tachas cromadas (bolitas) que se abren hacia la punta
      [[0.2, 1], [0.3, 2], [0.4, 3], [0.5, 4], [0.6, 4], [0.7, 3], [0.8, 2]].forEach(function (row) {
        for (var j = 0; j < row[1]; j++) {
          var stud = new THREE.Mesh(new THREE.SphereGeometry(0.038, 18, 14), chrome);
          place(nails[3], stud, 0.5 + (j - (row[1] - 1) / 2) * 0.16, row[0], 0.012);
        }
      });

      // 5. Nude con cruz de puntitos de gel negro en relieve
      var dot = function (u, v) { place(nails[4], new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), blackGel), u, v, 0.004); };
      for (var v = 0.12; v <= 0.9; v += 0.07) dot(0.5, v);
      [0.2, 0.3, 0.4, 0.6, 0.7, 0.8].forEach(function (u) { dot(u, 0.6); });

      group.rotation.x = -0.2;
      return group;
    }


  };

  // Ambiente de estudio: paneles de luz blancos para los reflejos del brillo
  function environment(renderer) {
    var THREE = window.THREE;
    var scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x6f5f66, side: THREE.BackSide })));
    [[0, 4.6, 1, 6, 0.2, 4, 0xffffff], [4.6, 1, 2, 0.2, 3, 3, 0xfff2f6], [-4.6, 0.5, 0, 0.2, 2.5, 4, 0xffe7ef], [0, 0, 4.6, 3, 1.2, 0.2, 0xffffff]].forEach(function (p) {
      var panel = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), new THREE.MeshBasicMaterial({ color: p[6] }));
      panel.position.set(p[0], p[1], p[2]);
      scene.add(panel);
    });
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = pmrem.fromScene(scene, 0.03).texture;
    pmrem.dispose();
    return env;
  }

  // Estudio de foto de producto: fondo oscuro con softboxes alargados (dan reflejos en tira sobre el gel)
  function studioEnvironment(renderer) {
    var THREE = window.THREE;
    var scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x2a2024, side: THREE.BackSide })));
    [
      [0.35, 4.7, 1.2, 0.55, 0.2, 4, 0xffffff, 10], // tira cenital: el reflejo largo que recorre la uña
      [-0.85, 4.7, 1.2, 0.18, 0.2, 3.4, 0xfff0f4, 5], // tira fina paralela (doble reflejo de estudio)
      [3.6, 1.2, 3.4, 0.9, 4.2, 0.2, 0xfff4ee, 6],  // tira principal (derecha, adelante)
      [0.6, 0.6, 4.7, 0.5, 3, 0.2, 0xffffff, 4],    // tira al frente (brilla cuando la uña gira)
      [-4.6, 0, 1.5, 0.2, 3.2, 1.4, 0x9a8f99],   // relleno suave (izquierda)
      [0, 1, -4.7, 6, 1.4, 0.2, 0xffdbe7, 5],       // contraluz rosado (atrás)
      [0, -4.7, 1, 6, 0.2, 4, 0x4a3a40]          // rebote cálido desde abajo
    ].forEach(function (p) {
      var panel = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), new THREE.MeshBasicMaterial({ color: p[6] }));
      panel.material.color.multiplyScalar(p[7] || 1); // luz "HDR": más brillante que blanco, como un softbox real
      panel.position.set(p[0], p[1], p[2]);
      scene.add(panel);
    });
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = pmrem.fromScene(scene, 0.02).texture;
    pmrem.dispose();
    return env;
  }

  // Iluminación de 3 puntos: principal (con sombras suaves), relleno frío y contraluz que dibuja los bordes
  function studioLights(scene) {
    var THREE = window.THREE;
    scene.add(new THREE.HemisphereLight(0xfff4f6, 0x3b2a30, 0.22));
    var key = new THREE.DirectionalLight(0xfff3ea, 2.3);
    key.position.set(2.6, 3.6, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -2.4;
    key.shadow.camera.right = key.shadow.camera.top = 2.4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 14;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xe4ecff, 0.35);
    fill.position.set(-4, 0.6, 3);
    scene.add(fill);
    var rim = new THREE.DirectionalLight(0xffd9e6, 1.6);
    rim.position.set(-1.8, 2.6, -4);
    scene.add(rim);
    var rim2 = new THREE.DirectionalLight(0xffffff, 0.7);
    rim2.position.set(3.2, 0.5, -3);
    scene.add(rim2);
  }
  var STUDIO = { semi: true, capping: true, softgel: true };

  // ---------------------------------------------------------------------------
  // Un visor por tarjeta
  // ---------------------------------------------------------------------------
  var viewers = [];
  var CAMERA = { semi: 5.2, capping: 5.4, softgel: 6.2, presson: 6.2 };

  function createViewer(container, index) {
    var THREE = window.THREE;
    var name = container.getAttribute('data-model');
    var studio = !!STUDIO[name];
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    var canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    var scene = new THREE.Scene();
    if (studio) {
      // respuesta tipo cámara de fotos: las luces fuertes no se "queman"
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.65;
      renderer.physicallyCorrectLights = false;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      scene.environment = studioEnvironment(renderer);
      studioLights(scene);
    } else {
      renderer.toneMapping = THREE.NoToneMapping;
      scene.environment = environment(renderer);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xe8c2cc, 0.5));
      var key = new THREE.DirectionalLight(0xffffff, 0.85);
      key.position.set(2.5, 3, 4);
      scene.add(key);
      var rim = new THREE.DirectionalLight(0xffe0ea, 0.35);
      rim.position.set(-3, 1, -2);
      scene.add(rim);
    }

    var pivot = new THREE.Group();   // se balancea solo
    pivot.add(MODELS[name]());
    scene.add(pivot);

    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0.2, CAMERA[name] || 4.4);

    // La rueda sola baja la página; con Ctrl acerca el modelo (se registra antes que los controles)
    canvas.addEventListener('wheel', function (e) { if (!e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });

    var controls = new THREE.OrbitControls(camera, canvas);
    controls.target.set(0, 0.1, 0);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.4;
    controls.maxDistance = 7;
    controls.rotateSpeed = 0.7;
    controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }; // un dedo deja bajar la página
    canvas.style.touchAction = 'pan-y';

    var viewer = { container: container, renderer: renderer, scene: scene, camera: camera, controls: controls, pivot: pivot,
      visible: false, phase: index * 1.3, interacting: false,
      introAt: 0,                      // cuándo apareció por primera vez (para llegar girando)
      hover: false, hx: 0, hy: 0, mix: 0 // mouse sobre la tarjeta: la uña mira hacia el cursor
    };
    // en compu: al pasar el mouse por la tarjeta, la uña gira hacia el cursor
    var card = container.closest('.service-card') || container;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      card.addEventListener('mousemove', function (e) {
        var r = container.getBoundingClientRect();
        viewer.hover = true;
        viewer.hx = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
        viewer.hy = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
      });
      card.addEventListener('mouseleave', function () { viewer.hover = false; });
    }
    controls.addEventListener('start', function () { viewer.interacting = true; });
    controls.addEventListener('end', function () { viewer.interacting = false; });

    function resize() {
      var w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
    else window.addEventListener('resize', resize);

    container.classList.add('is-ready');
    viewers.push(viewer);
    return viewer;
  }

  // Solo se dibujan los visores que están en pantalla
  function loop(time) {
    if (!document.hidden) {
      var t = time / 1000;
      viewers.forEach(function (v) {
        if (!v.visible) return;
        if (!reduceMotion && !v.interacting) {
          if (!v.introAt) v.introAt = time;
          // al aparecer por primera vez llega girando desde un costado (1,2 s, frena suave)
          var k = Math.min(1, (time - v.introAt) / 1200), intro = Math.pow(1 - k, 3) * -0.9;
          // con el mouse encima, mezcla el balanceo con la mirada hacia el cursor
          v.mix += ((v.hover ? 1 : 0) - v.mix) * 0.08;
          var swayY = Math.sin(t * 0.7 + v.phase) * 0.55, swayX = Math.sin(t * 0.5 + v.phase) * 0.08;
          v.pivot.rotation.y = swayY * (1 - v.mix) + v.hx * 0.6 * v.mix + intro;
          v.pivot.rotation.x = swayX * (1 - v.mix) + v.hy * 0.25 * v.mix;
          v.pivot.position.y = Math.sin(t * 1.1 + v.phase) * 0.04;
        }
        v.controls.update();
        v.renderer.render(v.scene, v.camera);
      });
    }
    requestAnimationFrame(loop);
  }

  function start() {
    if (!webglAvailable()) return;
    loadScript(THREE_URL)
      .then(function () { return loadScript(CONTROLS_URL); })
      .then(function () {
        var seen = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            var v = viewers.filter(function (x) { return x.container === entry.target; })[0];
            if (v) v.visible = entry.isIntersecting;
          });
        });
        containers.forEach(function (c, i) {
          try { createViewer(c, i); seen.observe(c); } catch (e) { c.classList.add('is-unavailable'); }
        });
        requestAnimationFrame(loop);
      })
      .catch(function () {
        containers.forEach(function (c) { c.classList.add('is-unavailable'); });
      });
  }

  // Cargar cuando la sección Servicios está por aparecer
  if ('IntersectionObserver' in window) {
    var trigger = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { trigger.disconnect(); start(); }
    }, { rootMargin: '400px 0px' });
    trigger.observe(containers[0]);
  } else {
    start();
  }
})();
