#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/petteknanach/ajew-org/main/public/reader';
const DEST = 'public/reader';

async function dl(fp, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const data = await new Promise((resolve, reject) => {
        https.get(BASE + '/' + fp, { timeout: 30000 }, r => {
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
      const dest = path.join(DEST, fp);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
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
  const books = [
    ['likutay-moharan', ['part-1', 'part-2']],
    ['likutay-tefilos', ['part-1', 'part-2']],
    ['likutay-halachos', ['part-1']],
    ['chumash-lh', ['part-1']],
  ];
  let total = 0;
  for (const [bk, pts] of books) {
    for (const pt of pts) {
      try {
        const idxP = bk + '/' + pt + '/index.json';
        if (!await dl(idxP)) { console.log('FAIL index: ' + idxP); continue; }
        const idx = JSON.parse(fs.readFileSync(path.join(DEST, idxP), 'utf8'));
        const items = idx.torahs || [];
        const prefix = bk.includes('tefilos') ? 'prayer' : bk.includes('halachos') ? 'halacha' : 'torah';
        const files = [];
        for (const t of items) {
          if (t.number) files.push(bk + '/' + pt + '/' + prefix + '-' + t.number + '.json');
        }
        for (const intro of (idx.introSections || [])) {
          const s = intro.slug || intro.file;
          if (s) files.push(bk + '/' + pt + '/' + s + '.json');
        }
        const n = await dlBatch(files, 30);
        total += n;
        console.log(bk + '/' + pt + ': ' + n + '/' + files.length);
      } catch (e) {
        console.log('Error ' + bk + '/' + pt + ': ' + e.message);
      }
    }
  }
  console.log('Total: ' + total + ' files');
}

go().catch(e => { console.error(e); process.exit(1); });
