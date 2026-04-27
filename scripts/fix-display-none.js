import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

console.log('🔧 Fixing display:none inline styles...\n');

let filesFixed = 0;
let replacementsMade = 0;

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let modified = false;
    
    // Fix style="display: none;"
    if (content.includes('style="display: none;"')) {
      newContent = newContent.replace(/style="display: none;"/g, 'class="hidden"');
      console.log(`✅ Fixed: ${path.relative(srcDir, filePath)}`);
      modified = true;
      replacementsMade++;
    }
    
    // Fix style="display: none"
    if (content.includes('style="display: none"')) {
      newContent = newContent.replace(/style="display: none"/g, 'class="hidden"');
      if (!modified) {
        console.log(`✅ Fixed: ${path.relative(srcDir, filePath)}`);
        modified = true;
      }
      replacementsMade++;
    }
    
    // Fix style='display: none;'
    if (content.includes("style='display: none;'")) {
      newContent = newContent.replace(/style='display: none;'/g, "class='hidden'");
      if (!modified) {
        console.log(`✅ Fixed: ${path.relative(srcDir, filePath)}`);
        modified = true;
      }
      replacementsMade++;
    }
    
    // Fix style='display: none'
    if (content.includes("style='display: none'")) {
      newContent = newContent.replace(/style='display: none'/g, "class='hidden'");
      if (!modified) {
        console.log(`✅ Fixed: ${path.relative(srcDir, filePath)}`);
        modified = true;
      }
      replacementsMade++;
    }
    
    if (modified) {
      // Create backup
      const backupPath = filePath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content, 'utf8');
      }
      
      // Write changes
      fs.writeFileSync(filePath, newContent, 'utf8');
      filesFixed++;
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function scanDirectory(dir) {
  let processed = 0;
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        processed += scanDirectory(itemPath);
      } else if (item.endsWith('.astro')) {
        processed++;
        processFile(itemPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
  
  return processed;
}

const totalProcessed = scanDirectory(srcDir);

console.log(`\n📊 Summary:`);
console.log(`   Files processed: ${totalProcessed}`);
console.log(`   Files fixed: ${filesFixed}`);
console.log(`   Replacements made: ${replacementsMade}`);

if (filesFixed > 0) {
  console.log('\n💡 Next steps:');
  console.log('1. Add this CSS to your global styles:');
  console.log('   .hidden { display: none !important; }');
  console.log('2. Test the site to ensure nothing broke');
  console.log('3. Remove .backup files after verification');
  console.log('\n⚠️  Note: Some files may have other inline styles that need fixing.');
  console.log('   Run the build to check for remaining CSS warnings.');
} else {
  console.log('\n✅ No display:none inline styles found!');
}

// Also check for other common problematic patterns
console.log('\n🔍 Checking for other common inline style issues...');

function checkForOtherIssues() {
  const problematicFiles = [];
  
  function scan(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scan(itemPath);
      } else if (item.endsWith('.astro')) {
        const content = fs.readFileSync(itemPath, 'utf8');
        
        // Check for complex inline styles (multiple properties)
        const complexStyleRegex = /style="[^"]*:[^"]*;[^"]*:[^"]/;
        if (complexStyleRegex.test(content)) {
          problematicFiles.push({
            path: itemPath,
            issue: 'Complex inline style (multiple properties)'
          });
        }
        
        // Check for inline styles with CSS blocks
        const blockStyleRegex = /style="[^"]*{[^"]*"/;
        if (blockStyleRegex.test(content)) {
          problematicFiles.push({
            path: itemPath,
            issue: 'Inline style with CSS block syntax'
          });
        }
      }
    }
  }
  
  scan(srcDir);
  
  if (problematicFiles.length > 0) {
    console.log(`\n⚠️  Found ${problematicFiles.length} files with other inline style issues:`);
    for (const file of problematicFiles.slice(0, 10)) { // Show first 10
      console.log(`   - ${path.relative(srcDir, file.path)} (${file.issue})`);
    }
    if (problematicFiles.length > 10) {
      console.log(`   ... and ${problematicFiles.length - 10} more`);
    }
    
    console.log('\n💡 Recommendation:');
    console.log('   Consider moving complex inline styles to CSS classes');
    console.log('   or using a CSS-in-JS solution for dynamic styles.');
  } else {
    console.log('✅ No other major inline style issues found!');
  }
}

checkForOtherIssues();