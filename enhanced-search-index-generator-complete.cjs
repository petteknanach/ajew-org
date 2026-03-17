#!/usr/bin/env node

/**
 * Complete Enhanced Search Index Generator for ajew.org
 * 
 * This script generates a search index for:
 * 1. Hebrew Torah teachings (from hebrew_torahs_simple)
 * 2. Hebrew/English books (from public/books/MyBooks)
 */

const fs = require('fs');
const path = require('path');
const lunr = require('lunr');
require('lunr-languages/lunr.stemmer.support')(lunr);
require('lunr-languages/lunr.multi')(lunr);
require('lunr-languages/lunr.he')(lunr);

// Configuration
const CONFIG = {
  // Input directories
  hebrewTorahsDir: path.join(__dirname, 'hebrew_torahs_simple'),
  booksDir: path.join(__dirname, 'public', 'books', 'MyBooks'),
  
  // Output files
  outputDir: path.join(__dirname, 'public', 'data'),
  indexFile: 'enhanced-search-index.json',
  statsFile: 'search-stats.json',
  metadataFile: 'search-metadata.json',
  
  // Search configuration
  maxResults: 1000,
  snippetLength: 200
};

// Book mapping for advanced search
// Maps AdvancedSearchOptions book IDs to actual book data patterns
const BOOK_MAPPING = {
  // Likutay Nanach volumes - map to actual Likutey Moharan
  'likutay-nanach-1': { 
    searchableBookId: 'likutay-moharan',
    category: 'Rabbainu', 
    subcategory: 'Likutey Moharan Part 1' 
  },
  'likutay-nanach-2': { 
    searchableBookId: 'likutay-moharan',
    category: 'Rabbainu', 
    subcategory: 'Likutey Moharan Part 2' 
  },
  'likutay-nanach-3': { 
    searchableBookId: 'likutay-moharan',
    category: 'Rabbainu', 
    subcategory: 'Likutey Moharan Part 1' // Fallback
  },
  'likutay-nanach-4': { 
    searchableBookId: 'likutay-moharan',
    category: 'Rabbainu', 
    subcategory: 'Likutey Moharan Part 2' // Fallback
  },
  'likutay-nanach-5': { 
    searchableBookId: 'likutay-moharan',
    category: 'Rabbainu', 
    subcategory: 'Likutey Moharan Part 1' // Fallback
  },
  
  // Other Breslov collections - map to actual categories
  'likutay-aitzos': { 
    searchableBookId: 'sefer-hamidos',
    category: 'Books', 
    subcategory: '1_ספרי רבי נחמן' // Likutey Aitzos is in ספרי רבי נחמן
  },
  'likutay-tefilos': { 
    searchableBookId: 'likutay-moharan', // Likutey Tefilos is part of Likutey Moharan
    category: 'Rabbainu', 
    subcategory: 'Likutey Moharan Part 1' 
  },
  'blossoms-of-the-spring': { 
    searchableBookId: '92_ספרים-מתורגמים', // Translated books
    category: 'Books', 
    subcategory: '92_ספרים מתורגמים' 
  },
  'fires-of-israel': { 
    searchableBookId: '92_ספרים-מתורגמים', // Translated books
    category: 'Books', 
    subcategory: '92_ספרים מתורגמים' 
  }
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Load Hebrew Torah teachings
function loadHebrewTorahs() {
  console.log('Loading Hebrew Torah teachings...');
  
  if (!fs.existsSync(CONFIG.hebrewTorahsDir)) {
    console.log(`Warning: Hebrew Torahs directory not found: ${CONFIG.hebrewTorahsDir}`);
    return [];
  }
  
  const files = fs.readdirSync(CONFIG.hebrewTorahsDir)
    .filter(f => f.endsWith('.txt'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });
  
  console.log(`Found ${files.length} Hebrew Torah files`);
  
  const documents = [];
  
  for (const file of files) {
    const filePath = path.join(CONFIG.hebrewTorahsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract Torah number from filename
    const torahNum = file.match(/\d+/)?.[0] || '0';
    
    const document = {
      id: `torah_${torahNum}`,
      type: 'torah',
      title: `תורה ${torahNum}`,
      englishTitle: `Torah ${torahNum}`,
      author: 'Rabbi Nachman of Breslov',
      category: 'Rabbainu',
      subcategory: 'Torah Teachings',
      language: 'hebrew',
      content: content,
      normalizedContent: content,
      path: `/teachings/torah-${torahNum}`,
      tags: ['torah', 'teachings', 'likutay-moharan'],
      wordCount: content.split(/\s+/).length,
      charCount: content.length,
      timestamp: new Date().toISOString(),
      bookId: 'likutay-moharan',
      searchableBookId: 'likutay-moharan',
      chapter: parseInt(torahNum),
      section: 1
    };
    
    documents.push(document);
    
    // Show progress
    if (documents.length % 50 === 0) {
      console.log(`  Processed ${documents.length} Torah files...`);
    }
  }
  
  return documents;
}

// Load books from MyBooks directory
function loadBooks() {
  console.log('Loading books from MyBooks directory...');
  
  if (!fs.existsSync(CONFIG.booksDir)) {
    console.log(`Warning: Books directory not found: ${CONFIG.booksDir}`);
    return [];
  }
  
  const documents = [];
  
  // Get all category directories
  const categoryDirs = fs.readdirSync(CONFIG.booksDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  console.log(`Found ${categoryDirs.length} book categories`);
  
  let bookCount = 0;
  
  for (const categoryDir of categoryDirs) {
    const categoryPath = path.join(CONFIG.booksDir, categoryDir);
    
    // Get text files in this category
    const textFiles = fs.readdirSync(categoryPath)
      .filter(f => f.endsWith('.txt'))
      .sort();
    
    for (const textFile of textFiles) {
      const filePath = path.join(categoryPath, textFile);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract book name from filename (remove .txt and numbers)
      const fileName = path.basename(textFile, '.txt');
      const bookName = fileName.replace(/^\d+_/, '').replace(/_/g, ' ');
      
      // Determine language (check if content is mostly Hebrew)
      const hebrewChars = (content.match(/[\u0590-\u05FF]/g) || []).length;
      const totalChars = content.length;
      const language = hebrewChars > totalChars * 0.3 ? 'hebrew' : 'english';
      
      // Map category to bookId for advanced search
      let bookId = categoryDir.toLowerCase().replace(/\s+/g, '-');
      let mappedCategory = 'Books';
      let mappedSubcategory = categoryDir;
      
      // Try to find matching book in mapping
      for (const [mappedId, mapping] of Object.entries(BOOK_MAPPING)) {
        if (categoryDir.toLowerCase().includes(mapping.subcategory.toLowerCase().replace(/\s+/g, '-'))) {
          bookId = mappedId;
          mappedCategory = mapping.category;
          mappedSubcategory = mapping.subcategory;
          break;
        }
      }
      
      // Also check for volume numbers in Likutay Nanach
      if (categoryDir.toLowerCase().includes('likutay') && categoryDir.toLowerCase().includes('nanach')) {
        const volumeMatch = fileName.match(/volume[\s\-]*(\d+)/i) || textFile.match(/\b(\d+)\b/);
        if (volumeMatch) {
          const volumeNum = volumeMatch[1];
          bookId = `likutay-nanach-${volumeNum}`;
          mappedCategory = 'Likutay Nanach';
          mappedSubcategory = `Volume ${volumeNum}`;
        }
      }
      
      const document = {
        id: `book_${categoryDir}_${fileName}`,
        type: 'book',
        title: bookName,
        englishTitle: bookName,
        author: 'Various Breslov Authors',
        category: mappedCategory,
        subcategory: mappedSubcategory,
        language: language,
        content: content,
        normalizedContent: content,
        path: `/books/read?category=${encodeURIComponent(categoryDir)}&book=${encodeURIComponent(textFile)}`,
        tags: ['book', categoryDir.toLowerCase(), bookId],
        wordCount: content.split(/\s+/).length,
        charCount: content.length,
        timestamp: new Date().toISOString(),
        bookId: bookId,
        chapter: 1,
        section: 1,
        searchableBookId: bookId // For advanced search filtering
      };
      
      documents.push(document);
      bookCount++;
      
      // Show progress
      if (bookCount % 20 === 0) {
        console.log(`  Processed ${bookCount} book files...`);
      }
    }
  }
  
  console.log(`Total books loaded: ${bookCount}`);
  return documents;
}



// Load Likutay Nanach content
function loadLikutayNanach() {
  console.log('Loading Likutay Nanach...');
  
  const nanachDir = path.join(__dirname, 'public', 'books', 'likutay-nanach');
  
  if (!fs.existsSync(nanachDir)) {
    console.log(`Warning: Likutay Nanach directory not found: ${nanachDir}`);
    return [];
  }
  
  const documents = [];
  
  // Check for volume directories (volume-3, volume-4, etc.)
  const volumeDirs = fs.readdirSync(nanachDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('volume-'))
    .map(dirent => dirent.name);
  
  console.log(`Found ${volumeDirs.length} Likutay Nanach volumes`);
  
  for (const volumeDir of volumeDirs) {
    const volumePath = path.join(nanachDir, volumeDir);
    const volumeNum = volumeDir.replace('volume-', '');
    
    // Load metadata.json for chapters
    const metadataPath = path.join(volumePath, 'metadata.json');
    
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const chapters = metadata.chapters || [];
        
        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i];
          const content = chapter.content || '';
          
          if (!content.trim()) continue;
          
          const document = {
            id: `likutay-nanach-${volumeNum}-${i + 1}`,
            type: 'book',
            title: chapter.title || `כרך ${volumeNum} פרק ${i + 1}`,
            englishTitle: `Likutay Nanach Volume ${volumeNum} Chapter ${i + 1}`,
            author: 'Breslov Chassidim',
            category: 'Likutay Nanach',
            subcategory: `Volume ${volumeNum}`,
            language: 'hebrew',
            content: content,
            normalizedContent: content,
            path: `/books/likutay-nanach/volume-${volumeNum}/chapter-${i + 1}`,
            tags: ['likutay-nanach', 'nanach', 'breslov', `volume-${volumeNum}`],
            wordCount: content.split(/\s+/).length,
            charCount: content.length,
            timestamp: new Date().toISOString(),
            bookId: `likutay-nanach-${volumeNum}`,
            searchableBookId: `likutay-nanach-${volumeNum}`,
            chapter: i + 1,
            section: 1
          };
          
          documents.push(document);
        }
        
        console.log(`  Loaded ${chapters.length} chapters from ${volumeDir}`);
      } catch (err) {
        console.log(`  Error loading ${metadataPath}: ${err.message}`);
      }
    }
  }
  
  // Also check for raw text files as fallback
  const rawFiles = fs.readdirSync(nanachDir)
    .filter(f => f.endsWith('-raw.txt'));
  
  for (const rawFile of rawFiles) {
    const volumeMatch = rawFile.match(/volume-(\w+)-raw\.txt/);
    if (!volumeMatch) continue;
    
    const volumeNum = volumeMatch[1];
    // Skip if we already loaded from metadata
    const existingDocs = documents.filter(d => d.bookId === `likutay-nanach-${volumeNum}`);
    if (existingDocs.length > 0) continue;
    
    const filePath = path.join(nanachDir, rawFile);
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.trim()) continue;
    
    const document = {
      id: `likutay-nanach-${volumeNum}-raw`,
      type: 'book',
      title: `לקוטי ננח כרך ${volumeNum}`,
      englishTitle: `Likutay Nanach Volume ${volumeNum}`,
      author: 'Breslov Chassidim',
      category: 'Likutay Nanach',
      subcategory: `Volume ${volumeNum}`,
      language: 'hebrew',
      content: content,
      normalizedContent: content,
      path: `/books/likutay-nanach/volume-${volumeNum}`,
      tags: ['likutay-nanach', 'nanach', 'breslov', `volume-${volumeNum}`],
      wordCount: content.split(/\s+/).length,
      charCount: content.length,
      timestamp: new Date().toISOString(),
      bookId: `likutay-nanach-${volumeNum}`,
      searchableBookId: `likutay-nanach-${volumeNum}`,
      chapter: 1,
      section: 1
    };
    
    documents.push(document);
    console.log(`  Loaded raw text from ${rawFile}`);
  }
  
  console.log(`Total Likutay Nanach documents: ${documents.length}`);
  return documents;
}

