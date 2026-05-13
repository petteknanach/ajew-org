import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

// Configuration
const DRY_RUN = true; // Set to false to actually delete files
const MIN_FILE_SIZE_MB = 10; // Files larger than this will be listed for review

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

class CleanupManager {
  constructor() {
    this.stats = {
      backupDirsFound: 0,
      backupDirsSize: 0,
      largeFilesFound: 0,
      largeFilesSize: 0,
      tiffFilesFound: 0,
      tiffFilesSize: 0
    };
    
    this.itemsToRemove = {
      backupDirs: [],
      largeFiles: [], // For review only, not auto-deleted
      tiffFiles: [] // For conversion, not deletion
    };
  }
  
  scan() {
    console.log('🔍 Scanning public directory...\n');
    this.findBackupDirectories();
    this.findLargeFiles();
    this.findTIFFImages();
  }
  
  findBackupDirectories() {
    console.log('Looking for backup directories...');
    
    function scan(dir) {
      const items = fs.readdirSync(dir);
      const backups = [];
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          if (item.toLowerCase().includes('backup')) {
            backups.push(itemPath);
          }
          backups.push(...scan(itemPath));
        }
      }
      
      return backups;
    }
    
    this.itemsToRemove.backupDirs = scan(publicDir);
    this.stats.backupDirsFound = this.itemsToRemove.backupDirs.length;
    
    // Calculate total size of backup directories
    for (const dir of this.itemsToRemove.backupDirs) {
      try {
        const size = this.calculateDirectorySize(dir);
        this.stats.backupDirsSize += size;
      } catch (error) {
        console.log(`  Warning: Could not calculate size for ${path.relative(publicDir, dir)}`);
      }
    }
    
    console.log(`  Found ${this.stats.backupDirsFound} backup directories (${formatBytes(this.stats.backupDirsSize)})`);
  }
  
  findLargeFiles() {
    console.log(`\nLooking for files larger than ${MIN_FILE_SIZE_MB}MB...`);
    const minSizeBytes = MIN_FILE_SIZE_MB * 1024 * 1024;
    
    function scan(dir) {
      const largeFiles = [];
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          largeFiles.push(...scan(itemPath));
        } else if (stat.size > minSizeBytes) {
          largeFiles.push({
            path: itemPath,
            size: stat.size,
            relativePath: path.relative(publicDir, itemPath)
          });
        }
      }
      
      return largeFiles;
    }
    
    this.itemsToRemove.largeFiles = scan(publicDir);
    this.stats.largeFilesFound = this.itemsToRemove.largeFiles.length;
    this.stats.largeFilesSize = this.itemsToRemove.largeFiles.reduce((sum, file) => sum + file.size, 0);
    
    console.log(`  Found ${this.stats.largeFilesFound} large files (${formatBytes(this.stats.largeFilesSize)})`);
  }
  
  findTIFFImages() {
    console.log('\nLooking for TIFF images...');
    
    function scan(dir) {
      const tiffFiles = [];
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          tiffFiles.push(...scan(itemPath));
        } else if (item.toLowerCase().endsWith('.tiff') || item.toLowerCase().endsWith('.tif')) {
          tiffFiles.push({
            path: itemPath,
            size: stat.size,
            relativePath: path.relative(publicDir, itemPath)
          });
        }
      }
      
      return tiffFiles;
    }
    
    this.itemsToRemove.tiffFiles = scan(publicDir);
    this.stats.tiffFilesFound = this.itemsToRemove.tiffFiles.length;
    this.stats.tiffFilesSize = this.itemsToRemove.tiffFiles.reduce((sum, file) => sum + file.size, 0);
    
    console.log(`  Found ${this.stats.tiffFilesFound} TIFF images (${formatBytes(this.stats.tiffFilesSize)})`);
  }
  
  calculateDirectorySize(dir) {
    let totalSize = 0;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        totalSize += this.calculateDirectorySize(itemPath);
      } else {
        totalSize += stat.size;
      }
    }
    
    return totalSize;
  }
  
  displaySummary() {
    console.log('\n📊 CLEANUP SUMMARY');
    console.log('='.repeat(50));
    
    const totalSavings = this.stats.backupDirsSize + this.stats.largeFilesSize;
    
    console.log(`Backup directories: ${this.stats.backupDirsFound} (${formatBytes(this.stats.backupDirsSize)})`);
    console.log(`Large files (>${MIN_FILE_SIZE_MB}MB): ${this.stats.largeFilesFound} (${formatBytes(this.stats.largeFilesSize)})`);
    console.log(`TIFF images: ${this.stats.tiffFilesFound} (${formatBytes(this.stats.tiffFilesSize)})`);
    console.log('-'.repeat(50));
    console.log(`Total potential savings: ${formatBytes(totalSavings)}`);
    
    if (this.stats.backupDirsFound > 0) {
      console.log('\n📁 Backup directories to remove:');
      for (const dir of this.itemsToRemove.backupDirs) {
        console.log(`  - ${path.relative(publicDir, dir)}`);
      }
    }
    
    if (this.stats.largeFilesFound > 0) {
      console.log(`\n📄 Large files (>${MIN_FILE_SIZE_MB}MB) for review:`);
      const sortedFiles = this.itemsToRemove.largeFiles.sort((a, b) => b.size - a.size);
      for (const file of sortedFiles.slice(0, 10)) {
        console.log(`  - ${file.relativePath} (${formatBytes(file.size)})`);
      }
      if (sortedFiles.length > 10) {
        console.log(`  ... and ${sortedFiles.length - 10} more`);
      }
    }
    
    if (this.stats.tiffFilesFound > 0) {
      console.log('\n🖼️  TIFF images to convert to WebP:');
      for (const file of this.itemsToRemove.tiffFiles) {
        console.log(`  - ${file.relativePath} (${formatBytes(file.size)})`);
      }
    }
  }
  
  executeCleanup() {
    if (DRY_RUN) {
      console.log('\n🚧 DRY RUN MODE - No files will be modified');
      console.log('Set DRY_RUN = false to actually clean up\n');
      return;
    }
    
    console.log('\n🧹 Executing cleanup...');
    
    // Remove backup directories
    if (this.itemsToRemove.backupDirs.length > 0) {
      console.log('\nRemoving backup directories:');
      for (const dir of this.itemsToRemove.backupDirs) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`  ✓ Removed: ${path.relative(publicDir, dir)}`);
        } catch (error) {
          console.log(`  ✗ Error removing ${path.relative(publicDir, dir)}: ${error.message}`);
        }
      }
    }
    
    // Note: Large files and TIFF images are not auto-deleted
    // They need manual review and conversion
    
    console.log('\n✅ Cleanup complete!');
    console.log('\nNext steps:');
    console.log('1. Review large files and consider moving to CDN');
    console.log('2. Convert TIFF images to WebP format');
    console.log('3. Run build again to see size reduction');
  }
}

// Main execution
async function main() {
  const cleanup = new CleanupManager();
  
  try {
    cleanup.scan();
    cleanup.displaySummary();
    cleanup.executeCleanup();
    
    // Generate recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Remove backup directories (safe, immediate savings)');
    console.log('2. Convert TIFF to WebP (image optimization)');
    console.log('3. Move large text files to CDN (requires code changes)');
    console.log('4. Implement image optimization pipeline');
    console.log('5. Add .gitignore rules to prevent future issues');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

main();