// Bounded LH publication adapter. Existing readers and browser note keys stay untouched.
export function snapshotFor(data, index, pathname) {
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

  async function save(index) {
    const snapshot = snapshotFor(data, index, location.pathname);
    const commit = () => persistSnapshot(localStorage, globalThis.AjewSeferStorage, snapshot, location.origin);
    const added = navigator.locks?.request
      ? await navigator.locks.request('ajew-my-sefer', { mode: 'exclusive' }, commit)
      : await commit();
    report(added ? 'Saved with the complete source text and translator notes.' : 'This source passage is already saved.');
  }

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
        .then(() => report('Copied with translator notes.'), () => report('Copy was blocked by this browser.'));
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
      link.textContent = row.sourceRole === 'unit_heading' || row.sourceRole === 'item_marker'
        ? row.en : row.sourceReference != null ? `[${row.sourceReference}]`
        : row.sourceEdition ? row.sourceRole.replaceAll('_', ' ') : `Paragraph ${row.index}`;
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
