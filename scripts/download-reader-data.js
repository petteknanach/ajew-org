/**
 * Download reader JSON data from GitHub raw CDN for Vercel builds.
 * This bypasses the Vercel upload limit that prevents reader data
 * from being included in the git checkout during builds.
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BASE = 'https://raw.githubusercontent.com/petteknanach/ajew-org/main/public/reader';
const DEST = path.join(ROOT, 'public', 'reader');

// Books that need download (large ones that Vercel strips)
const BOOKS = {
  'likutay-moharan': ['part-1', 'part-2'],
  'siach-sarfei-kodesh': ['part-1'],
  'likutay-tefilos': ['part-1', 'part-2', 'part-3', 'part-4'],
  'likutay-halachos': ['part-1', 'part-2', 'part-3', 'part-4', 'part-5'],
  'likutay-nanach': ['part-1', 'part-2'],
  'chumash-lh': ['part-1'],
};

function download(filepath) {
  return new Promise((resolve, reject) => {
    const url = BASE + '/' + filepath;
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, (res2) => {
          if (res2.statusCode !== 200) return reject(new Error(`${filepath}: ${res2.statusCode}`));
          const data = [];
          res2.on('data', c => data.push(c));
          res2.on('end', () => {
            const dest = path.join(DEST, filepath);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, Buffer.concat(data));
            resolve(data.length);
          });
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) return reject(new Error(`${filepath}: ${res.statusCode}`));
      const data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => {
        const dest = path.join(DEST, filepath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.concat(data));
        resolve(data.length);
      });
    }).on('error', reject);
  });
}

async function downloadBookFiles(book, parts) {
  let total = 0;
  for (const part of parts) {
    const indexFile = `${book}/${part}/index.json`;
    try {
      const size = await download(indexFile);
      console.log(`  ${indexFile}: ${size} bytes`);
      total++;

      // Parse index and download all files listed
      const indexContent = fs.readFileSync(path.join(DEST, indexFile), 'utf8');
      const index = JSON.parse(indexContent);
      const items = index.torahs || index.sections || [];

      for (const item of items) {
        const filename = item.file || item.slug;
        if (!filename) continue;
        try {
          const sz = await download(`${book}/${part}/${filename}`);
          total++;
        } catch (e) {
          // Skip 404s (missing files are expected)
          if (!e.message.includes('404')) {
            console.log(`    SKIP ${filename}: ${e.message}`);
          }
        }
      }
    } catch (e) {
      if (!e.message.includes('404')) {
        console.log(`  ERROR ${indexFile}: ${e.message}`);
      }
    }
  }
  return total;
}

async function main() {
  console.log('=== Downloading reader data from GitHub ===');
  let grandTotal = 0;

  for (const [book, parts] of Object.entries(BOOKS)) {
    console.log(`Book: ${book} (${parts.length} parts)`);
    const count = await downloadBookFiles(book, parts);
    console.log(`  Downloaded: ${count} files`);
    grandTotal += count;
  }

  // Verify
  const lmFiles = fs.readdirSync(path.join(DEST, 'likutay-moharan/part-1'));
  console.log(`\nVerification: ${lmFiles.length} files in likutay-moharan/part-1`);
  console.log(`Total downloaded: ${grandTotal} files`);
  console.log('=== Done ===');
}

main().catch(e => {
  console.error('Failed:', e.message);
  process.exit(1);
});
