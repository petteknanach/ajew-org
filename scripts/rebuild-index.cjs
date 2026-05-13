const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'public', 'reader', 'likutay-moharan');

// ============ PART 1 ============
const part1Path = path.join(basePath, 'part-1');

// Read all torah files
const torahFiles = fs.readdirSync(part1Path)
  .filter(f => f.startsWith('torah-') && f.endsWith('.json'))
  .sort((a, b) => {
    const numA = parseInt(a.replace('torah-', '').replace('.json', ''));
    const numB = parseInt(b.replace('torah-', '').replace('.json', ''));
    return numA - numB;
  });

// Read special files
const specialFiles = ['haskamos.json', 'intro.json', 'intro-shimon.json'];
const specials = [];

for (const sf of specialFiles) {
  const filePath = path.join(part1Path, sf);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    specials.push({
      number: 0,
      displayNumber: 0,
      title: data.title,
      hebrewTitle: data.hebrewTitle,
      themes: data.themes || [],
      paragraphs: data.totalParagraphs,
      hasEnglish: data.hasEnglish,
      url: `/reader/likutay-moharan/1/${sf.replace('.json', '')}`,
      type: sf.replace('.json', '')
    });
  }
}

// Build torahs list
const torahs = [];
for (const file of torahFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(part1Path, file), 'utf8'));
  const num = parseInt(file.replace('torah-', '').replace('.json', ''));
  torahs.push({
    number: num,
    displayNumber: data.displayNumber,
    title: data.title || `Torah ${data.displayNumber}`,
    hebrewTitle: data.hebrewTitle || '',
    themes: data.themes || [],
    paragraphs: data.totalParagraphs,
    hasEnglish: data.hasEnglish,
    url: `/reader/likutay-moharan/1/${num}`
  });
}

const index1 = {
  book: 'likutay-moharan',
  part: 1,
  title: 'Likutay Moharan - Part 1',
  hebrewTitle: 'ליקוטי מוהר"ן - חלק א',
  author: 'Rabbi Nachman of Breslov',
  hebrewAuthor: 'רבי נחמן מברסלב',
  totalTorahs: torahs.length,
  introSections: specials,
  torahs
};

fs.writeFileSync(path.join(part1Path, 'index.json'), JSON.stringify(index1, null, 2), 'utf8');
console.log(`Part 1 index: ${specials.length} intro sections + ${torahs.length} torahs`);

// ============ PART 2 ============
// Just re-read and verify - no changes needed
const part2Path = path.join(basePath, 'part-2');
if (fs.existsSync(path.join(part2Path, 'index.json'))) {
  const index2 = JSON.parse(fs.readFileSync(path.join(part2Path, 'index.json'), 'utf8'));
  console.log(`Part 2 index: ${index2.totalTorahs} torahs (unchanged)`);
}

console.log('Index rebuild complete!');
