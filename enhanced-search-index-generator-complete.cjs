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
  hebrewTorahsDir: path.join(__dirname, '..', 'hebrew_torahs_simple'),
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
      tags: ['torah', 'teachings'],
      wordCount: content.split(/\s+/).length,
      charCount: content.length,
      timestamp: new Date().toISOString(),
      bookId: 'likutay-moharan',
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
      
      const document = {
        id: `book_${categoryDir}_${fileName}`,
        type: 'book',
        title: bookName,
        englishTitle: bookName,
        author: 'Various Breslov Authors',
        category: 'Books',
        subcategory: categoryDir,
        language: language,
        content: content,
        normalizedContent: content,
        path: `/books/read?category=${encodeURIComponent(categoryDir)}&book=${encodeURIComponent(textFile)}`,
        tags: ['book', categoryDir.toLowerCase()],
        wordCount: content.split(/\s+/).length,
        charCount: content.length,
        timestamp: new Date().toISOString(),
        bookId: categoryDir,
        chapter: 1,
        section: 1
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
    const torahDocs = loadHebrewTorahs();
    const bookDocs = loadBooks();
    const allDocuments = [...torahDocs, ...bookDocs];
    
    console.log(`\nTotal documents to index: ${allDocuments.length}`);
    console.log(`- Torah teachings: ${torahDocs.length}`);
    console.log(`- Books: ${bookDocs.length}`);
    
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