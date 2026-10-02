// Mapa "maqueta" de la zona Plaza Belgrano (La Plata).
// MapLibre GL + teselas vectoriales de OpenFreeMap (datos de OpenStreetMap), sin claves ni cuentas.
// La librería se descarga recién cuando la sección está por aparecer en pantalla.
(function () {
  var container = document.getElementById('mapa-zona');
  if (!container) return;

  var MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';
  var PLAZA = [-57.96654, -34.91255]; // Plaza Manuel Belgrano (lon, lat)

  // Paletas de la maqueta. En tema oscuro: manzanas rosas y calles blancas.
  // En tema claro se invierte (manzanas blancas y calles rosas) para que el mapa
  // se distinga del fondo rosado de la sección.
  var PALETTES = {
    dark: {
      ground: '#FBE4EB', blocks: '#F5CDD9', park: '#EE9FBB', parkEdge: '#E48FAD', water: '#E6D3F0',
      road: '#FFFFFF', roadEdge: '#E7B1C4', building: '#F9DDE6', label: '#8E2E50', zone: '#B03F66'
    },
    light: {
      ground: '#FFFFFF', blocks: '#FFF6F8', park: '#F7B9CD', parkEdge: '#E48FAD', water: '#E6D3F0',
      road: '#F2A7C0', roadEdge: '#E07FA2', building: '#FFFFFF', label: '#8E2E50', zone: '#B03F66'
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
    document.head.appendChild(css);

    var script = document.createElement('script');
    script.src = MAPLIBRE + '.js';
    script.onload = done;
    script.onerror = function () {
      showFallback('No se pudo cargar el mapa. Podés ver la zona con el enlace de Google Maps.');
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
      '<svg class="map-marker__pin" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>';
    return el;
  }

  function initMap() {
    if (!window.maplibregl) return;
    container.innerHTML = '';

    var map = new maplibregl.Map({
      container: container,
      style: style,
      center: PLAZA,
      zoom: 15.6,
      pitch: 55,
      bearing: 40,
      minZoom: 13,
      maxZoom: 18.5,
      maxPitch: 70,
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
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

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
    loadMapLibre(initMap);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        start();
      }
    }, { rootMargin: '300px 0px' });
    io.observe(container);
  } else {
    start();
  }
})();
