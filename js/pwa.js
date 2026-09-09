// ==========================================
// CONFIGURACIÓN Y CONTROL DE LA PWA
// ==========================================

let deferredPrompt = null;
let pwaButtonConfigured = false;

// El navegador puede emitir este evento antes de que termine el login.
// Se registra al cargar el script para no perder la oportunidad de instalación.
window.addEventListener('beforeinstallprompt', (e) => {
  if (typeof e?.prompt !== 'function') return;
  e.preventDefault();
  deferredPrompt = e;
  const installBanner = document.getElementById('install-banner');
  if (installBanner) installBanner.classList.add('show');
});

window.addEventListener('appinstalled', () => {
  const installBanner = document.getElementById('install-banner');
  if (installBanner) installBanner.classList.remove('show');
  deferredPrompt = null;
});

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Ruta relativa: funciona tanto si la app está en la raíz del dominio
  // como si está publicada dentro de una subcarpeta.
  const swUrl = new URL('sw.js', document.baseURI).href;

  navigator.serviceWorker.register(swUrl).catch((err) => {
    console.warn('No se pudo registrar el service worker:', err);
  });
}

function initPWA() {
  registrarServiceWorker();

  const installBanner = document.getElementById('install-banner');
  const installButton = document.getElementById('btn-install');

  if (!installBanner || !installButton) return;

  if (pwaButtonConfigured) return;
  pwaButtonConfigured = true;
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      installBanner.classList.remove('show');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        installBanner.classList.remove('show');
      }
    } catch (err) {
      console.warn('No se pudo abrir el prompt de instalación:', err);
    } finally {
      deferredPrompt = null;
    }
  });

}