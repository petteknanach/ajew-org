// Bounded LH publication adapter. Existing readers and browser note keys stay untouched.
import { editionAwareSnapshot } from './lh-publication-snapshot.js';

export function snapshotFor(data, index, pathname) {
  if (data.readerTransportVersion === 2) return editionAwareSnapshot(data, index, pathname);
  if (data.sourcePublications?.length || (data.sourcePublication.volume != null && data.sourcePublication.volume !== 5) ||
      data.segments.some(row => row.sourceRole === 'supplied_english_source_paragraph')) throw new Error('Unsupported source edition transport');
  const rows = index == null ? data.segments : data.segments.filter(row => String(row.index) === String(index));
  if (!rows.length) throw new Error('Source paragraph not found');
  const units = new Map(data.sourcePublication.units.map(unit => [unit.unit, unit]));
  const labels = [];
  const text = rows.map(row => {
    const current = row.sourceEdition === data.sourcePublication.edition;
    const unit = units.get(row.sourceUnit);
    const label = current
      ? `${unit.title}${row.sourceReference == null ? '' : ` [${row.sourceReference}]`}`
      : `Unchanged Reader paragraph ${row.index}`;
    labels.push(label);
    const notes = (row.translatorNotes || []).map(note => note.text);
    return [label, current ? row.he_nikud : row.he, row.en,
      ...(notes.length ? ['Translator notes — separate from the original teaching', ...notes] : [])]
      .filter(value => typeof value === 'string' && value.length).join('\n\n');
  }).join('\n\n────────\n\n');
  const selection = index == null ? 'all' : String(index);
  const edition = data.sourcePublication.edition;
  return {
    _key: `${pathname}#${selection}@${edition}`,
    ref: index == null ? data.title : labels[0],
    refHe: data.hebrewTitle || '',
    he: '', en: '',
    savedText: `Matched source edition: Likutay Halachos, Volume 5 (English v13 / Hebrew v2). Unchanged Reader material is identified separately.\n\n${text}`,
    readerUrl: index == null ? pathname : `${pathname}#seg-${index}`,
    sourceEdition: edition,
    sourceReference: index == null ? null : rows[0].sourceReference ?? null,
    sourceQualification: 'Translator notes remain separately labelled. Earlier personal annotations and saved snapshots were not migrated.',
    sourceEnglishSHA256: data.sourcePublication.enSHA256,
    sourceHebrewSHA256: data.sourcePublication.heSHA256,
    addedAt: Date.now(), note: '', tag: ''
  };
}

export function snapshotForIndices(data, indices, pathname) {
  const requested = new Set(indices.map(String));
  const rows = data.segments.filter(row => requested.has(String(row.index)));
  if (!requested.size || rows.length !== requested.size) throw new Error('Source selection not found');
  if (rows.length === 1) return snapshotFor(data, rows[0].index, pathname);
  if (rows.length === data.segments.length) return snapshotFor(data, null, pathname);
  const snapshot = snapshotFor({ ...data, segments: rows }, null, pathname);
  snapshot._key = `${pathname}#selection-${rows.map(row => row.index).join('.')}@${snapshot.sourceEdition}`;
  snapshot.ref = `${data.title} — ${rows.length} complete source passages`;
  snapshot.readerUrl = `${pathname}#seg-${rows[0].index}`;
  snapshot.sourceSelectionIndices = rows.map(row => row.index);
  return snapshot;
}

export async function persistSnapshot(storage, api, snapshot, origin) {
  if (!api || typeof api.loadAndMigrate !== 'function' || typeof api.serialize !== 'function') {
    throw new Error('The existing saved-collection service is unavailable');
  }
  // Use the site's real compression/conservation/migration implementation.
  // This is called only by an explicit Save action, never on page load.
  // Bind the service's actual reads to their wire version before any await.
  // Its own verified migration writes advance this version; another tab cannot.
  let version = storage.getItem('mySefer');
  const legacyVersion = storage.getItem('ajew-my-sefer');
  function checkVersion() {
    if (storage.getItem('mySefer') !== version || storage.getItem('ajew-my-sefer') !== legacyVersion) {
      throw new Error('Collection changed in another tab; reload before saving');
    }
  }
  const boundStorage = {
    getItem(key) {
      if (key !== 'mySefer' && key !== 'ajew-my-sefer') throw new Error('Unexpected saved-collection key');
      checkVersion();
      return key === 'mySefer' ? version : legacyVersion;
    },
    setItem(key, value) {
      if (key !== 'mySefer' || typeof value !== 'string') throw new Error('Unexpected saved-collection write');
      checkVersion();
      storage.setItem(key, value);
      if (storage.getItem(key) !== value) throw new Error('Saved-collection readback failed');
      version = value;
    }
  };
  const collection = await api.loadAndMigrate(boundStorage, origin);
  checkVersion();
  if (collection.passages.some(passage => passage._key === snapshot._key)) return false;
  collection.passages.push({ ...snapshot, id: crypto.randomUUID() });
  collection.updatedAt = Date.now();
  const wire = api.serialize(collection);
  boundStorage.setItem('mySefer', wire);
  return true;
}

