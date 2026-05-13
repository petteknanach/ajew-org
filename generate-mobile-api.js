#!/usr/bin/env node

/**
 * Generate Mobile API Content for ajew.org
 * This script expands the mobile API with more books and chapters
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiMobileDir: path.join(__dirname, 'public', 'api-mobile'),
  teachingsDir: path.join(__dirname, 'public', 'teachings'),
  booksDir: path.join(__dirname, 'public', 'books'),
  
  // Books to add to mobile API
  books: [
    {
      id: 'likutay-moharan',
      title: 'Likutey Moharan',
      hebrewTitle: 'לקוטי מוהר"ן',
      author: 'Rabbi Nachman of Breslov',
      description: 'The primary work of Rabbi Nachman, containing his core teachings.',
      color: '#3498db',
      parts: 2,
      totalChapters: 282
    },
    {
      id: 'sefer-hamidos',
      title: 'Sefer Hamidos',
      hebrewTitle: 'ספר המידות',
      author: 'Rabbi Nachman of Breslov',
      description: 'A book of character traits and ethical teachings.',
      color: '#2ecc71',
      parts: 1,
      totalChapters: 413
    },
    {
      id: 'stories',
      title: 'Stories of Rabbi Nachman',
      hebrewTitle: 'סיפורי מעשיות',
      author: 'Rabbi Nachman of Breslov',
      description: 'Thirteen mystical stories with deep spiritual meanings.',
      color: '#e74c3c',
      parts: 1,
      totalChapters: 13
    },
    {
      id: 'likutay-eitzos',
      title: 'Likutey Eitzos',
      hebrewTitle: 'לקוטי עצות',
      author: 'Rabbi Natan of Breslov',
      description: 'Practical advice compiled from the teachings of Rabbi Nachman.',
      color: '#9b59b6',
      parts: 1,
      totalChapters: 50
    },
    {
      id: 'sichos-haran',
      title: 'Sichos Haran',
      hebrewTitle: 'שיחות הר"ן',
      author: 'Rabbi Nachman of Breslov',
      description: 'Conversations and teachings of Rabbi Nachman.',
      color: '#1abc9c',
      parts: 1,
      totalChapters: 30
    }
  ]
};

// Ensure directories exist
function ensureDirectories() {
  const dirs = [
    CONFIG.apiMobileDir,
    path.join(CONFIG.apiMobileDir, 'likutay-moharan', 'part-2'),
    path.join(CONFIG.apiMobileDir, 'sefer-hamidos'),
    path.join(CONFIG.apiMobileDir, 'stories'),
    path.join(CONFIG.apiMobileDir, 'likutay-eitzos'),
    path.join(CONFIG.apiMobileDir, 'sichos-haran')
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
}

// Update books.json
function updateBooksJson() {
  const booksPath = path.join(CONFIG.apiMobileDir, 'books.json');
  
  // Read existing books if they exist
  let existingBooks = [];
  if (fs.existsSync(booksPath)) {
    existingBooks = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
  }
  
  // Update chapters count for existing books
  const updatedBooks = CONFIG.books.map(newBook => {
    const existingBook = existingBooks.find(b => b.id === newBook.id);
    if (existingBook) {
      // Keep existing chapters count if it exists
      return { ...newBook, chapters: existingBook.chapters || 0 };
    }
    return { ...newBook, chapters: 0 };
  });
  
  fs.writeFileSync(booksPath, JSON.stringify(updatedBooks, null, 2));
  console.log(`Updated books.json with ${updatedBooks.length} books`);
}

// Generate sample chapter for a book
function generateSampleChapter(bookId, chapterNum, part = '1') {
  const chapterData = {
    id: `torah-${chapterNum}`,
    n: chapterNum,
    t: `Teaching ${chapterNum}`,
    ht: `תורה ${chapterNum}`,
    b: bookId,
    p: part,
    kv: "Psalms 119:1",
    hkv: "אַשְׁרֵי תְמִימֵי דָרֶךְ הַהֹלְכִים בְּתוֹרַת ה'",
    tr: "Happy are those whose way is perfect, who walk in the Torah of Hashem.",
    d: "1802",
    l: "Breslov",
    o: "General",
    th: ["Torah", "Wisdom", "Teaching"],
    kw: ["תּוֹרָה", "חָכְמָה", "לִימּוּד"],
    s: [
      {
        n: 1,
        t: "Sample Section",
        ht: "קטע לדוגמה",
        sum: "This is a sample section for the mobile API. Actual content will be added from the teachings directory.",
        kc: ["sample", "example"],
        src: ["Psalms 119:1"]
      }
    ],
    st: {
      ts: 1,
      ms: 1,
      c: true
    },
    nav: {
      prev: chapterNum > 1 ? `torah-${chapterNum - 1}` : null,
      next: `torah-${chapterNum + 1}`
    },
    v: "1.0",
    lu: new Date().toISOString().split('T')[0]
  };
  
  return chapterData;
}

// Generate index.json for a book part
function generateIndexJson(bookId, partNum, chapters) {
  const indexData = {
    part: {
      id: `part-${partNum}`,
      b: bookId,
      t: `${bookId.replace('-', ' ').toUpperCase()} Part ${partNum}`,
      ht: `${bookId.replace('-', ' ').toUpperCase()} חלק ${partNum}`,
      tr: "1-10",
      y: "1802-1806",
      d: `Part ${partNum} of ${bookId.replace('-', ' ').toUpperCase()} containing teachings.`,
      c: chapters.map(chapter => ({
        id: chapter.id,
        n: chapter.n,
        t: chapter.t,
        ht: chapter.ht,
        kv: chapter.kv,
        th: chapter.th,
        s: chapter.st.ts,
        prev: chapter.nav.prev,
        next: chapter.nav.next
      })),
      stats: {
        tt: chapters.length,
        ts: chapters.reduce((sum, ch) => sum + ch.st.ts, 0),
        aspt: chapters.length > 0 ? (chapters.reduce((sum, ch) => sum + ch.st.ts, 0) / chapters.length).toFixed(1) : 0
      },
      nav: {
        prev: partNum > 1 ? `part-${partNum - 1}` : null,
        next: partNum < 2 ? `part-${partNum + 1}` : null,
        pb: bookId
      },
      v: "1.0",
      lu: new Date().toISOString().split('T')[0]
    }
  };
  
  return indexData;
}

// Generate Likutay Moharan Part 2 (chapters 11-20 as sample)
function generateLikutayMoharanPart2() {
  const bookDir = path.join(CONFIG.apiMobileDir, 'likutay-moharan', 'part-2');
  const chapters = [];
  
  // Generate 10 sample chapters for part 2 (11-20)
  for (let i = 11; i <= 20; i++) {
    const chapter = generateSampleChapter('lm', i, '2');
    chapters.push(chapter);
    
    // Write chapter file
    const chapterPath = path.join(bookDir, `${i}.json`);
    fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
    
    // Also create torah-{i}.json for consistency
    const torahPath = path.join(bookDir, `torah-${i}.json`);
    fs.writeFileSync(torahPath, JSON.stringify(chapter, null, 2));
  }
  
  // Generate index.json for part 2
  const indexData = generateIndexJson('lm', 2, chapters);
  const indexPath = path.join(bookDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  console.log(`Generated Likutay Moharan Part 2 with ${chapters.length} chapters`);
  return chapters.length;
}

// Generate Sefer Hamidos sample chapters
function generateSeferHamidos() {
  const bookDir = path.join(CONFIG.apiMobileDir, 'sefer-hamidos');
  const chapters = [];
  
  // Generate 10 sample chapters for Sefer Hamidos
  for (let i = 1; i <= 10; i++) {
    const chapter = generateSampleChapter('sh', i, '1');
    chapter.t = `Character Trait ${i}`;
    chapter.ht = `מידה ${i}`;
    chapter.th = ["Character", "Ethics", "Trait"];
    chapter.kw = ["מִדָּה", "אֶתִיקָה", "אֹפִי"];
    chapters.push(chapter);
    
    // Write chapter file
    const chapterPath = path.join(bookDir, `${i}.json`);
    fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
  }
  
  // Generate index.json
  const indexData = generateIndexJson('sh', 1, chapters);
  const indexPath = path.join(bookDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  console.log(`Generated Sefer Hamidos with ${chapters.length} sample chapters`);
  return chapters.length;
}

// Generate Stories sample chapters
function generateStories() {
  const bookDir = path.join(CONFIG.apiMobileDir, 'stories');
  const chapters = [];
  
  // Generate 5 sample stories
  const storyTitles = [
    "The Lost Princess",
    "The Wise Man and the Simpleton", 
    "The Rabbi and the Only Son",
    "The Master of Prayer",
    "The Seven Beggars"
  ];
  
  const hebrewTitles = [
    "הנסיכה האבודה",
    "החכם והתם",
    "הרב והבן היחיד",
    "בעל התפילה",
    "שבעה הקבצנים"
  ];
  
  for (let i = 1; i <= 5; i++) {
    const chapter = generateSampleChapter('st', i, '1');
    chapter.t = storyTitles[i-1];
    chapter.ht = hebrewTitles[i-1];
    chapter.th = ["Story", "Allegory", "Teaching"];
    chapter.kw = ["סִיפּוּר", "מָשָׁל", "לִימּוּד"];
    chapters.push(chapter);
    
    // Write chapter file
    const chapterPath = path.join(bookDir, `${i}.json`);
    fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
  }
  
  // Generate index.json
  const indexData = generateIndexJson('st', 1, chapters);
  const indexPath = path.join(bookDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  console.log(`Generated Stories with ${chapters.length} sample stories`);
  return chapters.length;
}

// Update books.json with actual chapter counts
function updateChapterCounts(lmChapters, shChapters, stChapters) {
  const booksPath = path.join(CONFIG.apiMobileDir, 'books.json');
  const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
  
  // Update chapter counts
  const updatedBooks = books.map(book => {
    if (book.id === 'likutay-moharan') {
      return { ...book, chapters: 20 }; // 10 from part 1 + 10 from part 2
    }
    if (book.id === 'sefer-hamidos') {
      return { ...book, chapters: shChapters };
    }
    if (book.id === 'stories') {
      return { ...book, chapters: stChapters };
    }
    if (book.id === 'likutay-eitzos') {
      return { ...book, chapters: 0 }; // To be implemented
    }
    if (book.id === 'sichos-haran') {
      return { ...book, chapters: 0 }; // To be implemented
    }
    return book;
  });
  
  fs.writeFileSync(booksPath, JSON.stringify(updatedBooks, null, 2));
  console.log('Updated books.json with chapter counts');
}

// Generate search index for mobile API
function generateSearchIndex() {
  const searchIndex = {
    si: {
      v: "1.0",
      lu: new Date().toISOString().split('T')[0],
      td: 0, // Will be calculated
      cat: ["rabbainu"],
      f: ["t", "ht", "th", "kw", "sum"],
      d: []
    },
    sc: {
      fm: true,
      mql: 2,
      mr: 50,
      hf: ["t", "sum"],
      w: {
        t: 10,
        ht: 8,
        th: 3,
        kw: 2,
        sum: 1
      }
    },
    docs: []
  };
  
  // This would need to be populated by reading all chapter files
  // For now, we'll create a placeholder
  
  const searchIndexPath = path.join(CONFIG.apiMobileDir, 'search-index.json');
  fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2));
  console.log('Generated placeholder search-index.json');
}

// Main function
async function main() {
  console.log('Starting Mobile API Expansion...');
  
  try {
    // 1. Ensure directories exist
    ensureDirectories();
    
    // 2. Update books.json with new books
    updateBooksJson();
    
    // 3. Generate content for each book
    const lmChapters = generateLikutayMoharanPart2();
    const shChapters = generateSeferHamidos();
    const stChapters = generateStories();
    
    // 4. Update chapter counts in books.json
    updateChapterCounts(lmChapters, shChapters, stChapters);
    
    // 5. Generate search index
    generateSearchIndex();
    
    // 6. Create API documentation
    createApiDocumentation();
    
    console.log('\n✅ Mobile API expansion completed successfully!');
    console.log(`📚 Added/Updated books: ${CONFIG.books.length}`);
    console.log(`📖 Total chapters generated: ${lmChapters + shChapters + stChapters}`);
    
  } catch (error) {
    console.error('❌ Error generating mobile API:', error);
    process.exit(1);
  }
}

// Create API documentation
function createApiDocumentation() {
  const docs = `# Mobile API Documentation

## Overview
The ajew.org Mobile API provides structured access to Breslov teachings in a mobile-friendly format.

## Base URL
\`https://ajew.org/public/api-mobile/\`

## Endpoints

### 1. Books List
\`GET /books.json\`
Returns a list of available books with metadata.

### 2. Book Content
\`GET /{book-id}/{part}/index.json\`
Returns the index of a book part with chapter listings.

\`GET /{book-id}/{part}/{chapter-number}.json\`
Returns a specific chapter.

### 3. Daily Wisdom
\`GET /daily-wisdom.json\`
Returns a daily teaching for reflection.

### 4. Search
\`GET /search-index.json\`
Returns search index data for client-side search.

## Available Books

1. **likutay-moharan** - Likutey Moharan (Rabbi Nachman's primary work)
   - Part 1: Chapters 1-10
   - Part 2: Chapters 11-20 (sample)

2. **sefer-hamidos** - Sefer Hamidos (Book of Character Traits)
   - Part 1: Chapters 1-10 (sample)

3. **stories** - Stories of Rabbi Nachman
   - Part 1: 5 sample stories

4. **likutay-eitzos** - Likutey Eitzos (Compiled Advice)
   - Coming soon

5. **sichos-haran** - Sichos Haran (Conversations)
   - Coming soon

## Response Format

### Book Chapter Example:
\`\`\`json
{
  "id": "torah-1",
  "n": 1,
  "t": "Ashrei Temimei Darech",
  "ht": "אשרי תמימי דרך",
  "b": "lm",
  "p": "1",
  "kv": "Psalms 119:1",
  "hkv": "אַשְׁרֵי תְמִימֵי דָרֶךְ הַהֹלְכִים בְּתוֹרַת ה'",
  "tr": "Happy are those whose way is perfect...",
  "d": "1802",
  "l": "Breslov",
  "o": "Rosh Hashanah",
  "th": ["Torah", "Grace", "Prayer"],
  "kw": ["חֵן", "תּוֹרָה", "תְּפִלָּה"],
  "s": [
    {
      "