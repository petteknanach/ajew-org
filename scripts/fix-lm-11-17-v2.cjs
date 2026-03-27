/**
 * Fix LM 11-17: Extract plain text from HTML, split by ois markers,
 * align each section to corresponding Hebrew segments.
 */
const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Likuaty Moharan 11-17';
const READER = path.join(__dirname, '..', 'public', 'reader', 'likutay-moharan', 'part-1');

const OIS_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י'];

function htmlToText(html) {
  let t = html;
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/div>/gi, '\n');
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  t = t.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
  t = t.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  t = t.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/[ \t]+/g, ' ');
  return t.trim();
}

function findSentenceBoundary(text, pos) {
  for (let i = pos; i < Math.min(pos + 200, text.length); i++) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n' || i === text.length - 1)) return i + 1;
  }
  for (let i = pos; i > Math.max(pos - 200, 0); i--) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n')) return i + 1;
  }
  return pos;
}

function alignToSegments(enText, segments) {
  const contentSegs = segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
  if (!contentSegs.length || !enText.trim()) return;

  const enParas = enText.split(/\n\n+/).filter(p => p.trim().length > 10);

  if (contentSegs.length === 1) {
    contentSegs[0].en = enText.trim();
    return;
  }

  if (enParas.length >= contentSegs.length) {
    const ratio = enParas.length / contentSegs.length;
    for (let i = 0; i < contentSegs.length; i++) {
      const start = Math.round(i * ratio);
      const end = i === contentSegs.length - 1 ? enParas.length : Math.round((i + 1) * ratio);
      contentSegs[i].en = enParas.slice(start, end).join('\n\n');
    }
  } else {
    const allEn = enText.trim();
    const totalHe = contentSegs.reduce((s, seg) => s + (seg.he_nikud || seg.he || '').length, 0);
    let pos = 0;
    for (let j = 0; j < contentSegs.length; j++) {
      const heLen = (contentSegs[j].he_nikud || contentSegs[j].he || '').length;
      if (j === contentSegs.length - 1) {
        contentSegs[j].en = allEn.substring(pos).trim();
      } else {
        const targetEnd = pos + Math.floor(allEn.length * heLen / totalHe);
        const splitAt = findSentenceBoundary(allEn, targetEnd);
        contentSegs[j].en = allEn.substring(pos, splitAt).trim();
        pos = splitAt;
      }
    }
  }
}

// Process each torah
const htmlFiles = fs.readdirSync(FINISHED).filter(f => f.endsWith('.html')).sort();

for (const file of htmlFiles) {
  const numMatch = file.match(/torah_(\d+)/i);
  if (!numMatch) continue;
  const torahNum = parseInt(numMatch[1]);

  const readerFile = path.join(READER, 'torah-' + torahNum + '.json');
  if (!fs.existsSync(readerFile)) continue;

  const html = fs.readFileSync(path.join(FINISHED, file), 'utf8');
  const text = htmlToText(html);

  // Find ois section boundaries in the text
  // Pattern: isolated Hebrew letter followed by English heading
  const oisPositions = [];

  for (let oi = 0; oi < OIS_LETTERS.length; oi++) {
    const letter = OIS_LETTERS[oi];
    // Search for isolated Hebrew letter on its own line or before English heading
    const patterns = [
      new RegExp('(?:^|[\\s·])' + letter + '\\s+(?=[A-Z])', 'gm'),
      new RegExp('\\n\\s*' + letter + '\\s*\\n', 'gm'),
    ];
    let found = false;
    for (const pattern of patterns) {
      let m;
      while ((m = pattern.exec(text)) !== null) {
        oisPositions.push({ oisNum: oi + 1, pos: m.index, letter });
        found = true;
        break;
      }
      if (found) break;
    }
  }

  oisPositions.sort((a, b) => a.pos - b.pos);

  // Build sections: text between consecutive ois markers
  const oisSections = [];

  // Content before first ois (intro/verse)
  if (oisPositions.length > 0 && oisPositions[0].pos > 100) {
    oisSections.push({
      oisNum: 0,
      content: text.substring(0, oisPositions[0].pos).trim()
    });
  }

  for (let i = 0; i < oisPositions.length; i++) {
    const start = oisPositions[i].pos;
    const end = i + 1 < oisPositions.length ? oisPositions[i + 1].pos : text.length;
    oisSections.push({
      oisNum: oisPositions[i].oisNum,
      content: text.substring(start, end).trim()
    });
  }

  // Load reader data
  const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
  data.segments.forEach(s => s.en = '');

  // Group Hebrew segments by ois
  const segGroups = [];
  let currentGroup = { oisNum: 0, segIndices: [] };

  data.segments.forEach((s, i) => {
    const he = (s.he_nikud || s.he || '').trim().replace(/[\u0591-\u05C7]/g, '');
    // Check for standalone ois marker
    const isStandaloneOis = he.length <= 2 && OIS_LETTERS.includes(he);
    // Check for embedded ois at start: "א." or "ב." or "ג ." etc
    const embeddedMatch = he.match(/^([א-ט])[\.\s]/);
    const isEmbeddedOis = embeddedMatch && OIS_LETTERS.includes(embeddedMatch[1]);

    if (isStandaloneOis) {
      if (currentGroup.segIndices.length > 0) {
        segGroups.push({ ...currentGroup });
      }
      currentGroup = { oisNum: OIS_LETTERS.indexOf(he) + 1, segIndices: [] };
    } else if (isEmbeddedOis && he.length > 3) {
      // Embedded ois starts a new group but this segment is content
      if (currentGroup.segIndices.length > 0) {
        segGroups.push({ ...currentGroup });
      }
      currentGroup = { oisNum: OIS_LETTERS.indexOf(embeddedMatch[1]) + 1, segIndices: [i] };
    } else if (he.length > 0) {
      currentGroup.segIndices.push(i);
    }
  });
  if (currentGroup.segIndices.length > 0) {
    segGroups.push(currentGroup);
  }

  // Match ois sections to segment groups by ois number
  for (const section of oisSections) {
    const group = segGroups.find(g => g.oisNum === section.oisNum);
    if (group && section.content.length > 20) {
      const segs = group.segIndices.map(i => data.segments[i]);
      alignToSegments(section.content, segs);
    }
  }

  // For groups without matching ois section, try by order
  const unmatchedGroups = segGroups.filter(g =>
    !oisSections.some(s => s.oisNum === g.oisNum) &&
    g.segIndices.some(i => !(data.segments[i].en || '').trim())
  );
  const unmatchedSections = oisSections.filter(s =>
    !segGroups.some(g => g.oisNum === s.oisNum)
  );

  for (let i = 0; i < Math.min(unmatchedGroups.length, unmatchedSections.length); i++) {
    const segs = unmatchedGroups[i].segIndices.map(idx => data.segments[idx]);
    alignToSegments(unmatchedSections[i].content, segs);
  }

  data.hasEnglish = true;
  fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');

  // Report
  const contentSegs = data.segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
  const withEn = contentSegs.filter(s => s.en && s.en.trim().length > 10);
  console.log('Torah ' + torahNum + ': ' + withEn.length + '/' + contentSegs.length + ' segs, ' +
    oisSections.length + ' ois sections, ' + segGroups.length + ' seg groups');

  // Show first 3 segments
  contentSegs.slice(0, 4).forEach(s => {
    const he = (s.he_nikud || s.he || '').substring(0, 40);
    const en = (s.en || '').substring(0, 60);
    console.log('  he: ' + he);
    console.log('  en: ' + en);
    console.log('');
  });
}
