import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const publicDir = path.join(process.cwd(), 'public');
const magickPath = 'C:\\Program Files\\ImageMagick-7.1.2-Q16-HDRI\\magick.exe';

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Find large JPG images (>1MB)
function findLargeImages() {
  const largeImages = [];
  
  function scan(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scan(itemPath);
      } else if (item.toLowerCase().endsWith('.jpg') || item.toLowerCase().endsWith('.jpeg')) {
        if (stat.size > 1024 * 1024) { // >1MB
          largeImages.push({
            path: itemPath,
            size: stat.size,
            name: item
          });
        }
      }
    }
  }
  
  scan(publicDir);
  return largeImages.sort((a, b) => b.size - a.size).slice(0, 10); // Top 10 largest
}

function optimizeImage(inputPath, outputPath = null) {
  if (!outputPath) {
    outputPath = inputPath; // Overwrite original
  }
  
  try {
    const command = `"${magickPath}" convert "${inputPath}" -strip -interlace Plane -quality 85% "${outputPath}"`;
    console.log(`Optimizing: ${path.relative(publicDir, inputPath)}`);
    execSync(command, { stdio: 'pipe' });
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    const savings = originalSize - optimizedSize;
    const percent = ((savings / originalSize) * 100).toFixed(1);
    
    console.log(`  ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${percent}% savings)`);
    
    return { originalSize, optimizedSize, savings, percent };
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return null;
  }
}

function createWebP(inputPath) {
  const webpPath = inputPath.replace(/\.(jpg|jpeg)$/i, '.webp');
  
  try {
    const command = `"${magickPath}" convert "${inputPath}" -quality 85 "${webpPath}"`;
    console.log(`Creating WebP: ${path.relative(publicDir, webpPath)}`);
    execSync(command, { stdio: 'pipe' });
    
    const originalSize = fs.statSync(inputPath).size;
    const webpSize = fs.statSync(webpPath).size;
    const savings = originalSize - webpSize;
    const percent = ((savings / originalSize) * 100).toFixed(1);
    
    console.log(`  ${formatBytes(originalSize)} → ${formatBytes(webpSize)} (${percent}% savings)`);
    
    return { originalSize, webpSize, savings, percent, webpPath };
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🖼️  Optimizing large images...\n');
  
  const largeImages = findLargeImages();
  console.log(`Found ${largeImages.length} large JPG images to optimize:\n`);
  
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let totalWebPSize = 0;
  const webpFiles = [];
  
  for (const image of largeImages) {
    console.log(`${path.relative(publicDir, image.path)} (${formatBytes(image.size)})`);
  }
  
  console.log('\n=== OPTIMIZING ORIGINAL JPG FILES ===');
  for (const image of largeImages) {
    const result = optimizeImage(image.path);
    if (result) {
      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.optimizedSize;
    }
  }
  
  console.log('\n=== CREATING WEBP VERSIONS ===');
  for (const image of largeImages) {
    const result = createWebP(image.path);
    if (result) {
      totalWebPSize += result.webpSize;
      webpFiles.push(result.webpPath);
    }
  }
  
  // Summary
  console.log('\n📊 OPTIMIZATION SUMMARY');
  console.log('='.repeat(50));
  
  const jpgSavings = totalOriginalSize - totalOptimizedSize;
  const jpgPercent = ((jpgSavings / totalOriginalSize) * 100).toFixed(1);
  
  const webpSavings = totalOriginalSize - totalWebPSize;
  const webpPercent = ((webpSavings / totalOriginalSize) * 100).toFixed(1);
  
  console.log(`Original JPG size: ${formatBytes(totalOriginalSize)}`);
  console.log(`Optimized JPG size: ${formatBytes(totalOptimizedSize)} (${jpgPercent}% savings)`);
  console.log(`WebP size: ${formatBytes(totalWebPSize)} (${webpPercent}% savings)`);
  console.log(`Total files processed: ${largeImages.length}`);
  console.log(`WebP files created: ${webpFiles.length}`);
  
  // Generate HTML snippet for using WebP with fallback
  console.log('\n💡 HTML SNIPPET FOR WEBP WITH FALLBACK:');
  console.log('='.repeat(50));
  
  if (webpFiles.length > 0) {
    const example = webpFiles[0];
    const relativePath = path.relative(publicDir, example);
    const jpgPath = example.replace('.webp', '.jpg');
    const jpgRelative = path.relative(publicDir, jpgPath);
    
    console.log(`
<!-- For image: ${jpgRelative} -->
<picture>
  <source srcset="/${relativePath.replace(/\\/g, '/')}" type="image/webp">
  <source srcset="/${jpgRelative.replace(/\\/g, '/')}" type="image/jpeg">
  <img 
    src="/${jpgRelative.replace(/\\/g, '/')}" 
    alt="Description" 
    loading="lazy"
    width="800" 
    height="600"
  >
</picture>
`);
  }
  
  console.log('\n✅ Optimization complete!');
  console.log('\nNext steps:');
  console.log('1. Update your HTML to use WebP with fallback (see snippet above)');
  console.log('2. Add loading="lazy" to all images');
  console.log('3. Consider removing the original TIFF file if no longer needed');
  console.log('4. Run build to see the size reduction');
}

main().catch(console.error);