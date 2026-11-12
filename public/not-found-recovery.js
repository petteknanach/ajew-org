/* Enhance only explicit source-qualified links already in the static 404.
 * No fetch, storage, analytics, history changes, redirects, or query reflection.
 */
(() => {
  'use strict';
  const path = window.location.pathname;
  // Never decode a user path or reinterpret escaped separators/dot segments.
  const match = /^\/reader\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(?:part-)?([1-9][0-9]*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(path);
  if (!match) return;
  const context = document.getElementById('recovery-context');
  const selector = document.getElementById('recovery-book');
  if (!context || !selector) return;
  const owner = Array.from(context.querySelectorAll('[data-recovery-book]'))
    .find(node => node.dataset.recoveryBook === match[1]);
  const option = Array.from(selector.options).find(node => node.value === match[1]);
  if (!owner || !option) return;
  // Part links were generated from catalog membership; a requested number
  // never generates a destination or a claim that such a teaching exists.
  const links = Array.from(owner.querySelectorAll('[data-recovery-part]'));
  const part = links.find(link => link.dataset.recoveryPart === match[2]);
  if (part) links.forEach(link => { link.parentElement.hidden = link !== part; });
  owner.hidden = false;
  context.hidden = false;
  selector.value = option.value;
})();
