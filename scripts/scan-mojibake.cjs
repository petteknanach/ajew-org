/* Scan for suspicious mojibake/control chars in text source files.
   Looks for C1 control range U+0080..U+009F (often indicates encoding corruption).
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || process.cwd();

const INCLUDE_EXT = new Set(['.astro', '.js', '.ts', '.css', '.html', '.md', '.json', '.mjs', '.cjs']);
const EXCLUDE_DIR = new Set([
  'node_modules', '.git', 'dist', 'build', '.vercel', '.astro',
  // content dirs are huge; we only care about UI/layout/auth code
  'src\\content', 'src/content'
]);

function isExcludedDir(p) {
  const norm = p.replaceAll('/', '\\');
  for (const d of EXCLUDE_DIR) {
    const dn = d.replaceAll('/', '\\');
    if (norm.includes('\\' + dn + '\\')) return true;
    if (norm.endsWith('\\' + dn)) return true;
  }
  return false;
}

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (isExcludedDir(p)) continue;
      yield* walk(p);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (!INCLUDE_EXT.has(ext)) continue;
      yield p;
    }
  }
}

function findControlChars(str) {
  const hits = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x80 && code <= 0x9f) hits.push(i);
  }
  return hits;
}

let found = 0;
for (const file of walk(ROOT)) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    continue;
  }

  const text = buf.toString('utf8');
  const hits = findControlChars(text);
  if (!hits.length) continue;

  found++;
  console.log('\nFILE:', path.relative(ROOT, file));
  console.log('control-char-count:', hits.length);
  for (const idx of hits.slice(0, 10)) {
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + 100);
    const snippet = text.slice(start, end).replace(/[\r\n\t]/g, ' ');
    const code = text.charCodeAt(idx);
    console.log(`  @${idx} U+${code.toString(16).padStart(4, '0')} … ${snippet}`);
  }
}

if (!found) {
  console.log('No C1 control chars found in scanned files.');
}
