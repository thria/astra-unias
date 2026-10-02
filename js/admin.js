// Inicio de sesión del panel: la contraseña se valida en el servidor y solo se guarda en memoria
(function () {
  var form = document.querySelector('[data-login]');
  var error = document.querySelector('[data-login-error]');
  var agenda = document.querySelector('[data-agenda]');
  var submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var password = form.password.value;
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Entrando…';

    fetch('/api/agenda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
      body: JSON.stringify({ action: 'login' })
    }).then(function (r) {
      if (r.status === 401) throw new Error('Contraseña incorrecta. Revisala y probá de nuevo.');
      if (r.status === 429) throw new Error('Demasiados intentos seguidos. Por seguridad, esperá 15 minutos y probá de nuevo.');
      if (r.status === 503) return r.json().then(function (d) { throw new Error(d.error); });
      if (!r.ok) throw new Error('No se pudo conectar con la agenda. Probá de nuevo en un rato.');
      window.astraAdminPassword = password;
      form.hidden = true;
      agenda.hidden = false;
      window.astraAgendaLoad();
    }).catch(function (e) {
      error.textContent = e.message;
      error.hidden = false;
    }).finally(function () {
      submit.disabled = false;
      submit.textContent = 'Entrar';
    });
  });

  document.querySelector('[data-logout]').addEventListener('click', function () {
    window.astraAdminPassword = '';
    form.reset();
    agenda.hidden = true;
    form.hidden = false;
    form.password.focus();
  });
})();
