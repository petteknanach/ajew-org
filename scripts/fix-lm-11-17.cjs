/**
 * Fix LM Torahs 11-17: split expanded HTML translations by ois sections
 * and align each section to the correct Hebrew segments.
 */
const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Likuaty Moharan 11-17';
const READER = path.join(__dirname, '..', 'public', 'reader', 'likutay-moharan', 'part-1');

const OIS_MAP = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10 };

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function cleanHtml(html) {
  let c = html;
  c = c.replace(/<style[\s\S]*?<\/style>/gi, '');
  c = c.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove translator notes, summaries, flow diagrams, gematria boxes, callout titles
  c = c.replace(/<div class="sum[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="flow[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="chain[\s\S]*?<\/div>/gi, '');
  // Keep callouts but remove their titles
  c = c.replace(/<div class="callout-title">[\s\S]*?<\/div>/gi, '');
  // Remove gematria and acronym boxes (these are analysis, not translation)
  c = c.replace(/<div class="gematria-box[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="acronym-box[\s\S]*?<\/div>/gi, '');
  // Remove verse-decode blocks (analysis)
  c = c.replace(/<div class="verse-decode[\s\S]*?<\/div>/gi, '');
  // Remove rashbam blocks - actually keep these, they're commentary on the text
  return c;
}

function extractSectionContent(html) {
  // Extract paragraphs from p tags, callout divs, and body text
  const paras = [];
  const pMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  pMatches.forEach(m => {
    const text = stripHtml(m).trim();
    if (text.length > 10 && !text.match(/^[\u2022•]\s/)) { // Skip bullet-point analysis
      paras.push(text);
    }
  });
  return paras.join('\n\n');
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
    // Group paragraphs per segment
    const ratio = enParas.length / contentSegs.length;
    for (let i = 0; i < contentSegs.length; i++) {
      const start = Math.round(i * ratio);
      const end = i === contentSegs.length - 1 ? enParas.length : Math.round((i + 1) * ratio);
      contentSegs[i].en = enParas.slice(start, end).join('\n\n');
    }
  } else {
    // Split by sentences
    let expanded = [];
    for (const para of enParas) {
      const sentences = para.split(/(?<=\.)\s+(?=[A-Z"])/);
      expanded.push(...sentences.filter(s => s.trim().length > 5));
    }
    if (expanded.length >= contentSegs.length) {
      const ratio = expanded.length / contentSegs.length;
      for (let i = 0; i < contentSegs.length; i++) {
        const start = Math.round(i * ratio);
        const end = i === contentSegs.length - 1 ? expanded.length : Math.round((i + 1) * ratio);
        contentSegs[i].en = expanded.slice(start, end).join(' ');
      }
    } else {
      // Proportional by Hebrew length
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
  const clean = cleanHtml(html);

  // Find ois section markers (section-heading divs with Hebrew letters)
  const sectionPattern = /<div class="section-heading"[^>]*>[\s\S]*?<\/div>/gi;
  const sectionPositions = [];
  let m;
  while ((m = sectionPattern.exec(clean)) !== null) {
    const text = stripHtml(m[0]).trim();
    const oisNum = OIS_MAP[text] || null;
    sectionPositions.push({
      pos: m.index,
      endPos: m.index + m[0].length,
      oisNum,
      text
    });
  }

  // Also find h2 headings (they come before section divs)
  const h2Pattern = /<h2[^>]*>[\s\S]*?<\/h2>/gi;
  const h2Positions = [];
  while ((m = h2Pattern.exec(clean)) !== null) {
    h2Positions.push({ pos: m.index, endPos: m.index + m[0].length });
  }

  // Build ois sections: content between consecutive section markers
  const oisSections = [];

  // Content before first ois marker (opening verse / intro)
  if (sectionPositions.length > 0) {
    const introEnd = h2Positions.length > 0 ? h2Positions[0].pos : sectionPositions[0].pos;
    const introContent = extractSectionContent(clean.substring(0, introEnd));
    if (introContent.length > 20) {
      oisSections.push({ oisNum: 0, content: introContent });
    }
  }

  for (let i = 0; i < sectionPositions.length; i++) {
    const start = sectionPositions[i].endPos;
    // Find end: next section heading, or look for next h2 that's followed by a section heading
    let end;
    if (i + 1 < sectionPositions.length) {
      // Find the h2 that comes before the next section heading
      const nextSection = sectionPositions[i + 1].pos;
      const h2Before = h2Positions.filter(h => h.pos < nextSection && h.pos > start);
      end = h2Before.length > 0 ? h2Before[0].pos : nextSection;
    } else {
      end = clean.length;
    }

    const content = extractSectionContent(clean.substring(start, end));
    if (content.length > 10) {
      oisSections.push({
        oisNum: sectionPositions[i].oisNum,
        content
      });
    }
  }

  // Now load reader data and group segments by ois
  const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
  data.segments.forEach(s => s.en = '');

  // Group segments by ois marker
  const segGroups = []; // { oisNum, segIndices }
  let currentGroup = { oisNum: 0, segIndices: [] };

  data.segments.forEach((s, i) => {
    const he = (s.he_nikud || s.he || '').trim().replace(/[\u0591-\u05C7]/g, '');
    if (he.length <= 2 && OIS_MAP[he]) {
      // This is an ois marker
      if (currentGroup.segIndices.length > 0) {
        segGroups.push({ ...currentGroup });
      }
      currentGroup = { oisNum: OIS_MAP[he], segIndices: [] };
    } else if (he.length > 0) {
      currentGroup.segIndices.push(i);
    }
  });
  if (currentGroup.segIndices.length > 0) {
    segGroups.push(currentGroup);
  }

  // Match ois sections to segment groups
  // First, assign by matching ois number
  for (const oisSection of oisSections) {
    const group = segGroups.find(g => g.oisNum === oisSection.oisNum);
    if (group) {
      const segs = group.segIndices.map(i => data.segments[i]);
      alignToSegments(oisSection.content, segs);
    }
  }

  // For any remaining unmatched sections, assign to unmatched groups by order
  const unmatchedSections = oisSections.filter(os => {
    return !segGroups.some(g => g.oisNum === os.oisNum);
  });
  const unmatchedGroups = segGroups.filter(g => {
    return !oisSections.some(os => os.oisNum === g.oisNum);
  });

  for (let i = 0; i < Math.min(unmatchedSections.length, unmatchedGroups.length); i++) {
    const segs = unmatchedGroups[i].segIndices.map(idx => data.segments[idx]);
    alignToSegments(unmatchedSections[i].content, segs);
  }

  data.hasEnglish = true;
  fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');

  // Report
  const segsWithEn = data.segments.filter(s => s.en && s.en.trim().length > 10).length;
  const totalSegs = data.segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3).length;
  console.log('Torah ' + torahNum + ': ' + segsWithEn + '/' + totalSegs + ' segs, ' +
    oisSections.length + ' ois sections → ' + segGroups.length + ' seg groups');

  // Show alignment sample
  data.segments.forEach((s, i) => {
    const he = (s.he_nikud || s.he || '').trim();
    if (he.length <= 3) return;
    const en = (s.en || '').trim();
    if (en.length > 0) {
      const ratio = (en.length / he.length).toFixed(1);
      console.log('  seg' + i + ': en=' + en.length + ' he=' + he.length + ' r=' + ratio +
        ' | he:' + he.substring(0, 40) + ' | en:' + en.substring(0, 50));
    }
  });
}
