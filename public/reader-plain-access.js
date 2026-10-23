/* Numeric-reader plain exports: the server catalog, not the route, owns targets. */
(function () {
  'use strict';
  if (!/^\/reader\/[^/]+\/\d+\/[^/]+\/?$/.test(window.location.pathname)) return;
  const declaration = document.querySelector('meta[name="ajew-reader-plain-access"]');
  if (!declaration) return; // Unmatched/manual/reviewed readers retain their own links.
  const origin = window.location.origin;
  function safe(raw, prefix) {
    if (!raw || /[\u0000-\u001f\u007f?#\\<>"'`]/.test(raw)) return null;
    try {
      const url = new URL(raw);
      if (url.origin !== origin || url.username || url.password || raw !== url.href || !url.pathname.startsWith(prefix)) return null;
      const parts = url.pathname.split('/').slice(1);
      if (parts.at(-1) === '') parts.pop();
      if (parts.some(p => !p || ['.', '..'].includes(decodeURIComponent(p)) || /[/\\?#%<>"'`\u0000-\u001f\u007f]/.test(decodeURIComponent(p)))) return null;
      return url.href;
    } catch { return null; }
  }
  const source = safe(declaration.getAttribute('data-source'), '/reader/');
  const declaredSection = safe(declaration.getAttribute('data-section'), '/reader-plain/');
  const section = declaration.getAttribute('data-state') === 'available' &&
    source === origin + window.location.pathname.replace(/\/$/, '') &&
    declaredSection?.endsWith('/') && new URL(declaredSection).pathname.split('/').length >= 5 ? declaredSection : null;
  const book = section ? origin + '/reader-plain/' + new URL(section).pathname.split('/')[2] + '/' : null;
  const workTxt = section && safe(declaration.getAttribute('data-work-txt'), '/reader-plain/') === book + 'full.txt' ? book + 'full.txt' : null;
  const workMd = section && safe(declaration.getAttribute('data-work-md'), '/reader-plain/') === book + 'full.md' ? book + 'full.md' : null;
  const desired = section ? [
    ['text/html', section], ['text/plain', section + 'index.txt'],
    ['text/markdown', section + 'index.md'], ['application/json', section + 'index.json'],
    ['text/plain', workTxt], ['text/markdown', workMd],
  ].filter(([, href]) => href) : [];
  const types = new Set(['text/html', 'text/plain', 'text/markdown', 'application/json']);
  function plainAlternate(link) {
    if (!types.has(link.getAttribute('type'))) return false;
    try { return new URL(link.getAttribute('href'), origin).pathname.startsWith('/reader-plain/'); }
    catch { return false; }
  }
  function reconcile() {
    const seen = new Set();
    document.head.querySelectorAll('link[rel~="alternate"]').forEach(link => {
      if (!plainAlternate(link)) return;
      const type = link.getAttribute('type');
      const href = link.getAttribute('href');
      const match = desired.find(([t, h]) => t === type && h === href);
      const key = type + '\n' + href;
      if (!match || seen.has(key)) link.remove();
      else seen.add(key);
    });
    desired.forEach(([type, href]) => {
      if (seen.has(type + '\n' + href)) return;
      const link = document.createElement('link');
      link.rel = 'alternate'; link.type = type; link.href = href;
      document.head.appendChild(link);
    });
    [['btn-plain-text', section], ['btn-plain-full-work', workTxt]].forEach(([id, href]) => {
      document.querySelectorAll('a[id="' + id + '"]').forEach(anchor => {
        if (!href) anchor.remove();
        else if (anchor.getAttribute('href') !== href) anchor.setAttribute('href', href);
        // Existing labels, including edition/source qualifications, stay exact.
      });
    });
  }
  const observer = new MutationObserver(reconcile);
  observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'rel', 'type'] });
  const watched = new WeakSet();
  function start() {
    document.querySelectorAll('.reader-toolbar').forEach(toolbar => {
      if (watched.has(toolbar)) return;
      watched.add(toolbar);
      observer.observe(toolbar, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'id'] });
    });
    reconcile();
  }
  start();
  // The unchanged classic-defer core can initialize immediately at interactive,
  // or register DOMContentLoaded before/after this script. Both paths converge.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', start, { once: true });

  if (!section) return;
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get('format') || params.get('view') || '').toLowerCase();
  if (!params.has('plain') && !params.has('text') && !params.has('raw') && !['txt', 'text', 'plain', 'md', 'markdown', 'json', 'full'].includes(raw)) return;
  let target = section;
  if (params.has('full') || raw === 'full') target = workTxt;
  else if (raw === 'md' || raw === 'markdown') target = section + 'index.md';
  else if (raw === 'json') target = section + 'index.json';
  else if (['txt', 'text', 'plain'].includes(raw) || params.has('text') || params.has('raw')) target = section + 'index.txt';
  if (target) window.location.replace(target);
})();
