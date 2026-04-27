#!/usr/bin/env node

/**
 * Simple Enhanced Search Index Generator for ajew.org
 * 
 * This script generates a search index for all Hebrew books
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
  hebrewBooksDir: path.join(__dirname, 'hebrew_torahs_simple'),
  
  // Output files
  outputDir: path.join(__dirname, 'public', 'data'),
  indexFile: 'enhanced-search-index.json',
  statsFile: 'search-stats.json',
  
  // Search configuration
  maxResults: 1000,
  snippetLength: 200
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Load Hebrew files
function loadHebrewFiles() {
  console.log('Loading Hebrew files...');
  
  const files = fs.readdirSync(CONFIG.hebrewBooksDir)
    .filter(f => f.endsWith('.txt'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || 0);
      const numB = parseInt(b.match(/\d+/)?.[0] || 0);
      return numA - numB;
    });
  
  console.log(`Found ${files.length} Hebrew files`);
  
  const documents = [];
  let docId = 1;
  
  for (const file of files) {
    const filePath = path.join(CONFIG.hebrewBooksDir, file);
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
      normalizedContent: content, // In a real implementation, we'd normalize this
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
    docId++;
    
    // Show progress
    if (docId % 50 === 0) {
      console.log(`  Processed ${docId} files...`);
    }
  }
  
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
      languages: ['hebrew'],
      categories: ['Rabbainu'],
      books: ['likutay-moharan']
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
    generatedAt: new Date().toISOString(),
    processingTime: new Date().toISOString()
  };
  
  // Count by category
  documents.forEach(doc => {
    stats.byCategory[doc.category] = (stats.byCategory[doc.category] || 0) + 1;
    stats.byLanguage[doc.language] = (stats.byLanguage[doc.language] || 0) + 1;
  });
  
  return stats;
}

// Main function
async function main() {
  console.log('Starting enhanced search index generation...');
  console.log('===========================================\n');
  
  try {
    // Step 1: Load Hebrew files
    const documents = loadHebrewFiles();
    
    if (documents.length === 0) {
      console.error('No documents found to index!');
      process.exit(1);
    }
    
    // Step 2: Build search index
    const searchIndex = buildSearchIndex(documents);
    
    // Step 3: Save search index
    const indexPath = path.join(CONFIG.outputDir, CONFIG.indexFile);
    fs.writeFileSync(indexPath, JSON.stringify(searchIndex, null, 2));
    console.log(`\nSearch index saved to: ${indexPath}`);
    console.log(`Index size: ${fs.statSync(indexPath).size} bytes`);
    
    // Step 4: Generate and save statistics
    const stats = generateStats(documents, searchIndex);
    const statsPath = path.join(CONFIG.outputDir, CONFIG.statsFile);
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`Stats saved to: ${statsPath}`);
    
    // Step 5: Create lightweight metadata
    const lightweightIndex = {
      metadata: searchIndex.metadata,
      documentCount: Object.keys(searchIndex.documents).length,
      categories: Array.from(new Set(
        Object.values(searchIndex.documents).map(d => d.category)
      )).filter(Boolean),
      books: Array.from(new Set(
        Object.values(searchIndex.documents)
          .filter(d => d.type === 'torah')
          .map(d => d.bookId)
      )).filter(Boolean)
    };
    
    const lightweightPath = path.join(CONFIG.outputDir, 'search-metadata.json');
    fs.writeFileSync(lightweightPath, JSON.stringify(lightweightIndex, null, 2));
    console.log(`Lightweight metadata saved to: ${lightweightPath}`);
    
    console.log('\n✅ Search index generation completed successfully!');
    console.log(`📊 Total documents indexed: ${documents.length}`);
    console.log(`📚 Categories: ${Object.keys(lightweightIndex.categories).join(', ')}`);
    
  } catch (error) {
    console.error('Error generating search index:', error);
    process.exit(1);
  }
}

// Run the main function
main();