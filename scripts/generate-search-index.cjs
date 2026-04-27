#!/usr/bin/env node

/**
 * Search index generator for Vercel build
 * This script runs during build to generate the search index
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Generating search index during build...');

try {
  // Check if we're in a Vercel build environment
  const isVercel = process.env.VERCEL === '1';
  console.log(`Vercel environment: ${isVercel}`);
  
  // Run the complete search index generator
  const generatorPath = path.join(__dirname, '..', 'enhanced-search-index-generator-complete.cjs');
  
  if (fs.existsSync(generatorPath)) {
    console.log('Running search index generator...');
    execSync(`node "${generatorPath}"`, { stdio: 'inherit' });
    console.log('✅ Search index generated successfully');
  } else {
    console.log('⚠️  Search index generator not found, using existing index if available');
    
    // Check if index exists
    const indexPath = path.join(__dirname, '..', 'public', 'data', 'enhanced-search-index.json');
    if (fs.existsSync(indexPath)) {
      const stats = fs.statSync(indexPath);
      console.log(`Using existing index: ${stats.size} bytes`);
    } else {
      console.log('❌ No search index found! Search functionality will be limited.');
    }
  }
} catch (error) {
  console.error('Error generating search index:', error.message);
  console.log('⚠️  Continuing build without search index update');
}