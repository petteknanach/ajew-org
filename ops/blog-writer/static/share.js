'use strict';
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-link]');
  if (!button) return;
  try {
    await navigator.clipboard.writeText(button.dataset.copyLink);
    button.textContent = 'Copied';
  } catch (_) { button.textContent = 'Copy the page address'; }
});
