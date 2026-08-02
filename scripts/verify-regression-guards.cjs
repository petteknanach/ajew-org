#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const failures = [];

function mustContain(file, needle, label = needle) {
  const p = path.join(root, file);
  const text = fs.readFileSync(p, 'utf8');
  if (!text.includes(needle)) failures.push(`${file}: missing ${label}`);
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}

function walkJsonFiles(dir) {
  const out = [];
  const abs = path.join(root, dir);
  for (const name of fs.readdirSync(abs)) {
    const p = path.join(abs, name);
    const rel = path.relative(root, p).replaceAll(path.sep, '/');
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walkJsonFiles(rel));
    else if (name.endsWith('.json')) out.push(rel);
  }
  return out;
}

// Homepage visual/layout regressions that have been accidentally lost before.
mustContain('src/pages/index.astro', 'href="/shavuos"', 'Shavuos homepage button');
mustContain('src/pages/index.astro', 'Shavuos / שבועות', 'bilingual Shavuos button text');
mustContain('src/pages/index.astro', 'hero-saba-link', 'Saba bottom-corner image/link');
mustContain('src/pages/index.astro', 'saba-hands-up-isolated.png', 'Saba isolated image asset');
mustContain('src/pages/index.astro', 'hero-nosson-link', 'Rabbi Nosson bottom-corner image/link');
mustContain('src/pages/index.astro', 'rabbi-nosson-tomb-house-isolated.png', 'Rabbi Nosson isolated image asset');
mustContain('src/pages/index.astro', 'margin: 0.6rem auto 1.15in;', 'large space under האש שלי fire image');
mustContain('src/pages/index.astro', '<span class="no-break">English &amp; Hebrew&nbsp;—&nbsp;free.</span>', 'short one-line subtitle above search');
mustContain('src/pages/index.astro', 'home-prayers-section', 'Prayers for All Occasions homepage card');

// Accepted Saba homepage image: this is the later removebg thumbnail selected by the user.
// Earlier large/cropped Saba blobs caused a regression when old homepage state was reapplied.
const acceptedSabaHash = 'c2ee8b171dc58d771d4545455ac091ea8edec919a50a402c2af3e42d52883865';
const sabaPath = 'public/images/home/saba-hands-up-isolated.png';
const sabaHash = sha256(sabaPath);
if (sabaHash !== acceptedSabaHash) {
  failures.push(`${sabaPath}: wrong Saba image hash ${sabaHash}; expected accepted removebg image ${acceptedSabaHash}`);
}

// Yahrzeit box: Shavuos must show King Dovid.
mustContain('src/components/CompactYahrzeit.astro', 'King Dovid HaMelech', 'King Dovid in yahrzeit widget');
mustContain('src/components/CompactYahrzeit.astro', "{ month: 'Sivan', day: 6, type: 'yahrzeit', name: 'King Dovid HaMelech'", 'King Dovid on 6 Sivan');

for (const file of [
  'public/data/tzaddikim-database-complete.json',
  'public/data/tzaddikim-database-filtered.json',
  'public/data/tzaddikim-database.json',
]) {
  const db = loadJson(file);
  const entries = (db.all_tzaddikim || []).filter(t => t.hebrew_name === 'דוד המלך' || /King Dovid|King David|Dovid Hamelech/.test(t.name || ''));
  if (!entries.some(t => t.yahrzeit_month === 'Sivan' && String(t.yahrzeit_day) === '6')) {
    failures.push(`${file}: King Dovid is not recorded on 6 Sivan`);
  }
}

// Content regression guards for the user's recent high-risk work.
// These catch accidental checkout/revert of old reader data before Vercel builds it.
const behar = loadJson('public/data/behar-teachings.json');
if (behar.length !== 14) failures.push(`public/data/behar-teachings.json: expected 14 teachings, found ${behar.length}`);
if (behar.filter(t => t.he && t.en).length !== 14) failures.push('public/data/behar-teachings.json: every Behar teaching must have HE+EN');

const bechukosai = loadJson('public/data/bechukosai-teachings.json');
if (bechukosai.length !== 16) failures.push(`public/data/bechukosai-teachings.json: expected 16 teachings, found ${bechukosai.length}`);
if (bechukosai.filter(t => t.he && t.en).length !== 16) failures.push('public/data/bechukosai-teachings.json: every Bechukotai teaching must have HE+EN');

