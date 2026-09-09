// Se sube la versión del cache cada vez que cambian los archivos de la app,
// para forzar a los navegadores a descargar la versión nueva.
const CACHE = 'consultorio-v23';

// Rutas relativas (sin "/" inicial) para que funcionen tanto si la app
// vive en la raíz del dominio como en una subcarpeta.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/data.js',
  './js/utils.js',
  './js/appState.js',
  './js/config.js',
  './js/agenda.js',
  './js/calendario.js',
  './js/turnos.js',
  './js/pacientes.js',
  './js/detallePaciente.js',
  './js/odontograma.js',
  './js/dashboard.js',
  './js/alertas.js',
  './js/pwa.js',
  './js/modales.js',
  './js/main.js',
  './js/login.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Supabase y otros endpoints de datos usan POST/PATCH/DELETE. Cache solo
  // solicitudes GET: Cache.put rechaza cualquier otro método.
  if (e.request.method !== 'GET') return;

  // Nunca cachear respuestas de Supabase ni de otros dominios externos.
  // Los datos deben consultarse siempre en tiempo real.
  const requestUrl = new URL(e.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  // Para la navegación (el HTML), siempre intenta traer lo último de la red primero,
  // y si no hay conexión, usa la página guardada en cache.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Para el resto de los archivos (CSS, JS, imágenes): red primero,
  // con fallback al cache si no hay conexión. Así Netlify entrega
  // los cambios sin depender de incrementar CACHE en cada despliegue.
  e.respondWith(
    fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
  );
});
