import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

// Configuration - SET TO FALSE TO ACTUALLY DELETE
const DRY_RUN = false; // WARNING: Set to false to actually delete files

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

console.log('=== AJEW.ORG PUBLIC DIRECTORY CLEANUP ===\n');

if (DRY_RUN) {
  console.log('🚧 DRY RUN MODE - No files will be modified');
  console.log('To actually clean up, set DRY_RUN = false in the script\n');
} else {
  console.log('⚠️  WARNING: This will DELETE files from the public directory!');
  console.log('Make sure you have backups before proceeding.\n');
}

// Target: Remove the backup directory
const backupDir = path.join(publicDir, 'books', 'backup_2026-03-10_1550');

if (!fs.existsSync(backupDir)) {
  console.log('Backup directory not found:', backupDir);
  process.exit(0);
}

// Calculate size before deletion
function calculateDirectorySize(dir) {
  let totalSize = 0;
  
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        totalSize += calculateDirectorySize(itemPath);
      } else {
        totalSize += stat.size;
      }
    }
  } catch (error) {
    console.error(`Error calculating size for ${dir}:`, error.message);
  }
  
  return totalSize;
}

const backupSize = calculateDirectorySize(backupDir);
console.log(`Found backup directory: ${path.relative(publicDir, backupDir)}`);
console.log(`Size: ${formatBytes(backupSize)}`);
console.log(`Contains: ${fs.readdirSync(backupDir).length} items`);

// Ask for confirmation (in dry run mode, we just show what would happen)
if (!DRY_RUN) {
  console.log('\nAre you sure you want to delete this directory? (yes/no)');
  // For safety, we'll exit and let the user run the actual command
  console.log('\nTo actually delete, run:');
  console.log(`rm -rf "${backupDir}"`);
  console.log('\nOr use Windows command:');
  console.log(`rmdir /s /q "${backupDir}"`);
  process.exit(0);
}

// Dry run - show what would be deleted
console.log('\n📁 Would delete backup directory structure:');
function listDirectory(dir, indent = '  ') {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      const relativePath = path.relative(publicDir, itemPath);
      
      if (stat.isDirectory()) {
        console.log(`${indent}📁 ${item}/`);
        listDirectory(itemPath, indent + '  ');
      } else {
        console.log(`${indent}📄 ${item} (${formatBytes(stat.size)})`);
      }
    }
  } catch (error) {
    console.log(`${indent}⚠️  Error reading: ${error.message}`);
  }
}

listDirectory(backupDir);

console.log(`\n✅ Would free up: ${formatBytes(backupSize)}`);
console.log('\nTo actually delete, set DRY_RUN = false and run again.');

// Also check for other optimizations
console.log('\n=== OTHER OPTIMIZATION OPPORTUNITIES ===');

// Check for TIFF images
function findTIFFImages(dir) {
  const tiffFiles = [];
  
  function scan(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scan(itemPath);
        } else if (item.toLowerCase().endsWith('.tiff') || item.toLowerCase().endsWith('.tif')) {
          tiffFiles.push({
            path: itemPath,
            size: stat.size,
            relativePath: path.relative(publicDir, itemPath)
          });
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }
  
  scan(dir);
  return tiffFiles;
}

const tiffFiles = findTIFFImages(publicDir);
if (tiffFiles.length > 0) {
  console.log('\n🖼️  TIFF images found (convert to WebP for better performance):');
  for (const file of tiffFiles) {
    console.log(`  - ${file.relativePath} (${formatBytes(file.size)})`);
  }
}

console.log('\n=== NEXT STEPS ===');
console.log('1. Remove backup directory (immediate ~400MB savings)');
console.log('2. Convert TIFF to WebP format');
console.log('3. Consider moving large text files to CDN');
console.log('4. Run build to verify size reduction');