const otzarPartFiles = walkJsonFiles('public/reader/otzar-hayirah')
  .filter(f => /\/part-\d+\/.+\.json$/.test(f));
let otzarSegments = 0;
let otzarEnOnly = 0;
let otzarHeOnly = 0;
for (const file of otzarPartFiles) {
  const data = loadJson(file);
  for (const seg of data.segments || []) {
    const he = String(seg.he || '').trim();
    const en = String(seg.en || '').trim();
    if (!he && en) otzarEnOnly++;
    if (he && !en) otzarHeOnly++;
    if (he || en) otzarSegments++;
  }
}
// Current accepted OHY rebuild is source-based: 134 finished HTML sections paired to
// 4,306 local Hebrew source entries. Older 166+/6700+ thresholds were from a
// corrupted over-split state and blocked legitimate deployments.
if (otzarPartFiles.length < 134) failures.push(`Otzar HaYirah: expected at least 134 part files, found ${otzarPartFiles.length}`);
if (otzarSegments < 4300) failures.push(`Otzar HaYirah: expected at least 4300 populated source-paired segments, found ${otzarSegments}`);
if (otzarEnOnly !== 0) failures.push(`Otzar HaYirah: found ${otzarEnOnly} EN-only segments; previous accepted cleanup removed these`);
if (otzarHeOnly !== 0) failures.push(`Otzar HaYirah: found ${otzarHeOnly} HE-only segments; accepted state has paired HE+EN text`);

const otzarTopicIndex = loadJson('public/reader/otzar-hayirah/index.json');
const otzarTopicFiles = walkJsonFiles('public/reader/otzar-hayirah/topics');
if ((otzarTopicIndex.topics || []).length !== otzarTopicFiles.length) {
  failures.push(`Otzar HaYirah topic index: ${otzarTopicIndex.topics?.length || 0} index entries but ${otzarTopicFiles.length} topic files`);
}
for (const topicFile of otzarTopicFiles) {
  const topic = loadJson(topicFile);
  const slug = path.basename(topicFile, '.json');
  const entry = (otzarTopicIndex.topics || []).find(t => t.slug === slug);
  const simanim = topic.simanim || [];
  if (!entry) {
    failures.push(`Otzar HaYirah topic index: missing entry for ${slug}`);
    continue;
  }
  if (entry.siman_count !== simanim.length) {
    failures.push(`Otzar HaYirah topic index: ${slug} says ${entry.siman_count} simanim but file has ${simanim.length}`);
  }
}



function isSequential(values) {
  return values.every((v, i) => Number(v) === i + 1);
}

function normText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripNikud(value) {
  return normText(value).replace(/[\u0591-\u05C7]/g, '');
}

// Otzar HaYirah strict integrity gates. These intentionally fail closed: the
// current reader must not be deployable if OHY is partly duplicated, shifted, or
// carrying stale aligned_segments from a previous source.
const otzarRoot = 'public/reader/otzar-hayirah';
const otzarIndex = loadJson(`${otzarRoot}/index.json`);
const otzarParts = otzarIndex.parts || [];
const otzarPartIndexes = walkJsonFiles(otzarRoot).filter(f => /\/part-\d+\/index\.json$/.test(f));
if (otzarParts.length !== otzarPartIndexes.length) {
  failures.push(`Otzar HaYirah root index: expected ${otzarPartIndexes.length} parts, found ${otzarParts.length}`);
}

for (const partIndexFile of otzarPartIndexes) {
  const partMatch = partIndexFile.match(/part-(\d+)\/index\.json$/);
  const part = Number(partMatch[1]);
  const partIndex = loadJson(partIndexFile);
  const torahs = partIndex.torahs || [];
  const torahFiles = walkJsonFiles(`${otzarRoot}/part-${part}`).filter(f => /\/torah-\d+\.json$/.test(f));
  if (torahs.length !== torahFiles.length) {
    failures.push(`Otzar HaYirah part-${part}: index says ${torahs.length} torahs but ${torahFiles.length} torah files exist`);
  }
  const rootPart = otzarParts.find(p => Number(p.part) === part);
  if (!rootPart) failures.push(`Otzar HaYirah root index: missing part-${part}`);
  else if (Number(rootPart.totalTorahs) !== torahs.length) {
    failures.push(`Otzar HaYirah root index: part-${part} says ${rootPart.totalTorahs} torahs but part index has ${torahs.length}`);
  }
}

