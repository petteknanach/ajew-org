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

function findBackupDirectories(dir) {
  const backupDirs = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        if (item.toLowerCase().includes('backup')) {
          backupDirs.push(itemPath);
        }
        // Recursively search in subdirectories
        backupDirs.push(...findBackupDirectories(itemPath));
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }
  
  return backupDirs;
}

function findLargeFiles(dir, minSizeMB = 5) {
  const largeFiles = [];
  const minSizeBytes = minSizeMB * 1024 * 1024;
  
  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (stat.size > minSizeBytes) {
          largeFiles.push({
            path: itemPath,
            size: stat.size,
            relativePath: path.relative(publicDir, itemPath)
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning ${currentDir}:`, error.message);
    }
  }
  
  scanDirectory(dir);
  return largeFiles;
}

function findTIFFImages(dir) {
  const tiffFiles = [];
  
  function scanDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scanDirectory(itemPath);
        } else if (item.toLowerCase().endsWith('.tiff') || item.toLowerCase().endsWith('.tif')) {
          tiffFiles.push({
            path: itemPath,
            relativePath: path.relative(publicDir, itemPath)
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning ${currentDir}:`, error.message);
    }
  }
  
  scanDirectory(dir);
  return tiffFiles;
}

function createCleanupPlan() {
  console.log('=== AJEW.ORG CLEANUP PLAN ===\n');
  
  // Find backup directories
  const backupDirs = findBackupDirectories(publicDir);
  console.log(`Found ${backupDirs.length} backup directories:`);
  let backupTotalSize = 0;
  
  for (const dir of backupDirs) {
    try {
      const stats = fs.statSync(dir);
      console.log(`  - ${path.relative(publicDir, dir)}`);
    } catch (error) {
      console.log(`  - ${path.relative(publicDir, dir)} (error: ${error.message})`);
    }
  }
  
  // Find large files (>5MB)
  const largeFiles = findLargeFiles(publicDir, 5);
  console.log(`\nFound ${largeFiles.length} files larger than 5MB:`);
  
  let largeFilesTotalSize = 0;
  for (const file of largeFiles.slice(0, 10)) { // Show first 10
    console.log(`  - ${file.relativePath} (${formatBytes(file.size)})`);
    largeFilesTotalSize += file.size;
  }
  
  if (largeFiles.length > 10) {
    console.log(`  ... and ${largeFiles.length - 10} more`);
  }
  
  // Find TIFF images
  const tiffFiles = findTIFFImages(publicDir);
  console.log(`\nFound ${tiffFiles.length} TIFF images:`);
  
  for (const file of tiffFiles) {
    console.log(`  - ${file.relativePath}`);
  }
  
  // Calculate total savings
  console.log('\n=== POTENTIAL SAVINGS ===');
  console.log(`Backup directories: ${backupDirs.length} directories`);
  console.log(`Large files (>5MB): ${largeFiles.length} files (${formatBytes(largeFilesTotalSize)})`);
  console.log(`TIFF images: ${tiffFiles.length} files`);
  
  // Generate cleanup commands
  console.log('\n=== CLEANUP COMMANDS ===');
  console.log('\n// Remove backup directories:');
  for (const dir of backupDirs) {
    const relativePath = path.relative(process.cwd(), dir);
    console.log(`// rm -rf "${relativePath}"`);
  }
  
  console.log('\n// Consider moving large text files to CDN or external storage');
  console.log('// and converting TIFF images to WebP format.');
  
  // Create a safe cleanup script
  console.log('\n=== SAFE CLEANUP SCRIPT ===');
  console.log(`
// Save this as cleanup-safe.js and run it
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');

// List of backup directories to remove (relative to publicDir)
const backupDirsToRemove = [
${backupDirs.map(dir => `  "${path.relative(publicDir, dir)}"`).join(',\n')}
];

// List of TIFF files to convert (relative to publicDir)
const tiffFilesToConvert = [
${tiffFiles.map(file => `  "${file.relativePath}"`).join(',\n')}
];

console.log('This script would:');
console.log(\`1. Remove \${backupDirsToRemove.length} backup directories\`);
console.log(\`2. Convert \${tiffFilesToConvert.length} TIFF files to WebP\`);
console.log('\\nRun in dry-run mode first to see what would be deleted.');
`);
}

// Run the analysis
createCleanupPlan();