const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const DOCX_PATH = 'C:/Users/Pettek/Downloads/final batch from TE/Ramchal/Ruzin Gineezin/010 Ruzin Gineezin - Complete Source Hebrew Corrected (1).docx';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'ramchal-ruzin-gineezin');

async function main() {
  // 1. Count segments per section
  const files = fs.readdirSync(READER_DIR).filter(f => f.startsWith('section-'));
  let totalSegs = 0;
  let heSegs = 0;
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
    const total = data.segments.length;
    const withHe = data.segments.filter(s => s.he && s.he.trim()).length;
    totalSegs += total;
    heSegs += withHe;
    console.log(`${f}: ${total} segments, ${withHe} with Hebrew`);
  }
  console.log(`\nTotal: ${totalSegs} segments, ${heSegs} with Hebrew\n`);

  // 2. Extract DOCX
  const result = await mammoth.convertToHtml({ path: DOCX_PATH });
  console.log('DOCX HTML length:', result.value.length);

  // Also get raw text
  const textResult = await mammoth.extractRawText({ path: DOCX_PATH });
  console.log('DOCX raw text length:', textResult.value.length);

  // Save both for analysis
  fs.writeFileSync(path.join(__dirname, 'ruzin-docx-html.html'), result.value, 'utf8');
  fs.writeFileSync(path.join(__dirname, 'ruzin-docx-text.txt'), textResult.value, 'utf8');
  console.log('\nSaved ruzin-docx-html.html and ruzin-docx-text.txt');

  // Show first 3000 chars of text
  console.log('\n--- DOCX TEXT PREVIEW (first 3000 chars) ---');
  console.log(textResult.value.substring(0, 3000));
  console.log('--- END PREVIEW ---');
}

main().catch(console.error);