const otzarAllTorahFiles = walkJsonFiles(otzarRoot).filter(f => /\/part-\d+\/torah-\d+\.json$/.test(f));
let otzarEmptySegments = 0;
let otzarBadIndexes = 0;
let otzarBadAlignedSegments = 0;
let otzarBadTotalParagraphs = 0;
let otzarFooterEnglish = 0;
for (const file of otzarAllTorahFiles) {
  const data = loadJson(file);
  const segs = data.segments || [];
  if (segs.some(s => !normText(s.he) && !normText(s.en))) otzarEmptySegments++;

  const indexes = segs.map((s, i) => s.index ?? s.siman ?? (i + 1));
  if (!isSequential(indexes)) otzarBadIndexes++;

  if (typeof data.totalParagraphs === 'number' && data.totalParagraphs !== segs.length) {
    otzarBadTotalParagraphs++;
  }

  if (Array.isArray(data.aligned_segments)) {
    const sameLength = data.aligned_segments.length === segs.length;
    const sameText = sameLength && segs.every((seg, i) => {
      const a = data.aligned_segments[i] || {};
      return normText(a.he) === normText(seg.he) && normText(a.en) === normText(seg.en);
    });
    if (!sameText) otzarBadAlignedSegments++;
  }

  for (const seg of segs) {
    const en = normText(seg.en);
    if (/Otzar HaYirah\s+—\s+Treasury of Awe|Na Nach Nachma Nachman May these words/i.test(en)) {
      otzarFooterEnglish++;
      break;
    }
  }
}
if (otzarEmptySegments) failures.push(`Otzar HaYirah: ${otzarEmptySegments} torah files contain empty HE+EN segments`);
if (otzarBadIndexes) failures.push(`Otzar HaYirah: ${otzarBadIndexes} torah files have non-sequential/missing segment indexes`);
if (otzarBadTotalParagraphs) failures.push(`Otzar HaYirah: ${otzarBadTotalParagraphs} torah files have totalParagraphs that disagree with segments.length`);
if (otzarBadAlignedSegments) failures.push(`Otzar HaYirah: ${otzarBadAlignedSegments} torah files have stale aligned_segments differing from segments`);
if (otzarFooterEnglish) failures.push(`Otzar HaYirah: ${otzarFooterEnglish} torah files contain footer/header text in English segment fields`);

// Known-high-risk Pesach/Sefira/Shavuos pages must not share duplicated Hebrew
// bodies with divergent English. This was found in part-1 torah-22..25.
const pesachFiles = [22, 23, 24, 25].map(n => `${otzarRoot}/part-1/torah-${n}.json`);
const pesachBodies = pesachFiles.map(file => loadJson(file).segments || []);
for (let i = 0; i < pesachBodies.length; i++) {
  for (let j = i + 1; j < pesachBodies.length; j++) {
    const heA = pesachBodies[i].map(s => stripNikud(s.he)).join('\n');
    const heB = pesachBodies[j].map(s => stripNikud(s.he)).join('\n');
    const enA = pesachBodies[i].map(s => normText(s.en)).join('\n');
    const enB = pesachBodies[j].map(s => normText(s.en)).join('\n');
    if (heA && heA === heB && enA !== enB) {
      failures.push(`Otzar HaYirah: duplicated Hebrew with divergent English between ${pesachFiles[i]} and ${pesachFiles[j]}`);
    }
  }
}

// Likutay Moharan's directory has repeatedly regressed from the accepted rich,
// bilingual structure to a partial/plain list. Fail every build unless both
// volumes, every numbered Torah, and every special section remain reachable and
// bilingually labelled.
const lmRoot = 'public/reader/likutay-moharan';
const lmExpected = [
  {
    part: 1,
    total: 286,
    specials: ['haskamos', 'intro', 'intro-shimon', 'hakdama', 'intro-lm', 'intro-manuscripts', 'preface-section-1', 'preface-section-2', 'preface-section-3', 'preface-section-4', 'preface-section-5'],
  },
  {
    part: 2,
    total: 125,
    specials: ['intro-volume-2', 'intro', 'omission', 'manuscript-1', 'manuscript-2', 'manuscript-3', 'manuscript-4', 'manuscript-5', 'manuscript-6'],
  },
];

