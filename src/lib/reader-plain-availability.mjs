import { lstatSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const numericReader = /^\/reader\/[^/]+\/\d+\/[^/]+\/?$/;
const defaultPublicDir = fileURLToPath(new URL('../../public/', import.meta.url));
const buildResolvers = new Map();

// Admit before URL normalization: WHATWG URL would otherwise erase traversal.
// Catalog metadata (bookId/part/torah) is deliberately not a routing authority.
function admittedPath(raw, origin, prefix) {
  if (typeof raw !== 'string' || /[\u0000-\u001f\u007f?#\\<>"'`]/.test(raw)) return null;
  const match = raw.match(/^(?:https?:\/\/[^/]+)?(\/.*)$/);
  if (!match || raw.startsWith('//')) return null;
  const parts = match[1].split('/').slice(1);
  if (parts.at(-1) === '') parts.pop();
  try {
    if (parts.some(p => !p || ['.', '..'].includes(decodeURIComponent(p)) ||
      /[/\\?#%<>"'`\u0000-\u001f\u007f]/.test(decodeURIComponent(p)))) return null;
    const url = new URL(raw, origin);
    if (url.origin !== origin || url.username || url.password || !url.pathname.startsWith(prefix)) return null;
    return url.pathname;
  } catch { return null; }
}

/** One successful catalog read per build resolver. Failed prerequisites are not cached. */
export function createReaderPlainAvailability({ publicDir = defaultPublicDir, site = 'https://ajew.org' } = {}) {
  const root = resolve(publicDir instanceof URL ? fileURLToPath(publicDir) : publicDir);
  const origin = new URL(site).origin;
  let catalog;
  const files = new Map();
  function regularFile(path, memoize = true) {
    if (memoize && files.has(path)) return files.get(path);
    const parts = path.split('/').filter(Boolean);
    let current = root;
    let valid = false;
    try {
      const rootStat = lstatSync(current);
      valid = rootStat.isDirectory() && !rootStat.isSymbolicLink();
      for (let i = 0; valid && i < parts.length; i++) {
        current = join(current, decodeURIComponent(parts[i]));
        const stat = lstatSync(current);
        valid = !stat.isSymbolicLink() && (i === parts.length - 1 ? stat.isFile() && stat.size > 0 : stat.isDirectory());
      }
    } catch { valid = false; }
    if (memoize) files.set(path, valid);
    return valid;
  }
  function loadCatalog() {
    if (catalog) return catalog;
    const path = join(root, 'reader-plain/index.json');
    if (!regularFile('/reader-plain/index.json', false)) {
      throw new Error(`Plain reader prerequisite: missing, empty, nonregular or symlinked generated catalog: ${path}. Run the plain export producer before rendering numeric reader pages.`);
    }
    let data;
    try { data = JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { throw new Error(`Plain reader prerequisite: invalid generated catalog: ${path}`, { cause: error }); }
    if (!data || !Array.isArray(data.entries) || data.total !== data.entries.length) {
      throw new Error(`Plain reader prerequisite: invalid entries/total in generated catalog: ${path}`);
    }
    const next = new Map();
    for (const row of data.entries) {
      const source = admittedPath(row?.sourceUrl, origin, '/reader/');
      // Reviewed/manual entries without sourceUrl do not govern numeric routes.
      if (!source || !numericReader.test(source)) continue;
      const key = source.replace(/\/$/, '');
      const target = admittedPath(row.url, origin, '/reader-plain/');
      const value = target && target.endsWith('/') && target.split('/').length >= 5 ? target : null;
      // A conflicting or unsafe choice poisons only this exact source route.
      // Identical sourceUrl/url rows are legitimate and deduplicate.
      if (!next.has(key)) next.set(key, value);
      else if (next.get(key) !== value) next.set(key, null);
    }
    catalog = next; // Publish only after a complete successful parse.
    return catalog;
  }
  return function availability(pathname) {
    if (!numericReader.test(pathname)) return null;
    const source = admittedPath(pathname, origin, '/reader/');
    const unavailable = { state: 'unavailable', source: source ? origin + source.replace(/\/$/, '') : null, section: null, work: null };
    if (!source) return unavailable;
    const target = loadCatalog().get(source.replace(/\/$/, ''));
    if (!target || !['index.html', 'index.txt', 'index.md', 'index.json'].every(name => regularFile(target + name))) return unavailable;
    const book = '/reader-plain/' + target.split('/')[2] + '/';
    const checked = path => regularFile(path) ? origin + path : null;
    return {
      state: 'available', source: unavailable.source,
      section: { html: origin + target, txt: origin + target + 'index.txt', markdown: origin + target + 'index.md', json: origin + target + 'index.json' },
      work: { html: checked(book + 'index.html') ? origin + book : null, txt: checked(book + 'full.txt'), markdown: checked(book + 'full.md') },
    };
  };
}

export function getReaderPlainAvailability(pathname, site = 'https://ajew.org') {
  const origin = new URL(site).origin;
  if (!buildResolvers.has(origin)) buildResolvers.set(origin, createReaderPlainAvailability({ site: origin }));
  return buildResolvers.get(origin)(pathname);
}

export function readerPlainAlternates(access) {
  if (!access?.section) return [];
  const { section, work } = access;
  return [
    ['text/html', 'Plain text reader page', section.html],
    ['text/plain', 'Plain text TXT', section.txt],
    ['text/markdown', 'Plain text Markdown', section.markdown],
    ['application/json', 'Plain text JSON', section.json],
    ['text/plain', 'Complete work plain text', work.txt],
    ['text/markdown', 'Complete work Markdown', work.markdown],
  ].filter(([, , href]) => href);
}
