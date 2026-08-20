#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const failures = [];
const requiredArtifacts = process.env.REQUIRE_SEARCH_ARTIFACTS === '1';
const QUERY = 'הוא בבחינת דבר';
const TARGET_PATH = '/reader/likutay-moharan/2/1';
const KOKHVEI_PATH = '/reader/kokhvei-or/1/11';
const KOKHVEI_SOURCE = 'public/reader/kokhvei-or/section-11.json';
const KOKHVEI_QUERIES = [
  { query: 'tainted grain', groups: [['tainted','spoiled','corrupted','poisoned','bad','crazy','insane','madness'], ['grain','wheat','crop','produce']] },
  { query: 'spoiled grain', groups: [['spoiled','tainted','corrupted','poisoned','bad','crazy','insane','madness'], ['grain','wheat','crop','produce']] },
  { query: 'corrupted grain', groups: [['corrupted','tainted','spoiled','poisoned','bad','crazy','insane','madness'], ['grain','wheat','crop','produce']] },
  { query: 'poisoned grain', groups: [['poisoned','tainted','spoiled','corrupted','bad','crazy','insane','madness'], ['grain','wheat','crop','produce']] },
  { query: 'bad wheat', groups: [['bad','tainted','spoiled','corrupted','poisoned','crazy','insane','madness'], ['wheat','grain','crop','produce']] },
  { query: 'grain madness', groups: [['grain','wheat','crop','produce'], ['madness','mad','crazy','insane','insanity']] },
  { query: 'wheat made everyone insane', groups: [['wheat','grain','crop','produce'], ['made'], ['everyone'], ['insane','crazy','mad','madness','insanity']], minimum: 2 },
  { query: 'marks on their forehead', groups: [['marks','mark','marked','sign','symbol'], ['forehead','brow']] },
  { query: 'sign on forehead', groups: [['sign','mark','marked','symbol','indication','omen'], ['forehead','brow']] },
  { query: 'king adviser grain', groups: [['king'], ['adviser','advisor','counselor','friend','second'], ['grain','wheat','crop','produce']] },
  { query: 'תבואה', groups: [['תבואה','חטה','חיטה','חיטים','דגן']] },
  { query: 'חטה', groups: [['חטה','חיטה','חיטים','תבואה','דגן']] },
  { query: 'מצח', groups: [['מצח','מצחנו','מצחך','מצחי']] },
  { query: 'סימן', groups: [['סימן','רושם','אות']] },
  { query: 'רושם', groups: [['רושם','סימן','אות']] },
  { query: 'משוגע', groups: [['משוגע','משגע','משוגעים','משגעים','שגעון','מטורף']] }
];

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
mustContain('src/pages/search-enhanced.astro', 'function matchContext(doc, query)', 'segment-aware result preview');
mustContain('src/pages/search-enhanced.astro', 'function resultLink(link, query)', 'query-preserving deep result links');
mustContain('public/reader-script.js', 'function autoHighlightFromQuery()', 'reader deep-link highlighting');
mustContain('public/reader-script.js', 'init(); autoHighlightFromQuery(); setupMySefer();', 'search highlighting before optional Reader integrations');
mustContain('public/reader-script.js', 'Run only after the lookup table above has been initialized.', 'commentary lookup initialization order');
mustContain('src/pages/reader/likutay-moharan/[part]/[torah].astro', 'Likutay Moharan ${partRoman}:${torahNum}', 'numbered Likutay Moharan teaching titles');
mustContain('scripts/build-reader-search-shards.py', "algorithm': 'fnv1a32-utf8-bigram-le'", 'versioned phrase index builder');
mustContain('scripts/build-reader-search-shards.py', "parts[2] == 'tapes'", 'canonical Saba tape-side Reader links');
mustContain('scripts/build-reader-search-shards.py', "book == 'chayey-moharan'", 'canonical Chayey Moharan siman links');
mustContain('scripts/build-reader-search-shards.py', "seg.get('index') or position", 'fallback segment anchors for Saba tape transcripts');
mustContain('scripts/build-light-search-index.py', "he_doc['m'] = segment_map", 'single-pass Reader location map generation');
mustContain('scripts/build-light-search-index.py', "url = f'/reader/chayey-moharan/siman/{int(match.group(1))}'", 'Chayey Moharan public siman URLs');
mustContain('scripts/build-search-index-v2.cjs', 'Chayay Moharan: ${chayeyCount} canonical sections/simanim indexed', 'complete Chayey Moharan metadata indexing');
mustContain('src/pages/search.astro', 'window.location.replace(target)', 'classic search query-preserving redirect');
mustContain('src/pages/search-enhanced.astro', "['tainted', ['tainted', 'spoiled', 'corrupted', 'poisoned', 'bad', 'crazy', 'insane', 'madness']]", 'tainted-grain conceptual expansion');
mustContain('src/pages/search-enhanced.astro', 'Use the tightest semantic window anywhere in the document', 'minimum-window proximity ranking');
mustContain('src/pages/search-enhanced.astro', "c === 'kokhvei-or'", 'Kokhvei Or primary-work ranking');
mustContain('src/pages/search-enhanced.astro', 'Pick the segment with the tightest complete semantic match', 'semantic result deep-link selection');
mustContain('src/pages/search-enhanced.astro', "['forehead', ['forehead', 'brow']]", 'forehead conceptual expansion');
mustContain('src/pages/search-enhanced.astro', "['תבואה', ['תבואה', 'חטה', 'חיטה', 'חיטים', 'דגן']]", 'Hebrew grain conceptual expansion');

