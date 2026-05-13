/**
 * Fix Ebay HaNachal letter mappings
 * Match translation files to reader letters by date/content
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'ebay-hanachal', 'part-1');
const SRC_DIR = 'C:/Users/Pettek/Documents/Translations/Blossoms of the Spring';

function stripHtml(text) {
  return text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim();
}

function isEnglish(text) {
  const en = (text.match(/[a-zA-Z]/g) || []).length;
  const he = (text.match(/[\u0590-\u05FF]/g) || []).length;
  return en > he;
}

async function getDocContent(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  const paras = result.value.split(/<\/p>/).map(p => stripHtml(p)).filter(p => p.length > 0);
  const english = paras.filter(p => isEnglish(p) && p.length > 5);
  const content = english.filter(p => {
    if (p.length < 15) return false;
    if (/^letter\s+\d+/i.test(p)) return false;
    if (/^\(new:?\s*#?\d+/i.test(p)) return false;
    if (/^blossoms/i.test(p)) return false;
    if (/^for more letters/i.test(p)) return false;
    if (/^http/i.test(p)) return false;
    if (/naanaach\.blogspot/i.test(p)) return false;
    if (/^<!DOCTYPE/i.test(p)) return false;
    return true;
  });
  return { all: paras, english: content, firstEnglish: english[0] || '' };
}

async function main() {
  const sourceFiles = [
    'Letter 31 - final fixed.docx',
    'Letter 32.docx',
    'Letter 33 old 35 new - improved.docx',
    'Letter 34 old 38 new - improved.docx',
    'Letter 35 old 39 new.docx',
    'Letter 36 - new 40.docx',
    'Letter 37.docx',
  ];

  const sources = [];
  for (const file of sourceFiles) {
    const filePath = path.join(SRC_DIR, file);
    if (!fs.existsSync(filePath)) { console.log(`Missing: ${file}`); continue; }
    const { english, firstEnglish } = await getDocContent(filePath);
    sources.push({ file, english, firstEnglish });
    console.log(`"${file}": ${english.length} content lines, first: "${firstEnglish.substring(0, 80)}"`);
  }

  // Based on the analysis:
  // Source "Letter 31": MarCheshvan 5720 = different letter, not reader 31-37
  // Source "Letter 32": Erev Chanuka = reader letter-31 (ערב חנוכה)
  // Source "Letter 33 old 35 new": First Chol HaMoed Pesach or 23 Iyar? Need content match
  // Source "Letter 34 old 38 new": Need content match
  // Source "Letter 35 old 39 new": Need content match
  // Source "Letter 36 new 40": 13 Elul = reader letter-36 (י"ג אלול)
  // Source "Letter 37": Broken HTML file

  // Manual mapping based on date analysis:
  const manualMapping = {};

  for (const src of sources) {
    // Search through all English lines for date clues, not just the first
    const allText = src.english.slice(0, 5).join(' ').toLowerCase();
    const fe = allText;
    if (/erev.*chanuk|chanuk.*erev|night.*chanuk/i.test(fe) || /chanuka.*720|chanuk.*5720/i.test(fe)) {
      manualMapping[31] = src; // Reader letter-31 = Chanukah
      console.log(`\nMapped letter-31 <- ${src.file} (Chanukah)`);
    }
    else if (/chol.*moed|pesach|passover|16.*nissan|nissan.*16/i.test(fe)) {
      manualMapping[32] = src;
      console.log(`\nMapped letter-32 <- ${src.file} (Pesach)`);
    }
    else if (/23.*iyar|iyar.*23/i.test(fe)) {
      manualMapping[33] = src;
      console.log(`\nMapped letter-33 <- ${src.file} (23 Iyar)`);
    }
    else if (/7.*sivan|sivan.*7|shavuo/i.test(fe)) {
      manualMapping[34] = src;
      console.log(`\nMapped letter-34 <- ${src.file} (Sivan)`);
    }
    else if (/19.*tam[mu]uz|tam[mu]uz.*19/i.test(fe)) {
      manualMapping[35] = src;
      console.log(`\nMapped letter-35 <- ${src.file} (Tamuz)`);
    }
    else if (/13.*elul|elul.*13/i.test(fe)) {
      manualMapping[36] = src;
      console.log(`\nMapped letter-36 <- ${src.file} (13 Elul)`);
    }
    else if (/28.*elul|elul.*28/i.test(fe)) {
      manualMapping[37] = src;
      console.log(`\nMapped letter-37 <- ${src.file} (28 Elul)`);
    }
  }

  // For unmapped, try broader content matching
  console.log('\n=== Checking unmapped ===');
  for (const rn of [31, 32, 33, 34, 35, 36, 37]) {
    if (!manualMapping[rn]) {
      console.log(`letter-${rn}: no date match found`);
    }
  }

  // For sources not mapped, check their actual English content to match to reader Hebrew
  const unmappedSources = sources.filter(s => !Object.values(manualMapping).includes(s));
  const unmappedReaders = [31, 32, 33, 34, 35, 36, 37].filter(n => !manualMapping[n]);

  if (unmappedSources.length > 0 && unmappedReaders.length > 0) {
    console.log('\nTrying content-based matching for unmapped...');
    for (const src of unmappedSources) {
      console.log(`  Unmapped source "${src.file}": "${src.firstEnglish.substring(0, 100)}"`);
      // Check content for date hints
      for (const p of src.english.slice(0, 5)) {
        if (/\d{4}|57[12]\d|chanuk|pesach|elul|sivan|tamuz|iyar/i.test(p)) {
          console.log(`    Date hint: "${p.substring(0, 100)}"`);
        }
      }
    }
  }

  // Apply the mapped translations
  console.log('\n=== Applying translations ===');
  let updated = 0;

  for (const [readerNum, src] of Object.entries(manualMapping)) {
    const rn = parseInt(readerNum);
    const jsonPath = path.join(READER_DIR, `letter-${rn}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Reset all English
    for (const seg of data.segments) seg.en = '';

    const content = src.english;
    if (content.length === 0) {
      console.log(`  letter-${rn}: no English content in ${src.file}`);
      continue;
    }

    // Assign English to segments
    if (content.length >= data.segments.length) {
      const ratio = content.length / data.segments.length;
      for (let s = 0; s < data.segments.length; s++) {
        const startIdx = Math.round(s * ratio);
        const endIdx = Math.round((s + 1) * ratio);
        data.segments[s].en = content.slice(startIdx, endIdx).join('\n\n');
      }
    } else {
      for (let s = 0; s < Math.min(data.segments.length, content.length); s++) {
        data.segments[s].en = content[s];
      }
    }

    data.hasEnglish = true;
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    const filledSegs = data.segments.filter(s => s.en && s.en.length > 0).length;
    console.log(`  letter-${rn}: ${filledSegs}/${data.segments.length} segments from ${src.file}`);
    updated++;
  }

  // Clear bad content from unmapped letters
  for (const rn of unmappedReaders) {
    const jsonPath = path.join(READER_DIR, `letter-${rn}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const firstEn = data.segments[0]?.en || '';

    // Clear if it has obviously wrong content (HTML, wrong dates, etc)
    const shouldClear = firstEn.includes('<!DOCTYPE') ||
      firstEn.includes('<html') ||
      firstEn.length === 0 ||
      (data.hasEnglish && !manualMapping[rn]);

    if (shouldClear) {
      console.log(`  letter-${rn}: clearing mismatched English`);
      for (const seg of data.segments) seg.en = '';
      data.hasEnglish = false;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    }
  }

  // Update index
  const indexPath = path.join(READER_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const items = index.torahs || index.sections || index.letters || [];
    let indexUpdated = 0;
    for (const item of items) {
      const num = item.number || item.torah;
      const jsonPath = path.join(READER_DIR, `letter-${num}.json`);
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data.hasEnglish !== item.hasEnglish) {
          item.hasEnglish = data.hasEnglish;
          indexUpdated++;
        }
      }
    }
    if (indexUpdated) {
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
      console.log(`  Index: ${indexUpdated} entries updated`);
    }
  }

  console.log(`\nDone! ${updated} letters properly mapped`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
