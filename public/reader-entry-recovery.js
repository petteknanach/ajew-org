/* Exact, static directory-recovery notices only. No URL reflection, storage,
 * fetches, history changes, or inferred teaching identities. Original query
 * bytes and fragment remain in location; the routing layer prefixes one key.
 */
(() => {
  'use strict';
  const key = new URLSearchParams(window.location.search).get('ajew_unavailable');
  if (!key) return;
  for (const notice of document.querySelectorAll('[data-entry-recovery]')) {
    const entry = Array.from(notice.querySelectorAll('[data-entry-recovery-key]'))
      .find(node => node.dataset.entryRecoveryKey === key &&
        node.dataset.entryRecoveryDirectory === window.location.pathname);
    const output = notice.querySelector('[data-entry-recovery-path]');
    if (!entry || !output) continue;
    // Both the address and membership come from the build's static allowlist.
    output.textContent = entry.dataset.entryRecoverySource;
    notice.hidden = false;
  }
})();
