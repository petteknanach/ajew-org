/**
 * Clean header/title text from opening segments across all books.
 * Removes Na Nach headers, author lines, title pages, isolated ois letters.
 */
const fs = require('fs');
const path = require('path');

const READER = path.join(__dirname, '..', 'public', 'reader');

const books = fs.readdirSync(READER).filter(f => {
  const fp = path.join(READER, f);
  return fs.statSync(fp).isDirectory()
    && !f.startsWith('mishna-') && !f.startsWith('talmud-')
    && !f.startsWith('tanach-') && !f.startsWith('rambam-')
    && !f.startsWith('zohar-');
});

let cleaned = 0;

books.forEach(bookName => {
  const bookDir = path.join(READER, bookName);

  function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) walkDir(fp);
      else if (f.endsWith('.json') && f !== 'index.json') {
        try {
          const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
          let changed = false;

          (d.segments || []).forEach(s => {
            if (!s.en) return;
            const orig = s.en;

            // Remove Na Nach headers
            s.en = s.en.replace(/^\s*Na Nach Nachma Nachman\s*(MayUman|Me'?Uman)\s*/i, '');

            // Remove 'By the Rabbi, the Gaon...' author lines
            s.en = s.en.replace(/^\s*By the Rabbi,\s+the Gaon[\s\S]*?(?:of blessed memory|z"l|zt"l)\s*/i, '');

            // Remove 'Composed by Rabbi...' lines
            s.en = s.en.replace(/^\s*Composed by Rabbi[\s\S]*?(?:memory|z"l|zt"l)\s*/i, '');

            // Remove 'Said the writer and compiler:' headers
            s.en = s.en.replace(/^\s*Said the writer and compiler:\s*/i, '');

            // Remove 'May this work be blessed...' dedications
            s.en = s.en.replace(/^\s*May this work be blessed[\s\S]*?\n\n/i, '');

            // Remove isolated ois letters at start: 'א\n\n' or '✦\n'
            s.en = s.en.replace(/^\s*[א-ט✦]\s*\n+\s*/g, '');

            // Remove 'Entry Types:' color key text (Kuntrass)
            s.en = s.en.replace(/^\s*Entry Types:[\s\S]*?Combined types\s*/i, '');

            // Clean leading whitespace
            s.en = s.en.replace(/^\s+/, '').trim();

            if (s.en !== orig) changed = true;
          });

          if (changed) {
            fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
            cleaned++;
          }
        } catch (e) {}
      }
    });
  }

  walkDir(bookDir);
});

console.log('Cleaned ' + cleaned + ' files');