// Load mobile API content
function loadMobileApiContent() {
  console.log('Loading mobile API content...');
  
  const mobileApiDir = path.join(__dirname, 'public', 'api-mobile');
  const documents = [];
  
  // Load Likutay Moharan
  const lmPart1Dir = path.join(mobileApiDir, 'likutay-moharan', 'part-1');
  const lmPart2Dir = path.join(mobileApiDir, 'likutay-moharan', 'part-2');
  
  // Load Sefer Hamidos
  const shDir = path.join(mobileApiDir, 'sefer-hamidos');
  
  // Load Stories
  const storiesDir = path.join(mobileApiDir, 'stories');
  
  // Function to load chapters from a directory
  function loadChaptersFromDir(dirPath, bookId, bookTitle, type = 'torah') {
    if (!fs.existsSync(dirPath)) {
      console.log(`Warning: Directory not found: ${dirPath}`);
      return [];
    }
    
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.json') && !f.includes('index') && !f.includes('torah-'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
      });
    
    const chapters = [];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const chapterData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Create search document from chapter data
      const document = {
        id: `mobile-${bookId}-${chapterData.n}`,
        type: 'mobile-api',
        title: chapterData.t,
        englishTitle: chapterData.t,
        author: 'Rabbi Nachman of Breslov',
        category: 'Rabbainu',
        subcategory: bookTitle,
        language: 'hebrew',
        content: chapterData.s?.map(s => s.sum).join(' ') || chapterData.t,
        normalizedContent: chapterData.ht + ' ' + (chapterData.s?.map(s => s.sum).join(' ') || ''),
        path: `/api-mobile/${bookId}/${file}`,
        tags: chapterData.th || [],
        keywords: chapterData.kw || [],
        wordCount: (chapterData.s?.map(s => s.sum).join(' ') || '').split(/\s+/).length,
        charCount: (chapterData.s?.map(s => s.sum).join(' ') || '').length,
        timestamp: chapterData.lu || new Date().toISOString(),
        bookId: bookId,
        chapter: chapterData.n,
        section: 1,
        searchableBookId: bookId,
        source: 'mobile-api'
      };
      
      chapters.push(document);
    }
    
    console.log(`  Loaded ${chapters.length} chapters from ${bookId}`);
    return chapters;
  }
  
  // Load all books
  const lmPart1Chapters = loadChaptersFromDir(lmPart1Dir, 'likutay-moharan', 'Likutey Moharan Part 1');
  const lmPart2Chapters = loadChaptersFromDir(lmPart2Dir, 'likutay-moharan', 'Likutey Moharan Part 2');
  const shChapters = loadChaptersFromDir(shDir, 'sefer-hamidos', 'Sefer Hamidos');
  const storiesChapters = loadChaptersFromDir(storiesDir, 'stories', 'Stories of Rabbi Nachman');
  
  // Combine all chapters
  const allChapters = [...lmPart1Chapters, ...lmPart2Chapters, ...shChapters, ...storiesChapters];
  
  console.log(`Total mobile API chapters loaded: ${allChapters.length}`);
  return allChapters;
}
// Build search index
function buildSearchIndex(documents) {
  console.log('Building search index...');
  
  // Create Lunr index with Hebrew support
  const idx = lunr(function() {
    this.use(lunr.he);
    this.ref('id');
    
    // Define fields with weights
    this.field('title', { boost: 10 });
    this.field('englishTitle', { boost: 8 });
    this.field('content', { boost: 1 });
    this.field('author', { boost: 5 });
    this.field('category', { boost: 3 });
    this.field('tags', { boost: 2 });
    this.field('searchableBookId', { boost: 1 });
    
    // Add documents
    documents.forEach(doc => {
      this.add(doc);
    });
  });
  
  // Create document store
  const documentStore = {};
  documents.forEach(doc => {
    documentStore[doc.id] = doc;
  });
  
  return {
    lunrIndex: idx.toJSON(),
    documents: documentStore,
    metadata: {
      totalDocuments: documents.length,
      generatedAt: new Date().toISOString(),
      languages: ['hebrew', 'english'],
      categories: ['Rabbainu', 'Books'],
      books: ['likutay-moharan', 'various']
    }
  };
}

