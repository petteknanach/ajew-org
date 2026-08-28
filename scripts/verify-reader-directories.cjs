#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readerRoot = path.join(root, 'src/pages/reader');
const publicReaderRoot = path.join(root, 'public/reader');
const catalog = JSON.parse(fs.readFileSync(path.join(publicReaderRoot, 'catalog.json'), 'utf8'));
const failures = [];
let catalogParts = 0;
let bespokeParts = 0;
let fallbackParts = 0;

const fallbackRoute = path.join(readerRoot, '[book]', '[part]', 'index.astro');
if (!fs.existsSync(fallbackRoute)) failures.push('generic per-book directory fallback route is missing');

for (const book of catalog.books || []) {
  const parts = book.parts || [];
  if (!parts.length) failures.push(`${book.id}: catalog has no parts`);
  for (const partMeta of parts) {
    catalogParts++;
    const part = String(partMeta.part || 1);
    const indexUrl = String(partMeta.indexUrl || `/reader/${book.id}/index.json`);
    const indexPath = path.join(root, 'public', indexUrl.replace(/^\//, ''));
    if (!fs.existsSync(indexPath)) {
      failures.push(`${book.id}/${part}: missing directory data ${indexUrl}`);
      continue;
    }
    let index;
    try { index = JSON.parse(fs.readFileSync(indexPath, 'utf8')); }
    catch (error) { failures.push(`${book.id}/${part}: invalid JSON in ${indexUrl}`); continue; }
    const bespoke = path.join(readerRoot, book.id, '[part]', 'index.astro');
    const hasBespoke = fs.existsSync(bespoke);
    if (hasBespoke) bespokeParts++;
    else fallbackParts++;

    const entries = index.torahs || index.items || index.sections || index.chapters || [];
    if (!hasBespoke && (!Array.isArray(entries) || !entries.length)) {
      failures.push(`${book.id}/${part}: generic directory data has no entries`);
    }
  }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(readerRoot).filter(file => file.endsWith('.astro'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('/reader#')) failures.push(`${path.relative(root, file)}: obsolete global Reader fragment link remains`);
  for (const blockMatch of source.matchAll(/<div class="reader-breadcrumb">([\s\S]*?)<\/div>/g)) {
    const links = [...blockMatch[1].matchAll(/<a\s+href=([^>]+)>/g)].map(match => match[1]);
    if (links.length > 1 && /^["']\/reader\/?["']$/.test(links[1])) {
      failures.push(`${path.relative(root, file)}: book breadcrumb still targets the global Reader`);
    }
  }
  if (/Book Index<\/a>/.test(source)) {
    const links = [...source.matchAll(/<a\s+href=([^>]+)>Book Index<\/a>/g)].map(match => match[1]);
    for (const href of links) {
      if (/^["']\/reader\/?["']$/.test(href) || href.includes('/reader#')) {
        failures.push(`${path.relative(root, file)}: Book Index still targets the global Reader`);
      }
    }
  }
}

const globalDirectory = fs.readFileSync(path.join(readerRoot, 'index.astro'), 'utf8');
if (!globalDirectory.includes('return `/reader/${book.id}/${partNumber}/`;')) {
  failures.push('global Reader does not route every catalog book to its part directory');
}

const likutayNanach = (catalog.books || []).find(book => book.id === 'likutay-nanach');
if (!likutayNanach || likutayNanach.parts.length !== 5) {
  failures.push('likutay-nanach: catalog must expose all five volumes');
}
const likutayNanachDirectory = path.join(readerRoot, 'likutay-nanach', 'index.astro');
const likutayNanachPartDirectory = path.join(readerRoot, 'likutay-nanach', '[part]', 'index.astro');
if (!fs.existsSync(likutayNanachDirectory)) failures.push('likutay-nanach: five-volume root directory route is missing');
if (!fs.readFileSync(likutayNanachPartDirectory, 'utf8').includes("volume-' + partNum + '/index.json'")) {
  failures.push('likutay-nanach: part directory does not load volume-N/index.json');
}
if (!globalDirectory.includes('likutayNanachVolumeBooks') || !globalDirectory.includes('Likutay Nanach — Five Volumes')) {
  failures.push('global Reader does not render the five Likutay Nanach volumes');
}

const uziBook = (catalog.books || []).find(book => book.id === 'uzi-meshulam-prison-letter');
if (!uziBook || !String(uziBook.title || '').startsWith('Letter of Uzi Meshulam')) {
  failures.push('Uzi Meshulam letter must be alphabetized under L as “Letter of Uzi Meshulam”');
}
if (!globalDirectory.includes("title: 'Uzi A. Meshulam / עוזי א. בר׳ דוד משולם', ids: ['uzi-meshulam-prison-letter']")) {
  failures.push('Uzi A. Meshulam is missing from the Authors & Categories column');
}
for (const [key, label] of [
  ['neviim-folder', "Nevi'im — Prophets"],
  ['kesuvim-folder', 'Kesuvim — Scriptures'],
  ['zohar-hakdama-folder', 'Zohar Hakdama — Introduction'],
  ['zohar-torah-folder', 'Zohar on the Torah Parshiyos'],
  ['tikunay-zohar-folder', 'Tikunay Zohar'],
  ['zohar-chadash-folder', 'Zohar Chadash'],
]) {
  if (!globalDirectory.includes(`key: '${key}'`) || !globalDirectory.includes(`title: '${label}'`) && !globalDirectory.includes(`title: "${label}"`)) {
    failures.push(`global Reader expandable folder missing: ${label}`);
  }
}
const navigation = fs.readFileSync(path.join(root, 'src/components/Navigation.astro'), 'utf8');
if (!navigation.includes("label: 'Blog'") || !navigation.includes("href: '/blog'")) {
  failures.push('sitewide primary navigation does not expose the Blog');
}

if (failures.length) {
  console.error('Reader directory verification failed:');
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exit(1);
}
console.log(`Reader directories verified: ${catalogParts} catalog parts (${bespokeParts} bespoke, ${fallbackParts} generic), no global-fragment Book Index links.`);
