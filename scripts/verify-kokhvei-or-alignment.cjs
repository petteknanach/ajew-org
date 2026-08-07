#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'public/reader/kokhvei-or/section-11.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const failures = [];
const expectedHebrewHash = '3fe12160dd68ea954f5ae9a1456763356ce380cfbc476cfc69b42814f4c0aeb0';
const expectedMarkers = new Map([
  [1, 'The Conduct of Admoyr z"tl with the Aristocrats of Uman'],
  [2, 'Further I found written in a volume'],
  [3, 'I will seek him in whatever place he is'],
  [4, 'Story 1 Mazal'],
  [5, 'Story 3 A Man Stronger Than a Diamond'],
  [6, 'Story 4 Kaptzin Pasha'],
  [7, 'Story 5 The Flood'],
  [8, 'Story 6 Ivan'],
  [9, 'Story 7 Bitter Herbs'],
  [10, 'Story 8 The Treasure Under the Bridge'],
  [11, 'Story 9 The Turkey Prince'],
  [12, 'The transcriber says'],
  [13, 'Story 10 The Tainted Grain'],
  [14, 'Story 11 The Deer'],
  [15, 'Story 12 Appeasing the King'],
  [16, 'The import is'],
  [17, 'Story 13 The Book of Eylim'],
  [18, 'five hundred students outstanding in Torah'],
  [19, 'The Maharsha — Three Stories'],
  [20, 'Story 14b — The Maharsha Sinks a Church'],
  [21, "Story 14c — The Maharsha's Successor"],
  [22, "Story 15 Guarding One's Eyes"],
  [24, 'Story 16 The Rabbi Who Chose to Dress Like a Priest'],
  [25, 'Parables from Rabbi Avraham'],
  [26, 'this parable is very useful for the service of Hashem'],
  [27, 'Said the transcriber'],
  [28, 'the personal redemption of the person himself'],
  [29, 'He keeps truth forever']
]);

if (!Array.isArray(data.segments) || data.segments.length !== expectedMarkers.size) {
  failures.push(`expected ${expectedMarkers.size} canonical segments, found ${data.segments?.length ?? 'none'}`);
}
const hebrewHash = crypto.createHash('sha256')
  .update((data.segments || []).map(segment => segment.he || '').join(''), 'utf8')
  .digest('hex');
if (hebrewHash !== expectedHebrewHash) failures.push(`canonical Hebrew changed: ${hebrewHash}`);

for (const [index, marker] of expectedMarkers) {
  const segment = (data.segments || []).find(row => row.index === index);
  if (!segment) {
    failures.push(`segment ${index} is missing`);
    continue;
  }
  if (!String(segment.en || '').trim()) failures.push(`segment ${index} has no English`);
  else if (!segment.en.includes(marker)) failures.push(`segment ${index} is misaligned; missing “${marker}”`);
  if (segment.en === segment.he) failures.push(`segment ${index} repeats Hebrew as English`);
  if (/^\s*Siman\s+\d+\./i.test(segment.en || '')) failures.push(`segment ${index} contains the known cross-book Siman misalignment`);
}

const tainted = (data.segments || []).find(row => row.index === 13);
for (const marker of ['king', 'grain', 'crazy', 'sign on our foreheads', 'look at your forehead']) {
  if (!String(tainted?.en || '').toLowerCase().includes(marker)) failures.push(`tainted-grain segment lost “${marker}”`);
}

if (failures.length) {
  console.error('Kokhvei Or alignment verification failed:');
  failures.forEach(message => console.error(` - ${message}`));
  process.exit(1);
}
console.log(`Kokhvei Or section 11 alignment verified: ${expectedMarkers.size} bilingual segments; Hebrew ${hebrewHash}.`);
