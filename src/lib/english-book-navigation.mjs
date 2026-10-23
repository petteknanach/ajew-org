import fs from 'node:fs';
import path from 'node:path';

// Display-only labels for existing collection owners absent from the master book
// index. IDs, grouping and destination URLs are not aliases of the primary works.
const collectionLabels = new Map([
  ['bereishit', { title: 'Beraishis — collected texts', hebrewTitle: 'בראשית' }],
  ['chayey', { title: 'Likutay Nanach — Chayay Moharan commentary', hebrewTitle: 'ליקוטי ננח על חיי מוהר״ן' }],
  ['shivchey', { title: 'Likutay Nanach — Shivchay HaRan commentary', hebrewTitle: 'ליקוטי ננח על שבחי הר״ן' }],
  ['sichos', { title: 'Likutay Nanach — Sichos HaRan commentary', hebrewTitle: 'ליקוטי ננח על שיחות הר״ן' }],
  ['parsha-lm', { title: 'Parsha collections — Likutay Moharan and Halachos', hebrewTitle: 'ליקוטי מוהר״ן והלכות על הפרשה' }],
  ['shimshon-עצות-המבוארות', { title: 'Aitzoas HaMivooaroas — Rabbi Shimshon Barsky', hebrewTitle: 'עצות המבוארות' }],
]);

export function hasExportedEnglish(value) {
  if (typeof value !== 'string') return false;
  // Availability is not translation approval. Exported fields are text, not a
  // request to render new HTML. Tag/entity spellings alone are not English;
  // ignore those tokens rather than counting their names or inventing decoded
  // prose. The saved text is never changed, and ordinary mixed text remains.
  const text = value.replace(/<[^>]*>/gu, ' ').replace(/&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]*);/giu, ' ');
  return /[A-Za-z]/u.test(text);
}

function representativeSectionTitle(entry, data) {
  const title = (typeof data.title === 'string' && data.title.trim()) ? data.title : (entry.title || 'English section');
  if (['chayey', 'shivchey', 'sichos'].includes(entry.bookId) && String(entry.torah) === 'combined') return 'Collected commentary';
  if (title === `${entry.bookId} ${entry.part}/${entry.torah}`) return `Section ${entry.part}/${entry.torah}`;
  return title;
}

// Navigation over already-produced public text, not a translation approval gate.
export function englishBookNavigation(publicRoot, catalog, master = { books: [] }) {
  if (!catalog || !Array.isArray(catalog.entries) || catalog.total !== catalog.entries.length) {
    throw new Error('English navigation requires the complete generated plain catalog');
  }
  const root = fs.realpathSync(publicRoot);
  const labels = new Map((master.books || []).map((book) => [book.id, book]));
  const seen = new Set();
  const groups = new Map();
  function artifact(url, suffix) {
    if (typeof url !== 'string' || !url.startsWith('/reader-plain/') || url.includes('//') || /[?#\\\u0000-\u001f]/u.test(url)) {
      throw new Error('Unsafe plain catalog URL');
    }
    if (url.split('/').some((part) => {
      const decoded = decodeURIComponent(part);
      return decoded === '.' || decoded === '..' || /[\\/\u0000-\u001f]/u.test(decoded);
    })) throw new Error('Unsafe plain catalog path');
    const parsed = new URL(url, 'https://ajew.org');
    if (parsed.origin !== 'https://ajew.org' || parsed.search || parsed.hash || !parsed.pathname.endsWith('/')) {
      throw new Error('Unsafe plain catalog URL');
    }
    const parts = parsed.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
    if (parts.some((part) => !part || part === '.' || part === '..' || /[\\/\u0000-\u001f]/u.test(part))) {
      throw new Error('Unsafe plain catalog path');
    }
    let current = root;
    for (const part of [...parts, suffix]) {
      current = path.join(current, part);
      const st = fs.lstatSync(current);
      if (st.isSymbolicLink()) throw new Error('Plain navigation refuses symlink artifacts');
    }
    const st = fs.lstatSync(current);
    if (!st.isFile() || st.size <= 0 || st.size > 67108864) throw new Error('Invalid plain artifact');
    return current;
  }
  for (const entry of catalog.entries) {
    if (typeof entry.bookId !== 'string' || !entry.bookId || typeof entry.url !== 'string') {
      throw new Error('Incomplete plain catalog identity');
    }
    const identityPath = new URL(entry.url, 'https://ajew.org').pathname.split('/');
    if (decodeURIComponent(identityPath[2] || '') !== entry.bookId) {
      throw new Error('Plain catalog book identity mismatch');
    }
    const jsonFile = artifact(entry.url, 'index.json');
    if (seen.has(jsonFile)) continue;
    seen.add(jsonFile);
    const before = fs.statSync(jsonFile);
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const after = fs.statSync(jsonFile);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('Plain artifact changed during reading');
    if (!Array.isArray(data.segments) || !data.segments.some((segment) => hasExportedEnglish(segment?.en))) continue;
    artifact(entry.url, 'index.html');
    const bookUrl = `/reader-plain/${encodeURIComponent(entry.bookId)}/`;
    artifact(bookUrl, 'index.html');
    let group = groups.get(entry.bookId);
    if (!group) {
      const label = collectionLabels.get(entry.bookId) || labels.get(entry.bookId);
      if (typeof label?.title !== 'string' || !label.title.trim()) {
        throw new Error(`English navigation requires a source-bound work label: ${entry.bookId}`);
      }
      group = {
        id: entry.bookId,
        title: entry.bookId === 'chayey-moharan' ? 'Chayay Moharan' : (label?.title || entry.bookId),
        hebrewTitle: label?.hebrewTitle || '',
        directoryUrl: bookUrl,
        firstEnglishUrl: entry.url,
        firstEnglishTitle: representativeSectionTitle(entry, data),
        englishSections: 0,
      };
      groups.set(entry.bookId, group);
    }
    group.englishSections += 1;
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title, 'en'));
}
