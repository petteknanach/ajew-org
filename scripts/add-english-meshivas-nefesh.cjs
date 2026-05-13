const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const DOCX_PATH = 'C:/Users/nanach/Documents/Translations/Revival of the Soul/Revival of the Soul.docx';
const READER_DIR = path.join(__dirname, '../public/reader/meshivas-nefesh');

async function main() {
  // Extract text from DOCX
  const result = await mammoth.extractRawText({ path: DOCX_PATH });
  const lines = result.value.split('\n').filter(l => l.trim());

  // Parse into sections: number followed by paragraphs
  const sections = {};
  let currentSection = 0;
  let currentParagraphs = [];
  let introText = [];
  let inIntro = true;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line is just a number (section marker)
    if (/^\d+$/.test(trimmed)) {
      // Save previous section
      if (currentSection > 0 && currentParagraphs.length > 0) {
        sections[currentSection] = currentParagraphs;
      }
      currentSection = parseInt(trimmed, 10);
      currentParagraphs = [];
      inIntro = false;
    } else if (trimmed && !inIntro) {
      // Clean up the text - remove doubled words at line boundaries
      // The DOCX has a formatting issue where the first word repeats mid-line
      let cleaned = trimmed
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Fix doubled first word: "One who desires to return... One proficient"
      // -> "One who desires to return... proficient"
      // Pattern: text ends with a capitalized word, then same word starts next phrase
      const words = cleaned.split(' ');
      if (words.length > 3) {
        // Check for repeated word pattern in the middle of the sentence
        for (let i = 2; i < words.length - 1; i++) {
          const w = words[i];
          // If a word repeats the first word of the paragraph and is capitalized
          if (w === words[0] && /^[A-Z]/.test(w) && i > 1) {
            // Remove the duplicate
            words.splice(i, 1);
            break;
          }
        }
        cleaned = words.join(' ');
      }

      if (cleaned) {
        currentParagraphs.push(cleaned);
      }
    } else if (inIntro && trimmed) {
      introText.push(trimmed);
    }
  }

  // Save last section
  if (currentSection > 0 && currentParagraphs.length > 0) {
    sections[currentSection] = currentParagraphs;
  }

  console.log(`Parsed ${Object.keys(sections).length} sections from DOCX`);
  console.log(`Section numbers: ${Object.keys(sections).slice(0, 10).join(', ')}...`);

  // Now match to existing reader JSON files
  const files = fs.readdirSync(READER_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  console.log(`Found ${files.length} reader JSON files`);

  let matched = 0;
  let updated = 0;

  for (const file of files) {
    const filePath = path.join(READER_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Extract section number from file name (section-1.json -> 1)
    const match = file.match(/section-(\d+)\.json/);
    if (!match) continue;
    const sectionNum = parseInt(match[1], 10);

    if (sections[sectionNum]) {
      const englishParagraphs = sections[sectionNum];
      matched++;

      // Strategy: join all English paragraphs and distribute across segments
      // If segment count matches paragraph count, map 1:1
      // Otherwise, combine all English into segments proportionally
      const segCount = data.segments.length;
      const enCount = englishParagraphs.length;

      if (enCount === segCount) {
        // Perfect 1:1 match
        for (let i = 0; i < segCount; i++) {
          data.segments[i].en = englishParagraphs[i];
        }
      } else if (enCount >= segCount) {
        // More English paragraphs than segments - combine extras into last segments
        const ratio = Math.ceil(enCount / segCount);
        for (let i = 0; i < segCount; i++) {
          const start = i * ratio;
          const end = Math.min(start + ratio, enCount);
          data.segments[i].en = englishParagraphs.slice(start, end).join(' ');
        }
      } else {
        // Fewer English paragraphs - put one per segment, rest get empty
        for (let i = 0; i < segCount; i++) {
          if (i < enCount) {
            data.segments[i].en = englishParagraphs[i];
          }
        }
      }

      // Save updated JSON
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      updated++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Sections in English DOCX: ${Object.keys(sections).length}`);
  console.log(`  Reader files matched: ${matched}`);
  console.log(`  Files updated with English: ${updated}`);

  // Show which sections had no match
  const readerNums = files.map(f => {
    const m = f.match(/section-(\d+)\.json/);
    return m ? parseInt(m[1], 10) : 0;
  }).filter(n => n > 0);

  const missedInReader = Object.keys(sections).map(Number).filter(n => !readerNums.includes(n));
  if (missedInReader.length > 0) {
    console.log(`  Sections in DOCX but not in reader: ${missedInReader.join(', ')}`);
  }

  const missedInDocx = readerNums.filter(n => !sections[n]);
  if (missedInDocx.length > 0) {
    console.log(`  Reader files without English: ${missedInDocx.length} (sections ${missedInDocx.slice(0, 10).join(', ')}...)`);
  }
}

main().catch(console.error);
