const fs = require('fs');
console.time('read');
const text = fs.readFileSync('public/data/enhanced-search-index.json', 'utf8');
console.timeEnd('read');

console.time('parse');
const obj = JSON.parse(text);
console.timeEnd('parse');

console.time('search');
const query = 'prayer';
const results = Object.values(obj.documents).filter(doc => doc.content.toLowerCase().includes(query));
console.timeEnd('search');
console.log('Results:', results.length);
