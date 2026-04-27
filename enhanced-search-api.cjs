#!/usr/bin/env node

/**
 * Enhanced Search API for ajew.org
 * 
 * Provides RESTful API for advanced search features:
 * - Boolean operators
 * - Phrase matching
 * - Fuzzy search
 * - Proximity search
 * - Wildcard search
 * - Filtering by metadata
 * - Search analytics
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
  analyticsFile: path.join(__dirname, 'search-analytics.json'),
  
  // Search settings
  maxResults: 100,
  defaultPageSize: 20,
  
  // Analytics settings
  trackSearches: true,
  trackClicks: true,
  
  // Cache settings
  cacheTTL: 3600, // 1 hour in seconds
  enableCache: true
};

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Global variables
let searchIndex = null;
let documentStore = null;
let searchCache = new Map();
let analyticsData = {
  totalSearches: 0,
  searchesByDay: {},
  popularQueries: {},
  clickThroughs: {},
  noResultsQueries: {},
  startTime: new Date().toISOString()
};

// Load search index
function loadSearchIndex() {
  try {
    console.log('Loading search index...');
    const data = JSON.parse(fs.readFileSync(CONFIG.indexFile, 'utf8'));
    
    // Load Lunr index
    searchIndex = lunr.Index.load(data.lunrIndex);
    documentStore = data.documents;
    
    console.log(`Search index loaded: ${Object.keys(documentStore).length} documents`);
    console.log(`Languages: ${data.metadata.languages.join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('Failed to load search index:', error);
    return false;
  }
}

// Load analytics data
function loadAnalytics() {
  try {
    if (fs.existsSync(CONFIG.analyticsFile)) {
      analyticsData = JSON.parse(fs.readFileSync(CONFIG.analyticsFile, 'utf8'));
      console.log(`Analytics loaded: ${analyticsData.totalSearches} total searches`);
    }
  } catch (error) {
    console.error('Failed to load analytics:', error);
  }
}

// Save analytics data
function saveAnalytics() {
  try {
    fs.writeFileSync(CONFIG.analyticsFile, JSON.stringify(analyticsData, null, 2));
  } catch (error) {
    console.error('Failed to save analytics:', error);
  }
}

// Track search query
function trackSearch(query, filters, resultsCount) {
  if (!CONFIG.trackSearches) return;
  
  const today = new Date().toISOString().split('T')[0];
  
  // Update analytics
  analyticsData.totalSearches++;
  
  // Track by day
  if (!analyticsData.searchesByDay[today]) {
    analyticsData.searchesByDay[today] = 0;
  }
  analyticsData.searchesByDay[today]++;
  
  // Track popular queries
  const normalizedQuery = query.toLowerCase().trim();
  if (!analyticsData.popularQueries[normalizedQuery]) {
    analyticsData.popularQueries[normalizedQuery] = 0;
  }
  analyticsData.popularQueries[normalizedQuery]++;
  
  // Track no-results queries
  if (resultsCount === 0) {
    if (!analyticsData.noResultsQueries[normalizedQuery]) {
      analyticsData.noResultsQueries[normalizedQuery] = 0;
    }
    analyticsData.noResultsQueries[normalizedQuery]++;
  }
  
  // Save analytics periodically
  if (analyticsData.totalSearches % 10 === 0) {
    saveAnalytics();
  }
}

// Track click-through
function trackClick(documentId, query) {
  if (!CONFIG.trackClicks) return;
  
  if (!analyticsData.clickThroughs[documentId]) {
    analyticsData.clickThroughs[documentId] = 0;
  }
  analyticsData.clickThroughs[documentId]++;
  
  // Save analytics periodically
  if (analyticsData.totalSearches % 10 === 0) {
    saveAnalytics();
  }
}

// Parse advanced search query
function parseAdvancedQuery(query) {
  const result = {
    originalQuery: query,
    terms: [],
    phrases: [],
    operators: [],
    filters: {},
    isAdvanced: false
  };
  
  // Check for phrase matching (quotes)
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    result.phrases.push(match[1]);
    result.isAdvanced = true;
  }
  
  // Remove phrases from query for further processing
  let processedQuery = query.replace(phraseRegex, '');
  
  // Check for boolean operators
  const operatorRegex = /\b(AND|OR|NOT)\b/gi;
  const operators = processedQuery.match(operatorRegex);
  if (operators) {
    result.operators = operators.map(op => op.toUpperCase());
    result.isAdvanced = true;
  }
  
  // Check for wildcards
  if (processedQuery.includes('*') || processedQuery.includes('?')) {
    result.isAdvanced = true;
  }
  
  // Check for proximity search (NEAR)
  if (processedQuery.toUpperCase().includes('NEAR')) {
    result.isAdvanced = true;
  }
  
  // Extract simple terms
  result.terms = processedQuery
    .split(/\s+/)
    .filter(term => term && !operatorRegex.test(term))
    .map(term => term.toLowerCase());
  
  return result;
}

// Generate cache key
function generateCacheKey(query, filters, advancedOptions, page, pageSize) {
  return JSON.stringify({
    query: query.toLowerCase().trim(),
    filters: Object.keys(filters).sort().map(k => `${k}:${filters[k]}`).join('|'),
    advancedOptions: Object.keys(advancedOptions).sort().map(k => `${k}:${advancedOptions[k]}`).join('|'),
    page,
    pageSize
  });
}

// Perform search with advanced features
function performSearch(query, filters = {}, advancedOptions = {}, page = 1, pageSize = CONFIG.defaultPageSize) {
  const cacheKey = CONFIG.enableCache ? generateCacheKey(query, filters, advancedOptions, page, pageSize) : null;
  
  // Check cache
  if (CONFIG.enableCache && cacheKey && searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CONFIG.cacheTTL * 1000) {
      console.log(`Cache hit for: ${query}`);
      return cached.results;
    }
  }
  
  if (!searchIndex || !documentStore) {
    return {
      error: 'Search index not loaded',
      results: [],
      total: 0,
      page,
      pageSize
    };
  }
  
  try {
    // Parse advanced query
    const parsedQuery = parseAdvancedQuery(query);
    
    let searchResults = [];
    let lunrQuery = query;
    
    // Apply search type from advanced options
    if (advancedOptions && advancedOptions.searchType) {
      switch (advancedOptions.searchType) {
        case 'exact':
          // For exact phrase, wrap in quotes if not already
          if (!query.includes('"')) {
            lunrQuery = `"${query}"`;
          }
          break;
        case 'startsWith':
          // For starts with, add wildcard at the end
          lunrQuery = `${query}*`;
          break;
        case 'endsWith':
          // For ends with, add wildcard at the beginning
          lunrQuery = `*${query}`;
          break;
        case 'boolean':
          // Boolean search - keep as is, Lunr supports AND/OR/NOT
          break;
        case 'contains':
        default:
          // Default contains search with fuzzy matching
          if (!parsedQuery.isAdvanced) {
            lunrQuery = query + '~2'; // Add fuzzy search by default
          }
          break;
      }
    } else if (!parsedQuery.isAdvanced) {
      // Default fuzzy search for simple queries
      lunrQuery = query + '~2';
    }
    
    // Handle proximity search
    if (advancedOptions && advancedOptions.proximity && advancedOptions.proximity > 0) {
      // For proximity search, we need to modify the query
      // This is a simplified implementation - Lunr doesn't have built-in proximity
      // We'll use a workaround by searching for terms and filtering by position
      // For now, we'll just use the regular search
      console.log(`Proximity search requested: ${advancedOptions.proximity} words`);
    }
    
    // Perform search with modified query
    searchResults = searchIndex.search(lunrQuery);
    
    // Apply filters
    const filteredResults = searchResults.filter(result => {
      const doc = documentStore[result.ref];
      if (!doc) return false;
      
      // Filter by type
      if (filters.type && doc.type !== filters.type) {
        return false;
      }
      
      // Filter by category
      if (filters.category && doc.category !== filters.category) {
        return false;
      }
      
      // Filter by subcategory
      if (filters.subcategory && doc.subcategory !== filters.subcategory) {
        return false;
      }
      
      // Filter by language
      if (filters.language && doc.language !== filters.language) {
        return false;
      }
      
      // Filter by author
      if (filters.author && doc.author !== filters.author) {
        return false;
      }
      
      // Filter by tags
      if (filters.tags) {
        const filterTags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        const hasTag = filterTags.some(tag => doc.tags && doc.tags.includes(tag));
        if (!hasTag) return false;
      }
      
      // Filter by book
      if (filters.bookId && doc.bookId !== filters.bookId) {
        return false;
      }
      
      // Apply advanced options filters
      if (advancedOptions) {
        // Filter by selected books
        if (advancedOptions.books && advancedOptions.books.length > 0) {
          // Map AdvancedSearchOptions book IDs to actual searchableBookId values
          const bookMapping = {
            // Likutay Nanach volumes -> likutay-moharan
            'likutay-nanach-1': 'likutay-moharan',
            'likutay-nanach-2': 'likutay-moharan',
            'likutay-nanach-3': 'likutay-moharan',
            'likutay-nanach-4': 'likutay-moharan',
            'likutay-nanach-5': 'likutay-moharan',
            // Other collections
            'likutay-aitzos': 'sefer-hamidos',
            'likutay-tefilos': 'likutay-moharan',
            'blossoms-of-the-spring': '92_ספרים-מתורגמים',
            'fires-of-israel': '92_ספרים-מתורגמים'
          };
          
          // Check if any of the selected books match this document
          let hasMatchingBook = false;
          for (const selectedBook of advancedOptions.books) {
            const mappedBook = bookMapping[selectedBook] || selectedBook;
            if (doc.searchableBookId === mappedBook) {
              hasMatchingBook = true;
              break;
            }
          }
          
          if (!hasMatchingBook) {
            return false;
          }
        }
        
        // Filter by minimum words (simplified - check if query has enough words)
        if (advancedOptions.minWords && advancedOptions.minWords > 1) {
          const queryWords = query.trim().split(/\s+/).length;
          if (queryWords < advancedOptions.minWords) {
            // This is more of a query validation than document filtering
            // We'll handle this in the query parsing
          }
        }
      }
      
      return true;
    });
    
    // Paginate results
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);
    
    // Format results
    const formattedResults = paginatedResults.map(result => {
      const doc = documentStore[result.ref];
      return {
        id: doc.id,
        type: doc.type,
        title: doc.title,
        englishTitle: doc.englishTitle,
        author: doc.author,
        category: doc.category,
        subcategory: doc.subcategory,
        language: doc.language,
        path: doc.path,
        score: result.score,
        bookId: doc.bookId,
        chapter: doc.chapter,
        section: doc.section,
        tags: doc.tags,
        wordCount: doc.wordCount,
        charCount: doc.charCount,
        timestamp: doc.timestamp
      };
    });
    
    const response = {
      query: query,
      lunrQuery: lunrQuery, // The actual query sent to Lunr
      parsedQuery: parsedQuery,
      results: formattedResults,
      total: filteredResults.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(filteredResults.length / pageSize),
      filters: filters,
      advancedOptions: advancedOptions,
      timestamp: new Date().toISOString()
    };
    
    // Cache results
    if (CONFIG.enableCache && cacheKey) {
      searchCache.set(cacheKey, {
        results: response,
        timestamp: Date.now()
      });
      
      // Clean old cache entries
      if (searchCache.size > 1000) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
      }
    }
    
    return response;
    
  } catch (error) {
    console.error('Search error:', error);
    return {
      error: error.message,
      results: [],
      total: 0,
      page,
      pageSize
    };
  }
}

// Get search suggestions
function getSearchSuggestions(query, limit = 10) {
  if (!query || query.length < 2) {
    return [];
  }
  
  const suggestions = new Set();
  const normalizedQuery = query.toLowerCase();
  
  // Suggest from document titles
  Object.values(documentStore).forEach(doc => {
    if (doc.title.toLowerCase().includes(normalizedQuery)) {
      suggestions.add(doc.title);
    }
    if (doc.englishTitle && doc.englishTitle.toLowerCase().includes(normalizedQuery)) {
      suggestions.add(doc.englishTitle);
    }
  });
  
  // Suggest from popular queries
  Object.keys(analyticsData.popularQueries)
    .filter(popularQuery => popularQuery.includes(normalizedQuery))
    .sort((a, b) => analyticsData.popularQueries[b] - analyticsData.popularQueries[a])
    .forEach(popularQuery => {
      suggestions.add(popularQuery);
    });
  
  return Array.from(suggestions).slice(0, limit);
}

// Get search statistics
function getSearchStats() {
  const categories = {};
  const languages = {};
  const authors = {};
  
  Object.values(documentStore).forEach(doc => {
    // Count by category
    if (doc.category) {
      if (!categories[doc.category]) categories[doc.category] = 0;
      categories[doc.category]++;
    }
    
    // Count by language
    if (doc.language) {
      if (!languages[doc.language]) languages[doc.language] = 0;
      languages[doc.language]++;
    }
    
    // Count by author
    if (doc.author) {
      if (!authors[doc.author]) authors[doc.author] = 0;
      authors[doc.author]++;
    }
  });
  
  return {
    totalDocuments: Object.keys(documentStore).length,
    categories,
    languages,
    authors,
    analytics: {
      totalSearches: analyticsData.totalSearches,
      searchesToday: analyticsData.searchesByDay[new Date().toISOString().split('T')[0]] || 0,
      popularQueries: Object.entries(analyticsData.popularQueries)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {})
    }
  };
}

// API Routes

// Health check
app.get('/api/search/health', (req, res) => {
  res.json({
    status: 'ok',
    indexLoaded: !!searchIndex,
    documentCount: searchIndex ? Object.keys(documentStore).length : 0,
    uptime: process.uptime()
  });
});

// Search endpoint
app.get('/api/search', (req, res) => {
  const { q, type, category, subcategory, language, author, tags, bookId, page, pageSize, 
          books, searchType, missingLetters, minWords, proximity } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }
  
  const filters = {};
  if (type) filters.type = type;
  if (category) filters.category = category;
  if (subcategory) filters.subcategory = subcategory;
  if (language) filters.language = language;
  if (author) filters.author = author;
  if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
  if (bookId) filters.bookId = bookId;
  
  const advancedOptions = {};
  if (books) advancedOptions.books = Array.isArray(books) ? books : books.split(',');
  if (searchType) advancedOptions.searchType = searchType;
  if (missingLetters === 'true') advancedOptions.missingLetters = true;
  if (minWords) advancedOptions.minWords = parseInt(minWords);
  if (proximity) advancedOptions.proximity = parseInt(proximity);
  
  const pageNum = parseInt(page) || 1;
  const pageSizeNum = parseInt(pageSize) || CONFIG.defaultPageSize;
  
  const results = performSearch(q, filters, advancedOptions, pageNum, pageSizeNum);
  
  // Track search
  trackSearch(q, filters, results.total);
  
  res.json(results);
});

// Search suggestions
app.get('/api/search/suggest', (req, res) => {
  const { q, limit } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  const suggestions = getSearchSuggestions(q, parseInt(limit) || 10);
  res.json(suggestions);
});

// Search statistics
app.get('/api/search/stats', (req, res) => {
  const stats = getSearchStats();
  res.json(stats);
});

// Document details
app.get('/api/search/document/:id', (req, res) => {
  const { id } = req.params;
  
  if (!documentStore || !documentStore[id]) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  res.json(documentStore[id]);
});

// Track click-through
app.post('/api/search/click', (req, res) => {
  const { documentId, query } = req.body;
  
  if (!documentId) {
    return res.status(400).json({ error: 'documentId is required' });
  }
  
  trackClick(documentId, query);
  res.json({ success: true });
});

// Get popular searches
app.get('/api/search/popular', (req, res) => {
  const { limit } = req.query;
  const limitNum = parseInt(limit) || 20;
  
  const popular = Object.entries(analyticsData.popularQueries)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limitNum)
    .map(([query, count]) => ({ query, count }));
  
  res.json(popular);
});

// Clear cache (admin endpoint)
app.post('/api/search/clear-cache', (req, res) => {
  const { secret } = req.query;
  
  // Simple authentication
  if (secret !== 'admin123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  searchCache.clear();
  res.json({ success: true, cacheCleared: true });
});

// Initialize and start server
function startServer() {
  // Load search index
  if (!loadSearchIndex()) {
    console.error('Failed to load search index. Exiting.');
    process.exit(1);
  }
  
  // Load analytics
  loadAnalytics();
  
  // Start server
  app.listen(CONFIG.port, () => {
    console.log(`Enhanced Search API running on port ${CONFIG.port}`);
    console.log(`Document count: ${Object.keys(documentStore).length}`);
    console.log(`Endpoints:`);
    console.log(`  GET  /api/search?q=query - Search documents`);
    console.log(`  GET  /api/search/suggest?q=query - Get search suggestions`);
    console.log(`  GET  /api/search/stats - Get search statistics`);
    console.log(`  GET  /api/search/popular - Get popular searches`);
    console.log(`  GET  /api/search/document/:id - Get document details`);
    console.log(`  POST /api/search/click - Track click-through`);
    console.log(`  GET  /api/search/health - Health check`);
  });
  
  // Save analytics on exit
  process.on('SIGINT', () => {
    console.log('Saving analytics before exit...');
    saveAnalytics();
    process.exit(0);
  });
  
  // Periodic analytics save
  setInterval(saveAnalytics, 5 * 60 * 1000); // Save every 5 minutes
}

// Start server
startServer();