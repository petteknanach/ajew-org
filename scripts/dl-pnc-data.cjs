#!/usr/bin/env node
/**
 * Download Petek Nanach Commentary (PNC) data from GitHub during build.
 * Scans the remote repo for all torah-*.json and tinyana-*.json files,
 * then downloads them in batches.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'petteknanach';
const REPO_NAME = 'ajew-org';
const BRANCH = 'main';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;
const PNC_PATH = 'public/reader/pettek-nanach-commentary';
const DEST = path.join(process.cwd(), 'public/reader/pettek-nanach-commentary');

async function apiRequest(urlPath) {
  return new Promise((resolve, reject) => {
    https.get(`${API_BASE}/${urlPath}`, {
      headers: { 'User-Agent': 'ajew-org-build-script' },
      timeout: 30000,
    }, r => {
      if (r.statusCode === 301 || r.statusCode === 302) {
        https.get(r.headers.location, { timeout: 30000 }, r2 => {
          const d = [];
          r2.on('data', c => d.push(c));
          r2.on('end', () => resolve(JSON.parse(Buffer.concat(d).toString())));
          r2.on('error', reject);
        }).on('error', reject);
        return;
      }
      if (r.statusCode !== 200) { resolve(null); return; }
      const d = [];
      r.on('data', c => d.push(c));
      r.on('end', () => resolve(JSON.parse(Buffer.concat(d).toString())));
      r.on('error', reject);
    }).on('error', reject);
  });
}

async function dl(urlPath, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await new Promise((resolve, reject) => {
        https.get(`${RAW_BASE}/${urlPath}`, { timeout: 30000 }, r => {
          if (r.statusCode === 301 || r.statusCode === 302) {
            https.get(r.headers.location, { timeout: 30000 }, r2 => {
              const d = [];
              r2.on('data', c => d.push(c));
              r2.on('end', () => resolve(Buffer.concat(d)));
              r2.on('error', reject);
            }).on('error', reject);
            return;
          }
          if (r.statusCode !== 200) { resolve(null); return; }
          const d = [];
          r.on('data', c => d.push(c));
          r.on('end', () => resolve(Buffer.concat(d)));
          r.on('error', reject);
        }).on('error', reject);
      });
      if (!data) return false;
      const dest = path.join(DEST, path.basename(urlPath));
      fs.writeFileSync(dest, data);
      return true;
    } catch (e) {
      if (attempt === maxRetries - 1) return false;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return false;
}

async function dlBatch(files, concurrency) {
  let done = 0;
  let idx = 0;
  async function worker() {
    while (idx < files.length) {
      const f = files[idx++];
      try { if (await dl(f)) done++; } catch (e) {}
    }
  }
  await Promise.all(Array(Math.min(concurrency, files.length)).fill().map(() => worker()));
  return done;
}

async function go() {
  console.log('Downloading PNC data...');

  // Ensure dest exists
  fs.mkdirSync(DEST, { recursive: true });

  // Fetch file listing from GitHub API
  const listing = await apiRequest(PNC_PATH);
  if (!listing || !Array.isArray(listing)) {
    console.log('PNC: Could not fetch remote file listing, keeping existing files');
    return;
  }

  // Filter to PNC JSON files (torah-*.json, tinyana-*.json, index.json, and intro/front matter files)
  const pncFiles = listing
    .filter(f => f.name.endsWith('.json'))
    .map(f => PNC_PATH + '/' + f.name);

  console.log(`PNC: Found ${pncFiles.length} files on remote`);

  // Download in batches
  const n = await dlBatch(pncFiles, 30);
  console.log(`PNC: Downloaded ${n}/${pncFiles.length} files`);

  // Scan local files to report what we have
  const localFiles = fs.readdirSync(DEST).filter(f => f.endsWith('.json'));
  const torahCount = localFiles.filter(f => /^torah-\d+\.json$/.test(f)).length;
  const tinyanaCount = localFiles.filter(f => /^tinyana-\d+\.json$/.test(f)).length;
  console.log(`PNC: Local — ${torahCount} torahs, ${tinyanaCount} tinyana, ${localFiles.length - torahCount - tinyanaCount} index/metadata`);
}

go().catch(e => { console.error('PNC download failed:', e.message); /* Continue build anyway */ });
