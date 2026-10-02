// Uñas en 3D para la sección Servicios (Three.js r128 + OrbitControls).
// - Las librerías se descargan recién cuando la sección está por aparecer.
// - Cada tarjeta con [data-model] recibe su modelo: semi, capping, softgel o presson.
// - Las uñas van sobre la punta de un dedo (en press on, un set en abanico) para que se lean como uñas reales.
// - El modelo se balancea suave (no gira 360°, así nunca queda de canto). También se puede girar a mano.
// - Mouse: arrastrar para girar, Ctrl + rueda para acercar (la rueda sola sigue bajando la página).
// - Celular: un dedo baja la página normal; dos dedos giran y acercan.
(function () {
  var containers = Array.prototype.slice.call(document.querySelectorAll('[data-model]'));
  if (!containers.length) return;

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var CONTROLS_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
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

  // Uña: contorno (base redondeada + laterales + punta), extruida y curvada.
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

  // Dedo: superficie de revolución con la punta redondeada, un poco aplanado (más ancho que alto)
  function fingerGeometry() {
    var THREE = window.THREE;
    var profile = [
      [0.0, -3.2], [0.66, -3.2], [0.68, -2.0], [0.68, -0.6], [0.67, 0.2], [0.64, 0.6],
      [0.57, 0.92], [0.46, 1.16], [0.32, 1.32], [0.17, 1.4], [0.0, 1.43]
    ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var geo = new THREE.LatheGeometry(profile, 64);
    geo.scale(1, 1, 0.8);
    return geo;
  }

  // Degradado de color a lo largo (de la base a la punta)
  function paintGradient(geo, stops) {
    var THREE = window.THREE;
    geo.computeBoundingBox();
    var minY = geo.boundingBox.min.y, maxY = geo.boundingBox.max.y;
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var cols = stops.map(function (s) { return { at: s[0], c: srgb(s[1]) }; });
    var tmp = new THREE.Color();
    for (var i = 0; i < pos.count; i++) {
      var t = (pos.getY(i) - minY) / (maxY - minY);
      var a = cols[0], b = cols[cols.length - 1];
      for (var k = 0; k < cols.length - 1; k++) {
        if (t >= cols[k].at && t <= cols[k + 1].at) { a = cols[k]; b = cols[k + 1]; break; }
      }
      var f = b.at === a.at ? 0 : Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at)));
      tmp.copy(a.c).lerp(b.c, f);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
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

  function skin() {
    return new window.THREE.MeshPhysicalMaterial({
      color: srgb('#e9b9a1'), roughness: 0.62, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.6,
      sheen: srgb('#ffd9cc'), envMapIntensity: 0.35
    });
  }

  function strass(radius) {
    var THREE = window.THREE;
    return new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, flatShading: true, envMapIntensity: 1.4 })
    );
  }

  // Dedo + uña: la uña se apoya sobre la cara superior del dedo
  function fingerWithNail(nailMeshes) {
    var THREE = window.THREE;
    var group = new THREE.Group();
    group.add(new THREE.Mesh(fingerGeometry(), skin()));
    var nailGroup = new THREE.Group();
    nailMeshes.forEach(function (m) { nailGroup.add(m); });
    nailGroup.position.set(0, -0.3, 0.63);  // sobre la cara superior del dedo
    nailGroup.rotation.x = -0.12;            // acompaña la curva hacia la punta
    group.add(nailGroup);
    group.rotation.x = -0.6;                 // dedo inclinado, con la uña mirando a la cámara
    group.position.y = -0.8;
    return group;
  }

  var NAIL_ON_FINGER = { width: 0.98, bend: 0.62, thickness: 0.045 };

  // ---------------------------------------------------------------------------
  // Modelos de cada servicio
  // ---------------------------------------------------------------------------
  var MODELS = {
    // Semipermanente: uña natural corta pintada de rosa intenso, mucho brillo
    semi: function () {
      var geo = nailGeometry(Object.assign({ length: 1.55, roundness: 1, freeEdgeFrom: 1.2 }, NAIL_ON_FINGER));
      return fingerWithNail([new window.THREE.Mesh(geo, gel({ color: '#e2558d' }))]);
    },

    // Capping: uña natural (rosada con borde libre blanco) bajo una capa de gel transparente
    capping: function () {
      var THREE = window.THREE;
      var base = paintGradient(
        nailGeometry(Object.assign({ length: 1.65, roundness: 0.9, freeEdgeFrom: 1.25 }, NAIL_ON_FINGER)),
        [[0, '#f3b8b4'], [0.7, '#f1b3ad'], [0.78, '#fbeee8'], [1, '#fff8f4']]
      );
      var layerGeo = nailGeometry(Object.assign({ length: 1.68, roundness: 0.9, freeEdgeFrom: 1.25 }, NAIL_ON_FINGER, { width: 0.99, thickness: 0.07 }));
      layerGeo.translate(0, -0.01, 0.045); // la capa de gel copia la forma de la uña, apenas más gruesa
      return fingerWithNail([
        new THREE.Mesh(base, gel({ vertexColors: true, roughness: 0.5, clearcoat: 0.2 })),
        new THREE.Mesh(layerGeo, gel({ color: '#ffd1df', transparent: true, opacity: 0.3, roughness: 0.05, clearcoat: 0.4, envMapIntensity: 0.25, depthWrite: false }))
      ]);
    },

    // Soft gel: extensión almendra larga que sale del dedo, de nude a rosa
    softgel: function () {
      var geo = paintGradient(
        nailGeometry(Object.assign({ length: 2.7, roundness: 0.3, freeEdgeFrom: 1.15 }, NAIL_ON_FINGER)),
        [[0, '#eaa996'], [0.4, '#ee9fb3'], [1, '#e2558d']]
      );
      return fingerWithNail([new window.THREE.Mesh(geo, gel({ vertexColors: true, roughness: 0.15 }))]);
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

  // ---------------------------------------------------------------------------
  // Un visor por tarjeta
  // ---------------------------------------------------------------------------
  var viewers = [];
  var CAMERA = { semi: 5.4, capping: 5.4, softgel: 6.2, presson: 6.2 };

  function createViewer(container, index) {
    var THREE = window.THREE;
    var name = container.getAttribute('data-model');
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping;
    var canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    var scene = new THREE.Scene();
    scene.environment = environment(renderer);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8c2cc, 0.5));
    var key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(2.5, 3, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xffe0ea, 0.35);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

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
      visible: false, phase: index * 1.3, interacting: false };
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
          // balanceo suave de lado a lado y un leve flotar
          v.pivot.rotation.y = Math.sin(t * 0.7 + v.phase) * 0.55;
          v.pivot.rotation.x = Math.sin(t * 0.5 + v.phase) * 0.08;
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
