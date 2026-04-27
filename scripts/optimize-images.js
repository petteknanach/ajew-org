import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

// Check if ImageMagick is installed
function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    try {
      execSync('convert --version', { stdio: 'pipe' });
      return true;
    } catch (error2) {
      return false;
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

class ImageOptimizer {
  constructor() {
    this.hasImageMagick = checkImageMagick();
    this.stats = {
      totalImages: 0,
      totalSize: 0,
      byFormat: {},
      optimizable: []
    };
  }
  
  scanImages() {
    console.log('🔍 Scanning for images...\n');
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.bmp', '.webp'];
    
    function scan(dir) {
      const images = [];
      
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            images.push(...scan(itemPath));
          } else {
            const ext = path.extname(item).toLowerCase();
            if (imageExtensions.includes(ext)) {
              images.push({
                path: itemPath,
                size: stat.size,
                ext: ext,
                relativePath: path.relative(publicDir, itemPath)
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${dir}:`, error.message);
      }
      
      return images;
    }
    
    const allImages = scan(publicDir);
    this.stats.totalImages = allImages.length;
    this.stats.totalSize = allImages.reduce((sum, img) => sum + img.size, 0);
    
    // Group by format
    for (const img of allImages) {
      if (!this.stats.byFormat[img.ext]) {
        this.stats.byFormat[img.ext] = { count: 0, size: 0 };
      }
      this.stats.byFormat[img.ext].count++;
      this.stats.byFormat[img.ext].size += img.size;
    }
    
    // Identify optimizable images
    for (const img of allImages) {
      if (['.tiff', '.tif', '.bmp'].includes(img.ext)) {
        this.stats.optimizable.push({
          ...img,
          recommendation: 'Convert to WebP',
          potentialSavings: img.size * 0.7 // Estimate 70% savings
        });
      } else if (['.jpg', '.jpeg', '.png'].includes(img.ext) && img.size > 1024 * 1024) {
        this.stats.optimizable.push({
          ...img,
          recommendation: 'Optimize and convert to WebP',
          potentialSavings: img.size * 0.5 // Estimate 50% savings
        });
      }
    }
  }
  
  displayReport() {
    console.log('📊 IMAGE ANALYSIS REPORT');
    console.log('='.repeat(50));
    
    console.log(`Total images: ${this.stats.totalImages}`);
    console.log(`Total size: ${formatBytes(this.stats.totalSize)}\n`);
    
    console.log('Images by format:');
    console.log('-----------------');
    const sortedFormats = Object.entries(this.stats.byFormat)
      .sort((a, b) => b[1].size - a[1].size);
    
    for (const [format, data] of sortedFormats) {
      const percentage = ((data.size / this.stats.totalSize) * 100).toFixed(1);
      console.log(`${format.padEnd(10)} ${data.count.toString().padStart(5)} images | ${formatBytes(data.size).padStart(12)} | ${percentage}%`);
    }
    
    if (this.stats.optimizable.length > 0) {
      console.log(`\n🎯 ${this.stats.optimizable.length} optimizable images found:`);
      console.log('-' .repeat(50));
      
      const totalPotentialSavings = this.stats.optimizable.reduce((sum, img) => sum + img.potentialSavings, 0);
      
      // Group by recommendation
      const byRecommendation = {};
      for (const img of this.stats.optimizable) {
        if (!byRecommendation[img.recommendation]) {
          byRecommendation[img.recommendation] = [];
        }
        byRecommendation[img.recommendation].push(img);
      }
      
      for (const [recommendation, images] of Object.entries(byRecommendation)) {
        const groupSize = images.reduce((sum, img) => sum + img.size, 0);
        const groupSavings = images.reduce((sum, img) => sum + img.potentialSavings, 0);
        
        console.log(`\n${recommendation}:`);
        console.log(`  ${images.length} images | ${formatBytes(groupSize)} | Potential savings: ${formatBytes(groupSavings)}`);
        
        // Show top 5 largest images in this category
        const sorted = images.sort((a, b) => b.size - a.size).slice(0, 5);
        for (const img of sorted) {
          console.log(`    - ${img.relativePath} (${formatBytes(img.size)})`);
        }
        if (images.length > 5) {
          console.log(`    ... and ${images.length - 5} more`);
        }
      }
      
      console.log(`\n💾 Total potential savings: ${formatBytes(totalPotentialSavings)}`);
    } else {
      console.log('\n✅ All images are already optimized!');
    }
    
    // Check for ImageMagick
    console.log('\n🔧 TOOLS CHECK:');
    if (this.hasImageMagick) {
      console.log('✅ ImageMagick is installed');
    } else {
      console.log('❌ ImageMagick is not installed');
      console.log('   Install it from: https://imagemagick.org/script/download.php');
      console.log('   Or use: winget install ImageMagick.ImageMagick');
    }
  }
  
  generateOptimizationCommands() {
    if (!this.hasImageMagick) {
      console.log('\n⚠️  ImageMagick is required for optimization commands');
      return;
    }
    
    console.log('\n🛠️  OPTIMIZATION COMMANDS:');
    console.log('='.repeat(50));
    
    // TIFF to WebP conversion
    const tiffImages = this.stats.optimizable.filter(img => img.ext === '.tiff' || img.ext === '.tif');
    if (tiffImages.length > 0) {
      console.log('\n# Convert TIFF to WebP:');
      for (const img of tiffImages) {
        const webpPath = img.path.replace(/\.(tiff|tif)$/i, '.webp');
        console.log(`magick convert "${img.path}" -quality 85 "${webpPath}"`);
      }
    }
    
    // Large JPG/PNG optimization
    const largeImages = this.stats.optimizable.filter(img => 
      (img.ext === '.jpg' || img.ext === '.jpeg' || img.ext === '.png') && 
      img.size > 1024 * 1024
    );
    
    if (largeImages.length > 0) {
      console.log('\n# Optimize large JPG/PNG images:');
      for (const img of largeImages) {
        if (img.ext === '.jpg' || img.ext === '.jpeg') {
          console.log(`magick convert "${img.path}" -strip -interlace Plane -gaussian-blur 0.05 -quality 85% "${img.path}"`);
        } else if (img.ext === '.png') {
          console.log(`magick convert "${img.path}" -strip "${img.path}"`);
        }
      }
      
      console.log('\n# Convert optimized images to WebP:');
      for (const img of largeImages) {
        const webpPath = img.path.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        console.log(`magick convert "${img.path}" -quality 85 "${webpPath}"`);
      }
    }
    
    // Batch optimization script
    console.log('\n# Batch optimization script (save as optimize-all.sh):');
    console.log('#!/bin/bash');
    console.log('echo "Starting image optimization..."');
    
    if (tiffImages.length > 0) {
      console.log('\necho "Converting TIFF images to WebP..."');
      for (const img of tiffImages) {
        const webpPath = img.path.replace(/\.(tiff|tif)$/i, '.webp');
        const relativePath = img.relativePath.replace(/\\/g, '/');
        const relativeWebpPath = webpPath.replace(/\\/g, '/').replace(/^.*?public\//, '');
        console.log(`echo "  ${relativePath} -> ${relativeWebpPath}"`);
        console.log(`magick convert "${img.path}" -quality 85 "${webpPath}"`);
      }
    }
    
    console.log('\necho "Optimization complete!"');
  }
  
  generateNextSteps() {
    console.log('\n📋 NEXT STEPS FOR IMAGE OPTIMIZATION:');
    console.log('='.repeat(50));
    
    console.log('\n1. INSTALL ImageMagick (if not installed):');
    console.log('   Windows: winget install ImageMagick.ImageMagick');
    console.log('   macOS: brew install imagemagick');
    console.log('   Linux: sudo apt-get install imagemagick');
    
    console.log('\n2. CONVERT TIFF images to WebP:');
    console.log('   - Better compression (70-90% smaller)');
    console.log('   - Modern browser support');
    console.log('   - Transparency support');
    
    console.log('\n3. OPTIMIZE large JPG/PNG images:');
    console.log('   - Strip metadata');
    console.log('   - Adjust quality (85% is usually optimal)');
    console.log('   - Consider converting to WebP');
    
    console.log('\n4. UPDATE code to use WebP with fallbacks:');
    console.log('   ```html');
    console.log('   <picture>');
    console.log('     <source srcset="image.webp" type="image/webp">');
    console.log('     <source srcset="image.jpg" type="image/jpeg">');
    console.log('     <img src="image.jpg" alt="Description">');
    console.log('   </picture>');
    console.log('   ```');
    
    console.log('\n5. IMPLEMENT lazy loading:');
    console.log('   ```html');
    console.log('   <img src="image.jpg" loading="lazy" alt="Description">');
    console.log('   ```');
    
    console.log('\n6. SET UP responsive images:');
    console.log('   - Generate multiple sizes (1x, 2x, 3x)');
    console.log('   - Use srcset attribute');
    console.log('   - Specify sizes attribute');
  }
}

// Main execution
async function main() {
  const optimizer = new ImageOptimizer();
  
  try {
    optimizer.scanImages();
    optimizer.displayReport();
    optimizer.generateOptimizationCommands();
    optimizer.generateNextSteps();
    
  } catch (error) {
    console.error('Error during image analysis:', error);
    process.exit(1);
  }
}

main();