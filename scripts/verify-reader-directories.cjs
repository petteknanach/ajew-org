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

if (failures.length) {
  console.error('Reader directory verification failed:');
  failures.forEach(failure => console.error(` - ${failure}`));
  process.exit(1);
}
console.log(`Reader directories verified: ${catalogParts} catalog parts (${bespokeParts} bespoke, ${fallbackParts} generic), no global-fragment Book Index links.`);
