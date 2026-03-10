#!/usr/bin/env node

/**
 * Simple Enhanced Search API for ajew.org
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const lunr = require('lunr');
require('lunr-languages/lunr.stemmer.support')(lunr);
require('lunr-languages/lunr.multi')(lunr);
require('lunr-languages/lunr.he')(lunr);

// Configuration
const CONFIG = {
  port: process.env.PORT || 3001,
  indexFile: path.join(__dirname, 'public', 'data', 'enhanced-search-index.json'),
  
  // Search settings
  maxResults: 100,
  defaultPageSize: 20
};

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Global variables
let searchIndex = null;
let documentStore = null;

// Load search index
function loadSearchIndex() {
  try {
    console.log('Loading search index...');
    const data = JSON.parse(fs.readFileSync(CONFIG.indexFile, 'utf8'));
    
    // Load Lunr index
    searchIndex = lunr.Index.load(data.lunrIndex);
    documentStore = data.documents;
    
    console.log(`Search index loaded: ${Object.keys(documentStore).length} documents`);
    console.log(`Languages: ${data.metadata.languages?.join(', ') || 'unknown'}`);
    
    return true;
  } catch (error) {
    console.error('Failed to load search index:', error);
    return false;
  }
}

// Health check endpoint
app.get('/api/search/health', (req, res) => {
  res.json({
    status: 'ok',
    documents: documentStore ? Object.keys(documentStore).length : 0,
    timestamp: new Date().toISOString()
  });
});

// Main search endpoint
app.get('/api/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || CONFIG.defaultPageSize;
    
    if (!query.trim()) {
      return res.json({
        results: [],
        total: 0,
        page,
        pageSize,
        query
      });
    }
    
    if (!searchIndex) {
      return res.status(503).json({
        error: 'Search index not loaded',
        query
      });
    }
    
    // Perform search
    const searchResults = searchIndex.search(query);
    
    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = searchResults.slice(startIndex, endIndex);
    
    // Format results
    const results = paginatedResults.map(result => {
      const doc = documentStore[result.ref];
      return {
        id: doc.id,
        title: doc.title,
        englishTitle: doc.englishTitle,
        author: doc.author,
        category: doc.category,
        language: doc.language,
        path: doc.path,
        snippet: doc.content.substring(0, 200) + '...',
        score: result.score,
        wordCount: doc.wordCount,
        charCount: doc.charCount
      };
    });
    
    res.json({
      results,
      total: searchResults.length,
      page,
      pageSize,
      query,
      hasMore: endIndex < searchResults.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message,
      query: req.query.q
    });
  }
});

// Get document by ID
app.get('/api/search/document/:id', (req, res) => {
  try {
    const id = req.params.id;
    
    if (!documentStore || !documentStore[id]) {
      return res.status(404).json({
        error: 'Document not found',
        id
      });
    }
    
    const doc = documentStore[id];
    res.json({
      id: doc.id,
      title: doc.title,
      englishTitle: doc.englishTitle,
      author: doc.author,
      category: doc.category,
      language: doc.language,
      path: doc.path,
      content: doc.content,
      wordCount: doc.wordCount,
      charCount: doc.charCount,
      timestamp: doc.timestamp
    });
    
  } catch (error) {
    console.error('Document fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch document',
      message: error.message,
      id: req.params.id
    });
  }
});

// Search suggestions
app.get('/api/search/suggest', (req, res) => {
  try {
    const query = req.query.q || '';
    
    if (!query.trim() || !searchIndex) {
      return res.json({
        suggestions: []
      });
    }
    
    // Simple suggestion logic - in a real implementation,
    // you might want to use a more sophisticated approach
    const searchResults = searchIndex.search(query);
    const suggestions = searchResults
      .slice(0, 10)
      .map(result => documentStore[result.ref].title)
      .filter((title, index, self) => self.indexOf(title) === index); // Remove duplicates
    
    res.json({
      suggestions,
      query
    });
    
  } catch (error) {
    console.error('Suggestion error:', error);
    res.json({
      suggestions: [],
      error: error.message
    });
  }
});

// Test endpoint
app.get('/api/search/test', (req, res) => {
  res.json({
    message: 'Enhanced Search API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/search/health',
      '/api/search?q=query',
      '/api/search/suggest?q=query',
      '/api/search/document/:id',
      '/api/search/test'
    ]
  });
});

// Start server
function startServer() {
  // Load search index
  if (!loadSearchIndex()) {
    console.error('Failed to load search index. Exiting.');
    process.exit(1);
  }
  
  const server = app.listen(CONFIG.port, () => {
    console.log(`\n✅ Enhanced Search API running on port ${CONFIG.port}`);
    console.log(`📚 Documents indexed: ${Object.keys(documentStore).length}`);
    console.log(`🌐 Health check: http://localhost:${CONFIG.port}/api/search/health`);
    console.log(`🔍 Test search: http://localhost:${CONFIG.port}/api/search?q=תפילה`);
    console.log(`📋 API test: http://localhost:${CONFIG.port}/api/search/test`);
    console.log('\nPress Ctrl+C to stop the server\n');
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down search API...');
    server.close(() => {
      console.log('Search API stopped.');
      process.exit(0);
    });
  });
}

// Start the server
startServer();