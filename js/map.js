// Mapa "maqueta" de la zona Plaza Belgrano (La Plata).
// MapLibre GL + teselas vectoriales de OpenFreeMap (datos de OpenStreetMap), sin claves ni cuentas.
// La librería se descarga recién cuando la sección está por aparecer en pantalla.
(function () {
  var container = document.getElementById('mapa-zona');
  if (!container) return;

  var MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';
  var PLAZA = [-57.96654, -34.91255]; // Plaza Manuel Belgrano (lon, lat)

  // Paletas de la maqueta: alegres pero armónicas con la página. Manzanas rosadas, plazas verde menta,
  // agua lila, edificios color crema manteca y la zona marcada en rosa.
  var PALETTES = {
    // en tema oscuro: tonos empolvados de intensidad media (ni apagado ni rosa fuerte)
    dark: {
      ground: '#5B4952', blocks: '#6B5662', park: '#5F7766', parkEdge: '#6F8A76', water: '#5E5A7A',
      road: '#8E7883', roadEdge: '#9F8893', building: '#8F7D69', label: '#F3E6EA', zone: '#E3A6B5'
    },
    light: {
      ground: '#FDF6F3', blocks: '#F9E1E6', park: '#C4EACB', parkEdge: '#A3D6AE', water: '#DCD5F3',
      road: '#FFFFFF', roadEdge: '#EFC3CD', building: '#FFF0D6', label: '#8C5361', zone: '#D9748A'
    }
  };
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  function currentTheme() {
    return document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light');
  }
  var C = PALETTES[currentTheme()];

  function showFallback(text) {
    container.innerHTML = '<p class="local__map-fallback">' + text + '</p>';
  }

  function loadMapLibre(done) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = MAPLIBRE + '.css';
    css.integrity = 'sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V'; // si el archivo del CDN cambia, no se usa
    css.crossOrigin = 'anonymous';
    document.head.appendChild(css);

    var script = document.createElement('script');
    script.src = MAPLIBRE + '.js';
    script.integrity = 'sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj';
    script.crossOrigin = 'anonymous';
    script.onload = done;
    script.onerror = function () {
      showFallback('No se pudo cargar el mapa. Podés ver la zona con el enlace de Google Maps.');
      ready();
    };
    document.head.appendChild(script);
  }

  // Círculo aproximado (en metros) para marcar la zona sin mostrar la dirección exacta
  function zoneCircle(center, radiusMeters) {
    var points = [];
    var latRad = center[1] * Math.PI / 180;
    for (var i = 0; i <= 64; i++) {
      var a = (i / 64) * 2 * Math.PI;
      var dx = radiusMeters * Math.cos(a);
      var dy = radiusMeters * Math.sin(a);
      points.push([
        center[0] + dx / (111320 * Math.cos(latRad)),
        center[1] + dy / 110540
      ]);
    }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [points] } };
  }

  function roadWidth(base) {
    return ['interpolate', ['exponential', 1.6], ['zoom'], 13, base * 0.6, 16, base * 3, 18, base * 9];
  }

  var minorRoads = ['match', ['get', 'class'], ['minor', 'service', 'tertiary'], true, false];
  var majorRoads = ['match', ['get', 'class'], ['secondary', 'primary', 'trunk', 'motorway'], true, false];

  var style = {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      zona: { type: 'geojson', data: zoneCircle(PLAZA, 260) }
    },
    light: { anchor: 'viewport', color: '#FFFFFF', intensity: 0.35, position: [1.2, 210, 40] },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': C.ground } },
      { id: 'manzanas', type: 'fill', source: 'omt', 'source-layer': 'landuse',
        paint: { 'fill-color': C.blocks } },
      { id: 'verde', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        filter: ['match', ['get', 'class'], ['grass', 'wood'], true, false],
        paint: { 'fill-color': C.park, 'fill-outline-color': C.parkEdge } },
      { id: 'plazas', type: 'fill', source: 'omt', 'source-layer': 'park',
        paint: { 'fill-color': C.park, 'fill-outline-color': C.parkEdge } },
      { id: 'agua', type: 'fill', source: 'omt', 'source-layer': 'water',
        paint: { 'fill-color': C.water } },
      { id: 'calles-borde', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: minorRoads, layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.roadEdge, 'line-width': roadWidth(1.4) } },
      { id: 'calles', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: minorRoads, layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.road, 'line-width': roadWidth(1) } },
      { id: 'avenidas-borde', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: majorRoads, layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.roadEdge, 'line-width': roadWidth(2.4) } },
      { id: 'avenidas', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: majorRoads, layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.road, 'line-width': roadWidth(1.9) } },
      { id: 'zona-relleno', type: 'fill', source: 'zona',
        paint: { 'fill-color': C.zone, 'fill-opacity': 0.12 } },
      { id: 'zona-borde', type: 'line', source: 'zona',
        paint: { 'line-color': C.zone, 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } },
      { id: 'edificios', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 14,
        paint: {
          'fill-extrusion-color': C.building,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.92,
          'fill-extrusion-vertical-gradient': true
        } },
      { id: 'nombres-calles', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 15,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'text-letter-spacing': 0.02
        },
        paint: { 'text-color': C.label, 'text-halo-color': C.ground, 'text-halo-width': 1.5 } }
    ]
  };

  function makeMarker() {
    var el = document.createElement('div');
    el.className = 'map-marker';
    el.innerHTML =
      '<span class="map-marker__label">Zona Plaza Belgrano</span>' +
      '<svg class="map-marker__pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6.8-5.8 6.8-11.4a6.8 6.8 0 1 0-13.6 0C5.2 15.2 12 21 12 21Z"/><circle cx="12" cy="9.6" r="2.4"/></svg>';
    return el;
  }

  // Avisa al resto de la página que el mapa terminó de cargar (las uñas 3D esperan a esto para no trabarlo)
  function ready() {
    if (document.documentElement.dataset.map === 'ready') return;
    document.documentElement.dataset.map = 'ready';
    document.dispatchEvent(new Event('astra:map-ready'));
  }

  var HOME = { center: PLAZA, zoom: 15.6, pitch: 55, bearing: 40 };

  // Botones propios en el mismo estilo que los de + y −
  function ButtonsControl(buttons) { this.buttons = buttons; }
  ButtonsControl.prototype.onAdd = function () {
    var box = document.createElement('div');
    box.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    this.buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'map-btn';
      btn.setAttribute('aria-label', b.label);
      btn.title = b.label;
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + b.icon + '</svg>';
      btn.addEventListener('click', function () { b.action(btn); });
      box.appendChild(btn);
    });
    this.box = box;
    return box;
  };
  ButtonsControl.prototype.onRemove = function () { this.box.remove(); };

  function initMap() {
    if (!window.maplibregl) return ready();
    container.innerHTML = '';

    var map = new maplibregl.Map({
      container: container,
      style: style,
      center: HOME.center,
      zoom: HOME.zoom,
      pitch: HOME.pitch,
      bearing: HOME.bearing,
      minZoom: 13,
      maxZoom: 18.5,
      maxPitch: 70,
      maxBounds: [[-58.06, -34.99], [-57.87, -34.84]], // solo La Plata: no se pierde ni baja datos de más
      fadeDuration: 0, // los nombres de las calles aparecen enseguida
      cooperativeGestures: true,
      attributionControl: false,
      locale: {
        'NavigationControl.ZoomIn': 'Acercar',
        'NavigationControl.ZoomOut': 'Alejar',
        'NavigationControl.ResetBearing': 'Volver al norte',
        'CooperativeGesturesHandler.WindowsHelpText': 'Usá Ctrl + rueda del mouse para hacer zoom',
        'CooperativeGesturesHandler.MacHelpText': 'Usá ⌘ + rueda del mouse para hacer zoom',
        'CooperativeGesturesHandler.MobileHelpText': 'Usá dos dedos para mover el mapa'
      }
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    // Pantalla completa propia (anda igual en iPhone, donde el modo pantalla completa del navegador no existe):
    // el mapa se muda a una capa fija sobre la página, se mueve con un dedo y se cierra con ✕ o Escape
    var home = container.parentNode, placeholder = document.createComment('mapa'), overlay = null, expandBtn = null;
    var ICON_EXPAND = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>';
    var ICON_SHRINK = '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>';
    function setGestures(on) {
      var h = map.cooperativeGestures;
      if (h && h.enable) { if (on) h.enable(); else h.disable(); }
    }
    function onKey(e) { if (e.key === 'Escape') closeFull(); }
    function openFull() {
      overlay = document.createElement('div');
      overlay.className = 'map-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Mapa de la zona en pantalla completa');
      overlay.innerHTML = '<button type="button" class="map-overlay__close">✕ Cerrar mapa</button>';
      home.insertBefore(placeholder, container);
      overlay.appendChild(container);
      document.body.appendChild(overlay);
      document.documentElement.classList.add('map-is-full');
      overlay.querySelector('.map-overlay__close').addEventListener('click', closeFull);
      document.addEventListener('keydown', onKey);
      setGestures(false); // en pantalla completa se mueve con un dedo
      setFullIcon(true);
      map.resize();
      overlay.querySelector('.map-overlay__close').focus();
    }
    function closeFull() {
      if (!overlay) return;
      home.insertBefore(container, placeholder);
      placeholder.remove();
      overlay.remove();
      overlay = null;
      document.documentElement.classList.remove('map-is-full');
      document.removeEventListener('keydown', onKey);
      setGestures(true);
      setFullIcon(false);
      map.resize();
      if (expandBtn) expandBtn.focus();
    }
    function setFullIcon(full) {
      if (!expandBtn) return;
      var label = full ? 'Achicar mapa' : 'Ver mapa en pantalla completa';
      expandBtn.setAttribute('aria-label', label);
      expandBtn.title = label;
      expandBtn.querySelector('svg').innerHTML = full ? ICON_SHRINK : ICON_EXPAND;
    }

    map.addControl(new ButtonsControl([
      { label: 'Volver a la zona', icon: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
        action: function () { map.flyTo(Object.assign({ duration: 1200, essential: true }, HOME)); } },
      { label: 'Ver mapa en pantalla completa', icon: ICON_EXPAND,
        action: function (btn) { expandBtn = btn; if (overlay) closeFull(); else openFull(); } }
    ]), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    // los créditos arrancan cerrados (botón "i"): abiertos tapaban medio mapa en el celular
    map.once('load', function () {
      var attrib = container.querySelector('.maplibregl-ctrl-attrib');
      if (attrib) attrib.classList.remove('maplibregl-compact-show');
    });

    new maplibregl.Marker({ element: makeMarker(), anchor: 'bottom' }).setLngLat(PLAZA).addTo(map);

    // Al cambiar de tema, cambian los colores sin recargar el mapa
    var PAINT = [
      ['fondo', 'background-color', 'ground'], ['manzanas', 'fill-color', 'blocks'],
      ['verde', 'fill-color', 'park'], ['plazas', 'fill-color', 'park'],
      ['calles-borde', 'line-color', 'roadEdge'], ['calles', 'line-color', 'road'],
      ['avenidas-borde', 'line-color', 'roadEdge'], ['avenidas', 'line-color', 'road'],
      ['edificios', 'fill-extrusion-color', 'building'], ['nombres-calles', 'text-halo-color', 'ground']
    ];
    function applyTheme() {
      var p = PALETTES[currentTheme()];
      if (p === C || !map.isStyleLoaded()) return;
      C = p;
      PAINT.forEach(function (x) { map.setPaintProperty(x[0], x[1], p[x[2]]); });
    }
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    systemDark.addEventListener('change', applyTheme);
    map.on('load', applyTheme);

    map.once('idle', ready);
    setTimeout(ready, 8000); // si la conexión es muy lenta, no hace esperar para siempre al resto

    map.on('error', function (e) {
      if (e && e.error && /tiles|style|Failed to fetch/i.test(String(e.error.message))) {
        console.warn('Mapa: ', e.error.message);
      }
    });
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    document.documentElement.dataset.map = 'loading';
    loadMapLibre(initMap);
  }

  // Empieza a cargar una pantalla antes de llegar, así ya está listo cuando aparece
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        start();
      }
    }, { rootMargin: '100% 0px' });
    io.observe(container);
  } else {
    start();
  }
})();
