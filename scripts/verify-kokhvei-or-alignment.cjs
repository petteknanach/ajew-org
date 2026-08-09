#!/usr/bin/env node
/** Lock and validate the manually reviewed Kokhvei Or bilingual corpus. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const bookDir = path.join(root, 'public', 'reader', 'kokhvei-or');
const manifestPath = path.join(bookDir, 'alignment-manifest.json');
const sha = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const fail = (message) => { throw new Error(`Kokhvei Or alignment regression: ${message}`); };

if (!fs.existsSync(manifestPath)) fail('reviewed alignment-manifest.json is missing');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== 1 || !Array.isArray(manifest.sections) || manifest.sections.length !== 21) {
  fail('manifest must lock exactly 21 sections at schema version 1');
}

let total = 0;
for (let number = 1; number <= 21; number += 1) {
  const file = path.join(bookDir, `section-${number}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const locked = manifest.sections.find((section) => section.number === number);
  if (!locked) fail(`section ${number} is absent from the lock manifest`);
  if (data.book !== 'kokhvei-or' || data.torah !== number) fail(`section ${number} metadata identity changed`);
  if (!Array.isArray(data.segments) || data.segments.length !== locked.segmentCount) {
    fail(`section ${number} segment count changed`);
  }
  if (Boolean(data.hasEnglish) !== locked.hasEnglish) fail(`section ${number} hasEnglish changed`);
  if (locked.pairs.length !== data.segments.length) fail(`section ${number} pair-lock count changed`);

  const seenIndices = new Set();
  data.segments.forEach((segment, offset) => {
    const pair = locked.pairs[offset];
    const index = segment.index;
    const he = segment.he || '';
    const en = segment.en || '';
    if (index !== pair.index || seenIndices.has(index)) fail(`section ${number} stored index ${index} changed or is duplicated`);
    seenIndices.add(index);
    if (!he.trim()) fail(`section ${number} index ${index} has no canonical Hebrew`);
    if (number === 15) {
      if (en.trim()) fail(`Biur HaLikutim section 15 index ${index} must remain Hebrew-only`);
    } else {
      if (!en.trim()) fail(`section ${number} index ${index} has no English`);
      if (en.trim() === he.trim()) fail(`section ${number} index ${index} copies Hebrew into English`);
    }
    if (sha(he) !== pair.heSha256 || sha(en) !== pair.enSha256 || sha(`${he}\x1f${en}`) !== pair.pairSha256) {
      fail(`section ${number} index ${index} differs from the reviewed bilingual lock`);
    }
  });

  const hebrewHash = sha(data.segments.map((segment) => segment.he || '').join('\x1e'));
  const englishHash = sha(data.segments.map((segment) => segment.en || '').join('\x1e'));
  if (hebrewHash !== locked.hebrewSha256 || englishHash !== locked.englishSha256) {
    fail(`section ${number} aggregate language hash changed`);
  }
  total += data.segments.length;
}

const story = JSON.parse(fs.readFileSync(path.join(bookDir, 'section-11.json'), 'utf8')).segments.find((segment) => segment.index === 13);
const plainHebrew = story.he.normalize('NFD').replace(/[\u0591-\u05C7]/g, '');
for (const phrase of ['תבואה', 'משגע', 'מצח']) {
  if (!plainHebrew.includes(phrase)) fail(`section 11 index 13 lost Hebrew tainted-grain anchor ${phrase}`);
}
for (const pattern of [/grain/i, /craz|insan|mad/i, /king/i, /forehead/i]) {
  if (!pattern.test(story.en)) fail(`section 11 index 13 lost English tainted-grain concept ${pattern}`);
}
for (const required of [
  'Alternate Version — the King Refuses the Grain (Siach Sarfey Kodesh 2:271)',
  'the king vehemently rejected this',
  'That is no reason to eat the grain that makes people crazy',
  'So they would prepare grain for themselves',
  'Sanhedrin 97a',
  'Isaiah (59:15)',
  'Truth item #31',
  'One who wants to turn away from evil, and sees that there is no truth in the world, makes himself as a fool',
  'http://naanaach.blogspot.com/p/stories-and-parables-of-rabbi-nachman.html',
]) {
  if (!story.en.includes(required)) fail(`section 11 index 13 lost authorized alternate-version detail: ${required}`);
}
const section11English = JSON.parse(fs.readFileSync(path.join(bookDir, 'section-11.json'), 'utf8')).segments.map((segment) => segment.en || '');
if (section11English.some((en) => /(^|\n)Stor(?:y|ies)\s+\d+[a-z]?(?:\b|\s*[,—-])/i.test(en))) {
  fail('section 11 regained synthetic numbered-story wrappers');
}

const importer = fs.readFileSync(path.join(root, 'scripts', 'parse-koachvay-or-english.cjs'), 'utf8');
if (!importer.includes('REFUSED: parse-koachvay-or-english.cjs used proportional block distribution')) {
  fail('unsafe proportional importer is no longer hard-disabled');
}

console.log(`Kokhvei Or alignment verified: ${total} canonical segments across 21 sections; Section 15 Hebrew-only; reviewed pair hashes locked.`);
