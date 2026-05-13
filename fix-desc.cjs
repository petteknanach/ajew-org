const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages\\teachings';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro'));

let fixed = 0;
for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace any pageDescription that has mojibake with quotes inside it
    // The issue is lines like: const pageDescription = "???"?""??";
    const newContent = content.replace(/const pageDescription = "[^\\n]*";/g, 'const pageDescription = "";');
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        fixed++;
    }
}
console.log('Fixed files:', fixed);
