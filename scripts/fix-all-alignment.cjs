const fs = require('fs');
const path = require('path');

const READER = path.resolve(__dirname, '..', 'public', 'reader');
const stripNikud = s => (s || '').replace(/[\u0591-\u05C7]/g, '');

// Hebrew letter to number mapping for ois markers
const heLetterVal = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'יא':11,'יב':12,'יג':13,'יד':14,'טו':15,'טז':16,'יז':17,'יח':18,'יט':19,'כ':20};

function findHebrewOisMarkers(segments) {
  // Find segments that start with an ois marker like "א ", "ב ", "(א)", etc.
  const markers = [];
  for (let i = 0; i < segments.length; i++) {
    const he = stripNikud(segments[i].he || '').trim();
    // Match patterns: "א כש...", "(א) ...", "אות א ...", standalone Hebrew letter at start
    const m = he.match(/^([א-ת]{1,2})\s/) || he.match(/^\(([א-ת]{1,2})\)/) || he.match(/^אות\s+([א-ת]{1,2})/);
    if (m) {
      const letter = m[1];
      if (heLetterVal[letter]) {
        markers.push({ segIdx: i, ois: heLetterVal[letter], letter });
      }
    }
  }
  return markers;
}

function findEnglishSectionMarkers(text) {
  // Find section numbers in English: "1. ", "2. ", "[1]", "Section 1", etc.
  const markers = [];
  const regex = /(?:^|\n)\s*(\d{1,2})\.\s/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 50) {
      markers.push({ pos: match.index, num });
    }
  }
  return markers;
}

function fixFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.segments || data.segments.length < 2) return 0;

  // Check if file has both Hebrew and English
  const hasHe = data.segments.some(s => s.he && s.he.length > 10);
  const hasEn = data.segments.some(s => s.en && s.en.length > 10);
  if (!hasHe || !hasEn) return 0;

  // Check if there's a cramming problem
  let cramming = 0;
  for (const seg of data.segments) {
    const heLen = (seg.he || '').length;
    const enLen = (seg.en || '').length;
    if (enLen > heLen * 4 && enLen > 500) cramming++;
  }
  if (cramming === 0) return 0; // No problem, skip

  // Collect all English into one string
  const allEn = data.segments.map(s => s.en || '').join('\n\n');
  if (allEn.trim().length < 50) return 0;

  // Find Hebrew ois markers
  const heMarkers = findHebrewOisMarkers(data.segments);

  // Find English section markers
  const enMarkers = findEnglishSectionMarkers(allEn);

  // If we have matching markers, use them as anchors
  if (heMarkers.length >= 2 && enMarkers.length >= 2) {
    // Build mapping: ois number -> English text section
    const enSections = {};
    for (let i = 0; i < enMarkers.length; i++) {
      const startPos = enMarkers[i].pos;
      const endPos = i < enMarkers.length - 1 ? enMarkers[i + 1].pos : allEn.length;
      enSections[enMarkers[i].num] = allEn.substring(startPos, endPos).trim();
    }

    // Text before first English marker = intro
    const introEn = allEn.substring(0, enMarkers[0].pos).trim();

    // Clear all English
    for (const seg of data.segments) seg.en = '';

    // Assign intro to segments before first ois marker
    if (introEn.length > 10 && heMarkers[0].segIdx > 0) {
      const introSegs = data.segments.slice(0, heMarkers[0].segIdx);
      const totalIntroHe = introSegs.reduce((sum, s) => sum + (s.he || '').length, 0);
      const introSentences = introEn.split(/(?<=\.)\s+/).filter(s => s.length > 5);
      let sentIdx = 0;
      for (let i = 0; i < introSegs.length; i++) {
        const proportion = (introSegs[i].he || '').length / (totalIntroHe || 1);
        const numSentences = Math.max(1, Math.round(proportion * introSentences.length));
        data.segments[i].en = introSentences.slice(sentIdx, sentIdx + numSentences).join(' ');
        sentIdx += numSentences;
      }
    }

    // For each ois section, assign English to the Hebrew segment range
    for (let mi = 0; mi < heMarkers.length; mi++) {
      const oisNum = heMarkers[mi].ois;
      const startSeg = heMarkers[mi].segIdx;
      const endSeg = mi < heMarkers.length - 1 ? heMarkers[mi + 1].segIdx : data.segments.length;

      const enText = enSections[oisNum] || '';
      if (!enText) continue;

      const segRange = data.segments.slice(startSeg, endSeg);
      const totalHe = segRange.reduce((sum, s) => sum + (s.he || '').length, 0);

      if (segRange.length === 1) {
        data.segments[startSeg].en = enText;
      } else {
        // Distribute English sentences proportionally across segments in this ois section
        const sentences = enText.split(/(?<=\.)\s+/).filter(s => s.length > 5);
        let sentIdx = 0;
        for (let i = startSeg; i < endSeg; i++) {
          const proportion = (data.segments[i].he || '').length / (totalHe || 1);
          const numSentences = Math.max(1, Math.round(proportion * sentences.length));
          data.segments[i].en = sentences.slice(sentIdx, sentIdx + numSentences).join(' ');
          sentIdx += numSentences;
        }
        // Assign remaining to last segment
        if (sentIdx < sentences.length) {
          data.segments[endSeg - 1].en += ' ' + sentences.slice(sentIdx).join(' ');
        }
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return 1; // Fixed with ois anchors
  }

  // FALLBACK: No ois markers — distribute proportionally by Hebrew length
  const sentences = allEn.split(/(?<=\.)\s+/).filter(s => s.length > 5);
  if (sentences.length < 2) return 0;

  const totalHe = data.segments.reduce((sum, s) => sum + (s.he || '').length, 0);
  if (totalHe === 0) return 0;

  // Clear all English
  for (const seg of data.segments) seg.en = '';

  let sentIdx = 0;
  for (let i = 0; i < data.segments.length; i++) {
    const heLen = (data.segments[i].he || '').length;
    if (heLen < 5) continue;
    const proportion = heLen / totalHe;
    const numSentences = Math.max(1, Math.round(proportion * sentences.length));
    data.segments[i].en = sentences.slice(sentIdx, sentIdx + numSentences).join(' ');
    sentIdx += numSentences;
  }
  // Remaining sentences to last segment with Hebrew
  if (sentIdx < sentences.length) {
    for (let i = data.segments.length - 1; i >= 0; i--) {
      if ((data.segments[i].he || '').length > 5) {
        data.segments[i].en += ' ' + sentences.slice(sentIdx).join(' ');
        break;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return 2; // Fixed with proportional fallback
}

// Process all books
const books = fs.readdirSync(READER).filter(f => {
  const fp = path.join(READER, f);
  return fs.statSync(fp).isDirectory() && !f.startsWith('.');
});

let totalOis = 0, totalProp = 0, totalSkipped = 0;
const bookStats = {};

for (const book of books) {
  const bookDir = path.join(READER, book);
  const parts = fs.readdirSync(bookDir).filter(f => f.startsWith('part-') && fs.statSync(path.join(bookDir, f)).isDirectory());
  const dirs = parts.length > 0 ? parts.map(p => path.join(bookDir, p)) : [bookDir];

  let bookOis = 0, bookProp = 0, bookSkip = 0;

  for (const dir of dirs) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.includes('index'));
    for (const f of files) {
      const result = fixFile(path.join(dir, f));
      if (result === 1) { bookOis++; totalOis++; }
      else if (result === 2) { bookProp++; totalProp++; }
      else { bookSkip++; totalSkipped++; }
    }
  }

  if (bookOis > 0 || bookProp > 0) {
    bookStats[book] = { ois: bookOis, prop: bookProp, skip: bookSkip };
    console.log(`${book}: ${bookOis} ois-fixed, ${bookProp} prop-fixed, ${bookSkip} skipped`);
  }
}

console.log(`\n=== TOTAL ===`);
console.log(`Ois-anchored: ${totalOis}`);
console.log(`Proportional: ${totalProp}`);
console.log(`Skipped (no issue): ${totalSkipped}`);