// Koachvay Or source alignment is itself a search prerequisite. The prior bad
// alignment paired this Hebrew parable with an unrelated burial testament,
// making correct English search impossible even when the index was healthy.
const kokhveiSource = JSON.parse(fs.readFileSync(path.join(root, KOKHVEI_SOURCE), 'utf8'));
const taintedSegment = (kokhveiSource.segments || []).find(segment => segment.index === 13);
if (!taintedSegment) fail(`${KOKHVEI_SOURCE}: tainted-grain segment 13 is missing`);
else {
  const he = normalize(taintedSegment.he);
  const en = normalize(taintedSegment.en);
  for (const required of ['תבואה', 'משגע', 'סימן', 'מצח']) {
    if (!he.includes(normalize(required))) fail(`${KOKHVEI_SOURCE}: Hebrew tainted-grain segment lost “${required}”`);
  }
  for (const required of ['grain', 'king', 'crazy', 'forehead']) {
    if (!en.includes(required)) fail(`${KOKHVEI_SOURCE}: English segment 13 is misaligned or lost “${required}”`);
  }
}

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
      const targetMap = (doc.m || []).find(row => row[1] === 11 && row[2] <= doc.he.indexOf(QUERY) && row[3] >= doc.he.indexOf(QUERY) + QUERY.length);
      if (!targetMap) fail('reader-search target lacks a segment map locating the phrase at Likutay Moharan II:1:11');
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

