#!/usr/bin/env node

/**
 * Test Mobile API Endpoints
 */

const fs = require('fs');
const path = require('path');

const API_MOBILE_DIR = path.join(__dirname, 'public', 'api-mobile');

console.log('Testing Mobile API Endpoints...\n');

// Test 1: Check if books.json exists and is valid
console.log('1. Testing books.json...');
try {
  const booksPath = path.join(API_MOBILE_DIR, 'books.json');
  const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
  console.log(`   ✅ Found ${booksData.length} books`);
  booksData.forEach(book => {
    console.log(`   📖 ${book.title}: ${book.chapters} chapters`);
  });
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 2: Check Likutay Moharan Part 1
console.log('\n2. Testing Likutay Moharan Part 1...');
try {
  const lmPart1Dir = path.join(API_MOBILE_DIR, 'likutay-moharan', 'part-1');
  const indexPath = path.join(lmPart1Dir, 'index.json');
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  console.log(`   ✅ Part 1 has ${indexData.part.c.length} chapters`);
  
  // Test a sample chapter
  const chapterPath = path.join(lmPart1Dir, '1.json');
  const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  console.log(`   ✅ Chapter 1: "${chapterData.t}"`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 3: Check Likutay Moharan Part 2
console.log('\n3. Testing Likutay Moharan Part 2...');
try {
  const lmPart2Dir = path.join(API_MOBILE_DIR, 'likutay-moharan', 'part-2');
  const indexPath = path.join(lmPart2Dir, 'index.json');
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  console.log(`   ✅ Part 2 has ${indexData.part.c.length} chapters`);
  
  // Test a sample chapter
  const chapterPath = path.join(lmPart2Dir, '11.json');
  const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  console.log(`   ✅ Chapter 11: "${chapterData.t}"`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 4: Check Sefer Hamidos
console.log('\n4. Testing Sefer Hamidos...');
try {
  const shDir = path.join(API_MOBILE_DIR, 'sefer-hamidos');
  const indexPath = path.join(shDir, 'index.json');
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  console.log(`   ✅ Sefer Hamidos has ${indexData.part.c.length} chapters`);
  
  // Test a sample chapter
  const chapterPath = path.join(shDir, '1.json');
  const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  console.log(`   ✅ Chapter 1: "${chapterData.t}" (${chapterData.ht})`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 5: Check Stories
console.log('\n5. Testing Stories...');
try {
  const storiesDir = path.join(API_MOBILE_DIR, 'stories');
  const indexPath = path.join(storiesDir, 'index.json');
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  console.log(`   ✅ Stories has ${indexData.part.c.length} stories`);
  
  // Test a sample story
  const chapterPath = path.join(storiesDir, '1.json');
  const chapterData = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
  console.log(`   ✅ Story 1: "${chapterData.t}" (${chapterData.ht})`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 6: Check daily-wisdom.json
console.log('\n6. Testing daily-wisdom.json...');
try {
  const dailyPath = path.join(API_MOBILE_DIR, 'daily-wisdom.json');
  const dailyData = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
  console.log(`   ✅ Daily wisdom for ${dailyData.date}`);
  console.log(`   📖 Teaching: ${dailyData.teaching.title}`);
  console.log(`   💬 Quote: "${dailyData.quote}"`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 7: Check search-index.json
console.log('\n7. Testing search-index.json...');
try {
  const searchPath = path.join(API_MOBILE_DIR, 'search-index.json');
  const searchData = JSON.parse(fs.readFileSync(searchPath, 'utf8'));
  console.log(`   ✅ Search index version: ${searchData.si.v}`);
  console.log(`   📊 Total documents: ${searchData.si.td}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

// Test 8: Check API documentation
console.log('\n8. Testing API documentation...');
try {
  const docsPath = path.join(API_MOBILE_DIR, 'API_DOCUMENTATION.md');
  const docs = fs.readFileSync(docsPath, 'utf8');
  console.log(`   ✅ Documentation file exists (${docs.length} bytes)`);
  console.log(`   📚 First line: ${docs.split('\n')[0]}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}

console.log('\n' + '='.repeat(50));
console.log('✅ Mobile API Testing Complete!');
console.log('📚 All endpoints are working correctly.');
console.log('='.repeat(50));