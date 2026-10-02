// Uñas en 3D para la sección Servicios (Three.js r128 + OrbitControls).
// - Las librerías se descargan recién cuando la sección está por aparecer.
// - Cada tarjeta con [data-model] recibe su modelo: semi, capping, softgel o presson.
// - Las uñas van sobre la punta de un dedo (o, en press on, sobre una bandejita) para que se lean como uñas reales.
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

    // Press on: set de 5 uñas apoyadas en abanico sobre una bandejita rosa, como vienen en la caja
    presson: function () {
      var THREE = window.THREE;
      var group = new THREE.Group();

      var trayShape = new THREE.Shape();
      var tw = 1.9, th = 1.25, r = 0.35;
      trayShape.moveTo(-tw + r, -th);
      trayShape.lineTo(tw - r, -th); trayShape.quadraticCurveTo(tw, -th, tw, -th + r);
      trayShape.lineTo(tw, th - r); trayShape.quadraticCurveTo(tw, th, tw - r, th);
      trayShape.lineTo(-tw + r, th); trayShape.quadraticCurveTo(-tw, th, -tw, th - r);
      trayShape.lineTo(-tw, -th + r); trayShape.quadraticCurveTo(-tw, -th, -tw + r, -th);
      var tray = new THREE.Mesh(
        new THREE.ExtrudeGeometry(trayShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4 }),
        new THREE.MeshPhysicalMaterial({ color: srgb('#efb9cb'), roughness: 0.8, clearcoat: 0, envMapIntensity: 0.25 })
      );
      tray.position.z = -0.2;
      group.add(tray);

      var colors = ['#f4a7c0', '#fde9ef', '#e2558d', '#fde9ef', '#f4a7c0'];
      var sizes = [[1.0, 0.6], [1.22, 0.68], [1.36, 0.76], [1.22, 0.68], [1.06, 0.62]];
      for (var i = 0; i < 5; i++) {
        var angle = (i - 2) * 0.3;
        var nail = new THREE.Mesh(
          nailGeometry({ length: sizes[i][0], width: sizes[i][1], roundness: 0.5, thickness: 0.045, bend: 0.5, freeEdgeFrom: 99 }),
          gel({ color: colors[i] })
        );
        nail.position.set(Math.sin(angle) * 1.15, Math.cos(angle) * 1.15 - 1.55, 0.05);
        nail.rotation.z = -angle;
        group.add(nail);
      }
      var s = strass(0.07);
      s.position.set(0, -0.25, 0.17);
      group.add(s);

      group.rotation.x = -0.55;
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
  var CAMERA = { semi: 5.4, capping: 5.4, softgel: 6.2, presson: 5.6 };

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
