import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.join(__dirname, '../public/books');
const OUTPUT_FILE = path.join(__dirname, '../src/data/search-index.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function scanBooks(dir, category = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const books = [];
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      const subBooks = scanBooks(fullPath, item.name);
      books.push(...subBooks);
    } else if (item.name.endsWith('.txt')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(path.join(__dirname, '../public'), fullPath);
        
        books.push({
          title: item.name.replace('.txt', ''),
          category: category || 'Other',
          path: '/' + relativePath.replace(/\\/g, '/'),
          content: content.substring(0, 30000),
        });
      } catch (e) {
        console.error(`Error reading ${fullPath}:`, e.message);
      }
    }
  }
  
  return books;
}

function scanTeachings() {
  const teachings = [];
  const teachingsDir = path.join(__dirname, '../src/pages/teachings');
  
  if (!fs.existsSync(teachingsDir)) return teachings;
  
  const files = fs.readdirSync(teachingsDir).filter(f => f.endsWith('.astro'));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(teachingsDir, file), 'utf8');
      const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
      const title = titleMatch ? titleMatch[1] : file.replace('.astro', '');
      
      const textContent = content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 30000);
      
      teachings.push({
        title: title,
        category: 'Teachings',
        path: '/teachings/' + file.replace('.astro', ''),
        content: textContent
      });
    } catch (e) {
      console.error(`Error reading ${file}:`, e.message);
    }
  }
  
  return teachings;
}

console.log('Building search index...');

const books = scanBooks(BOOKS_DIR);
const teachings = scanTeachings();

const index = {
  updated: new Date().toISOString(),
  books,
  teachings
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
console.log(`Indexed ${books.length} books and ${teachings.length} teachings`);
console.log(`Written to ${OUTPUT_FILE}`);
