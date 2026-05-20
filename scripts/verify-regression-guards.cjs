#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

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

if (failures.length) {
  console.error('Regression guard failed:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log('Regression guards passed.');
