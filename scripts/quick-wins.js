import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

console.log('🚀 Implementing Quick Performance Wins\n');

// 1. Check for images without loading="lazy"
console.log('1. Checking for images without lazy loading...');
let imagesWithoutLazy = 0;
let imagesFixed = 0;

function checkImages(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      checkImages(itemPath);
    } else if (item.endsWith('.astro')) {
      try {
        const content = fs.readFileSync(itemPath, 'utf8');
        
        // Find img tags without loading="lazy"
        const imgRegex = /<img\s+([^>]*?)>/g;
        let match;
        let newContent = content;
        
        while ((match = imgRegex.exec(content)) !== null) {
          const fullMatch = match[0];
          const attributes = match[1];
          
          // Check if it already has loading attribute
          if (!attributes.includes('loading=') && 
              !attributes.includes('loading="') && 
              !attributes.includes("loading='")) {
            
            imagesWithoutLazy++;
            
            // Add loading="lazy" before the closing >
            const fixedImg = fullMatch.replace('>', ' loading="lazy">');
            newContent = newContent.replace(fullMatch, fixedImg);
            
            console.log(`   Found: ${path.relative(srcDir, itemPath)}`);
          }
        }
        
        if (newContent !== content) {
          // Create backup
          const backupPath = itemPath + '.lazy-backup';
          if (!fs.existsSync(backupPath)) {
            fs.writeFileSync(backupPath, content, 'utf8');
          }
          
          // Write changes
          fs.writeFileSync(itemPath, newContent, 'utf8');
          imagesFixed++;
        }
      } catch (error) {
        console.error(`   Error processing ${itemPath}:`, error.message);
      }
    }
  }
}

checkImages(srcDir);
console.log(`   Images without lazy loading: ${imagesWithoutLazy}`);
console.log(`   Images fixed: ${imagesFixed}\n`);

// 2. Check for missing alt text
console.log('2. Checking for images without alt text...');
let imagesWithoutAlt = 0;

function checkAltText(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      checkAltText(itemPath);
    } else if (item.endsWith('.astro')) {
      try {
        const content = fs.readFileSync(itemPath, 'utf8');
        
        // Find img tags without alt attribute
        const imgRegex = /<img\s+([^>]*?)>/g;
        let match;
        
        while ((match = imgRegex.exec(content)) !== null) {
          const attributes = match[1];
          
          // Check if it has alt attribute
          if (!attributes.includes('alt=') && 
              !attributes.includes('alt="') && 
              !attributes.includes("alt='")) {
            
            imagesWithoutAlt++;
            console.log(`   Missing alt: ${path.relative(srcDir, itemPath)}`);
            break; // Just report first one per file
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }
}

checkAltText(srcDir);
console.log(`   Images without alt text: ${imagesWithoutAlt}\n`);

// 3. Check for WebP usage
console.log('3. Checking for WebP image usage...');
let webpUsage = {
  total: 0,
  withFallback: 0,
  withoutFallback: 0
};

function checkWebP(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      checkWebP(itemPath);
    } else if (item.endsWith('.astro')) {
      try {
        const content = fs.readFileSync(itemPath, 'utf8');
        
        // Check for .webp references
        if (content.includes('.webp')) {
          webpUsage.total++;
          
          // Check if it's used with picture tag (proper fallback)
          if (content.includes('<picture>') && content.includes('</picture>')) {
            webpUsage.withFallback++;
          } else {
            webpUsage.withoutFallback++;
            console.log(`   WebP without picture tag: ${path.relative(srcDir, itemPath)}`);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }
}

checkWebP(srcDir);
console.log(`   Total WebP references: ${webpUsage.total}`);
console.log(`   With proper fallback: ${webpUsage.withFallback}`);
console.log(`   Without fallback: ${webpUsage.withoutFallback}\n`);

// 4. Generate recommendations
console.log('📋 RECOMMENDATIONS FOR QUICK WINS:\n');

console.log('1. LAZY LOADING:');
if (imagesFixed > 0) {
  console.log(`   ✅ Added loading="lazy" to ${imagesFixed} images`);
} else if (imagesWithoutLazy > 0) {
  console.log(`   ⚠️  Found ${imagesWithoutLazy} images without lazy loading`);
  console.log('   Run this script again to fix them');
} else {
  console.log('   ✅ All images have lazy loading');
}

console.log('\n2. ALT TEXT (Accessibility):');
if (imagesWithoutAlt > 0) {
  console.log(`   ⚠️  Found ${imagesWithoutAlt} images without alt text`);
  console.log('   Add descriptive alt text for accessibility');
} else {
  console.log('   ✅ All images have alt text');
}

console.log('\n3. WEBP OPTIMIZATION:');
if (webpUsage.total > 0) {
  console.log(`   ✅ Using WebP format in ${webpUsage.total} places`);
  if (webpUsage.withoutFallback > 0) {
    console.log(`   ⚠️  ${webpUsage.withoutFallback} WebP images need fallback`);
    console.log('   Wrap in <picture> tag with JPEG/PNG fallback');
  }
} else {
  console.log('   ⚠️  Not using WebP format');
  console.log('   Convert images to WebP for better performance');
}

console.log('\n4. OTHER QUICK WINS:');
console.log('   • Add width and height attributes to all images');
console.log('   • Use srcset for responsive images');
console.log('   • Implement proper caching headers');
console.log('   • Minify JavaScript bundles');
console.log('   • Enable Brotli/Gzip compression');

console.log('\n5. HTML SNIPPET FOR WEBP WITH FALLBACK:');
console.log(`
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img 
    src="image.jpg" 
    alt="Descriptive alt text"
    loading="lazy"
    width="800"
    height="600"
  >
</picture>
`);

console.log('\n6. NEXT STEPS:');
console.log('   1. Test the site after lazy loading changes');
console.log('   2. Add alt text to images missing it');
console.log('   3. Implement WebP with fallback where needed');
console.log('   4. Run Lighthouse audit to measure improvements');
console.log('   5. Monitor Core Web Vitals');

console.log('\n✅ Quick wins analysis complete!');