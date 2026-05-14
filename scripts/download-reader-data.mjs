/**
 * Download reader JSON data from GitHub raw CDN for Vercel builds.
 * Node.js ESM version.
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://raw.githubusercontent.com/petteknanach/ajew-org/main/public/reader';
const DEST = path.join(ROOT, 'public', 'reader');

function dl(filepath) {
  return new Promise((resolve, reject) => {
    const url = BASE + '/' + filepath;
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
          if (res2.statusCode !== 200) return resolve(null);
          const data = [];
          res2.on('data', c => data.push(c));
          res2.on('end', () => {
            const dest = path.join(DEST, filepath);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, Buffer.concat(data));
            resolve({ file: filepath, size: data.length });
          });
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) return resolve(null);
      const data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => {
        const dest = path.join(DEST, filepath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.concat(data));
        resolve({ file: filepath, size: data.length });
      });
    }).on('error', reject);
  });
}

async function getIndex(bookPart) {
  const result = await dl(bookPart + '/index.json');
  if (!result) return null;
  return JSON.parse(fs.readFileSync(path.join(DEST, bookPart, 'index.json'), 'utf8'));
}

async function downloadBookPart(bookPart) {
  const index = await getIndex(bookPart);
  if (!index) return 0;

  const filesToDl = [];
  for (const intro of (index.introSections || [])) {
    const slug = intro.slug || intro.file;
    if (slug) filesToDl.push(bookPart + '/' + slug + '.json');
  }
  for (const preface of (index.prefaceSections || [])) {
    const slug = preface.slug || preface.file;
    if (slug) filesToDl.push(bookPart + '/' + slug + '.json');
  }

  const bookName = bookPart.split('/')[0];
  let prefix = 'torah';
  if (bookName.includes('tefilos')) prefix = 'prayer';
  else if (bookName.includes('halachos')) prefix = 'halacha';
  else if (bookName.includes('eitzos')) prefix = 'eitzah';

  for (const torah of (index.torahs || [])) {
    const num = torah.number;
    if (num) filesToDl.push(bookPart + '/' + prefix + '-' + num + '.json');
  }

  let count = 0;
  // Process in batches of 50 for parallel downloads
  for (let i = 0; i < filesToDl.length; i += 50) {
    const batch = filesToDl.slice(i, i + 50);
    const results = await Promise.allSettled(batch.map(f => dl(f)));
    count += results.filter(r => r.status === 'fulfilled' && r.value).length;
  }
  return count;
}

async function main() {
  console.log('=== Downloading reader data ===');
  const books = [
    'likutay-moharan/part-1',
    'likutay-moharan/part-2',
    'likutay-tefilos/part-1',
    'likutay-tefilos/part-2',
    'likutay-halachos/part-1',
    'chumash-lh/part-1',
  ];

  let total = 0;
  for (const bp of books) {
    console.log('  Downloading ' + bp + '...');
    const t0 = Date.now();
    const n = await downloadBookPart(bp);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('    ' + n + ' files in ' + elapsed + 's');
    total += n;
  }

  try {
    const lmFiles = fs.readdirSync(path.join(DEST, 'likutay-moharan/part-1'));
    console.log('  Verification: ' + lmFiles.length + ' files in LM part-1');
  } catch (e) {
    console.log('  Verification failed: ' + e.message);
  }
  console.log('Total: ' + total + ' files downloaded');
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
