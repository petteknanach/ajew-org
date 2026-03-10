#!/usr/bin/env node

/**
 * Enhanced Search Index Generator for ajew.org
 * 
 * This script generates a comprehensive search index for all Hebrew books
 * with advanced features and bilingual support.
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
  hebrewBooksDir: path.join(__dirname, '..', 'hebrew_torahs_simple'),
  teachingsDir: path.join(__dirname, 'teachings'),
  englishTranslationsDir: path.join(__dirname, '..', 'english_translations'),
  
  // Output files
  outputDir: path.join(__dirname, 'public', 'data'),
  indexFile: 'enhanced-search-index.json',
  statsFile: 'search-stats.json',
  
  // Search configuration
  maxResults: 1000,
  snippetLength: 200,
  
  // Field weights for relevance scoring
  fieldWeights: {
    title: 10,
    category: 5,
    subcategory: 3,
    author: 4,
    content: 1,
    tags: 2
  }
};

// Book metadata mapping
const BOOK_METADATA = {
  // Likutay Moharan (Vol 1)
  'likutay-moharan': {
    title: 'ליקוטי מוהר"ן',
    englishTitle: 'Likutay Moharan',
    author: 'Rabbi Nachman of Breslov',
    category: 'Rabbainu',
    subcategory: 'Torah Teachings',
    language: 'hebrew',
    type: 'book',
    tags: ['torah', 'teachings', 'kabbalah', 'chasidut']
  },
  
  // Likutay Moharan (Vol 2)
  'likutay-moharan-tinyana': {
    title: 'ליקוטי מוהר"ן תנינא',
    englishTitle: 'Likutay Moharan Tinyana',
    author: 'Rabbi Nachman of Breslov',
    category: 'Rabbainu',
    subcategory: 'Torah Teachings',
    language: 'hebrew',
    type: 'book',
    tags: ['torah', 'teachings', 'kabbalah', 'chasidut']
  },
  
  // Sippurei Maasiyos
  'sippurei-maasiyos': {
    title: 'סיפורי מעשיות',
    englishTitle: 'Story Tales',
    author: 'Rabbi Nachman of Breslov',
    category: 'Rabbainu',
    subcategory: 'Stories',
    language: 'hebrew',
    type: 'book',
    tags: ['stories', 'parables', 'wisdom']
  },
  
  // Sichos HaRan
  'sichos-haran': {
    title: 'שיחות הר"ן',
    englishTitle: 'Rabbi Nachman\'s Conversations',
    author: 'Rabbi Nachman of Breslov',
    category: 'Rabbainu',
    subcategory: 'Conversations',
    language: 'hebrew',
    type: 'book',
    tags: ['conversations', 'wisdom', 'advice']
  },
  
  // Sefer HaMiddos
  'sefer-hamiddos': {
    title: 'ספר המידות',
    englishTitle: 'Book of Attributes',
    author: 'Rabbi Nachman of Breslov',
    category: 'Rabbainu',
    subcategory: 'Character Traits',
    language: 'hebrew',
    type: 'book',
    tags: ['middos', 'character', 'ethics', 'musar']
  },
  
  // Likutey Eitzos
  'likutey-eitzos': {
    title: 'ליקוטי עצות',
    englishTitle: 'Collected Advice',
    author: 'Rabbi Natan of Breslov',
    category: 'Rabbi Nussun',
    subcategory: 'Practical Advice',
    language: 'hebrew',
    type: 'book',
    tags: ['advice', 'practical', 'guidance']
  },
  
  // Likutey Tefilos
  'likutey-tefilos': {
    title: 'ליקוטי תפילות',
    englishTitle: 'Collected Prayers',
    author: 'Rabbi Natan of Breslov',
    category: 'Rabbi Nussun',
    subcategory: 'Prayers',
    language: 'hebrew',
    type: 'book',
    tags: ['prayers', 'tefillos', 'devotion']
  },
  
  // Likutey Halachos
  'likutey-halachos': {
    title: 'ליקוטי הלכות',
    englishTitle: 'Collected Laws',
    author: 'Rabbi Natan of Breslov',
    category: 'Rabbi Nussun',
    subcategory: 'Halacha',
    language: 'hebrew',
    type: 'book',
    tags: ['halacha', 'laws', 'torah']
  },
  
  // Chayey Moharan
  'chayey-moharan': {
    title: 'חיי מוהר"ן',
    englishTitle: 'Life of Rabbi Nachman',
    author: 'Rabbi Natan of Breslov',
    category: 'Rabbi Nussun',
    subcategory: 'Biography',
    language: 'hebrew',
    type: 'book',
    tags: ['biography', 'life', 'stories']
  }
};

// Utility functions
function normalizeHebrew(text) {
  if (!text) return '';
  // Remove nikud and taamim
  return text
    .replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '')
    .toLowerCase();
}

function generateSnippet(content, query, length = CONFIG.snippetLength) {
  if (!content || !query) return '';
  
  const normalizedContent = normalizeHebrew(content);
  const normalizedQuery = normalizeHebrew(query);
  
  const index = normalizedContent.indexOf(normalizedQuery);
  if (index === -1) {
    return content.substring(0, length) + '...';
  }
  
  const start = Math.max(0, index - length / 2);
  const end = Math.min(content.length, index + normalizedQuery.length + length / 2);
  
  return (start > 0 ? '...' : '') + 
    content.substring(start, end).replace(/\n/g, ' ') + 
    (end < content.length ? '...' : '');
}

function extractMetadataFromPath(filePath) {
  const basename = path.basename(filePath, '.txt');
  const parts = basename.split('_');
  
  let bookId = 'unknown';
  let chapter = null;
  let section = null;
  
  if (parts.length >= 2) {
    bookId = parts[0];
    if (parts[1].match(/^\d+$/)) {
      chapter = parseInt(parts[1]);
      if (parts[2] && parts[2].match(/^\d+$/)) {
        section = parseInt(parts[2]);
      }
    }
  }
  
  return { bookId, chapter, section };
}

async function loadHebrewBooks() {
  console.log('Loading Hebrew books...');
  
  const documents = [];
  const stats = {
    totalBooks: 0,
    totalDocuments: 0,
    booksByCategory: {},
    wordsIndexed: 0
  };
  
  try {
    const files = fs.readdirSync(CONFIG.hebrewBooksDir);
    
    for (const file of files) {
      if (!file.endsWith('.txt')) continue;
      
      const filePath = path.join(CONFIG.hebrewBooksDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { bookId, chapter, section } = extractMetadataFromPath(file);
      
      // Get book metadata
      const bookMeta = BOOK_METADATA[bookId] || {
        title: `Book ${bookId}`,
        englishTitle: `Book ${bookId}`,
        author: 'Unknown',
        category: 'Unknown',
        subcategory: 'Unknown',
        language: 'hebrew',
        type: 'book',
        tags: []
      };
      
      // Create document ID
      const docId = `book_${bookId}_${chapter || '0'}_${section || '0'}`;
      
      // Create document
      const doc = {
        id: docId,
        type: 'book',
        title: bookMeta.title,
        englishTitle: bookMeta.englishTitle,
        author: bookMeta.author,
        category: bookMeta.category,
        subcategory: bookMeta.subcategory,
        language: 'hebrew',
        content: content,
        normalizedContent: normalizeHebrew(content),
        path: `/teachings/${bookId}/${chapter || 'index'}`,
        bookId: bookId,
        chapter: chapter,
        section: section,
        tags: bookMeta.tags,
        wordCount: content.split(/\s+/).length,
        charCount: content.length,
        timestamp: new Date().toISOString()
      };
      
      documents.push(doc);
      
      // Update stats
      stats.totalDocuments++;
      stats.wordsIndexed += doc.wordCount;
      
      if (!stats.booksByCategory[bookMeta.category]) {
        stats.booksByCategory[bookMeta.category] = 0;
      }
      stats.booksByCategory[bookMeta.category]++;
    }
    
    stats.totalBooks = Object.keys(BOOK_METADATA).length;
    
    console.log(`Loaded ${documents.length} Hebrew book documents`);
    console.log(`Words indexed: ${stats.wordsIndexed}`);
    
    return { documents, stats };
    
  } catch (error) {
    console.error('Error loading Hebrew books:', error);
    return { documents: [], stats };
  }
}

async function loadTeachings() {
  console.log('Loading teachings from ajew-org...');
  
  const documents = [];
  const stats = {
    totalTeachings: 0,
    teachingsByCategory: {}
  };
  
  try {
    // Walk through teachings directory
    function walkDir(dir, category = '') {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const newCategory = category ? `${category}/${item.name}` : item.name;
          walkDir(fullPath, newCategory);
        } else if (item.isFile() && item.name.endsWith('.html')) {
          // Read HTML file
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Extract title from HTML
          const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i) ||
                            content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const title = titleMatch ? titleMatch[1].trim() : path.basename(item.name, '.html');
          
          // Extract text content (strip HTML)
          const textContent = content
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Create relative path
          const relativePath = fullPath
            .replace(path.join(__dirname, 'ajew-org', 'teachings'), '')
            .replace(/\\/g, '/');
          
          const docId = `teaching_${relativePath.replace(/\//g, '_').replace(/\.html$/, '')}`;
          
          const doc = {
            id: docId,
            type: 'teaching',
            title: title,
            category: category || 'Teachings',
            subcategory: '',
            language: 'hebrew',
            content: textContent,
            normalizedContent: normalizeHebrew(textContent),
            path: `/teachings${relativePath}`,
            tags: ['teaching', 'lesson'],
            wordCount: textContent.split(/\s+/).length,
            charCount: textContent.length,
            timestamp: new Date().toISOString()
          };
          
          documents.push(doc);
          stats.totalTeachings++;
          
          if (!stats.teachingsByCategory[category]) {
            stats.teachingsByCategory[category] = 0;
          }
          stats.teachingsByCategory[category]++;
        }
      }
    }
    
    walkDir(CONFIG.teachingsDir);
    
    console.log(`Loaded ${documents.length} teaching documents`);
    
    return { documents, stats };
    
  } catch (error) {
    console.error('Error loading teachings:', error);
    return { documents: [], stats };
  }
}

function buildSearchIndex(allDocuments) {
  console.log('Building enhanced search index...');
  
  // Create Lunr index with Hebrew support
  const idx = lunr(function() {
    // Use Hebrew language support
    this.use(lunr.he);
    
    // Define fields with weights
    this.field('title', { boost: CONFIG.fieldWeights.title });
    this.field('englishTitle', { boost: CONFIG.fieldWeights.title * 0.8 });
    this.field('category', { boost: CONFIG.fieldWeights.category });
    this.field('subcategory', { boost: CONFIG.fieldWeights.subcategory });
    this.field('author', { boost: CONFIG.fieldWeights.author });
    this.field('content', { boost: CONFIG.fieldWeights.content });
    this.field('tags', { boost: CONFIG.fieldWeights.tags });
    this.field('normalizedContent'); // For Hebrew search
    
    // Add documents
    allDocuments.forEach(doc => {
      this.add({
        id: doc.id,
        title: doc.title,
        englishTitle: doc.englishTitle || '',
        category: doc.category,
        subcategory: doc.subcategory || '',
        author: doc.author || '',
        content: doc.content,
        normalizedContent: doc.normalizedContent,
        tags: doc.tags.join(' ')
      });
    });
  });
  
  // Create document store
  const documentStore = {};
  allDocuments.forEach(doc => {
    // Create a slim version for the store
    documentStore[doc.id] = {
      id: doc.id,
      type: doc.type,
      title: doc.title,
      englishTitle: doc.englishTitle,
      author: doc.author,
      category: doc.category,
      subcategory: doc.subcategory,
      language: doc.language,
      path: doc.path,
      tags: doc.tags,
      wordCount: doc.wordCount,
      charCount: doc.charCount,
      timestamp: doc.timestamp,
      bookId: doc.bookId,
      chapter: doc.chapter,
      section: doc.section
    };
  });
  
  return {
    lunrIndex: idx.toJSON(),
    documents: documentStore,
    metadata: {
      totalDocuments: allDocuments.length,
      fieldWeights: CONFIG.fieldWeights,
      languages: ['hebrew', 'english'],
      version: '2.0.0',
      generatedAt: new Date().toISOString()
    }
  };
}

function saveSearchIndex(searchIndex, stats) {
  console.log('Saving search index...');
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Save search index
  const indexPath = path.join(CONFIG.outputDir, CONFIG.indexFile);
  fs.writeFileSync(indexPath, JSON.stringify(searchIndex, null, 2));
  console.log(`Search index saved to: ${indexPath}`);
  console.log(`Index size: ${(fs.statSync(indexPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  // Save stats
  const statsPath = path.join(CONFIG.outputDir, CONFIG.statsFile);
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`Stats saved to: ${statsPath}`);
  
  // Create a lightweight version for quick loading
  const lightweightIndex = {
    metadata: searchIndex.metadata,
    documentCount: Object.keys(searchIndex.documents).length,
    categories: Array.from(new Set(
      Object.values(searchIndex.documents).map(d => d.category)
    )).filter(Boolean),
    books: Array.from(new Set(
      Object.values(searchIndex.documents)
        .filter(d => d.type === 'book')
        .map(d => d.bookId)
    )).filter(Boolean)
  };
  
  const lightweightPath = path.join(CONFIG.outputDir, 'search-metadata.json');
  fs.writeFileSync(lightweightPath, JSON.stringify(lightweightIndex, null, 2));
  console.log(`Lightweight metadata saved to: