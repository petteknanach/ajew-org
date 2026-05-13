const fs = require('fs');
const path = require('path');

// Missing prayers in reader part-2 (= LT Chelek Rishon, prayers mapped 1:1)
const missingPart2 = [30,32,35,36,43,51,61,66,68,69,71,81,93,104,108];
// Missing prayers in reader part-3 (= LT Chelek Sheni)
const missingPart3 = [1,4,13,26,34,58,59];

const finishedDir1 = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1';
const finishedDir2 = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2';

function extractPrayerFromHtml(html, prayerNum) {
  // Look for prayer header patterns
  const patterns = [
    new RegExp(`Prayer\\s+${prayerNum}\\b`, 'i'),
    new RegExp(`prayer${prayerNum}\\b`, 'i'),
    new RegExp(`<h[23][^>]*>[^<]*${prayerNum}[^<]*</h[23]>`, 'i'),
    new RegExp(`#${prayerNum}\\b`),
  ];

  let startIdx = -1;
  for (const p of patterns) {
    const m = p.exec(html);
    if (m) { startIdx = m.index; break; }
  }

  if (startIdx === -1) return null;

  // Find next prayer header
  const after = html.substring(startIdx + 5);
  const nextPatterns = [
    /Prayer\s+\d+/i,
    /<h[23][^>]*>[^<]*\d+[^<]*<\/h[23]>/i,
  ];

  let endIdx = html.length;
  for (const p of nextPatterns) {
    const m = p.exec(after);
    if (m && (startIdx + 5 + after.indexOf(m[0])) < endIdx) {
      endIdx = startIdx + 5 + after.indexOf(m[0]);
    }
  }

  const section = html.substring(startIdx, endIdx);
  let text = section
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Remove prayer number prefix
  text = text.replace(/^Prayer\s+\d+\.?\s*/i, '').trim();

  return text.length > 20 ? text : null;
}

// Load all Finished LT1 files
const lt1Files = fs.readdirSync(finishedDir1).filter(f => f.endsWith('.html'));
let lt1Html = '';
for (const f of lt1Files.sort()) {
  lt1Html += '\n\n' + fs.readFileSync(path.join(finishedDir1, f), 'utf8');
}

// Load all Finished LT2 files
const lt2Files = fs.readdirSync(finishedDir2).filter(f => f.endsWith('.html'));
let lt2Html = '';
for (const f of lt2Files.sort()) {
  lt2Html += '\n\n' + fs.readFileSync(path.join(finishedDir2, f), 'utf8');
}

console.log('LT1 HTML total:', lt1Html.length, 'chars');
console.log('LT2 HTML total:', lt2Html.length, 'chars');

let imported = 0;

// Process missing part-2 prayers
for (const num of missingPart2) {
  const text = extractPrayerFromHtml(lt1Html, num);
  if (!text) {
    console.log(`Part 2 Prayer ${num}: NOT FOUND in source`);
    continue;
  }

  const jsonFile = `public/reader/likutay-tefilos/part-2/prayer-${num}.json`;
  if (!fs.existsSync(jsonFile)) {
    console.log(`Part 2 Prayer ${num}: JSON not found`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const paras = text.split(/\n\n+/).filter(p => p.trim().length > 15);

  if (data.segments.length <= 1 || paras.length <= 1) {
    data.segments[0].en = text;
  } else {
    for (let i = 0; i < Math.min(paras.length, data.segments.length); i++) {
      data.segments[i].en = paras[i].trim();
    }
    if (paras.length > data.segments.length) {
      data.segments[data.segments.length - 1].en += '\n\n' + paras.slice(data.segments.length).join('\n\n');
    }
  }

  data.hasEnglish = true;
  fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
  console.log(`Part 2 Prayer ${num}: IMPORTED (${text.length} chars)`);
  imported++;
}

// Process missing part-3 prayers
for (const num of missingPart3) {
  const text = extractPrayerFromHtml(lt2Html, num);
  if (!text) {
    console.log(`Part 3 Prayer ${num}: NOT FOUND in source`);
    continue;
  }

  const jsonFile = `public/reader/likutay-tefilos/part-3/prayer-${num}.json`;
  if (!fs.existsSync(jsonFile)) {
    console.log(`Part 3 Prayer ${num}: JSON not found`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const paras = text.split(/\n\n+/).filter(p => p.trim().length > 15);

  if (data.segments.length <= 1 || paras.length <= 1) {
    data.segments[0].en = text;
  } else {
    for (let i = 0; i < Math.min(paras.length, data.segments.length); i++) {
      data.segments[i].en = paras[i].trim();
    }
    if (paras.length > data.segments.length) {
      data.segments[data.segments.length - 1].en += '\n\n' + paras.slice(data.segments.length).join('\n\n');
    }
  }

  data.hasEnglish = true;
  fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
  console.log(`Part 3 Prayer ${num}: IMPORTED (${text.length} chars)`);
  imported++;
}

console.log('\nTotal imported:', imported);
