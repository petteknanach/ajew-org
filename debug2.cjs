const fs = require('fs');

const filePath = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages\\teachings\\hh-intro.astro';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find all lines containing semicolons in first 200 lines
console.log('Lines 165-175:');
for (let i = 164; i < 175 && i < lines.length; i++) {
    console.log(`Line ${i+1}: ${lines[i]}`);
}

// Also count total lines
console.log(`\nTotal lines: ${lines.length}`);
