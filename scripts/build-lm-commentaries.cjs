/*
 * Build src/data/lm-commentaries.json
 *
 * Scans the indexes of Biur HaLikutim and Parparos LeChochma, parses their
 * Hebrew section titles, and maps each to its Likutey Moharan torah. Writes
 * a registry consumed by the commentary sidebar on LM reader pages.
 *
 * Usage: node scripts/build-lm-commentaries.cjs
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');

const gValues = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40,
  'נ': 50, 'ן': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80,
  'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
};

function gematria(heStr) {
  let s = heStr.replace(/[\u0027\u0022\u05F3\u05F4]/g, '');
  let sum = 0;
  for (const ch of s) sum += (gValues[ch] || 0);
  return sum;
}

// Extract LM siman number from a Hebrew title like "אמור אל הכהנים-מאמר ב'"
function parseSiman(title) {
  // Match Hebrew "סימן", "מאמר", or "סי'" followed by gematria letters
  const re = /(?:\u05E1\u05D9\u05DE\u05DF|\u05DE\u05D0\u05DE\u05E8|\u05E1\u05D9[\u0027\u05F3])\s*([\u05D0-\u05EA\u0027\u0022\u05F3\u05F4]+)/;
  const m = title.match(re);
  if (!m) return null;
  const clean = m[1].replace(/[\u0027\u0022\u05F3\u05F4]/g, '');
  if (!clean) return null;
  const v = gematria(clean);
  if (v >= 1 && v <= 300) return v;
  return null;
}

function buildMappingFor(bookId, partBoundary, label) {
  const idxPath = path.join(REPO_ROOT, 'public', 'reader', bookId, 'index.json');
  const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  const result = { 1: {}, 2: {} };
  idx.torahs.forEach((s) => {
    const inTinyana = partBoundary && s.number >= partBoundary;
    const lmTorah = parseSiman(s.hebrewTitle);
    if (lmTorah === null) return;
    const lmPart = inTinyana ? 2 : 1;
    if (!result[lmPart][lmTorah]) result[lmPart][lmTorah] = [];
    result[lmPart][lmTorah].push({
      section: 'section-' + s.number,
      sectionNumber: s.number,
      label: label,
      sectionTitle: s.hebrewTitle,
      url: s.url || ('/reader/' + bookId + '/' + idx.part + '/' + s.number)
    });
  });
  return result;
}

// Boundaries derived from titles (first resetting "סימן א" that clearly references
// Likutey Moharan Tinyana, e.g. "תקעו ממשלה-סימן א" in Biur, "חקעו ממשלה" in Parparos).
const biurMap = buildMappingFor('biur-halikutim', 49, 'Biur HaLikutim');
const parparosMap = buildMappingFor('parparos-lechochma', 108, 'Parparos LeChochma');

const shaped = { '1': {}, '2': {} };

function add(lmPart, lmTorah, bookId, entry) {
  const p = String(lmPart);
  const t = String(lmTorah);
  if (!shaped[p][t]) {
    shaped[p][t] = {
      related_commentaries: [],
      running_commentary: null,
      segment_refs: {}
    };
  }
  shaped[p][t].related_commentaries.push({ book: bookId, ...entry });
}

for (const part of ['1', '2']) {
  Object.entries(biurMap[part]).forEach(([t, arr]) =>
    arr.forEach(e => add(part, t, 'biur-halikutim', e))
  );
  Object.entries(parparosMap[part]).forEach(([t, arr]) =>
    arr.forEach(e => add(part, t, 'parparos-lechochma', e))
  );
}

// Attach running commentary placeholder for all Part 1 torahs that have other
// commentaries; the Ne'imos Netzach extraction is in progress.
Object.keys(shaped['1']).forEach((t) => {
  shaped['1'][t].running_commentary = {
    book: 'neimos-netzach',
    slug: 'nn-torah-' + t,
    status: 'pending'
  };
});

const outPath = path.join(REPO_ROOT, 'src', 'data', 'lm-commentaries.json');
fs.writeFileSync(outPath, JSON.stringify(shaped, null, 2) + '\n', 'utf8');

const count1 = Object.keys(shaped['1']).length;
const count2 = Object.keys(shaped['2']).length;
console.log('Wrote ' + outPath);
console.log('Part 1 torahs with commentary: ' + count1);
console.log('Part 2 torahs with commentary: ' + count2);
console.log('Sample Part 1 Torah 1:', JSON.stringify(shaped['1']['1'], null, 2));
