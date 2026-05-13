const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const ODT_PATH = 'C:/Users/nanach/Documents/Translations/Outpouring of the Soul/Outpouring of the Soul for Amazon complete.odt';
const READER_DIR = path.join(__dirname, '../public/reader/hashtatfchus-hanefesh');

function extractODTText(odtPath) {
  const zip = new AdmZip(odtPath);
  const content = zip.readAsText('content.xml');
  return content
    .replace(/<text:p[^>]*>/g, '\n')
    .replace(/<text:tab[^>]*\/>/g, ' ')
    .replace(/<text:s[^>]*\/>/g, ' ')
    .replace(/<text:line-break[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function main() {
  const text = extractODTText(ODT_PATH);
  const lines = text.split('\n').filter(l => l.trim());

  // Parse sections: "N. Title" pattern
  const sections = {};
  let currentSection = 0;
  let currentParagraphs = [];
  let foundStart = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Look for section headers like "1. Reciting Psalms..." or "2. Hisbodidus"
    const sectionMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (sectionMatch && parseInt(sectionMatch[1]) <= 200) {
      const num = parseInt(sectionMatch[1]);

      // Verify it's a real section (not a footnote reference)
      if (num === currentSection + 1 || (num > currentSection && num <= currentSection + 3)) {
        // Save previous section
        if (currentSection > 0 && currentParagraphs.length > 0) {
          sections[currentSection] = currentParagraphs;
        }
        currentSection = num;
        currentParagraphs = [];
        foundStart = true;

        // Include the title line as first paragraph
        const titleText = sectionMatch[2].trim();
        if (titleText.length > 10) {
          currentParagraphs.push(titleText);
        }
        continue;
      }
    }

    if (foundStart && trimmed) {
      // Skip known non-content markers
      if (trimmed === 'Na Nach Nachma Nachman MeUman!' || trimmed === 'Na Nach Nachma Nachman MeUman') continue;
      if (trimmed.startsWith('The copier') && trimmed.includes('said:')) {
        currentParagraphs.push(trimmed);
        continue;
      }
      // Skip very short lines that are likely headers/footers
      if (trimmed.length < 5) continue;

      currentParagraphs.push(trimmed);
    }
  }

  // Save last section
  if (currentSection > 0 && currentParagraphs.length > 0) {
    sections[currentSection] = currentParagraphs;
  }

  console.log(`Parsed ${Object.keys(sections).length} sections from ODT`);
  console.log(`Section range: ${Math.min(...Object.keys(sections).map(Number))} - ${Math.max(...Object.keys(sections).map(Number))}`);

  // Match to reader files
  const files = fs.readdirSync(READER_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  console.log(`Found ${files.length} reader JSON files`);

  let updated = 0;

  for (const file of files) {
    const match = file.match(/section-(\d+)\.json/);
    if (!match) continue;
    const sectionNum = parseInt(match[1], 10);

    if (!sections[sectionNum]) continue;

    const filePath = path.join(READER_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const englishParagraphs = sections[sectionNum];
    const segCount = data.segments.length;
    const enCount = englishParagraphs.length;

    if (enCount <= segCount) {
      for (let i = 0; i < segCount; i++) {
        if (i < enCount) {
          data.segments[i].en = englishParagraphs[i];
        }
      }
    } else {
      // More English paragraphs - combine into segments
      const ratio = Math.ceil(enCount / segCount);
      for (let i = 0; i < segCount; i++) {
        const start = i * ratio;
        const end = Math.min(start + ratio, enCount);
        data.segments[i].en = englishParagraphs.slice(start, end).join(' ');
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    updated++;
  }

  console.log(`\nResults:`);
  console.log(`  Sections in English: ${Object.keys(sections).length}`);
  console.log(`  Files updated: ${updated}`);

  const readerNums = files.map(f => {
    const m = f.match(/section-(\d+)\.json/);
    return m ? parseInt(m[1], 10) : 0;
  }).filter(n => n > 0);
  const missed = readerNums.filter(n => !sections[n]);
  console.log(`  Reader files without English: ${missed.length}`);
}

main();
