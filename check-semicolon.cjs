const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages';

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.startsWith('---')) return null;
    
    const firstEnd = content.indexOf('---', 3);
    if (firstEnd === -1) return null;
    
    const frontmatter = content.substring(0, firstEnd + 3);
    
    // Has import but NO semicolon at end
    if (frontmatter.includes('import Layout') && !frontmatter.match(/import Layout[^;]*;/)) {
        return { file: path.basename(filePath), fm: frontmatter };
    }
    
    return null;
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    const issues = [];
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            issues.push(...walkDir(filePath));
        } else if (file.endsWith('.astro')) {
            const result = checkFile(filePath);
            if (result) {
                issues.push(result);
            }
        }
    }
    return issues;
}

const issues = walkDir(dir);
console.log('Files with import missing semicolon:', issues.length);
issues.forEach(i => console.log(i.file));
