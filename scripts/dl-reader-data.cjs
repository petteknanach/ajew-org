const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE = 'https://raw.githubusercontent.com/petteknanach/ajew-org/main/public/reader';
const DEST = 'public/reader';

function dl(fp) {
  return new Promise((ok, fail) => {
    https.get(BASE + '/' + fp, r => {
      if (r.statusCode === 302) return https.get(r.headers.location, r2 => {
        if (r2.statusCode !== 200) return ok(null);
        const d = [];
        r2.on('data', c => d.push(c));
        r2.on('end', () => {
          fs.mkdirSync(path.dirname(path.join(DEST, fp)), { recursive: true });
          fs.writeFileSync(path.join(DEST, fp), Buffer.concat(d));
          ok(d.length);
        });
      }).on('error', fail);
      if (r.statusCode !== 200) return ok(null);
      const d = [];
      r.on('data', c => d.push(c));
      r.on('end', () => {
        fs.mkdirSync(path.dirname(path.join(DEST, fp)), { recursive: true });
        fs.writeFileSync(path.join(DEST, fp), Buffer.concat(d));
        ok(d.length);
      });
    }).on('error', fail);
  });
}

async function dlBatch(files, concurrency) {
  let downloaded = 0;
  let idx = 0;
  async function worker() {
    while (idx < files.length) {
      const f = files[idx++];
      try {
        const sz = await dl(f);
        if (sz) downloaded++;
      } catch (e) { /* skip */ }
    }
  }
  const workers = Array(Math.min(concurrency, files.length)).fill(null).map(() => worker());
  await Promise.all(workers);
  return downloaded;
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
        await dl(idxP);
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
  console.log('Downloaded ' + total + ' files');
}

go().catch(e => {
  console.error(e);
  process.exit(1);
});
