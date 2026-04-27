import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeDirectory(dir, depth = 0) {
  const results = {
    totalFiles: 0,
    totalSize: 0,
    byExtension: {},
    largeFiles: []
  };

  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        if (depth < 3) { // Limit recursion depth
          const subResults = analyzeDirectory(itemPath, depth + 1);
          results.totalFiles += subResults.totalFiles;
          results.totalSize += subResults.totalSize;
          
          // Merge extension data
          for (const [ext, data] of Object.entries(subResults.byExtension)) {
            if (!results.byExtension[ext]) {
              results.byExtension[ext] = { count: 0, size: 0 };
            }
            results.byExtension[ext].count += data.count;
            results.byExtension[ext].size += data.size;
          }
          
          // Merge large files
          results.largeFiles.push(...subResults.largeFiles);
        }
      } else {
        results.totalFiles++;
        results.totalSize += stat.size;
        
        const ext = path.extname(item).toLowerCase() || '(no extension)';
        if (!results.byExtension[ext]) {
          results.byExtension[ext] = { count: 0, size: 0 };
        }
        results.byExtension[ext].count++;
        results.byExtension[ext].size += stat.size;
        
        // Track files larger than 1MB
        if (stat.size > 1024 * 1024) {
          results.largeFiles.push({
            path: itemPath.replace(publicDir + path.sep, ''),
            size: stat.size,
            formattedSize: formatBytes(stat.size)
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${dir}:`, error.message);
  }
  
  return results;
}

function generateReport(results) {
  console.log('=== AJEW.ORG PUBLIC DIRECTORY ANALYSIS ===\n');
  
  console.log(`Total Files: ${results.totalFiles}`);
  console.log(`Total Size: ${formatBytes(results.totalSize)}\n`);
  
  console.log('Files by Extension:');
  console.log('-------------------');
  const sortedExtensions = Object.entries(results.byExtension)
    .sort((a, b) => b[1].size - a[1].size);
  
  for (const [ext, data] of sortedExtensions) {
    const percentage = ((data.size / results.totalSize) * 100).toFixed(1);
    console.log(`${ext.padEnd(15)} ${data.count.toString().padStart(6)} files | ${formatBytes(data.size).padStart(12)} | ${percentage}%`);
  }
  
  console.log('\nLarge Files (>1MB):');
  console.log('-------------------');
  const sortedLargeFiles = results.largeFiles.sort((a, b) => b.size - a.size);
  
  for (const file of sortedLargeFiles.slice(0, 20)) {
    console.log(`${formatBytes(file.size).padStart(10)} ${file.path}`);
  }
  
  if (sortedLargeFiles.length > 20) {
    console.log(`... and ${sortedLargeFiles.length - 20} more large files`);
  }
  
  // Generate recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  
  const txtSize = results.byExtension['.txt']?.size || 0;
  const imageSize = (results.byExtension['.tiff']?.size || 0) + 
                   (results.byExtension['.jpg']?.size || 0) + 
                   (results.byExtension['.jpeg']?.size || 0) +
                   (results.byExtension['.png']?.size || 0);
  
  if (txtSize > 100 * 1024 * 1024) { // >100MB
    console.log('❌ CRITICAL: Large text files detected (>100MB total)');
    console.log('   Recommendation: Move text files to CDN or external storage');
  }
  
  if (results.byExtension['.tiff']?.size > 0) {
    console.log('❌ CRITICAL: TIFF images detected (not web-optimized)');
    console.log('   Recommendation: Convert to WebP format');
  }
  
  if (imageSize > 50 * 1024 * 1024) { // >50MB
    console.log('⚠️  WARNING: Large images detected (>50MB total)');
    console.log('   Recommendation: Optimize and convert to WebP');
  }
  
  // Check for backup directories
  const backupDirs = [];
  try {
    const items = fs.readdirSync(publicDir);
    for (const item of items) {
      const itemPath = path.join(publicDir, item);
      if (fs.statSync(itemPath).isDirectory() && item.toLowerCase().includes('backup')) {
        backupDirs.push(item);
      }
    }
  } catch (error) {
    // Ignore
  }
  
  if (backupDirs.length > 0) {
    console.log('⚠️  WARNING: Backup directories found in public folder:');
    for (const dir of backupDirs) {
      console.log(`   - ${dir}`);
    }
    console.log('   Recommendation: Remove backup directories from public folder');
  }
  
  console.log('\n=== QUICK WINS ===');
  console.log('1. Remove backup_* directories from public/');
  console.log('2. Convert TIFF to WebP format');
  console.log('3. Move large text files to external storage/CDN');
  console.log('4. Implement image optimization pipeline');
}

// Run analysis
console.log('Analyzing public directory...');
const results = analyzeDirectory(publicDir);
generateReport(results);