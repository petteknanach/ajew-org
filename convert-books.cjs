const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const booksDir = './public/books';

function processDir(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      processDir(fullPath);
    } else if (item.name.endsWith('.txt')) {
      try {
        // Use PowerShell to convert encoding
        const cmd = `powershell -Command "$content = [System.IO.File]::ReadAllBytes('${fullPath.replace(/\\/g, '\\\\')}'); $decoded = [System.Text.Encoding]::GetEncoding(1255).GetString($content); [System.IO.File]::WriteAllText('${fullPath.replace(/\\/g, '\\\\')}', $decoded, [System.Text.Encoding]::UTF8)"`;
        execSync(cmd, { encoding: 'utf8' });
        
        console.log(`Converted: ${fullPath}`);
      } catch (err) {
        console.error(`Error with ${fullPath}: ${err.message}`);
      }
    }
  }
}

processDir(booksDir);
console.log('Done!');
