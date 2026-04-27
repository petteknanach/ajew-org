const fs = require('fs');
console.log('Reading test...');
const data = JSON.parse(fs.readFileSync('public/reader/likutay-halachos/part-4/halacha-83.json', 'utf8'));
console.log('Title:', data.title);
console.log('Segments:', data.segments.length);
