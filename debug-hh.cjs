const fs = require('fs');

const filePath = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages\\teachings\\hh-intro.astro';
let content = fs.readFileSync(filePath, 'utf8');

// Get first 2000 chars to see the beginning
console.log('First 500 chars:');
console.log(content.substring(0, 500));
console.log('\n--- chars 400-600: ---');
console.log(content.substring(400, 600));
