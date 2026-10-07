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
})();
