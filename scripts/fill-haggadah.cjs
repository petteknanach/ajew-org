/**
 * Fill Haggadah sections with content from raw source file.
 * Parses the raw Haggadah text and distributes to section JSON files.
 */
const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'public', 'reader', 'haggadah-shel-pesach', '_raw_haggadah.txt');
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'haggadah-shel-pesach', 'part-1');

// Seder steps and their Hebrew markers
const SEDER_STEPS = [
  { num: 1, name: 'Kadesh', he: 'קַדֵּשׁ' },
  { num: 2, name: 'Urchatz', he: 'וּרְחַץ' },
  { num: 3, name: 'Karpas', he: 'כַּרְפַּס' },
  { num: 4, name: 'Yachatz', he: 'יַחַץ' },
  { num: 5, name: 'Maggid', he: 'מַגִּיד' },
  { num: 6, name: 'Rachtzah', he: 'רָחְצָה' },
  { num: 7, name: 'Motzi Matzah', he: 'מוֹצִיא' },
  { num: 8, name: 'Maror', he: 'מָרוֹר' },
  { num: 9, name: 'Korech', he: 'כּוֹרֵךְ' },
  { num: 10, name: 'Shulchan Orech', he: 'שֻׁלְחָן עוֹרֵךְ' },
  { num: 11, name: 'Tzafun', he: 'צָפוּן' },
  { num: 12, name: 'Barech', he: 'בָּרֵךְ' },
  { num: 13, name: 'Hallel', he: 'הַלֵּל' },
  { num: 14, name: 'Nirtzah', he: 'נִרְצָה' },
];

// Read raw text
const rawText = fs.readFileSync(RAW_FILE, 'utf8');

// Split by lines
const lines = rawText.split('\n');

// Find section boundaries by looking for seder step markers
// The raw file has markers like "קַדֵּשׁ\t1" at the top, then the actual content below
// The content starts after "הגדה של פסח" header

let contentStart = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'הגדה של פסח' && i > 10) {
    contentStart = i + 1;
    break;
  }
}

console.log('Content starts at line ' + contentStart);

// Now find each section start in the content
const sectionContent = {};
let currentSection = null;
let currentContent = [];

for (let i = contentStart; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Check if this line is a section header
  let foundSection = null;
  for (const step of SEDER_STEPS) {
    const heClean = step.he.replace(/[\u0591-\u05C7]/g, '');
    const lineClean = line.replace(/[\u0591-\u05C7]/g, '');
    if (lineClean === heClean || lineClean.startsWith(heClean + ' ') || line === step.he) {
      foundSection = step;
      break;
    }
  }

  if (foundSection) {
    // Save previous section
    if (currentSection && currentContent.length > 0) {
      sectionContent[currentSection.num] = currentContent.join('\n');
    }
    currentSection = foundSection;
    currentContent = [];
    console.log('Found section ' + foundSection.num + ': ' + foundSection.name + ' at line ' + i);
  } else if (currentSection) {
    currentContent.push(line);
  }
}

// Save last section
if (currentSection && currentContent.length > 0) {
  sectionContent[currentSection.num] = currentContent.join('\n');
}

console.log('\nExtracted ' + Object.keys(sectionContent).length + ' sections');
Object.entries(sectionContent).forEach(([k, v]) => {
  console.log('  Section ' + k + ': ' + v.length + ' chars');
});

// Now update the reader JSON files
for (let secNum = 1; secNum <= 14; secNum++) {
  const fp = path.join(READER_DIR, 'section-' + secNum + '.json');
  if (!fs.existsSync(fp)) continue;

  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const content = sectionContent[secNum];

  if (!content || content.length < 10) {
    console.log('Section ' + secNum + ': no content found, skipping');
    continue;
  }

  // Split content into paragraphs
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 3);

  if (paragraphs.length === 0) {
    // Try splitting by single newlines for shorter sections
    const singleLines = content.split('\n').filter(l => l.trim().length > 3);
    if (singleLines.length > 0) {
      paragraphs.push(...singleLines);
    }
  }

  // If current segments are empty or just 1, create new segments from paragraphs
  if (data.segments.length <= 1 || !data.segments.some(s => (s.he_nikud || s.he || '').trim().length > 10)) {
    data.segments = paragraphs.map((p, i) => ({
      index: i + 1,
      he: p.trim(),
      he_nikud: p.trim(),
      en: ''
    }));
    console.log('Section ' + secNum + ' (' + SEDER_STEPS[secNum - 1].name + '): created ' + data.segments.length + ' segments from ' + paragraphs.length + ' paragraphs');
  } else {
    // Segments already exist - leave them as is
    console.log('Section ' + secNum + ' (' + SEDER_STEPS[secNum - 1].name + '): ' + data.segments.length + ' segments already exist');
  }

  data.hasNikud = true;
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

// Final check
console.log('\n=== Final Status ===');
for (let i = 1; i <= 14; i++) {
  const fp = path.join(READER_DIR, 'section-' + i + '.json');
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const segs = d.segments || [];
  const withContent = segs.filter(s => (s.he_nikud || s.he || '').trim().length > 5);
  console.log('Section ' + i + ' (' + SEDER_STEPS[i - 1].name + '): ' + withContent.length + ' segments');
}
