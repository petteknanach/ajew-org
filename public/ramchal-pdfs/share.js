(() => {
  'use strict';
  function init() {
    document.querySelectorAll('[data-ramchal-share]').forEach(button => {
      if (button.dataset.shareReady) return;
      button.dataset.shareReady = 'true';
      button.addEventListener('click', async () => {
        const status = button.closest('.pdf-card').querySelector('.pdf-share-status');
        const url = new URL(button.dataset.ramchalShare, window.location.origin).href;
        const title = button.dataset.title;
        button.disabled = true;
        status.textContent = '';
        try {
          if (typeof navigator.share === 'function') {
            try {
              await navigator.share({ title, url });
              status.textContent = 'PDF link shared.';
              return;
            } catch (error) {
              if (error.name === 'AbortError') {
                status.textContent = 'Sharing cancelled.';
                return;
              }
            }
          }
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(url);
            status.textContent = 'PDF link copied — paste it to share.';
          } else {
            window.prompt('Copy this PDF link to share:', url);
            status.textContent = 'PDF link ready to copy.';
          }
        } catch (_) {
          window.prompt('Copy this PDF link to share:', url);
          status.textContent = 'Copy the PDF link from the dialog.';
        } finally {
          button.disabled = false;
        }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
