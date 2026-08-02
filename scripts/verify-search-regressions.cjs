#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const failures = [];
const requiredArtifacts = process.env.REQUIRE_SEARCH_ARTIFACTS === '1';
const QUERY = 'הוא בבחינת דבר';
const TARGET_PATH = '/reader/likutay-moharan/2/1';

function fail(message) { failures.push(message); }
function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[״"׳']/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ').trim();
}
function fnv1a32(text) {
  let value = 0x811c9dc5;
  for (const byte of Buffer.from(text, 'utf8')) {
    value ^= byte;
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value >>> 0;
}
function mustContain(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (!text.includes(needle)) fail(`${file}: missing ${label || needle}`);
}
function intersect(lists) {
  if (!lists.length) return [];
  lists.sort((a, b) => a.length - b.length);
  const [smallest, ...rest] = lists;
  const sets = rest.map(list => new Set(list));
  return smallest.filter(id => sets.every(set => set.has(id)));
}
function phrasePostings(file, hash) {
  const buffer = fs.readFileSync(file);
  if (buffer.length % 8) fail(`${path.relative(root, file)}: byte size is not divisible by 8`);
  let lo = 0;
  let hi = Math.floor(buffer.length / 8);
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (buffer.readUInt32LE(mid * 8) < hash) lo = mid + 1;
    else hi = mid;
  }
  const ids = [];
  for (let i = lo; i * 8 < buffer.length && buffer.readUInt32LE(i * 8) === hash; i++) {
    ids.push(buffer.readUInt32LE(i * 8 + 4));
  }
  return ids;
}

// Source-level invariants: builds fail if exact semantics or the compact index
// wiring is accidentally reverted, even before generated artifacts exist.
mustContain('src/pages/search-enhanced.astro', 'async function idsForExactPhrase', 'binary exact-phrase candidate lookup');
mustContain('src/pages/search-enhanced.astro', "Exact means exact: normalized words must remain consecutive", 'strict exact semantics');
mustContain('src/pages/search-enhanced.astro', "return { query: trimmed.slice(open.length, -close.length).trim(), mode: 'exact' }", 'quoted-query exact mode');
mustContain('src/pages/search-enhanced.astro', "const maxCandidates = searchType === 'exact' ? ids.length", 'uncapped exact fallback correctness');
mustContain('scripts/build-reader-search-shards.py', "algorithm': 'fnv1a32-utf8-bigram-le'", 'versioned phrase index builder');

// Canonical corpus regression: the reported phrase and target must remain in the
// source index, independent of generated reader-search artifacts.
const lightHe = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root, 'public/data/light-search-index-he.json.gz'))));
const targetSource = lightHe.find(doc => /\/reader\/likutay-moharan\/(?:part-2\/torah-|2\/)1$/.test(doc.l || ''));
if (!targetSource) fail('canonical Hebrew index: Likutay Moharan Tinyana 1 is missing');
else if (!normalize(`${targetSource.t || ''} ${targetSource.h || ''} ${targetSource.x || ''}`).includes(normalize(QUERY))) {
  fail(`canonical Hebrew index: Tinyana 1 no longer contains exact phrase “${QUERY}”`);
}

const phraseRoot = path.join(root, 'public/reader-search/phrases');
const phraseMetaPath = path.join(phraseRoot, 'meta.json');
if (!fs.existsSync(phraseMetaPath)) {
  if (requiredArtifacts) fail('generated exact-phrase index is missing');
} else {
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'public/reader-search/meta.json'), 'utf8'));
  const phraseMeta = JSON.parse(fs.readFileSync(phraseMetaPath, 'utf8'));
  if (phraseMeta.version !== 1 || phraseMeta.algorithm !== 'fnv1a32-utf8-bigram-le' || phraseMeta.recordBytes !== 8) {
    fail('phrase index manifest version/algorithm/record size is invalid');
  }
  if (!Array.isArray(phraseMeta.shards) || phraseMeta.shards.length !== 256) fail('phrase index must contain 256 hash shards');
  if (phraseMeta.maxShardBytes > 4 * 1024 * 1024) fail(`phrase index shard exceeds 4 MiB budget: ${phraseMeta.maxShardBytes}`);

  const targetId = meta.items.findIndex(item => item.p === TARGET_PATH);
  if (targetId < 0) fail(`reader-search metadata is missing ${TARGET_PATH}`);
  else {
    const docPath = path.join(root, 'public/reader-search/docs', `${targetId}.json`);
    if (!fs.existsSync(docPath)) fail(`reader-search target document ${targetId}.json is missing`);
    else {
      const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
      if (doc.id !== targetId || doc.p !== TARGET_PATH) fail('reader-search target document id/path disagrees with metadata');
      if (!normalize(doc.n).includes(normalize(QUERY))) fail(`reader-search target document lost exact phrase “${QUERY}”`);
    }

    const tokens = normalize(QUERY).split(' ');
    const postings = tokens.slice(0, -1).map((word, i) => {
      const hash = fnv1a32(`${word} ${tokens[i + 1]}`);
      const key = (hash >>> 24).toString(16).padStart(2, '0');
      const file = path.join(phraseRoot, `${key}.bin`);
      if (!fs.existsSync(file)) { fail(`phrase shard ${key}.bin is missing`); return []; }
      return phrasePostings(file, hash);
    });
    const candidates = intersect(postings);
    if (!candidates.includes(targetId)) fail(`phrase postings do not return Tinyana 1 (document ${targetId})`);
    if (candidates.length > 100) fail(`exact phrase produces ${candidates.length} candidates; expected <=100`);

    // Exact and All Words must stay distinct: this known query has all-word
    // candidates that do not contain the consecutive phrase.
    const wordLists = tokens.map(word => {
      const shard = JSON.parse(fs.readFileSync(path.join(root, 'public/reader-search/shards', `${word[0]}.json`), 'utf8'));
      return shard[word] || [];
    });
    const allWordIds = intersect(wordLists);
    let foundNonPhrase = false;
    for (const id of allWordIds) {
      const file = path.join(root, 'public/reader-search/docs', `${id}.json`);
      if (!fs.existsSync(file)) continue;
      const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!normalize(doc.n).includes(normalize(QUERY))) { foundNonPhrase = true; break; }
    }
    if (!foundNonPhrase) fail('exact-vs-all regression fixture disappeared; choose a new known non-phrase all-word document');
  }
}

if (failures.length) {
  console.error('Search regression verification failed:');
  failures.forEach(message => console.error(` - ${message}`));
  process.exit(1);
}
console.log(`Search regressions passed${fs.existsSync(phraseMetaPath) ? ' (source + generated artifacts)' : ' (source; artifacts generated during build)'}.`);
