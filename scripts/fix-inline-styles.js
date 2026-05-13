import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

// Common inline style patterns that cause issues
const problematicPatterns = [
  /style="[^"]*<[^"]*"/, // HTML tags inside style attributes
  /style="[^"]*{[^"]*"/, // CSS blocks inside style attributes
  /style="[^"]*}[^"]*"/, // CSS closing braces
  /style="[^"]*;[^"]*"/, // Semicolons (can cause issues)
];

// Better approach: Convert inline styles to classes
function convertInlineStyleToClass(match, styleContent) {
  // Extract the style value
  const styleMatch = match.match(/style="([^"]*)"/);
  if (!styleMatch) return match;
  
  const styleValue = styleMatch[1];
  
  // Check if it's a simple display:none or similar
  if (styleValue.includes('display: none')) {
    return match.replace(/style="[^"]*"/, 'class="hidden"');
  }
  
  if (styleValue.includes('display: block')) {
    return match.replace(/style="[^"]*"/, 'class="visible"');
  }
  
  // For other styles, we should create CSS classes
  return match;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let newContent = content;
    
    // Check for problematic patterns
    for (const pattern of problematicPatterns) {
      if (pattern.test(content)) {
        console.log(`⚠️  Found potential issue in: ${path.relative(srcDir, filePath)}`);
        console.log(`   Pattern: ${pattern}`);
        
        // Try to find the exact line
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            console.log(`   Line ${i + 1}: ${lines[i].trim()}`);
          }
        }
        
        modified = true;
      }
    }
    
    // Simple fix: Replace display:none with hidden class
    if (content.includes('style="display: none"')) {
      newContent = content.replace(/style="display: none"/g, 'class="hidden"');
      console.log(`✅ Fixed display:none in: ${path.relative(srcDir, filePath)}`);
      modified = true;
    }
    
    if (content.includes("style='display: none'")) {
      newContent = newContent.replace(/style='display: none'/g, "class='hidden'");
      console.log(`✅ Fixed display:none (single quotes) in: ${path.relative(srcDir, filePath)}`);
      modified = true;
    }
    
    if (modified && newContent !== content) {
      // Backup original
      const backupPath = filePath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content, 'utf8');
      }
      
      // Write changes
      fs.writeFileSync(filePath, newContent, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

function scanAstroFiles() {
  console.log('🔍 Scanning Astro files for inline style issues...\n');
  
  let processed = 0;
  let fixed = 0;
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else if (item.endsWith('.astro')) {
        processed++;
        if (processFile(itemPath)) {
          fixed++;
        }
      }
    }
  }
  
  scanDirectory(srcDir);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${processed}`);
  console.log(`   Files fixed: ${fixed}`);
  
  if (fixed > 0) {
    console.log('\n💡 Next steps:');
    console.log('1. Add CSS for the new classes:');
    console.log('   .hidden { display: none !important; }');
    console.log('   .visible { display: block !important; }');
    console.log('2. Test the site to ensure nothing broke');
    console.log('3. Remove .backup files after verification');
  }
}

// Create CSS file with helper classes
function createHelperCSS() {
  const cssContent = `/* Helper classes for replacing inline styles */
.hidden {
  display: none !important;
}

.visible {
  display: block !important;
}

/* Responsive helper classes */
.mobile-only {
  display: none !important;
}

.desktop-only {
  display: block !important;
}

@media (max-width: 768px) {
  .mobile-only {
    display: block !important;
  }
  
  .desktop-only {
    display: none !important;
  }
}

/* Print styles */
.print-only {
  display: none !important;
}

@media print {
  .print-only {
    display: block !important;
  }
  
  .no-print {
    display: none !important;
  }
}

/* Accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Animation helpers */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.slide-down {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
`;

  const cssPath = path.join(srcDir, 'styles', 'helpers.css');
  
  // Create styles directory if it doesn't exist
  const stylesDir = path.join(srcDir, 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
  }
  
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log(`✅ Created helper CSS: ${path.relative(process.cwd(), cssPath)}`);
}

// Main execution
async function main() {
  console.log('=== FIX INLINE STYLES FOR BETTER PERFORMANCE ===\n');
  
  // First, create helper CSS classes
  createHelperCSS();
  
  // Then scan and fix files
  scanAstroFiles();
  
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('1. Import the helper CSS in your layout:');
  console.log('   import "../styles/helpers.css";');
  console.log('');
  console.log('2. Replace other inline styles with CSS classes');
  console.log('3. Avoid inline styles in Astro components');
  console.log('4. Use Tailwind CSS or similar for utility classes');
  console.log('');
  console.log('This will help:');
  console.log('• Reduce CSS minification warnings');
  console.log('• Improve caching (CSS in separate files)');
  console.log('• Make styles more maintainable');
  console.log('• Enable better code splitting');
}

main().catch(console.error);