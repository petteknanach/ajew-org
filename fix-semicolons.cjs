const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages';
let fixed = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern: import Layout from '...';
    // (missing semicolon, directly followed by ---)
    const pattern = /(import Layout from '[^']+')(\r?\n)(---)/g;
    
    if (pattern.test(content)) {
        content = content.replace(pattern, "$1;$2$3");
        fs.writeFileSync(filePath, content);
        console.log("Fixed semicolon:", path.basename(filePath));
        return true;
    }
    return false;
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.astro')) {
            if (processFile(filePath)) fixed++;
        }
    }
}

walkDir(dir);
console.log(`\nTotal fixed: ${fixed}`);
