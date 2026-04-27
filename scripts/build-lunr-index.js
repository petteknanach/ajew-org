import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import lunr from 'lunr';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Hebrew tokenizer for Lunr
function hebrewTokenizer(token) {
  if (!token) return [];
  
  // Remove nikud (vowel points)
  const withoutNikud = token.toString().replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
  
  // Return as lowercase
  return [withoutNikud.toLowerCase()];
}

// Custom pipeline function for Hebrew
lunr.Pipeline.registerFunction(hebrewTokenizer, 'hebrewTokenizer');

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
      
      // Clean up content
      let cleanContent = content;
      // Remove metadata lines at start
      cleanContent = cleanContent.replace(/^&[^\n]+\n/, '');
      // Remove excessive whitespace
      cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
      
      books.push({
        id: `book_${books.length}`,
        title,
        category,
        path: `/books/${category}/${file}`,
        content: cleanContent.substring(0, 100000), // Limit content size
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
        
        // Remove HTML tags for search
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
          content: plainContent.substring(0, 100000), // Limit content size
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

// Build Lunr index
console.log('Building Lunr index...');
const idx = lunr(function() {
  // Use Hebrew tokenizer
  this.tokenizer = hebrewTokenizer;
  
  // Define fields
  this.field('title', { boost: 10 });
  this.field('content', { boost: 1 });
  this.field('category', { boost: 5 });
  this.field('subcategory', { boost: 3 });
  
  // Add documents
  allDocuments.forEach(doc => {
    this.add(doc);
  });
});

// Create search index data structure
const searchIndex = {
  // The Lunr index
  lunrIndex: idx.toJSON(),
  
  // Document store for retrieving full data
  documents: allDocuments.reduce((store, doc) => {
    store[doc.id] = {
      title: doc.title,
      category: doc.category,
      subcategory: doc.subcategory,
      path: doc.path,
      type: doc.type
    };
    return store;
  }, {})
};

// Write search index
const outputPath = path.join(rootDir, 'src', 'data', 'lunr-search-index.json');
fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2));
console.log(`Lunr search index written to ${outputPath}`);
console.log(`Index size: ${JSON.stringify(searchIndex).length} bytes`);

// Also write a simple version for backward compatibility
const simpleIndex = {
  books: books.map(b => ({
    title: b.title,
    category: b.category,
    path: b.path,
    content: b.content.substring(0, 5000) // Limited for simple search
  })),
  teachings: teachings.map(t => ({
    title: t.title,
    category: t.category,
    path: t.path,
    content: t.content.substring(0, 5000) // Limited for simple search
  }))
};

const simpleOutputPath = path.join(rootDir, 'src', 'data', 'search-index.json');
fs.writeFileSync(simpleOutputPath, JSON.stringify(simpleIndex, null, 2));
console.log(`Simple search index written to ${simpleOutputPath}`);