for (const spec of lmExpected) {
  const partRoot = `${lmRoot}/part-${spec.part}`;
  const index = loadJson(`${partRoot}/index.json`);
  const torahs = index.torahs || [];
  if (Number(index.totalTorahs) !== spec.total) failures.push(`LM part ${spec.part}: totalTorahs must be ${spec.total}`);
  if (torahs.length !== spec.total) failures.push(`LM part ${spec.part}: directory has ${torahs.length} Torahs, expected ${spec.total}`);
  if (!isSequential(torahs.map(t => t.number))) failures.push(`LM part ${spec.part}: directory Torah numbers are not complete/sequential`);

  for (let n = 1; n <= spec.total; n++) {
    const entry = torahs[n - 1] || {};
    const expectedUrl = `/reader/likutay-moharan/${spec.part}/${n}`;
    if (!normText(entry.title) || !normText(entry.hebrewTitle)) failures.push(`LM part ${spec.part} Torah ${n}: directory label is not bilingual`);
    if (entry.hasEnglish !== true) failures.push(`LM part ${spec.part} Torah ${n}: directory lost hasEnglish=true`);
    if (entry.url !== expectedUrl) failures.push(`LM part ${spec.part} Torah ${n}: URL is ${entry.url || 'missing'}, expected ${expectedUrl}`);
    const dataFile = `${partRoot}/torah-${n}.json`;
    if (!fs.existsSync(path.join(root, dataFile))) {
      failures.push(`LM part ${spec.part} Torah ${n}: missing ${dataFile}`);
      continue;
    }
    const data = loadJson(dataFile);
    if (!normText(data.title) || !normText(data.hebrewTitle)) failures.push(`LM part ${spec.part} Torah ${n}: source title is not bilingual`);
    if (!(data.segments || []).length) failures.push(`LM part ${spec.part} Torah ${n}: source has no segments`);
  }

  for (const slug of spec.specials) {
    const file = `${partRoot}/${slug}.json`;
    if (!fs.existsSync(path.join(root, file))) failures.push(`LM part ${spec.part}: missing special section ${slug}`);
  }
}

const lmDirectoryUi = 'src/pages/reader/likutay-moharan/[part]/index.astro';
for (const marker of [
  'Complete Likutay Moharan Directory',
  'הספר השלם בשתי שפות',
  "preface-section-1",
  "preface-section-5",
  "manuscript-${i + 1}",
  'item.title',
  'item.hebrewTitle',
  'Torahs 32–286 — Main Likutay Moharan',
  'Likutay Moharan Tinyana — Torahs 1–125',
]) mustContain(lmDirectoryUi, marker, `protected complete/bilingual directory marker ${marker}`);

// Search regression: a singular English query must be able to generate the
// plural posting used by LM 1:268. The first `npm run verify` intentionally runs
// before reader-search shards are regenerated, so verify the canonical light
// index input here; the normal build then regenerates shards from this source.
mustContain('src/pages/search-enhanced.astro', 'function englishMorphologyVariants', 'English singular/plural search expansion');
mustContain('src/pages/search-enhanced.astro', '"medicine" finds a source containing "medicines" (LM 1:268)', 'medicine -> LM 1:268 regression note');
const lightEnPath = path.join(root, 'public/data/light-search-index-en.json.gz');
const lightEn = JSON.parse(zlib.gunzipSync(fs.readFileSync(lightEnPath)).toString('utf8'));
const medicineTarget = lightEn.find(doc => /\/reader\/likutay-moharan\/(?:part-1\/torah-|1\/)268$/.test(doc.l || ''));
if (!medicineTarget) failures.push('Search source index: LM 1:268 is missing');
else if (!/\bmedicines\b/i.test(`${medicineTarget.x || ''} ${medicineTarget.e || ''}`)) failures.push('Search source index: LM 1:268 no longer contains searchable “medicines”');

if (failures.length) {
  console.error('Regression guard failed:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log('Regression guards passed.');
