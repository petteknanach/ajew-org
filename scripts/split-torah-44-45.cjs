const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '..', 'public', 'reader', 'likutay-moharan', 'part-1');

// Step 1: Read current torah-44.json
const torah44 = JSON.parse(fs.readFileSync(path.join(basePath, 'torah-44.json'), 'utf8'));

// Extract segment 6 (Torah 45 content)
const torah45Segment = torah44.segments[5]; // index 5 = segment 6

// Step 2: Shift all files from 284 down to 45, renaming them +1
// We go in reverse to avoid overwriting
console.log('Shifting files from 284 down to 45...');
for (let i = 284; i >= 45; i--) {
  const oldFile = path.join(basePath, `torah-${i}.json`);
  const newFile = path.join(basePath, `torah-${i + 1}.json`);

  if (fs.existsSync(oldFile)) {
    // Read, update internal number references, write to new location
    const data = JSON.parse(fs.readFileSync(oldFile, 'utf8'));

    // Update internal references
    data.id = `lm-1-${i + 1}`;
    data.torah = i + 1;

    // Update navigation
    if (data.navigation) {
      if (data.navigation.prev) {
        data.navigation.prev = `lm-1-${i}`;
        data.navigation.prevUrl = `/reader/likutay-moharan/1/${i}`;
      }
      if (data.navigation.next) {
        const nextNum = i + 2;
        data.navigation.next = `lm-1-${nextNum}`;
        data.navigation.nextUrl = `/reader/likutay-moharan/1/${nextNum}`;
      }
    }

    fs.writeFileSync(newFile, JSON.stringify(data, null, 2), 'utf8');

    // Remove old file (unless it's now the same as new, which won't happen since we go in reverse)
    if (oldFile !== newFile) {
      fs.unlinkSync(oldFile);
    }
  }
}

// Step 3: Fix torah-44.json - remove segment 6
torah44.segments = torah44.segments.slice(0, 5);
torah44.totalParagraphs = 5;
torah44.navigation.next = 'lm-1-45';
torah44.navigation.nextUrl = '/reader/likutay-moharan/1/45';
fs.writeFileSync(path.join(basePath, 'torah-44.json'), JSON.stringify(torah44, null, 2), 'utf8');
console.log('Updated torah-44.json: removed segment 6, now has 5 segments');

// Step 4: Create new torah-45.json with the extracted Torah 45 content
const newTorah45 = {
  id: 'lm-1-45',
  book: 'likutay-moharan',
  part: 1,
  torah: 45,
  displayNumber: 45,
  title: 'Torah 45',
  hebrewTitle: 'מחאת כפים בתפלה',
  keyVerse: '',
  keyVerseTranslation: '',
  keyVerseRef: '',
  themes: [],
  keywords: [],
  simanim: [],
  segments: [{
    index: 1,
    he: torah45Segment.he,
    en: '',
    // No he_nikud in the original segment 6
  }],
  totalParagraphs: 1,
  hasEnglish: false,
  navigation: {
    prev: 'lm-1-44',
    next: 'lm-1-46',
    prevUrl: '/reader/likutay-moharan/1/44',
    nextUrl: '/reader/likutay-moharan/1/46'
  },
  hasNikud: false
};
fs.writeFileSync(path.join(basePath, 'torah-45.json'), JSON.stringify(newTorah45, null, 2), 'utf8');
console.log('Created new torah-45.json: Torah 45 with 1 segment');

// Step 5: Fix the navigation of the now-shifted torah-46 (was torah-45)
const torah46Path = path.join(basePath, 'torah-46.json');
if (fs.existsSync(torah46Path)) {
  const torah46 = JSON.parse(fs.readFileSync(torah46Path, 'utf8'));
  torah46.navigation.prev = 'lm-1-45';
  torah46.navigation.prevUrl = '/reader/likutay-moharan/1/45';
  fs.writeFileSync(torah46Path, JSON.stringify(torah46, null, 2), 'utf8');
  console.log('Fixed torah-46.json navigation');
}

// Verify
const files = fs.readdirSync(basePath).filter(f => f.startsWith('torah-') && f.endsWith('.json'));
console.log(`Total torah files: ${files.length}`);
console.log('Split complete!');
