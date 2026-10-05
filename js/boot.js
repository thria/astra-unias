// Tema según la hora del día (de quien visita): claro de 7 a 19:59, oscuro de 20 a 6:59. Se aplica antes de pintar.
// Va en un archivo aparte (y no escrito dentro del HTML) para que la política de seguridad
// pueda prohibir cualquier script incrustado en la página.
try { var h = new Date().getHours(); document.documentElement.dataset.theme = (h >= 7 && h < 20) ? 'light' : 'dark'; } catch (e) {}
// Cinemática de apertura: al entrar y al recargar, nunca con "reducir movimiento"
if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('no-intro');
else document.documentElement.classList.add('intro-hold'); // la cinemática arranca cuando la página está lista