// The generated Reader index must preserve both the Koachvay Or document and
// the conceptual vocabulary a visitor is likely to use. This runs after index
// generation in production builds and catches omissions, stale assets, and
// query-expansion regressions before deployment.
const readerMetaPath = path.join(root, 'public/reader-search/meta.json');
const completeReaderArtifacts = fs.existsSync(readerMetaPath) && fs.existsSync(phraseMetaPath);
if (!completeReaderArtifacts) {
  if (requiredArtifacts) fail('complete generated Reader search artifacts are missing');
} else {
  const meta = JSON.parse(fs.readFileSync(readerMetaPath, 'utf8'));
  const chayeyItems = meta.items.filter(item => item.c === 'chayey-moharan');
  const chayeyPaths = new Set(chayeyItems.map(item => item.p));
  const missingChayey = [];
  for (let siman = 60; siman <= 615; siman++) {
    if (!chayeyPaths.has(`/reader/chayey-moharan/siman/${siman}`)) missingChayey.push(siman);
  }
  for (let section = 1; section <= 7; section++) {
    if (!chayeyPaths.has(`/reader/chayey-moharan/1/${section}`)) fail(`reader-search metadata is missing Chayey Moharan early section ${section}`);
  }
  if (missingChayey.length) fail(`reader-search metadata is missing ${missingChayey.length} Chayey Moharan simanim (${missingChayey.slice(0, 12).join(', ')})`);
  if (chayeyItems.some(item => /\/chayey-moharan\/simanim\//.test(item.p) || /\/chayey-moharan\/(?:1\/)?chapter-(?:8|9|10|11|12)$/.test(item.p))) {
    fail('reader-search metadata contains duplicate or noncanonical Chayey Moharan routes');
  }
  const chayey198Id = meta.items.findIndex(item => item.p === '/reader/chayey-moharan/siman/198');
  if (chayey198Id < 0) fail('reader-search metadata is missing Chayey Moharan Siman 198');
  else {
    const chayey198Path = path.join(root, 'public/reader-search/docs', `${chayey198Id}.json`);
    if (!fs.existsSync(chayey198Path)) fail(`reader-search Chayey Moharan document ${chayey198Id}.json is missing`);
    else {
      const chayey198 = JSON.parse(fs.readFileSync(chayey198Path, 'utf8'));
      const normalized = normalize(chayey198.n || `${chayey198.he || ''} ${chayey198.en || ''}`);
      if (!normalized.includes('robber') || !normalized.includes(normalize('גזלן'))) fail('Chayey Moharan Siman 198 lost its bilingual robber parable search text');
    }
  }
  const targetId = meta.items.findIndex(item => item.p === KOKHVEI_PATH);
  if (targetId < 0) fail(`reader-search metadata is missing ${KOKHVEI_PATH}`);
  else {
    const docPath = path.join(root, 'public/reader-search/docs', `${targetId}.json`);
    if (!fs.existsSync(docPath)) {
      if (requiredArtifacts) fail(`reader-search Koachvay Or document ${targetId}.json is missing`);
    } else {
      const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
      const normalizedDoc = normalize(doc.n || `${doc.he || ''} ${doc.en || ''}`);
      const shardCache = new Map();
      const postingsForTerm = term => {
        const normalized = normalize(term);
        const key = normalized[0];
        if (!key) return [];
        if (!shardCache.has(key)) {
          const file = path.join(root, 'public/reader-search/shards', `${key}.json`);
          shardCache.set(key, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
        }
        return shardCache.get(key)[normalized] || [];
      };
      for (const fixture of KOKHVEI_QUERIES) {
        const matchedGroups = fixture.groups.filter(group => group.some(term => normalizedDoc.includes(normalize(term))));
        const minimum = fixture.minimum || fixture.groups.length;
        if (matchedGroups.length < minimum) {
          fail(`Koachvay Or document does not semantically satisfy “${fixture.query}” (${matchedGroups.length}/${minimum} groups)`);
          continue;
        }
        const groupLists = fixture.groups.map(group => {
          const merged = new Set();
          group.forEach(term => postingsForTerm(term).forEach(id => merged.add(id)));
          return Array.from(merged);
        }).filter(list => list.length);
        const candidates = fixture.groups.length > 3
          ? Array.from(new Set(groupLists.flat()))
          : intersect(groupLists);
        if (!candidates.includes(targetId)) fail(`generated postings do not retrieve Koachvay Or for “${fixture.query}”`);
      }
    }
  }
}

const v2Path = path.join(root, 'public/data/search-index-v2.json');
if (!fs.existsSync(v2Path)) {
  if (requiredArtifacts) fail('search-index-v2.json is missing');
} else {
  const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
  const chayeyDocs = (v2.documents || []).filter(doc => doc.book === 'chayey-moharan');
  const paths = new Set(chayeyDocs.map(doc => doc.url));
  if (chayeyDocs.length !== 563) fail(`search-index-v2 has ${chayeyDocs.length} Chayey Moharan documents; expected 563 canonical sections/simanim`);
  for (let section = 1; section <= 7; section++) {
    if (!paths.has(`/reader/chayey-moharan/1/${section}`)) fail(`search-index-v2 is missing Chayey Moharan early section ${section}`);
  }
  const missing = [];
  for (let siman = 60; siman <= 615; siman++) if (!paths.has(`/reader/chayey-moharan/siman/${siman}`)) missing.push(siman);
  if (missing.length) fail(`search-index-v2 is missing ${missing.length} Chayey Moharan simanim`);
}

if (failures.length) {
  console.error('Search regression verification failed:');
  failures.forEach(message => console.error(` - ${message}`));
  process.exit(1);
}
console.log(`Search regressions passed${fs.existsSync(phraseMetaPath) ? ' (source + generated artifacts)' : ' (source; artifacts generated during build)'}.`);
