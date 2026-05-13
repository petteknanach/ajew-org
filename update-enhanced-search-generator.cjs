#!/usr/bin/env node

/**
 * Update Enhanced Search Index Generator to include mobile API content
 */

const fs = require('fs');
const path = require('path');

// Path to the enhanced search index generator
const GENERATOR_PATH = path.join(__dirname, 'enhanced-search-index-generator-complete.cjs');

// Read the current generator
let generatorContent = fs.readFileSync(GENERATOR_PATH, 'utf8');

// Add mobile API content loading function
const mobileApiLoader = `

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
      console.log(\`Warning: Directory not found: \${dirPath}\`);
      return [];
    }
    
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.json') && !f.includes('index') && !f.includes('torah-'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\\d+/)?.[0] || 0);
        return numA - numB;
      });
    
    const chapters = [];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const chapterData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Create search document from chapter data
      const document = {
        id: \`mobile-\${bookId}-\${chapterData.n}\`,
        type: 'mobile-api',
        title: chapterData.t,
        englishTitle: chapterData.t,
        author: 'Rabbi Nachman of Breslov',
        category: 'Rabbainu',
        subcategory: bookTitle,
        language: 'hebrew',
        content: chapterData.s?.map(s => s.sum).join(' ') || chapterData.t,
        normalizedContent: chapterData.ht + ' ' + (chapterData.s?.map(s => s.sum).join(' ') || ''),
        path: \`/api-mobile/\${bookId}/\${file}\`,
        tags: chapterData.th || [],
        keywords: chapterData.kw || [],
        wordCount: (chapterData.s?.map(s => s.sum).join(' ') || '').split(/\\s+/).length,
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
    
    console.log(\`  Loaded \${chapters.length} chapters from \${bookId}\`);
    return chapters;
  }
  
  // Load all books
  const lmPart1Chapters = loadChaptersFromDir(lmPart1Dir, 'likutay-moharan', 'Likutey Moharan Part 1');
  const lmPart2Chapters = loadChaptersFromDir(lmPart2Dir, 'likutay-moharan', 'Likutey Moharan Part 2');
  const shChapters = loadChaptersFromDir(shDir, 'sefer-hamidos', 'Sefer Hamidos');
  const storiesChapters = loadChaptersFromDir(storiesDir, 'stories', 'Stories of Rabbi Nachman');
  
  // Combine all chapters
  const allChapters = [...lmPart1Chapters, ...lmPart2Chapters, ...shChapters, ...storiesChapters];
  
  console.log(\`Total mobile API chapters loaded: \${allChapters.length}\`);
  return allChapters;
}
`;

// Find where to insert the new function (after the loadBooks function)
const insertPoint = generatorContent.indexOf('// Load books from MyBooks directory');
if (insertPoint === -1) {
  console.error('Could not find insertion point in generator file');
  process.exit(1);
}

// Find the end of the loadBooks function
const afterLoadBooks = generatorContent.indexOf('// Build search index', insertPoint);
if (afterLoadBooks === -1) {
  console.error('Could not find build search index section');
  process.exit(1);
}

// Insert the mobile API loader function
const updatedContent = 
  generatorContent.substring(0, afterLoadBooks) + 
  mobileApiLoader + 
  generatorContent.substring(afterLoadBooks);

// Update the main loading section to include mobile API
const mainLoadingSection = `// Load all documents
  const hebrewTorahs = loadHebrewTorahs();
  const books = loadBooks();
  const mobileApiContent = loadMobileApiContent();
  
  // Combine all documents
  const allDocuments = [...hebrewTorahs, ...books, ...mobileApiContent];`;

// Find and replace the document loading section
const documentsLoadingPattern = /\/\/ Load all documents[\s\S]*?const allDocuments = \[.*?\];/;
if (documentsLoadingPattern.test(updatedContent)) {
  const finalContent = updatedContent.replace(
    documentsLoadingPattern,
    mainLoadingSection
  );
  
  // Write the updated file
  fs.writeFileSync(GENERATOR_PATH, finalContent);
  console.log('✅ Successfully updated enhanced-search-index-generator-complete.cjs');
  console.log('📚 Added mobile API content loading');
} else {
  console.error('Could not find document loading section to update');
  process.exit(1);
}