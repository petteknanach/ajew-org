/**
 * PWA Registration — ajew.org Phase 1
 * Registers sw-v2.js with beforeinstallprompt handler
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw-v2.js').then(function(registration) {
      console.log('[PWA] Service Worker registered:', registration.scope);

      // Listen for install prompt
      var deferredPrompt = null;
      window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        console.log('[PWA] Install prompt available');
        // Dispatch custom event so UI can show install button
        window.dispatchEvent(new CustomEvent('pwa-install-available'));
      });

      // Expose install function globally
      window.installPWA = function() {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function(result) {
            console.log('[PWA] User choice:', result.outcome);
            deferredPrompt = null;
          });
        }
      };
    }).catch(function(error) {
      console.error('[PWA] Service Worker registration failed:', error);
    });
  });
}
