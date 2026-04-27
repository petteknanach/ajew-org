// Regenerate search index from books and teachings
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
      
      books.push({
        title,
        category,
        path: `/books/${category}/${file}`,
        content: content.substring(0, 50000) // Limit content size
      });
    }
  }
}

console.log(`Found ${books.length} books`);

// Get all teaching files  
const teachingsDir = path.join(rootDir, 'src', 'pages', 'teachings');
const teachings = [];

if (fs.existsSync(teachingsDir)) {
  const files = fs.readdirSync(teachingsDir);
  
  for (const file of files) {
    if (!file.endsWith('.astro')) continue;
    
    const filePath = path.join(teachingsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract title from frontmatter (YAML or JS const)
    const yamlMatch = content.match(/title:\s*"([^"]+)"/);
    const jsMatch = content.match(/const\s+pageTitle\s*=\s*"([^"]+)"/);
    const titleMatch = yamlMatch || jsMatch;
    if (!titleMatch) continue;
    
    // Remove HTML tags for search
    const plainContent = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 50000);
    
    teachings.push({
      title: titleMatch[1],
      path: `/teachings/${file.replace('.astro', '').replace(/-/g, '')}`,
      content: plainContent
    });
  }
}

console.log(`Found ${teachings.length} teachings`);

// Write search index
const searchIndex = { books, teachings };
const outputPath = path.join(rootDir, 'src', 'data', 'search-index.json');
fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2));
console.log(`Search index written to ${outputPath}`);
