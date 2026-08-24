#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'public/reader/parparos-lechochma');
const report = JSON.parse(fs.readFileSync(path.join(DIR, 'english-alignment-report.json'), 'utf8'));
const plainBuilder = fs.readFileSync(path.join(ROOT, 'scripts/build-reader-plain-text.py'), 'utf8');
const failures = [];
if (!plainBuilder.includes('"super"')) failures.push('plain reader builder must skip derived Super Reader commentary files');
if (report.sections.length !== 135 || report.repaired !== 116 || report.withheld !== 18 || report.noSource !== 1) failures.push('unexpected repair classification counts');
for (const row of report.sections) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, `section-${row.section}.json`), 'utf8'));
  const english = (data.segments || []).map(s => String(s.en || '').trim());
  if (data.torah !== row.section || data.displayNumber !== row.section) failures.push(`section ${row.section}: route identity mismatch`);
  const expectedPrev = row.section > 1 ? `/reader/parparos-lechochma/1/${row.section - 1}` : null;
  const expectedNext = row.section < 135 ? `/reader/parparos-lechochma/1/${row.section + 1}` : null;
  if (data.navigation?.prevUrl !== expectedPrev || data.navigation?.nextUrl !== expectedNext) failures.push(`section ${row.section}: navigation mismatch`);
  if (row.status === 'repaired') {
    if (english.some(text => !text)) failures.push(`section ${row.section}: repaired chapter has empty English`);
    if (new Set(english).size !== english.length) failures.push(`section ${row.section}: duplicate English blocks`);
  } else if (english.some(Boolean)) failures.push(`section ${row.section}: unsafe English was not withheld`);
  for (const text of english) {
    if (/Translator's Summary|^\s*\[\s*Note\s*:|Section \d+ — Letter/i.test(text)) failures.push(`section ${row.section}: editorial heading/note leaked`);
  }
}
const s43 = JSON.parse(fs.readFileSync(path.join(DIR, 'section-43.json'), 'utf8')).segments;
if (!s43[0].en.startsWith('Said on Shabbas Chanukah')) failures.push('section 43: opening translation mismatch');
if (!s43[5].en.startsWith('Now: here it is elaborated that through one who slanders')) failures.push('section 43: motzi-dibah translation is not paired with its Hebrew');
if (!s43[6].en.startsWith('Connected to the above matter')) failures.push('section 43: final section mismatch');
const s103 = JSON.parse(fs.readFileSync(path.join(DIR, 'section-103.json'), 'utf8'));
if (s103.segments.some(s => /Siman Two Hundred and Eighty-Two/i.test(s.en || ''))) failures.push('section 103: cross-siman 282 contamination remains');
const s107 = JSON.parse(fs.readFileSync(path.join(DIR, 'section-107.json'), 'utf8'));
if (!s107.hasEnglish || s107.segments.length !== 1 || s107.segments[0].mergedSourceIndices?.length !== 8 || !s107.segments[0].en) failures.push('section 107: merged exact chapter alignment missing');
if (failures.length) {
  console.error('Parparos Reader alignment verification failed:');
  failures.forEach(f => console.error(' - ' + f));
  process.exit(1);
}
console.log(`Parparos Reader alignment verified: ${report.repaired} exact bilingual chapters; ${report.withheld + report.noSource} unsafe chapters withheld; routes synchronized.`);
