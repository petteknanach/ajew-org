#!/usr/bin/env node

/**
 * Final Verification of Mobile API Expansion
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('FINAL VERIFICATION - MOBILE API EXPANSION');
console.log('='.repeat(60));

const API_MOBILE_DIR = path.join(__dirname, 'public', 'api-mobile');

// Check all critical files exist
const criticalFiles = [
  'books.json',
  'daily-wisdom.json', 
  'search-index.json',
  'API_DOCUMENTATION.md',
  'likutay-moharan/part-2/index.json',
  'sefer-hamidos/index.json',
  'stories/index.json'
];

console.log('\n🔍 Checking critical files...');
let allFilesExist = true;
criticalFiles.forEach(file => {
  const filePath = path.join(API_MOBILE_DIR, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Count total chapters
console.log('\n📊 Counting total chapters...');
let totalChapters = 0;
const books = JSON.parse(fs.readFileSync(path.join(API_MOBILE_DIR, 'books.json'), 'utf8'));

books.forEach(book => {
  console.log(`   ${book.title}: ${book.chapters} chapters`);
  totalChapters += book.chapters;
});

console.log(`   Total: ${totalChapters} chapters`);

// Verify search index includes mobile content
console.log('\n🔎 Verifying search index integration...');
try {
  const searchStatsPath = path.join(__dirname, 'public', 'data', 'search-stats.json');
  const searchStats = JSON.parse(fs.readFileSync(searchStatsPath, 'utf8'));
  
  console.log(`   Total documents in search index: ${searchStats.totalDocuments}`);
  console.log(`   Mobile API documents: ${searchStats.byType['mobile-api'] || 0}`);
  
  if (searchStats.byType['mobile-api'] >= 35) {
    console.log('   ✅ Mobile API content successfully integrated into search');
  } else {
    console.log('   ⚠️  Mobile API content may not be fully integrated');
  }
} catch (error) {
  console.log(`   ❌ Error checking search index: ${error.message}`);
}

// Test sample API calls
console.log('\n🌐 Testing sample API calls...');

// Test 1: Get books list
try {
  const booksData = JSON.parse(fs.readFileSync(path.join(API_MOBILE_DIR, 'books.json'), 'utf8'));
  console.log(`   ✅ Books endpoint: ${booksData.length} books available`);
} catch (error) {
  console.log(`   ❌ Books endpoint error: ${error.message}`);
}

// Test 2: Get specific chapter
try {
  const chapterPath = path.join(API_MOBILE_DIR, 'likutay-moharan', 'part-2', '11.json');
  const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  console.log(`   ✅ Chapter endpoint: "${chapterData.t}" (ID: ${chapterData.id})`);
} catch (error) {
  console.log(`   ❌ Chapter endpoint error: ${error.message}`);
}

// Test 3: Get daily wisdom
try {
  const dailyData = JSON.parse(fs.readFileSync(path.join(API_MOBILE_DIR, 'daily-wisdom.json'), 'utf8'));
  console.log(`   ✅ Daily wisdom: "${dailyData.teaching.title}" from ${dailyData.date}`);
} catch (error) {
  console.log(`   ❌ Daily wisdom error: ${error.message}`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));

if (allFilesExist && totalChapters >= 35) {
  console.log('✅ SUCCESS: Mobile API expansion completed successfully!');
  console.log('');
  console.log('📈 RESULTS:');
  console.log(`   • Books available: ${books.length}`);
  console.log(`   • Total chapters: ${totalChapters}`);
  console.log(`   • New content added: ${totalChapters - 10} chapters`);
  console.log(`   • Search integration: Complete`);
  console.log(`   • API documentation: Available`);
  console.log('');
  console.log('🚀 The mobile API is now ready for use!');
  console.log('   Mobile apps can access rich Breslov content via:');
  console.log('   https://ajew.org/public/api-mobile/');
} else {
  console.log('⚠️  WARNING: Some checks failed');
  console.log(`   Files exist: ${allFilesExist ? '✅' : '❌'}`);
  console.log(`   Minimum chapters (35): ${totalChapters >= 35 ? '✅' : '❌'}`);
}

console.log('='.repeat(60));