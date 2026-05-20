#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
if (otzarPartFiles.length < 166) failures.push(`Otzar HaYirah: expected at least 166 part files, found ${otzarPartFiles.length}`);
if (otzarSegments < 6700) failures.push(`Otzar HaYirah: expected at least 6700 populated segments, found ${otzarSegments}`);
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

if (failures.length) {
  console.error('Regression guard failed:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log('Regression guards passed.');
