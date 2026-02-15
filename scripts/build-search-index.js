import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '..');

const booksDir = path.join(baseDir, 'public/books');
const outputPath = path.join(baseDir, 'public/data-search-index.json');

const books = [];

function walkDir(dir, category = '') {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      walkDir(fullPath, item);
    } else if (item.endsWith('.txt')) {
      try {
        // Read as UTF-8 (files already converted)
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Strip the weird markup at start (CosmeticsType stuff)
        content = content.replace(/^&[^&]*&/, '').replace(/^[^\u05D0-\u05EA]*([\u05D0-\u05EA])/, '$1');
        
        const relativePath = path.relative(baseDir + '/public', fullPath);
        
        books.push({
          title: item.replace('.txt', ''),
          category: category || 'Unknown',
          path: '/' + relativePath.replace(/\\/g, '/'),
          content: content.substring(0, 5000)
        });
      } catch (err) {
        console.error(`Error reading ${fullPath}:`, err.message);
      }
    }
  }
}

console.log('Walking books directory...');
walkDir(booksDir);

const index = {
  books,
  teachings: []
};

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
console.log(`Created search index with ${books.length} books`);
