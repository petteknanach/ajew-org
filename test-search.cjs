const fs = require('fs');
console.time('read');
const text = fs.readFileSync('public/data/enhanced-search-index.json', 'utf8');
console.timeEnd('read');

console.time('search');
const query = 'Tefilos'; // example
const results = [];
const regex = /"id":\s*"([^"]+)",[^}]*"title":\s*"([^"]+)",[^}]*"content":\s*"([^"]*?)(.{0,50}Tefilos.{0,50})([^"]*?)"/gi;
// Wait, regex over 200MB with .*? is super slow and causes catastrophic backtracking!
// Better: split by "id": or find index of query, then expand.
let pos = 0;
while ((pos = text.indexOf('Tefilos', pos)) !== -1) {
  // Extract context
  const start = Math.max(0, pos - 50);
  const end = Math.min(text.length, pos + 50);
  results.push(text.substring(start, end));
  pos += 7;
  if (results.length > 10) break;
}
console.timeEnd('search');
console.log(results);
