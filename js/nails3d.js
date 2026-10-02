// Uñas en 3D para la sección Servicios (Three.js r128 + OrbitControls).
// - Las librerías se descargan recién cuando la sección está por aparecer.
// - Cada tarjeta con [data-model] recibe su propio modelo: semi, capping, softgel o presson.
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

  // ---------------------------------------------------------------------------
  // Geometría de una uña: contorno almendrado, extruido y curvado como una uña real
  // ---------------------------------------------------------------------------
  function nailGeometry(length, width, roundness, thickness) {
    var THREE = window.THREE;
    var w = width / 2;
    var tipCtrl = w * (0.15 + 0.6 * roundness);
    var shape = new THREE.Shape();
    shape.moveTo(-w * 0.92, 0);
    shape.quadraticCurveTo(0, -w * 0.5, w * 0.92, 0);                                  // base (cutícula)
    shape.bezierCurveTo(w * 1.02, length * 0.5, tipCtrl, length * 0.96, 0, length);    // lado derecho hasta la punta
    shape.bezierCurveTo(-tipCtrl, length * 0.96, -w * 1.02, length * 0.5, -w * 0.92, 0);

    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: thickness * 0.6,
      bevelSize: thickness * 0.55,
      bevelSegments: 5,
      curveSegments: 40
    });
    geo.translate(0, -length / 2, -thickness / 2);

    // Curvatura: arco a lo ancho (curva C) y una leve caída hacia la punta
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      pos.setZ(i, z - 0.55 * (x * x) / width - 0.08 * Math.pow(y / length, 2) * length);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Colores degradados a lo largo de la uña (de la base a la punta)
  function paintGradient(geo, stops) {
    var THREE = window.THREE;
    geo.computeBoundingBox();
    var minY = geo.boundingBox.min.y, maxY = geo.boundingBox.max.y;
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    var cols = stops.map(function (s) { return { at: s[0], c: new THREE.Color(s[1]).convertSRGBToLinear() }; });
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

  function glossy(options) {
    var THREE = window.THREE;
    // Los colores se escriben en hex (sRGB) y Three.js trabaja en lineal: se convierten para que no se vean lavados
    if (options.color != null) options.color = new THREE.Color(options.color).convertSRGBToLinear();
    return new THREE.MeshPhysicalMaterial(Object.assign({
      roughness: 0.28,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      envMapIntensity: 0.55
    }, options));
  }

  function strass(radius) {
    var THREE = window.THREE;
    return new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 1),
      new THREE.MeshStandardMaterial({ color: 0xf6f3f5, metalness: 1, roughness: 0.12, flatShading: true })
    );
  }

  // ---------------------------------------------------------------------------
  // Modelos de cada servicio
  // ---------------------------------------------------------------------------
  var MODELS = {
    // Uña corta y redondeada, esmalte rosa intenso con mucho brillo
    semi: function () {
      var THREE = window.THREE;
      var group = new THREE.Group();
      var nail = new THREE.Mesh(nailGeometry(1.5, 1.05, 1, 0.07), glossy({ color: 0xe2558d }));
      group.add(nail);
      [[0.18, 0.42], [0, 0.5], [-0.18, 0.42]].forEach(function (p) {
        var s = strass(0.055);
        s.position.set(p[0], p[1] - 0.95, 0.12);
        group.add(s);
      });
      return group;
    },

    // Uña natural (nude con borde libre blanco) cubierta por una capa de gel transparente
    capping: function () {
      var THREE = window.THREE;
      var group = new THREE.Group();
      var base = paintGradient(nailGeometry(1.6, 1.0, 0.85, 0.05), [[0, '#e3a593'], [0.76, '#e8b09f'], [0.83, '#f8ece6'], [1, '#fff6f1']]);
      group.add(new THREE.Mesh(base, glossy({ vertexColors: true, roughness: 0.45, clearcoat: 0.3 })));
      var layer = nailGeometry(1.72, 1.1, 0.85, 0.09);
      layer.translate(0, 0, 0.07);
      group.add(new THREE.Mesh(layer, glossy({
        color: 0xffb3cc, transparent: true, opacity: 0.28, roughness: 0.04, depthWrite: false
      })));
      return group;
    },

    // Extensión almendra larga: nude en la base y rosa en la punta
    softgel: function () {
      var THREE = window.THREE;
      var geo = paintGradient(nailGeometry(2.4, 0.95, 0.28, 0.065), [[0, '#e6a895'], [0.35, '#ec9fb2'], [1, '#e2558d']]);
      var group = new THREE.Group();
      group.add(new THREE.Mesh(geo, glossy({ vertexColors: true, roughness: 0.18 })));
      return group;
    },

    // Set de 5 uñas en abanico, como vienen las press on
    presson: function () {
      var THREE = window.THREE;
      var group = new THREE.Group();
      var colors = [0xf4a7c0, 0xfce8ee, 0xe2558d, 0xfce8ee, 0xf4a7c0];
      var sizes = [[1.05, 0.62], [1.3, 0.72], [1.45, 0.8], [1.3, 0.72], [1.15, 0.66]];
      for (var i = 0; i < 5; i++) {
        var angle = (i - 2) * 0.32;
        var nail = new THREE.Mesh(nailGeometry(sizes[i][0], sizes[i][1], 0.55, 0.05), glossy({ color: colors[i] }));
        nail.position.set(Math.sin(angle) * 1.25, Math.cos(angle) * 1.25 - 1.15, -Math.abs(i - 2) * 0.05);
        nail.rotation.z = -angle;
        group.add(nail);
        if (i === 2) {
          var s = strass(0.06);
          s.position.set(nail.position.x, nail.position.y - 0.35, 0.1);
          group.add(s);
        }
      }
      group.scale.setScalar(0.85);
      return group;
    }
  };

  // Ambiente con luces blancas suaves para los reflejos del brillo
  function environment(renderer) {
    var THREE = window.THREE;
    var scene = new THREE.Scene();
    var room = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0x8c7a82, side: THREE.BackSide }));
    scene.add(room);
    [[0, 4.5, 0, 6, 0.2, 6, 0xffffff], [4.5, 1, 2, 0.2, 3, 3, 0xfff0f5], [-4.5, 0, -1, 0.2, 2.5, 4, 0xffe4ee]].forEach(function (p) {
      var panel = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), new THREE.MeshBasicMaterial({ color: p[6] }));
      panel.position.set(p[0], p[1], p[2]);
      scene.add(panel);
    });
    var pmrem = new THREE.PMREMGenerator(renderer);
    var env = pmrem.fromScene(scene, 0.04).texture;
    pmrem.dispose();
    return env;
  }

  // ---------------------------------------------------------------------------
  // Un visor por tarjeta
  // ---------------------------------------------------------------------------
  var viewers = [];

  function createViewer(container) {
    var THREE = window.THREE;
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.NoToneMapping; // sin filtro de tono: los colores quedan fieles a la paleta
    var canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    var scene = new THREE.Scene();
    scene.environment = environment(renderer);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xf3c6d3, 0.55));
    var key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 3, 4);
    scene.add(key);

    var model = MODELS[container.getAttribute('data-model')]();
    model.rotation.set(-0.35, 0.35, 0);
    scene.add(model);

    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    var DISTANCE = { semi: 3.4, capping: 3.6, softgel: 4.7, presson: 4 };
    camera.position.set(0, 0, DISTANCE[container.getAttribute('data-model')] || 3.8);

    // La rueda sola baja la página; con Ctrl acerca el modelo (se registra antes que los controles)
    canvas.addEventListener('wheel', function (e) { if (!e.ctrlKey) e.stopImmediatePropagation(); }, { capture: true });

    var controls = new THREE.OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.2;
    controls.maxDistance = 6;
    controls.rotateSpeed = 0.7;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 1.6;
    controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }; // un dedo deja bajar la página
    canvas.style.touchAction = 'pan-y';

    var viewer = { container: container, renderer: renderer, scene: scene, camera: camera, controls: controls, visible: false };

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
  function loop() {
    if (!document.hidden) {
      viewers.forEach(function (v) {
        if (!v.visible) return;
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
        containers.forEach(function (c) {
          try { createViewer(c); seen.observe(c); } catch (e) { c.classList.add('is-unavailable'); }
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
