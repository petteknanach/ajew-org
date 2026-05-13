const fs = require('fs');

const filePath = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages\\teachings\\hh-intro.astro';
let content = fs.readFileSync(filePath, 'utf8');

// Find the frontmatter (between first --- and second ---)
const firstDash = content.indexOf('---');
const secondDash = content.indexOf('---', firstDash + 3);
const frontmatter = content.substring(firstDash, secondDash + 3);

console.log('Frontmatter:');
console.log(frontmatter);
console.log('\n---END FRONTMATTER---\n');

// Check for issues in frontmatter
if (frontmatter.includes(';')) {
    console.log('Found semicolon in frontmatter!');
}
