const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages';

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if has frontmatter start
    if (!content.startsWith('---')) {
        return { file: filePath, issue: 'no-frontmatter' };
    }
    
    // Find second --- 
    const firstEnd = content.indexOf('---', 3);
    if (firstEnd === -1) {
        return { file: filePath, issue: 'no-second-dash' };
    }
    
    const frontmatter = content.substring(0, firstEnd + 3);
    
    // Check if it has import Layout
    if (!frontmatter.includes('import Layout')) {
        return { file: filePath, issue: 'no-layout-import' };
    }
    
    // Check if there's a trailing semicolon after import
    const importMatch = frontmatter.match(/import Layout[^;]*;/);
    if (!importMatch && frontmatter.includes('import Layout')) {
        // Has import but no semicolon
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
console.log('Total issues:', issues.length);
issues.forEach(i => console.log(i.file + ': ' + i.issue));
