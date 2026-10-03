// Uñas en 3D para la sección Servicios (Three.js r128 + OrbitControls).
// - Las librerías se descargan recién cuando la sección está por aparecer.
// - Cada tarjeta con [data-model] recibe su modelo: semi, capping, softgel o presson.
// - Las uñas van sobre la punta de un dedo (en press on, un set stiletto en abanico) para que se lean como uñas reales.
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
  // Celulares: menos píxeles, sombras y texturas más livianas y 30 cuadros por segundo (rinde y no recalienta)
  var MOBILE = window.matchMedia('(max-width: 48em), (pointer: coarse)').matches;

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
    var shape = o.customShape || realNailShape(o), T = o.thickness * 1.7, rad = T / 2;
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

    // Press on: set de 5 uñas stiletto largas, hecho a partir de una foto de referencia de press on góticos de lujo.
    // De izquierda a derecha:
    //  1. Blanco lechoso con aura negra, corazón en relieve contorneado y un dije de cruz plateada
    //     (piedra negra facetada y cristalitos) que cuelga de una cadenita.
    //  2. Negro cromado con polvo plateado en el centro y una cruz de caviar.
    //  3. Blanco lechoso con una cruz gótica en relieve de negro cromado, contorneada con caviar.
    //  4. Blanco lechoso con tribal negro en relieve (llamas curvas que terminan en punta) y dos tachas.
    //  5. Azul noche cromado (efecto ojo de gato) con dos vueltas de cadenita plateada.
    // PBR: color, rugosidad y metalizado pintados por zonas + capa de brillo (clearcoat); caviar y cadenas de
    // plata pulida; piedras con facetas. Medidas aproximadas: 1 unidad ≈ 14 mm (caviar ≈ 0,5 mm de radio).
    presson: function () {
      var THREE = window.THREE;
      var group = new THREE.Group();
      var T = 0.05, BEND = 0.55, TOP = 1.7 * T; // espesor, curva a lo ancho y altura de la cara de arriba
      var TW = MOBILE ? 256 : 512, TH = MOBILE ? 512 : 1024; // resolución de las texturas de cada uña
      var BEAD = 0.017;                            // radio del caviar

      // ---- Materiales ----
      // (todas comparten el mismo tipo de material, así la placa de video prepara menos programas al cargar)
      var silver = new THREE.MeshPhysicalMaterial({ color: srgb('#f3f3f6'), metalness: 1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8 });
      var blackChrome = new THREE.MeshPhysicalMaterial({ color: srgb('#3a3a40'), metalness: 1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5 });
      var jet = new THREE.MeshPhysicalMaterial({ color: srgb('#050507'), metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, reflectivity: 1, envMapIntensity: 2.4 });
      var crystal = new THREE.MeshPhysicalMaterial({ color: srgb('#eef2ff'), metalness: 0.9, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 3 });
      var sphereGeo = new THREE.SphereGeometry(1, 18, 12);
      var linkGeo = new THREE.TorusGeometry(0.022, 0.0062, 8, 20);
      linkGeo.scale(1.5, 1, 1); // eslabón ovalado

      // ---- Superficie curva (coordenadas de la uña: x a lo ancho, y de la cutícula a la punta) ----
      function surfZ(x) { return TOP - (x * x) / (2 * BEND); }
      function normalAt(x) { return new THREE.Vector3(x / BEND, 0, 1).normalize(); }
      function onSurface(x, y, lift) { return new THREE.Vector3(x, y, surfZ(x)).addScaledVector(normalAt(x), lift || 0); }
      function place(nail, obj, x, y, lift) {
        obj.position.copy(onSurface(x, y, lift));
        obj.rotation.y = Math.atan(x / BEND); // acompaña la curva
        nail.add(obj);
      }

      // Contorno stiletto: lleno cerca de la base y afinándose hasta una punta filosa apenas redondeada
      function stilettoShape(len, width) {
        var w = width / 2, s = new THREE.Shape();
        s.moveTo(-w * 0.92, 0);
        s.quadraticCurveTo(0, -w * 0.5, w * 0.92, 0);
        s.bezierCurveTo(w * 1.08, len * 0.3, w * 0.45, len * 0.66, 0, len);
        s.bezierCurveTo(-w * 0.45, len * 0.66, -w * 1.08, len * 0.3, -w * 0.92, 0);
        return s;
      }
      function halfWidth(nail, y) { // medio ancho de la uña a la altura y
        var o = nail.userData.outline, best = 0;
        for (var i = 0; i < o.length; i++) {
          var a = o[i], b = o[(i + 1) % o.length];
          if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) best = Math.max(best, Math.abs(a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y)));
        }
        return best;
      }

      // ---- Texturas: color + material (canal G = rugosidad, B = metalizado), dibujadas en medidas de la uña ----
      function matStyle(rough, metal) { return 'rgb(0,' + Math.round(rough * 255) + ',' + Math.round(metal * 255) + ')'; }
      function grain(g, amount, sparkle, seed, ch) { // grano fino; "sparkle" = destellos de polvo cromado
        var img = g.getImageData(0, 0, TW, TH), d = img.data, s = seed >>> 0 || 1;
        for (var i = 0; i < d.length; i += 4) {
          s = (s * 1664525 + 1013904223) >>> 0;
          var r = s / 4294967296, k = (r - 0.5) * amount;
          if (sparkle && r > 1 - sparkle * d[i + 1] / 255) k += 110; // más destellos donde el cromo es más claro
          if (ch < 0) { d[i] += k; d[i + 1] += k; d[i + 2] += k; } else d[i + ch] += k;
        }
        g.putImageData(img, 0, 0);
      }
      function nailMaps(len, width, paint, seed, sparkle) {
        var cc = document.createElement('canvas'), mc = document.createElement('canvas');
        cc.width = mc.width = TW; cc.height = mc.height = TH;
        var c = cc.getContext('2d'), m = mc.getContext('2d');
        [c, m].forEach(function (g) { g.setTransform(TW / width, 0, 0, -TH / len, TW / 2, TH); });
        paint(c, m, width / 2, len);
        grain(c, 5, sparkle || 0, seed, -1);
        grain(m, 22, 0, seed + 1, 1); // rugosidad apenas despareja, como un gel real
        var map = new THREE.CanvasTexture(cc), mr = new THREE.CanvasTexture(mc);
        map.encoding = THREE.sRGBEncoding;
        map.anisotropy = mr.anisotropy = 8;
        return { map: map, mr: mr };
      }
      function fillAll(g, style, len) { g.fillStyle = style; g.fillRect(-1, -1, 2, len + 2); }
      function milky(c, m, w, len) { // gel blanco lechoso: apenas grisáceo en la base, más blanco hacia la punta
        var g = c.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, '#d3cecd'); g.addColorStop(0.45, '#e6e3e2'); g.addColorStop(1, '#f3f1f0');
        fillAll(c, g, len);
        fillAll(m, matStyle(0.3, 0), len);
      }
      function chrome(stops, shade, rough) { // cromo: franja de luz a lo largo + bordes y punta más oscuros
        return function (c, m, w, len) {
          var gx = c.createLinearGradient(-w, 0, w, 0), gy = c.createLinearGradient(0, 0, 0, len);
          stops.forEach(function (s) { gx.addColorStop(s[0], s[1]); });
          shade.forEach(function (s) { gy.addColorStop(s[0], s[1]); });
          fillAll(c, gx, len);
          fillAll(c, gy, len);
          fillAll(m, matStyle(rough, 1), len);
        };
      }
      function aura(c, m, w, len) { // blanco lechoso en el centro que se esfuma a negro en los bordes y la punta
        fillAll(c, '#121114', len);
        c.save();
        c.translate(0, len * 0.36);
        c.scale(1, len * 0.56 / (w * 0.95));
        var g = c.createRadialGradient(0, 0, 0, 0, 0, w * 0.95);
        g.addColorStop(0, '#f1efee'); g.addColorStop(0.6, '#e9e6e5');
        g.addColorStop(0.85, 'rgba(220,216,215,0.55)'); g.addColorStop(1, 'rgba(220,216,215,0)');
        c.fillStyle = g; c.fillRect(-w * 1.2, -w * 1.2, w * 2.4, w * 2.4);
        c.restore();
        fillAll(m, matStyle(0.26, 0), len);
      }

      // ---- Caminos: muestrear, desplazar hacia afuera y repartir piezas a distancia pareja ----
      function resample(pts, step, closed) {
        var src = closed ? pts.concat([pts[0]]) : pts, segs = [], total = 0;
        for (var i = 0; i < src.length - 1; i++) {
          var l = Math.hypot(src[i + 1][0] - src[i][0], src[i + 1][1] - src[i][1]);
          segs.push(l); total += l;
        }
        var count = Math.max(1, Math.round(total / step)), d = total / count, out = [], si = 0, acc = 0;
        for (var k = 0; k < (closed ? count : count + 1); k++) {
          var target = k * d;
          while (si < segs.length - 1 && acc + segs[si] < target) { acc += segs[si]; si++; }
          var f = segs[si] ? Math.min(1, (target - acc) / segs[si]) : 0;
          out.push([src[si][0] + (src[si + 1][0] - src[si][0]) * f, src[si][1] + (src[si + 1][1] - src[si][1]) * f]);
        }
        return out;
      }
      function offsetPath(pts, dist, closed) { // dist > 0: hacia la derecha del recorrido (afuera, si es antihorario)
        var n = pts.length, out = [];
        function nrm(p, q) { var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; }
        for (var i = 0; i < n; i++) {
          var prev = closed ? pts[(i - 1 + n) % n] : pts[i - 1], next = closed ? pts[(i + 1) % n] : pts[i + 1];
          var n1 = prev ? nrm(prev, pts[i]) : null, n2 = next ? nrm(pts[i], next) : null;
          n1 = n1 || n2; n2 = n2 || n1;
          var mx = n1[0] + n2[0], my = n1[1] + n2[1], ml = Math.hypot(mx, my) || 1;
          mx /= ml; my /= ml;
          var k = dist / Math.max(0.45, mx * n1[0] + my * n1[1]); // esquinas a inglete
          out.push([pts[i][0] + mx * k, pts[i][1] + my * k]);
        }
        return out;
      }
      function shapePoints(shape) {
        var out = [];
        shape.getPoints(16).forEach(function (p) {
          var last = out[out.length - 1];
          if (!last || Math.hypot(p.x - last[0], p.y - last[1]) > 1e-5) out.push([p.x, p.y]);
        });
        if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < 1e-5) out.pop();
        return out;
      }
      function edgeLine(nail, y0, slope, bow, margin) { // línea que cruza la uña, recortada a su contorno
        var pts = [];
        for (var x = -0.5; x <= 0.5001; x += 0.01) {
          var y = y0 + slope * x + bow * x * x;
          if (Math.abs(x) <= halfWidth(nail, y) - margin) pts.push([x, y]);
        }
        return pts;
      }

      // ---- Adornos ----
      function bead(nail, x, y, r, lift) { nail.userData.beads.push([x, y, r, lift == null ? r * 0.7 : lift]); }
      function lineBeads(nail, pts, off, r) {
        resample(off ? offsetPath(pts, off, false) : pts, r * 2.15, false).forEach(function (p) { bead(nail, p[0], p[1], r); });
      }
      function outlineBeads(nail, shape, off, r) { // caviar alrededor de una pieza, siempre del lado de afuera
        var pts = shapePoints(shape), area = 0;
        for (var i = 0; i < pts.length; i++) { var a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
        resample(offsetPath(pts, area > 0 ? off : -off, true), r * 2.15, true).forEach(function (p) { bead(nail, p[0], p[1], r); });
      }
      // Pieza en relieve (gel 3D) tipo almohadilla: una grilla fina cuya altura sale de la distancia al borde
      // (canto redondeado y meseta arriba). Lo que queda fuera del contorno se hunde dentro de la uña.
      function raised(nail, shape, material, height, lift) {
        var poly = resample(shapePoints(shape), 0.01, true), n = poly.length;
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        poly.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
        var S = Math.max(0.0025, Math.min(0.005, Math.min(maxX - minX, maxY - minY) / 60)); // más fina en piezas chicas
        var R = height * 1.4, nx = Math.ceil((maxX - minX) / S) + 3, ny = Math.ceil((maxY - minY) / S) + 3;
        var X0 = minX - S, Y0 = minY - S, positions = [], inside = [], index = [], i, j, k;
        // distancia al borde: solo hace falta cerca del contorno (más lejos, la pieza ya tiene toda su altura)
        var dist = new Float32Array(nx * ny).fill(R);
        for (k = 0; k < n; k++) {
          var a = poly[k], b = poly[(k + 1) % n], ex = b[0] - a[0], ey = b[1] - a[1], ll = ex * ex + ey * ey || 1;
          var i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - R - X0) / S)), i1 = Math.min(nx - 1, Math.ceil((Math.max(a[0], b[0]) + R - X0) / S));
          var j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - R - Y0) / S)), j1 = Math.min(ny - 1, Math.ceil((Math.max(a[1], b[1]) + R - Y0) / S));
          for (j = j0; j <= j1; j++) {
            for (i = i0; i <= i1; i++) {
              var px = X0 + i * S - a[0], py = Y0 + j * S - a[1], t = Math.max(0, Math.min(1, (px * ex + py * ey) / ll));
              var d = Math.hypot(px - ex * t, py - ey * t), id = j * nx + i;
              if (d < dist[id]) dist[id] = d;
            }
          }
        }
        for (j = 0; j < ny; j++) {
          var y = Y0 + j * S, cuts = []; // adentro/afuera por fila: dónde corta el contorno a esta altura
          for (k = 0; k < n; k++) {
            var p = poly[k], q = poly[(k + 1) % n];
            if ((p[1] > y) !== (q[1] > y)) cuts.push(p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]));
          }
          cuts.sort(function (u, v) { return u - v; });
          for (i = 0; i < nx; i++) {
            var x = X0 + i * S, c = 0;
            while (c < cuts.length && cuts[c] < x) c++;
            // perfil de canto redondeado (cuarto de círculo); afuera baja igual (espejo), así el borde cae justo
            // sobre el contorno y sin escalones de la grilla
            var f = 1 - dist[j * nx + i] / R, g = Math.sqrt(1 - f * f), inn = c % 2 === 1;
            positions.push(x, y, surfZ(x) + (inn ? (height + (lift || 0)) * g : -height * g));
            inside.push(inn);
          }
        }
        for (j = 0; j < ny - 1; j++) {
          for (i = 0; i < nx - 1; i++) {
            var a0 = j * nx + i, a1 = a0 + 1, b0 = a0 + nx, b1 = b0 + 1;
            if (inside[a0] || inside[a1] || inside[b0] || inside[b1]) index.push(a0, a1, b0, a1, b1, b0);
          }
        }
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(index);
        geo.computeVertexNormals();
        var mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = mesh.receiveShadow = true;
        nail.add(mesh);
      }
      // Cadenita curb: eslabones ovalados que se enganchan, girados en forma alternada, apoyados sobre la uña
      function chain(nail, pts) {
        var path = resample(pts, 0.05, false), m = new THREE.Matrix4();
        for (var i = 0; i < path.length; i++) {
          var a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], p = path[i];
          var X = onSurface(b[0], b[1]).sub(onSurface(a[0], a[1])).normalize();
          var Y = new THREE.Vector3().crossVectors(normalAt(p[0]), X).normalize();
          var N = new THREE.Vector3().crossVectors(X, Y);
          var tw = (i % 2 ? 1 : -1) * 0.55;
          var Yt = Y.clone().multiplyScalar(Math.cos(tw)).addScaledVector(N, Math.sin(tw));
          m.makeBasis(X, Yt, new THREE.Vector3().crossVectors(X, Yt));
          m.setPosition(onSurface(p[0], p[1], 0.017));
          nail.userData.links.push(m.clone());
        }
      }
      // Piedra de fondo plano: corona facetada (tabla y facetas) que refleja el estudio en destellos
      function stone(r, material) {
        var h = r * 0.62;
        var geo = new THREE.LatheGeometry([
          new THREE.Vector2(r, 0), new THREE.Vector2(r, h * 0.14), new THREE.Vector2(r * 0.8, h * 0.6),
          new THREE.Vector2(r * 0.5, h), new THREE.Vector2(0, h)
        ], 10);
        geo = geo.toNonIndexed(); // cada cara con su propia normal: facetas nítidas
        geo.rotateX(Math.PI / 2);
        geo.computeVertexNormals();
        var mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        return mesh;
      }
      // Cruz gótica: brazos que se ensanchan y terminan en punta (a: medio ancho, f: ensanche, k: largo del
      // ensanche, tip: largo de la punta; up/side/down: largo de cada brazo). "up" apunta hacia la punta de la uña.
      function crossShape(cx, cy, o) {
        var pts = [];
        [[0, 1, o.up], [-1, 0, o.side], [0, -1, o.down], [1, 0, o.side]].forEach(function (arm) {
          var dx = arm[0], dy = arm[1], d = arm[2], lx = -dy, ly = dx, A = d - o.tip;
          [[o.a, -o.a], [A, -o.a], [A + o.k, -o.f], [d, 0], [A + o.k, o.f], [A, o.a]].forEach(function (q) {
            pts.push([cx + dx * q[0] + lx * q[1], cy + dy * q[0] + ly * q[1]]);
          });
        });
        var s = new THREE.Shape();
        pts.forEach(function (p, i) { if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); });
        return s;
      }
      function heartShape(cx, cy, size) { // corazón derecho: lóbulos hacia la punta de la uña y punta hacia la cutícula
        var s = size / 110, X = function (x) { return cx + (x - 25) * s; }, Y = function (y) { return cy - (y - 47.5) * s; };
        var h = new THREE.Shape();
        h.moveTo(X(25), Y(25));
        h.bezierCurveTo(X(25), Y(25), X(20), Y(0), X(0), Y(0));
        h.bezierCurveTo(X(-30), Y(0), X(-30), Y(35), X(-30), Y(35));
        h.bezierCurveTo(X(-30), Y(55), X(-10), Y(77), X(25), Y(95));
        h.bezierCurveTo(X(60), Y(77), X(80), Y(55), X(80), Y(35));
        h.bezierCurveTo(X(80), Y(35), X(80), Y(0), X(50), Y(0));
        h.bezierCurveTo(X(35), Y(0), X(25), Y(25), X(25), Y(25));
        return h;
      }

      // ---- Las cinco uñas en abanico ----
      var SET = [
        { len: 1.95, width: 0.6, paint: aura },   // izquierda: aura negra con corazón y dije,
        { len: 2.15, width: 0.64, sparkle: 0.06, paint: chrome(
          [[0, '#0d0d0f'], [0.3, '#232328'], [0.47, '#8a8d95'], [0.53, '#9a9da5'], [0.68, '#2c2d33'], [1, '#0d0d0f']],
          [[0, 'rgba(8,8,10,0.9)'], [0.28, 'rgba(8,8,10,0)'], [0.78, 'rgba(8,8,10,0)'], [1, 'rgba(8,8,10,0.85)']], 0.2) },
        { len: 2.35, width: 0.7, paint: milky },
        { len: 2.15, width: 0.64, paint: milky }, // tribal
        { len: 1.95, width: 0.6, sparkle: 0.02, paint: chrome(
          [[0, '#07090f'], [0.25, '#141c2e'], [0.55, '#5f7aa3'], [0.64, '#8fa8cc'], [0.75, '#2a3a5c'], [1, '#07090f']],
          [[0, 'rgba(5,7,12,0.7)'], [0.3, 'rgba(5,7,12,0)'], [0.85, 'rgba(5,7,12,0)'], [1, 'rgba(5,7,12,0.8)']], 0.14) }
      ];
      var nails = SET.map(function (s, i) {
        // la misma malla curva de las otras uñas (sin caras planas), con el contorno stiletto
        var shape = stilettoShape(s.len, s.width);
        var geo = realNail({ customShape: shape, length: s.len, thickness: T, bend: BEND, freeEdgeFrom: 99 }).geo;
        var pos = geo.attributes.position, uv = geo.attributes.uv;
        for (var k = 0; k < pos.count; k++) uv.setXY(k, pos.getX(k) / s.width + 0.5, pos.getY(k) / s.len);
        var maps = nailMaps(s.len, s.width, s.paint, 101 + i * 17, s.sparkle);
        var mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
          map: maps.map, roughnessMap: maps.mr, metalnessMap: maps.mr, roughness: 1, metalness: 1,
          clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.25
        }));
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData = { len: s.len, width: s.width, outline: shape.getSpacedPoints(300), beads: [], links: [] };
        var a = (i - 2) * 0.34;
        mesh.position.set(Math.sin(a) * 1.3, Math.cos(a) * 1.3 - 2.05, -Math.abs(i - 2) * 0.12);
        mesh.rotation.z = -a;
        group.add(mesh);
        return mesh;
      });

      // 4. Tribal negro en relieve: llamas curvas que suben por la uña y terminan en punta, con tachas plateadas
      (function (nail) {
        var L = nail.userData.len;
        // u: de -1 a 1 a lo ancho a esa altura; v: de 0 (cutícula) a 1 (punta). Va espejado (M = -1): la llama
        // principal queda del lado de afuera del abanico y no se mete debajo de la uña del centro
        var M = -1, P = function (u, v) { return [M * u * halfWidth(nail, v * L), v * L]; };
        function blade(p0, c, p1, t) { // trazo curvo afinado en las dos puntas, con la panza hacia un lado
          var a = P(p0[0], p0[1]), m = P(c[0], c[1]), b = P(p1[0], p1[1]);
          var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
          var s = new THREE.Shape();
          s.moveTo(a[0], a[1]);
          t *= M; // al espejar, la panza también cambia de lado
          s.quadraticCurveTo(m[0] + nx * t, m[1] + ny * t, b[0], b[1]);
          s.quadraticCurveTo(m[0] - nx * t * 0.25, m[1] - ny * t * 0.25, a[0], a[1]);
          raised(nail, s, blackChrome, 0.026);
        }
        blade([-0.6, 0.06], [-1.05, 0.5], [0.05, 0.93], 0.22);  // llama principal por un costado, hasta la punta
        // espinas que nacen de la llama y se curvan hacia la punta, cada vez más cortas
        blade([-0.72, 0.22], [0.05, 0.2], [0.62, 0.4], -0.1);
        blade([-0.74, 0.44], [0.1, 0.44], [0.58, 0.64], -0.085);
        blade([-0.6, 0.64], [0.1, 0.66], [0.4, 0.83], -0.065);
        [[0.35, 0.12, 0.026], [0.72, 0.52, 0.02]].forEach(function (s) { // tachas entre las espinas (sobre la uña)
          var p = P(s[0], s[1]);
          bead(nail, p[0], p[1], s[2], s[2] * 0.55);
        });
      })(nails[3]);

      // 2. Cruz de caviar sobre el negro cromado
      (function (nail) {
        var L = nail.userData.len, yc = L * 0.55, hw = halfWidth(nail, yc) - 0.05;
        lineBeads(nail, [[0, L * 0.16], [0, L * 0.93]], 0, BEAD);
        lineBeads(nail, [[-hw, yc], [-0.04, yc]], 0, BEAD);
        lineBeads(nail, [[0.04, yc], [hw, yc]], 0, BEAD);
      })(nails[1]);

      // 3. Cruz gótica en relieve contorneada con caviar (brazo largo hacia la cutícula, como una cruz derecha)
      (function (nail) {
        var H = 0.03, cross = crossShape(0, nail.userData.len * 0.47, { a: 0.048, f: 0.09, k: 0.06, tip: 0.12, up: 0.28, side: 0.17, down: 0.48 });
        raised(nail, cross, blackChrome, H);
        outlineBeads(nail, cross, BEAD * 0.95, BEAD);
      })(nails[2]);

      // 1. Corazón en relieve (punta hacia abajo) del que cuelga, con una cadenita, un dije de cruz plateada
      //    con piedra negra facetada en el centro y cristalitos en los brazos
      (function (nail) {
        var L = nail.userData.len, H = 0.03, hy = L * 0.5, size = 0.27, tipY = hy - 47.5 * size / 110;
        var heart = heartShape(0, hy, size);
        raised(nail, heart, blackChrome, H);
        outlineBeads(nail, heart, BEAD * 0.95, BEAD);
        var cy = L * 0.27, o = { a: 0.022, f: 0.045, k: 0.03, tip: 0.055, up: 0.1, side: 0.09, down: 0.16 };
        var top = cy + o.up + 0.012, from = tipY - 0.05;
        chain(nail, [[0, from], [0.014, (from + top) / 2], [0, top]]);
        raised(nail, crossShape(0, cy, o), silver, 0.02, 0.004);
        place(nail, stone(0.036, jet), 0, cy, 0.02);
        [[0, -1, o.down], [-1, 0, o.side], [1, 0, o.side]].forEach(function (arm) {
          var d = arm[2] - o.tip + o.k * 0.4;
          place(nail, stone(0.017, crystal), arm[0] * d, cy + arm[1] * d, 0.02);
        });
      })(nails[0]);

      // 5. Dos vueltas de cadenita sobre el azul cromado
      (function (nail) {
        var L = nail.userData.len;
        [0.34, 0.6].forEach(function (v) {
          var path = edgeLine(nail, L * v, 0.5, 0, 0.05); // los eslabones terminan antes del borde (no asoman)
          chain(nail, path);
          [path[0], path[path.length - 1]].forEach(function (p) { bead(nail, p[0], p[1], 0.022, 0.014); }); // remate pegado
        });
      })(nails[4]);

      // Caviar, tachas y eslabones: una sola malla instanciada por uña (rápido aunque sean cientos)
      nails.forEach(function (nail) {
        var m = new THREE.Matrix4(), list = nail.userData.beads, links = nail.userData.links;
        if (list.length) {
          var beads = new THREE.InstancedMesh(sphereGeo, silver, list.length);
          list.forEach(function (b, i) {
            m.makeScale(b[2], b[2], b[2]);
            m.setPosition(onSurface(b[0], b[1], b[3]));
            beads.setMatrixAt(i, m);
          });
          beads.castShadow = beads.receiveShadow = true;
          nail.add(beads);
        }
        if (links.length) {
          var chainMesh = new THREE.InstancedMesh(linkGeo, silver, links.length);
          links.forEach(function (mat, i) { chainMesh.setMatrixAt(i, mat); });
          chainMesh.castShadow = chainMesh.receiveShadow = true;
          nail.add(chainMesh);
        }
      });

      group.rotation.x = -0.22;
      group.position.y = -0.22;
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
    key.shadow.mapSize.set(MOBILE ? 512 : 1024, MOBILE ? 512 : 1024);
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
  var STUDIO = { semi: true, capping: true, softgel: true, presson: true };

  // ---------------------------------------------------------------------------
  // Un visor por tarjeta
  // ---------------------------------------------------------------------------
  var viewers = [];
  var CAMERA = { semi: 5.2, capping: 5.4, softgel: 6.2, presson: 6.0 };

  function createViewer(container, index) {
    var THREE = window.THREE;
    var name = container.getAttribute('data-model');
    var studio = !!STUDIO[name];
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2));
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

    renderer.render(scene, camera); // primer dibujo acá (prepara materiales y sombras) y no todos juntos en el mismo cuadro
    container.classList.add('is-ready');
    viewers.push(viewer);
    return viewer;
  }

  // Solo se dibujan los visores que están en pantalla
  var lastFrame = 0;
  function loop(time) {
    if (MOBILE && time - lastFrame < 30) { requestAnimationFrame(loop); return; } // ~30 cuadros por segundo
    lastFrame = time;
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
        // Cada modelo se arma recién cuando su tarjeta está por llegar (y de a uno), así el trabajo
        // queda repartido mientras se baja y no traba la página (en celular las tarjetas van una abajo de otra)
        var build = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry, k) {
            if (!entry.isIntersecting) return;
            build.unobserve(entry.target);
            var c = entry.target, i = containers.indexOf(c);
            setTimeout(function () {
              try { createViewer(c, i); seen.observe(c); } catch (e) { c.classList.add('is-unavailable'); }
            }, k * 60);
          });
        }, { rootMargin: '100% 0px' });
        containers.forEach(function (c) { build.observe(c); });
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
    }, { rootMargin: '150% 0px' }); // las librerías se bajan con tiempo
    containers.forEach(function (c) { trigger.observe(c); }); // cualquiera de las cuatro (por si se llega directo a una)
  } else {
    start();
  }
})();
