// Servicios: cada tarjeta despliega sus precios al tocar "Ver precios" (o el nombre / la descripción).
// Sin JavaScript los precios se ven siempre abiertos.
(function () {
  var list = document.querySelector('.service-list');
  if (!list) return;
  var cards = Array.prototype.slice.call(list.querySelectorAll('.service-card'));

  function set(card, open) {
    var button = card.querySelector('.service-card__toggle');
    var panel = card.querySelector('.service-card__prices');
    if (!button || !panel) return;
    card.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.textContent = open ? 'Ocultar precios' : 'Ver precios';
    panel.inert = !open;
  }

  cards.forEach(function (card) {
    set(card, false);
    card.addEventListener('click', function (event) {
      // el modelo 3D se gira arrastrando y la lista de precios se puede seleccionar: no cierran ni abren
      if (event.target.closest('.service-card__model, .service-card__prices')) return;
      if (!card.querySelector('.service-card__toggle')) return;
      set(card, !card.classList.contains('is-open'));
    });
  });
  list.classList.add('has-prices');

  // Precios actualizados desde el panel /admin (si no hay, quedan los escritos en la página)
  function money(n) { return '$' + Number(n).toLocaleString('es-AR'); }
  fetch('/api/agenda?precios=1', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var p = data && data.prices;
      if (!p) return;
      Array.prototype.forEach.call(list.querySelectorAll('[data-price]'), function (el) {
        var v = p[el.getAttribute('data-price')];
        if (typeof v === 'number') el.textContent = money(v);
      });
      Array.prototype.forEach.call(list.querySelectorAll('[data-range]'), function (el) {
        var k = el.getAttribute('data-range'), min = p[k + '_min'], max = p[k + '_max'];
        if (typeof min !== 'number' || typeof max !== 'number') return;
        el.textContent = max === 0 ? 'Gratis' : min === max ? money(min) : (min === 0 ? 'Gratis' : money(min)) + ' – ' + money(max);
      });
    })
    .catch(function () { /* sin conexión: quedan los precios de la página */ });
})();
