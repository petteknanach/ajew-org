import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import lunr from 'lunr';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Get all book files
const booksDir = path.join(rootDir, 'public', 'books');
const books = [];

if (fs.existsSync(booksDir)) {
  const categories = fs.readdirSync(booksDir);
  
  for (const category of categories) {
    const categoryPath = path.join(booksDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    const files = fs.readdirSync(categoryPath);
    for (const file of files) {
      if (!file.endsWith('.txt')) continue;
      
      const filePath = path.join(categoryPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = path.basename(file, '.txt');
      
      // Clean up content - just get first 1000 chars for snippet
      let cleanContent = content;
      cleanContent = cleanContent.replace(/^&[^\n]+\n/, '');
      cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
      
      books.push({
        id: `book_${books.length}`,
        title,
        category,
        path: `/books/${category}/${file}`,
        snippet: cleanContent.substring(0, 1000), // Just for snippet display
        type: 'book'
      });
    }
  }
}

console.log(`Found ${books.length} books`);

// Get all teaching files  
const teachingsDir = path.join(rootDir, 'src', 'pages', 'teachings');
const teachings = [];

function processTeachingsDir(dir, basePath = '') {
  if (!fs.existsSync(dir)) return;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processTeachingsDir(fullPath, path.join(basePath, item));
    } else if (item.endsWith('.astro')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Extract title from frontmatter
        let title = item.replace('.astro', '').replace(/-/g, ' ');
        
        // Try to extract from YAML frontmatter
        const yamlMatch = content.match(/title:\s*"([^"]+)"/);
        const jsMatch = content.match(/const\s+pageTitle\s*=\s*"([^"]+)"/);
        const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
        
        if (yamlMatch) title = yamlMatch[1];
        else if (jsMatch) title = jsMatch[1];
        else if (h1Match) title = h1Match[1];
        
        // Remove HTML tags for search - just get text content
        let plainContent = content
          .replace(/---[\s\S]*?---/, '') // Remove frontmatter
          .replace(/<script[\s\S]*?<\/script>/g, ' ') // Remove scripts
          .replace(/<style[\s\S]*?<\/style>/g, ' ') // Remove styles
          .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        // Determine category from path
        let category = 'Teachings';
        if (basePath.includes('likutay-halachos')) category = 'Likutey Halachos';
        else if (basePath.includes('likutay-tefilos')) category = 'Likutey Tefilos';
        else if (basePath.includes('stories')) category = 'Stories';
        
        // Determine subcategory
        let subcategory = '';
        if (basePath) {
          const parts = basePath.split(path.sep);
          if (parts.length > 0) subcategory = parts[parts.length - 1];
        }
        
        const urlPath = `/teachings/${path.join(basePath, item.replace('.astro', '')).replace(/\\/g, '/')}`;
        
        teachings.push({
          id: `teaching_${teachings.length}`,
          title,
          category,
          subcategory,
          path: urlPath,
          snippet: plainContent.substring(0, 1000), // Just for snippet display
          type: 'teaching'
        });
      } catch (err) {
        console.error(`Error processing ${fullPath}:`, err.message);
      }
    }
  }
}

processTeachingsDir(teachingsDir);
console.log(`Found ${teachings.length} teachings`);

// Combine all documents
const allDocuments = [...books, ...teachings];
console.log(`Total documents: ${allDocuments.length}`);

// Build Lunr index - only index titles and categories, not full content
console.log('Building optimized Lunr index...');
const idx = lunr(function() {
  this.ref('id');
  this.field('title', { boost: 10 });
  this.field('category', { boost: 5 });
  this.field('subcategory', { boost: 3 });
  
  // Add documents
  allDocuments.forEach(doc => {
    this.add({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      subcategory: doc.subcategory || ''
    });
  });
});

// Create search index data structure
const searchIndex = {
  // The Lunr index (small)
  lunrIndex: idx.toJSON(),
  
  // Document store for retrieving full data
  documents: allDocuments.reduce((store, doc) => {
    store[doc.id] = {
      title: doc.title,
      category: doc.category,
      subcategory: doc.subcategory,
      path: doc.path,
      type: doc.type,
      snippet: doc.snippet
    };
    return store;
  }, {})
};

// Write search index
const outputPath = path.join(rootDir, 'src', 'data', 'optimized-search-index.json');
fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2));
console.log(`Optimized search index written to ${outputPath}`);

// Check file size
const stats = fs.statSync(outputPath);
console.log(`Index size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`);