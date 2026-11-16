/* A standalone finite navigator: no Reader runtime, analytics, fetch, history or storage. */
(() => {
  'use strict';
  if (window.location.pathname !== '/reader/entry-recovery/') return;
  // Only the first literal query field is authoritative. Do not decode keys, search later
  // fields, or interpret the fragment: an original colliding parameter cannot win.
  const first = window.location.search.slice(1).split('&', 1)[0];
  const match = /^ajew_entry=(entry-[a-f0-9]{20})$/.exec(first);
  if (!match) return;
  const registry = document.getElementById('finite-recovery-registry');
  if (!registry) return;
  let entries;
  try { entries = JSON.parse(registry.textContent); } catch { return; }
  if (!Array.isArray(entries)) return;
  const matches = entries.filter(entry => entry && entry.key === match[1]);
  if (matches.length !== 1) return;
  const entry = matches[0];
  if (typeof entry.originalURL !== 'string' || !(/^(?:\/reader(?:-plain)?\/[^?#\s\\]+|\/books\/blossoms-of-the-spring\/letter[0-9]+)$/.test(entry.originalURL))) return;
  if (typeof entry.directory !== 'string' || !(entry.directory === '/books/blossoms-of-the-spring/' || /^\/reader\/(?!entry-recovery\/)[^?#\s\\]+\/$/.test(entry.directory))) return;
  if (![entry.title, entry.hebrewTitle, entry.partTitle, entry.hebrewPartTitle].every(s => typeof s === 'string')) return;
  if (entry.part !== null && (!Number.isSafeInteger(entry.part) || entry.part < 1)) return;
  const ids = ['known', 'unknown', 'address', 'title', 'hebrew-title', 'part', 'reviewed', 'directory'];
  const nodes = Object.fromEntries(ids.map(id => [id, document.getElementById('finite-recovery-' + id)]));
  if (Object.values(nodes).some(node => !node)) return;
  nodes.address.textContent = entry.originalURL;
  nodes.title.textContent = entry.title;
  nodes['hebrew-title'].textContent = entry.hebrewTitle;
  nodes.part.textContent = entry.part === null ? '' : ['Part ' + entry.part, entry.partTitle, entry.hebrewPartTitle].filter(Boolean).join(' · ');
  nodes.reviewed.hidden = entry.reviewedEdition !== true;
  nodes.directory.setAttribute('href', entry.directory);
  nodes.unknown.hidden = true;
  nodes.known.hidden = false;
})();
