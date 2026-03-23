/**
 * Final fix for Sefer HaMidos topics 7 and 70
 * Based on the analysis of the English-only version structure
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'sefer-hamidos');

async function main() {
  const docPath = 'C:/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/Continuous deleted Hebrew just English 2021 version.docx';
  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  const paras = html.split(/<\/p>/).map(p =>
    p.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  ).filter(p => p.length > 0);

  // === TOPIC 7: ארץ-ישראל (Land of Israel) ===
  // Part 2 entries found at paras 202-207
  // The entries are structured with "SECOND PART:" prefix then numbered entries
  // Some entries are combined in single paragraphs

  // Find the "ISRAEL, LAND OF" section's Part 2 entries
  // Para 202 starts with "SECOND PART:1. Through settling..."
  // We need to split these into individual entries

  let eiStart = -1;
  for (let i = 0; i < paras.length; i++) {
    if (/SECOND PART.*Through settling the Land of Israel/i.test(paras[i])) {
      eiStart = i;
      break;
    }
  }

  if (eiStart === -1) {
    // Broader search
    for (let i = 0; i < paras.length; i++) {
      if (/Through settling.*Land of Israel.*perceiv/i.test(paras[i])) {
        eiStart = i;
        break;
      }
    }
  }

  console.log(`Eretz Yisrael entries start at para ${eiStart}`);

  // Collect all text from the Land of Israel Part 2 section
  let eiText = '';
  if (eiStart >= 0) {
    for (let i = eiStart; i < Math.min(eiStart + 10, paras.length); i++) {
      const p = paras[i];
      // Stop when we hit a new topic (all caps, no numbers at start)
      if (i > eiStart && /^[A-Z][A-Z, ()]+$/.test(p.trim()) && p.length < 60) break;
      eiText += p + ' ';
    }
  }

  // Remove "SECOND PART:" prefix
  eiText = eiText.replace(/^SECOND PART:\s*/i, '').trim();

  // Split into numbered entries
  const eiEntries = [];
  const entryPattern = /(\d+)\.\s+(.*?)(?=\d+\.\s|$)/gs;
  let match;
  while ((match = entryPattern.exec(eiText)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    if (text.length > 10) {
      eiEntries.push({ num, text: `${num}. ${text}` });
    }
  }

  console.log(`Found ${eiEntries.length} Eretz Yisrael entries:`);
  for (const e of eiEntries) {
    console.log(`  #${e.num}: "${e.text.substring(0, 80)}..."`);
  }

  // Apply to topic-7.json
  const topic7Path = path.join(READER_DIR, 'topic-7.json');
  const topic7 = JSON.parse(fs.readFileSync(topic7Path, 'utf8'));

  // Reset all en fields
  for (const seg of topic7.segments) seg.en = '';

  // Segment 1 is "חלק שני" (Part Two header) - skip it
  // Segments 2-8 are entries א through ז (1-7)
  // Note: Hebrew may have nikud, so strip it for comparison
  const stripNikud = (s) => s.replace(/[\u0591-\u05C7]/g, '');
  const startSeg = stripNikud(topic7.segments[0].he).includes('חלק שני') ? 1 : 0;
  console.log(`startSeg=${startSeg} (first seg he: "${topic7.segments[0].he}")`);
  let applied7 = 0;
  for (let i = startSeg; i < topic7.segments.length && applied7 < eiEntries.length; i++) {
    topic7.segments[i].en = eiEntries[applied7].text;
    applied7++;
  }

  topic7.hasEnglish = applied7 > 0;
  fs.writeFileSync(topic7Path, JSON.stringify(topic7, null, 2));
  console.log(`\nUpdated topic-7.json with ${applied7}/${topic7.segments.length - (startSeg ? 1 : 0)} translations`);

  // === TOPIC 70: נר תמיד (Memorial/Constant Light) ===
  // Found at para 1688: "1. In the merit of memorial (lit. constant) lights..."
  // Topic 70 has only 1 content segment (entry 1)

  let ntEntry = '';
  for (let i = 0; i < paras.length; i++) {
    if (/In the merit of memorial.*constant.*lights.*burn.*olive/i.test(paras[i])) {
      // Extract just the numbered entry
      const m = paras[i].match(/(\d+\.\s+.*)/);
      if (m) ntEntry = m[1];
      else ntEntry = paras[i];
      break;
    }
  }

  console.log(`\nNer Tamid entry: "${ntEntry.substring(0, 100)}..."`);

  const topic70Path = path.join(READER_DIR, 'topic-70.json');
  const topic70 = JSON.parse(fs.readFileSync(topic70Path, 'utf8'));

  // Reset
  for (const seg of topic70.segments) seg.en = '';

  // Segment 1 is "חלק שני", segment 2 is the actual entry
  const startSeg70 = stripNikud(topic70.segments[0].he).includes('חלק שני') ? 1 : 0;
  if (ntEntry && startSeg70 < topic70.segments.length) {
    topic70.segments[startSeg70].en = ntEntry;
    topic70.hasEnglish = true;
    console.log(`Updated topic-70.json with 1 translation`);
  }

  fs.writeFileSync(topic70Path, JSON.stringify(topic70, null, 2));

  // Update index
  const indexPath = path.join(READER_DIR, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const items = index.torahs || index.sections || index.topics || [];
  for (const item of items) {
    const num = item.number || item.torah;
    if (num === 7 || num === 70) {
      const jsonPath = path.join(READER_DIR, `topic-${num}.json`);
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      item.hasEnglish = data.hasEnglish;
    }
  }
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
