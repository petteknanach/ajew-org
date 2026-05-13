#!/usr/bin/env node

/**
 * Simple Mobile API Generator for ajew.org
 * Expands the mobile API with more books and chapters
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_MOBILE_DIR = path.join(__dirname, 'public', 'api-mobile');

// Ensure directories exist
function ensureDirectories() {
  const dirs = [
    path.join(API_MOBILE_DIR, 'likutay-moharan', 'part-2'),
    path.join(API_MOBILE_DIR, 'sefer-hamidos'),
    path.join(API_MOBILE_DIR, 'stories'),
    path.join(API_MOBILE_DIR, 'likutay-eitzos'),
    path.join(API_MOBILE_DIR, 'sichos-haran')
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
  const booksPath = path.join(API_MOBILE_DIR, 'books.json');
  
  const books = [
    {
      id: 'likutay-moharan',
      title: 'Likutey Moharan',
      hebrewTitle: 'לקוטי מוהר"ן',
      author: 'Rabbi Nachman of Breslov',
      chapters: 20, // 10 from part 1 + 10 from part 2
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
      chapters: 10,
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
      chapters: 5,
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
      chapters: 0,
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
      chapters: 0,
      description: 'Conversations and teachings of Rabbi Nachman.',
      color: '#1abc9c',
      parts: 1,
      totalChapters: 30
    }
  ];
  
  fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
  console.log(`Updated books.json with ${books.length} books`);
}

// Generate sample chapter
function generateSampleChapter(bookId, chapterNum, part = '1', title = '', hebrewTitle = '') {
  const defaultTitles = {
    'lm': { t: `Teaching ${chapterNum}`, ht: `תורה ${chapterNum}` },
    'sh': { t: `Character Trait ${chapterNum}`, ht: `מידה ${chapterNum}` },
    'st': { t: `Story ${chapterNum}`, ht: `סיפור ${chapterNum}` }
  };
  
  const bookKey = bookId === 'likutay-moharan' ? 'lm' : 
                  bookId === 'sefer-hamidos' ? 'sh' : 'st';
  
  const finalTitle = title || defaultTitles[bookKey]?.t || `Chapter ${chapterNum}`;
  const finalHebrewTitle = hebrewTitle || defaultTitles[bookKey]?.ht || `פרק ${chapterNum}`;
  
  return {
    id: `torah-${chapterNum}`,
    n: chapterNum,
    t: finalTitle,
    ht: finalHebrewTitle,
    b: bookKey,
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
}

// Generate Likutay Moharan Part 2
function generateLikutayMoharanPart2() {
  const bookDir = path.join(API_MOBILE_DIR, 'likutay-moharan', 'part-2');
  const chapters = [];
  
  // Sample titles for chapters 11-20
  const chapterTitles = [
    { t: "I Am Hashem", ht: "אני ה'" },
    { t: "The Power of Speech", ht: "כח הדיבור" },
    { t: "Guard Your Tongue", ht: "שמור לשונך" },
    { t: "The Tzaddik's Light", ht: "אור הצדיק" },
    { t: "Faith and Trust", ht: "אמונה ובטחון" },
    { t: "The Importance of Joy", ht: "חשיבות השמחה" },
    { t: "Personal Prayer", ht: "תפילה אישית" },
    { t: "Torah Study", ht: "לימוד תורה" },
    { t: "Character Refinement", ht: "עידון המידות" },
    { t: "Divine Providence", ht: "השגחה פרטית" }
  ];
  
  for (let i = 11; i <= 20; i++) {
    const titleIndex = i - 11;
    const chapter = generateSampleChapter('lm', i, '2', 
      chapterTitles[titleIndex]?.t, 
      chapterTitles[titleIndex]?.ht);
    chapters.push(chapter);
    
    // Write chapter files
    const chapterPath = path.join(bookDir, `${i}.json`);
    fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
    
    const torahPath = path.join(bookDir, `torah-${i}.json`);
    fs.writeFileSync(torahPath, JSON.stringify(chapter, null, 2));
  }
  
  // Generate index.json
  const indexData = {
    part: {
      id: "part-2",
      b: "lm",
      t: "Likutay Moharan Part 2",
      ht: "ליקוטי מוהר\"ן חלק ב",
      tr: "11-20",
      y: "1806-1810",
      d: "The second part of Likutay Moharan contains teachings delivered by Rabbi Nachman between 1806-1810.",
      c: chapters.map(ch => ({
        id: ch.id,
        n: ch.n,
        t: ch.t,
        ht: ch.ht,
        kv: ch.kv,
        th: ch.th,
        s: ch.st.ts,
        prev: ch.nav.prev,
        next: ch.nav.next
      })),
      stats: {
        tt: chapters.length,
        ts: chapters.reduce((sum, ch) => sum + ch.st.ts, 0),
        aspt: (chapters.reduce((sum, ch) => sum + ch.st.ts, 0) / chapters.length).toFixed(1)
      },
      nav: {
        prev: "part-1",
        next: null,
        pb: "lm"
      },
      v: "1.0",
      lu: new Date().toISOString().split('T')[0]
    }
  };
  
  const indexPath = path.join(bookDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  console.log(`Generated Likutay Moharan Part 2 with ${chapters.length} chapters`);
  return chapters.length;
}

// Generate Sefer Hamidos
function generateSeferHamidos() {
  const bookDir = path.join(API_MOBILE_DIR, 'sefer-hamidos');
  const chapters = [];
  
  // Sample character traits
  const traits = [
    { t: "Humility", ht: "ענוה" },
    { t: "Patience", ht: "סבלנות" },
    { t: "Kindness", ht: "חסד" },
    { t: "Truth", ht: "אמת" },
    { t: "Faith", ht: "אמונה" },
    { t: "Joy", ht: "שמחה" },
    { t: "Gratitude", ht: "הכרת הטוב" },
    { t: "Love", ht: "אהבה" },
    { t: "Fear of Heaven", ht: "יראת שמים" },
    { t: "Diligence", ht: "זריזות" }
  ];
  
  for (let i = 1; i <= 10; i++) {
    const chapter = generateSampleChapter('sh', i, '1', traits[i-1]?.t, traits[i-1]?.ht);
    chapter.th = ["Character", "Ethics", "Trait"];
    chapter.kw = ["מִדָּה", "אֶתִיקָה", "אֹפִי"];
    chapters.push(chapter);
    
    const chapterPath = path.join(bookDir, `${i}.json`);
    fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
  }
  
  // Generate index.json
  const indexData = {
    part: {
      id: "part-1",
      b: "sh",
      t: "Sefer Hamidos",
      ht: "ספר המידות",
      tr: "1-10",
      y: "1803",
      d: "A book of character traits and ethical teachings by Rabbi Nachman of Breslov.",
      c: chapters.map(ch => ({
        id: ch.id,
        n: ch.n,
        t: ch.t,
        ht: ch.ht,
        kv: ch.kv,
        th: ch.th,
        s: ch.st.ts,
        prev: ch.nav.prev,
        next: ch.nav.next
      })),
      stats: {
        tt: chapters.length,
        ts: chapters.reduce((sum, ch) => sum + ch.st.ts, 0),
        aspt: (chapters.reduce((sum, ch) => sum + ch.st.ts, 0) / chapters.length).toFixed(1)
      },
      nav: {
        prev: null,
        next: null,
        pb: "sh"
      },
      v: "1.0",
      lu: new Date().toISOString().split('T')[0]
    }
  };
  
  const indexPath = path.join(bookDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  console.log(`Generated Sefer Hamidos with ${chapters.length} chapters`);
  return chapters.length;
}

// Generate Stories
function generateStories() {
  const bookDir = path.join(API_MOBILE_DIR, 'stories');
  const chapters = [];
  
  // Sample stories
  const stories = [
    { t: "The Lost Princess", ht: "הנסיכה האבודה" },
    { t: "The Wise Man and the Simpleton", ht: "החכם והתם" },
    { t: "The Rabbi and the Only Son", ht: "הרב והבן היחיד" },
    { t: "The Master of Prayer", ht: "בעל התפילה" },
    { t: "The Seven Beggars", ht: "שבעה הקבצנים" }
  ];
  
  for (let i = 1; i <= 5; i++) {
    const chapter = generateSampleChapter('st', i, '1', stories[i-1]?.t, stories[i-1]?.ht);
    chapter.th = ["Story", "Allegory", "Teaching"];
    chapter.kw = ["סִיפּוּר", "מָשָׁל", "לִימּוּד"];
    chapters.push(chapter);
    
    const chapterPath = path.join(bookDir, `${i}.json`);
    fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
  }
  
  // Generate index.json
  const indexData = {
    part: {
      id: "part-1",
      b: "st",
      t: "Stories of Rabbi Nachman",
      ht: "סיפורי מעשיות",
      tr: "1-5",
      y: "1810-1811",
      d: "Thirteen mystical stories with deep spiritual meanings told by Rabbi Nachman.",
      c: chapters.map(ch => ({
        id: ch.id,
        n: ch.n,
        t: ch.t,
        ht: ch.ht,
        kv: ch.kv,
        th: ch.th,
        s: ch.st.ts,
        prev: ch.nav.prev,
        next: ch.nav.next
      })),
      stats: {
        tt: chapters.length,
        ts: chapters.reduce((sum, ch) => sum + ch.st.ts, 0),
        aspt: (chapters.reduce((sum, ch) => sum + ch.st.ts, 0) / chapters.length).toFixed(1)
      },
      nav: {
        prev: null,
        next: null,
        pb: "st"
      },
      v: "1.0",
      lu: new Date().toISOString().split('T')[0]
    }
  };
  
  const indexPath = path.join(bookDir, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
  
  console.log(`Generated Stories with ${chapters.length} stories`);
  return chapters.length;
}

// Generate search index
function generateSearchIndex() {
  const searchIndex = {
    si: {
      v: "1.0",
      lu: new Date().toISOString().split('T')[0],
      td: 35, // 20 LM + 10 SH + 5 Stories
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
  
  // Note: In a full implementation, we would read all chapter files
  // and populate the docs array with searchable content
  
  const searchIndexPath = path.join(API_MOBILE_DIR, 'search-index.json');
  fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2));
  console.log('Generated search-index.json');
}

// Create simple API documentation
function createApiDocumentation() {
  const docs = `# Mobile API Documentation

## Base URL
\`/public/api-mobile/\`

## Available Books
1. Likutey Moharan (20 chapters)
2. Sefer Hamidos (10 chapters)  
3. Stories of Rabbi Nachman (5 stories)
4. Likutey Eitzos (coming soon)
5. Sichos Haran (coming soon)

## Sample Endpoints
- \`/books.json\` - List all books
- \`/likutay-moharan/part-1/1.json\` - Chapter 1 of Likutey Moharan
- \`/daily-wisdom.json\` - Daily teaching
- \`/search-index.json\` - Search index

## Response Format
Chapters include: title (English/Hebrew), key verse, themes, keywords, sections with summaries.`;
  
  const docsPath = path.join(API_MOBILE_DIR, 'API_DOCUMENTATION.md');
  fs.writeFileSync(docsPath, docs);
  console.log('Created API_DOCUMENTATION.md');
}

// Update daily wisdom
function updateDailyWisdom() {
  const dailyWisdom = {
    date: new Date().toISOString().split('T')[0],
    teaching: {
      id: "torah-11",
      book: "likutay-moharan",
      part: "part-2",
      title: "I Am Hashem",
      hebrewTitle: "אני ה'",
      keyVerse: "Isaiah 42:8",
      reflection: "How can we recognize God's presence in our daily lives?"
    },
    quote: "I am Hashem, that is My name, and My glory I will not give to another.",
    hebrewQuote: "אֲנִי ה' הוּא שְׁמִי וּכְבוֹדִי לְאַחֵר לֹא אֶתֵּן"
  };
  
  const dailyPath = path.join(API_MOBILE_DIR, 'daily-wisdom.json');
  fs.writeFileSync(dailyPath, JSON.stringify(dailyWisdom, null, 2));
  console.log('Updated daily-wisdom.json');
}

// Main function
function main() {
  console.log('Starting Mobile API Expansion...\n');
  
  try {
    // 1. Ensure directories exist
    ensureDirectories();
    
    // 2. Generate content
    const lmChapters = generateLikutayMoharanPart2();
    const shChapters = generateSeferHamidos();
    const stChapters = generateStories();
    
    // 3. Update books.json
    updateBooksJson();
    
    // 4. Generate search index
    generateSearchIndex();
    
    // 5. Update daily wisdom
    updateDailyWisdom();
    
    // 6. Create documentation
    createApiDocumentation();
    
    console.log('\n✅ Mobile API expansion completed successfully!');
    console.log(`📚 Books added/updated: 5`);
    console.log(`📖 Total chapters generated: ${lmChapters + shChapters + stChapters}`);
    console.log(`📁 Check: ${API_MOBILE_DIR}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}