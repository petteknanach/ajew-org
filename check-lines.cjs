const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages\\teachings\\hh-intro.astro';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('Line 170 (index 169):');
console.log(lines[169]);

// Look for the problematic line - where there's <p> with curly braces inside
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Our Teacher/Guide') || lines[i].includes('[-acronym')) {
        console.log(`\nFound at line ${i+1}:`);
        console.log(lines[i]);
    }
}
