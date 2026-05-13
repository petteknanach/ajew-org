const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern: import Layout from '...';
    // <style>  (missing --- in between)
    const pattern = /(import Layout from '[^']+');\r?\n<style>/g;
    
    if (pattern.test(content)) {
        content = content.replace(pattern, "$1\n---\n<style>");
        fs.writeFileSync(filePath, content);
        console.log("Fixed:", path.basename(filePath));
        return true;
    }
    return false;
}

function walkDir(dir) {
    let fixed = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            fixed += walkDir(filePath);
        } else if (file.endsWith('.astro')) {
            if (processFile(filePath)) fixed++;
        }
    }
    return fixed;
}

const total = walkDir(dir);
console.log(`Total fixed: ${total}`);
