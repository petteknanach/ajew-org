#!/usr/bin/env node
/**
 * Download reader data from GitHub for Vercel builds.
 * Uses GitHub API tarball endpoint for reliability.
 */
const https = require('https');
const { execSync } = require('child_process');

console.log('=== Downloading reader data from GitHub ===');

try {
  // Clone the repo with sparse checkout to get only reader data
  console.log('Cloning repo...');
  execSync('rm -rf /tmp/ajew-data', { stdio: 'inherit' });
  execSync('git clone --depth=1 --filter=blob:none --sparse https://github.com/petteknanach/ajew-org.git /tmp/ajew-data', { stdio: 'inherit' });
  console.log('Setting sparse checkout...');
  execSync('cd /tmp/ajew-data && git sparse-checkout init && git sparse-checkout set public/reader', { stdio: 'inherit' });
  console.log('Downloading blobs...');
  execSync('cd /tmp/ajew-data && git checkout HEAD', { stdio: 'inherit' });
  console.log('Copying reader data...');
  execSync('cp -rf /tmp/ajew-data/public/reader/* public/reader/', { stdio: 'inherit' });
  console.log('Cleaning up...');
  execSync('rm -rf /tmp/ajew-data', { stdio: 'inherit' });
  const count = execSync('ls public/reader/likutay-moharan/part-1/ | wc -l').toString().trim();
  console.log(`Downloaded reader data: ${count} LM part-1 files`);
} catch (e) {
  console.error('Failed to download reader data:', e.message);
  // Continue build anyway - pages will show "not found" instead of crashing
}
