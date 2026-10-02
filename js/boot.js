// Aplica el tema elegido antes de pintar la página (evita un parpadeo claro/oscuro).
// Va en un archivo aparte (y no escrito dentro del HTML) para que la política de seguridad
// pueda prohibir cualquier script incrustado en la página.
try { var t = localStorage.getItem('astra-theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) {}
// Cinemática de apertura: al entrar y al recargar, nunca con "reducir movimiento"
if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('no-intro');
else document.documentElement.classList.add('intro-hold'); // la cinemática arranca cuando la página está lista
