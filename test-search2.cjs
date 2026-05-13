const fs = require('fs');
console.time('read');
const text = fs.readFileSync('public/data/enhanced-search-index.json', 'utf8');
console.timeEnd('read');

console.time('search');
const query = 'prayer';
const results = [];
let pos = 0;
while ((pos = text.toLowerCase().indexOf(query, pos)) !== -1) {
  const start = Math.max(0, pos - 50);
  const end = Math.min(text.length, pos + 50);
  results.push(text.substring(start, end).replace(/\n/g, ' '));
  pos += query.length;
  if (results.length >= 5) break;
}
console.timeEnd('search');
console.log(results);