// Generate statistics
function generateStats(documents, searchIndex) {
  console.log('Generating statistics...');
  
  const stats = {
    totalDocuments: documents.length,
    totalWords: documents.reduce((sum, doc) => sum + doc.wordCount, 0),
    totalChars: documents.reduce((sum, doc) => sum + doc.charCount, 0),
    byCategory: {},
    byLanguage: {},
    byType: {},
    generatedAt: new Date().toISOString(),
    processingTime: new Date().toISOString()
  };
  
  // Count by category
  documents.forEach(doc => {
    stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
    stats.byLanguage[doc.language] = (stats.byLanguage[doc.language] || 0) + 1;
    stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1;
  });
  
  return stats;
}

// Generate lightweight metadata
function generateMetadata(documents) {
  const metadata = documents.map(doc => ({
    id: doc.id,
    type: doc.type,
    title: doc.title,
    englishTitle: doc.englishTitle,
    author: doc.author,
    category: doc.category,
    language: doc.language,
    path: doc.path,
    wordCount: doc.wordCount
  }));
  
  return metadata;
}

// Main function
async function main() {
  console.log('Starting complete enhanced search index generation...');
  console.log('===================================================\n');
  
  try {
    // Load all documents
  const hebrewTorahs = loadHebrewTorahs();
  const books = loadBooks();
  const likutayNanach = loadLikutayNanach();
  const mobileApiContent = loadMobileApiContent();
  
  // Combine all documents
  const allDocuments = [...hebrewTorahs, ...books, ...likutayNanach, ...mobileApiContent];
    
    console.log(`\nTotal documents to index: ${allDocuments.length}`);
    console.log(`- Torah teachings: ${hebrewTorahs.length}`);
    console.log(`- Books: ${books.length}`);
    console.log(`- Likutay Nanach: ${likutayNanach.length}`);
    console.log(`- Mobile API chapters: ${mobileApiContent.length}`);
    
    if (allDocuments.length === 0) {
      console.error('Error: No documents found to index!');
      process.exit(1);
    }
    
    // Build search index
    const searchIndex = buildSearchIndex(allDocuments);
    
    // Save search index
    const indexPath = path.join(CONFIG.outputDir, CONFIG.indexFile);
    fs.writeFileSync(indexPath, JSON.stringify(searchIndex, null, 2));
    console.log(`\nSearch index saved to: ${indexPath}`);
    console.log(`Index size: ${fs.statSync(indexPath).size} bytes`);
    
    // Generate and save statistics
    const stats = generateStats(allDocuments, searchIndex);
    const statsPath = path.join(CONFIG.outputDir, CONFIG.statsFile);
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`Stats saved to: ${statsPath}`);
    
    // Generate and save lightweight metadata
    const metadata = generateMetadata(allDocuments);
    const metadataPath = path.join(CONFIG.outputDir, CONFIG.metadataFile);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Lightweight metadata saved to: ${metadataPath}`);
    
    console.log('\n✅ Search index generation complete!');
    
  } catch (error) {
    console.error('Error generating search index:', error);
    process.exit(1);
  }
}

// Run main function
main();