function initialisePublication() {
  const source = document.getElementById('lh-publication-data');
  const root = document.querySelector('.lh-publication[data-lh-publication]');
  if (!source || !root || root.dataset.lhReady) return;
  const data = JSON.parse(source.textContent);
  const container = root.closest('.reader-container');
  if (!container) return;
  root.dataset.lhReady = 'true';
  const status = document.querySelector('.lh-action-status');
  const report = text => { if (status) status.textContent = text; };
  const wholeIndex = button => button.hasAttribute('data-lh-save') ? button.getAttribute('data-lh-save') : null;

  async function saveSnapshot(snapshot) {
    const commit = () => persistSnapshot(localStorage, globalThis.AjewSeferStorage, snapshot, location.origin);
    const added = navigator.locks?.request
      ? await navigator.locks.request('ajew-my-sefer', { mode: 'exclusive' }, commit)
      : await commit();
    report(added ? (data.readerTransportVersion === 2 ? 'Saved with the complete source text and source qualifications.' : 'Saved with the complete source text and translator notes.') : 'This source passage is already saved.');
  }

  const save = index => saveSnapshot(snapshotFor(data, index, location.pathname));

  // Bind selection ranges to the original owned nodes, not mutable DOM text or
  // a later data-index edit. Payloads always come from the immutable source.
  const selectionBindings = data.segments.map(row => ({ row, node: document.getElementById(`seg-${row.index}`) }))
    .filter(({ row, node }) => node && root.contains(node) &&
      (!row.sourceOwner || node.getAttribute('data-source-owner') === row.sourceOwner));
  const publicationPath = location.pathname;
  function selectedAuthority() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
    const ranges = Array.from({ length: selection.rangeCount }, (_, n) => selection.getRangeAt(n));
    const owners = selectionBindings.filter(({ node }) => node.isConnected && root.contains(node) &&
      ranges.some(range => range.intersectsNode(node)));
    return owners.length ? { snapshot: snapshotForIndices(data, owners.map(({ row }) => row.index), publicationPath),
      nodes: owners.map(({ node }) => node) } : null;
  }
  const selectedSnapshot = () => selectedAuthority()?.snapshot ?? null;
  const validAuthority = authority => root.isConnected && location.pathname === publicationPath &&
    authority?.nodes.length && authority.nodes.every(node => node.isConnected && root.contains(node));
  const payloadFor = snapshot => snapshot.savedText + '\n\n' + location.origin + snapshot.readerUrl;
  const selectionButton = target => target instanceof Element
    ? target.closest('.selection-popup .sel-btn, #highlight-context-menu .hl-action[data-action="share"]') : null;
  // Highlight menus capture text in their own closure. Bind the actual menu
  // instance at creation; never borrow a later selection or fall through after
  // its LH authority becomes invalid. The reusable popup follows live selection.
  const menuBindings = new WeakMap();
  let menuOrigin = null;
  function bindNewMenus(records) {
    for (const record of records) for (const menu of record.addedNodes) {
      if (!(menu instanceof Element) || menu.id !== 'highlight-context-menu' || menuBindings.has(menu)) continue;
      const authority = selectedAuthority() || menuOrigin;
      menuBindings.set(menu, { lh: !!authority, authority });
    }
  }
  const menuObserver = new MutationObserver(bindNewMenus);
  menuObserver.observe(document.body, { childList: true });
  document.addEventListener('dblclick', () => {
    const origin = selectedAuthority();
    menuOrigin = origin;
    queueMicrotask(() => {
      bindNewMenus(menuObserver.takeRecords());
      if (menuOrigin === origin) menuOrigin = null;
    });
  }, true);
  function bindPopupSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const popup = document.querySelector('.selection-popup');
    if (!popup) return;
    const authority = selectedAuthority();
    menuBindings.set(popup, { lh: !!authority, authority });
  }
  document.addEventListener('selectionchange', bindPopupSelection);

  document.addEventListener('copy', event => {
    if (event.target instanceof Element && event.target.closest('input,textarea,[contenteditable="true"]')) return;
    const snapshot = selectedSnapshot();
    if (!snapshot) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!event.clipboardData) { report('Use Copy passage to copy the complete source and notes.'); return; }
    event.clipboardData.setData('text/plain', payloadFor(snapshot));
    report(data.readerTransportVersion === 2 ? 'Copied complete source records with source qualifications.' : 'Copied complete source passages with translator notes.');
  }, true);

  // Shared selection menus are appended outside the Reader container. Capture
  // only their outward LH actions; local highlight/Note/Prayer remain intact.
  document.addEventListener('mousedown', event => {
    const button = selectionButton(event.target);
    if (button?.closest('.selection-popup')) bindPopupSelection();
  }, true);
  document.addEventListener('click', event => {
    const button = selectionButton(event.target);
    if (!button || !['copy', 'share', 'mysefer'].includes(button.dataset.action)) return;
    bindNewMenus(menuObserver.takeRecords());
    const menu = button.closest('.selection-popup, #highlight-context-menu');
    const binding = menuBindings.get(menu);
    if (!binding?.lh) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!menu.isConnected || !validAuthority(binding.authority)) {
      report('Not exported: select the source passage again to include its complete text and notes.');
      return;
    }
    const snapshot = binding.authority.snapshot;
    const action = button.dataset.action;
    menu.style.setProperty('display', 'none');
    window.getSelection()?.removeAllRanges();
    if (action === 'mysefer') {
      saveSnapshot(snapshot).catch(error => report(`Not saved: ${error.message}`));
    } else if (action === 'share' && navigator.share) {
      navigator.share({ title: snapshot.ref, text: snapshot.savedText, url: location.origin + snapshot.readerUrl })
        .then(() => report(data.readerTransportVersion === 2 ? 'Shared with source qualifications.' : 'Shared with translator notes.'), error => report(error.name === 'AbortError' ? 'Share cancelled.' : 'Share was blocked by this browser.'));
    } else {
      navigator.clipboard.writeText(payloadFor(snapshot))
        .then(() => report(data.readerTransportVersion === 2 ? 'Copied complete source records with source qualifications.' : 'Copied complete source passages with translator notes.'), () => report('Copy was blocked by this browser.'));
    }
  }, true);

  document.addEventListener('mouseup', () => setTimeout(() => {
    bindPopupSelection();
    if (!selectedSnapshot()) return;
    for (const [selector, label] of [
      ['.selection-popup [data-action="copy"]', 'Copy source'],
      ['.selection-popup [data-action="share"]', 'Share source'],
      ['.selection-popup [data-action="mysefer"]', '+ My Sefer'],
      ['#highlight-context-menu [data-action="share"]', 'Share source']
    ]) {
      const button = document.querySelector(selector);
      if (button) { button.textContent = label; button.title = data.readerTransportVersion === 2 ? 'Complete selected source records with source qualifications' : 'Complete bilingual source passages with translator notes'; button.style.minHeight = '44px'; }
    }
    for (const menu of document.querySelectorAll('.selection-popup, #highlight-context-menu')) {
      if (getComputedStyle(menu).display === 'none') continue;
      menu.style.maxWidth = `${Math.max(1, innerWidth - 20)}px`;
      menu.style.boxSizing = 'border-box';
      menu.style.flexWrap = 'wrap';
      const rect = menu.getBoundingClientRect();
      menu.style.left = `${scrollX + Math.max(10, Math.min(rect.left, innerWidth - rect.width - 10))}px`;
    }
  }, 20));

  // Capture only LH save controls, including the existing first-paragraph-only
  // toolbar/hover consumer. All other readers retain their unchanged handlers.
  container.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const button = target.closest('[data-lh-save],.seg-add-sefer-btn,#btn-add-sefer');
    const copy = target.closest('[data-lh-copy]');
    if (button) {
      event.preventDefault(); event.stopImmediatePropagation();
      const pair = button.closest('[data-lh-index]');
      const index = button.hasAttribute('data-lh-save') ? wholeIndex(button) : pair?.dataset.lhIndex ?? null;
      save(index).catch(error => report(`Not saved: ${error.message}`));
    } else if (copy) {
      event.preventDefault(); event.stopImmediatePropagation();
      const snapshot = snapshotFor(data, copy.getAttribute('data-lh-copy'), location.pathname);
      navigator.clipboard.writeText(snapshot.savedText + '\n\n' + location.origin + snapshot.readerUrl)
        .then(() => report(data.readerTransportVersion === 2 ? 'Copied with source qualifications.' : 'Copied with translator notes.'), () => report('Copy was blocked by this browser.'));
    }
  }, true);

  // Current paragraphs are already paired in every language mode. Do not add
  // a second DOM projection or duplicate annotation controls.
  const align = document.getElementById('btn-align');
  if (align) {
    align.disabled = true;
    align.setAttribute('aria-disabled', 'true');
    align.title = 'This source edition is already paired in every language mode';
  }

  function restoreExactNikudState() {
    const button = document.getElementById('btn-nikud');
    const nikud = button ? button.classList.contains('active') : true;
    root.querySelectorAll('p[data-lh-plain]').forEach(paragraph => {
      const expected = nikud ? paragraph.getAttribute('data-nikud') : paragraph.getAttribute('data-lh-plain');
      // Retain selection-highlight nodes whenever their complete text is right.
      if (paragraph.textContent !== expected) paragraph.textContent = expected;
    });
  }
  restoreExactNikudState();
  const observer = new MutationObserver(restoreExactNikudState);
  observer.observe(root, { childList: true, subtree: true });

  function bindSourceContents() {
    const list = container.querySelector('.reader-toc-list');
    if (!list || list.dataset.lhSourceContents) return;
    list.dataset.lhSourceContents = 'true';
    const fragment = document.createDocumentFragment();
    let unitList = null;
    let itemList = null;
    for (const row of data.segments) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#' + (row.canonicalAnchor || `seg-${row.index}`);
      link.dataset.index = String(row.index);
      link.textContent = row.sourceRole === 'unit_heading' || row.sourceRole === 'item_marker' || (data.readerTransportVersion === 2 && row.sourceRole === 'embedded_subheading')
        ? (data.readerTransportVersion === 2 ? row.en || row.he_nikud : row.en) : row.sourceReference != null ? `[${row.sourceReference}]`
        : data.readerTransportVersion === 2 && row.sourceRole === 'supplied_english_source_paragraph'
          ? `Supplied English — related ${row.relatedReferences.map(ref => `[${ref}]`).join(', ')}`
        : row.sourceEdition ? row.sourceRole.replaceAll('_', ' ') : `Paragraph ${row.index}`;
      if (data.readerTransportVersion === 2) link.dir = 'auto';
      li.appendChild(link);
      if (row.sourceRole === 'unit_heading') {
        fragment.appendChild(li);unitList = document.createElement('ol');li.appendChild(unitList);itemList = null;
      } else if (row.sourceRole === 'item_marker') {
        (unitList || fragment).appendChild(li);itemList = document.createElement('ol');li.appendChild(itemList);
      } else if (row.sourceEdition) (itemList || unitList || fragment).appendChild(li);
      else {fragment.appendChild(li);unitList = null;itemList = null;}
    }
    list.replaceChildren(fragment);
  }
  bindSourceContents();
  const contentsObserver = new MutationObserver(bindSourceContents);
  contentsObserver.observe(container, { childList: true, subtree: true });

  const legacyRoot = document.querySelector('.lh-legacy-contexts');
  function readNotes() {
    const raw = localStorage.getItem('ajew-reader-notes');
    const notes = raw == null ? {} : JSON.parse(raw);
    if (!notes || typeof notes !== 'object' || Array.isArray(notes)) throw new Error('Earlier notes could not be loaded safely');
    return notes;
  }
  try {
    const notes = readNotes();
    legacyRoot?.querySelectorAll('[data-lh-legacy-note]').forEach(area => {
      const key = area.getAttribute('data-lh-legacy-note');
      if (typeof notes[key] === 'string') {
        area.value = notes[key];
        area.closest('details').open = true;
        legacyRoot.open = true;
      }
    });
  } catch (error) { report(error.message); }
  legacyRoot?.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('[data-lh-save-legacy-note]') : null;
    if (!button) return;
    try {
      const key = button.getAttribute('data-lh-save-legacy-note');
      const area = Array.from(legacyRoot.querySelectorAll('[data-lh-legacy-note]')).find(node => node.getAttribute('data-lh-legacy-note') === key);
      const notes = readNotes();
      // Preserve every other identity and the exact user-entered note string.
      if (area.value) notes[key] = area.value; else delete notes[key];
      const wire = JSON.stringify(notes);
      localStorage.setItem('ajew-reader-notes', wire);
      if (localStorage.getItem('ajew-reader-notes') !== wire) throw new Error('Earlier-note readback failed');
      report('Earlier note saved under its original identity.');
    } catch (error) { report(`Not saved: ${error.message}`); }
  });

  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const node = id && document.getElementById(id);
    if (!node) return;
    let parent = node;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    if (node.closest('.lh-legacy-contexts,.lh-editorial')) node.scrollIntoView({ block: 'start' });
  }
  revealHash();
  addEventListener('hashchange', revealHash);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialisePublication, { once: true });
  else initialisePublication();
}
