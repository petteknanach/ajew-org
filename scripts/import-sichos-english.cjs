const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Sichos Haran';
const TARGET_DIR = 'public/reader/sichos-haran';

async function main() {
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.docx')).sort();
  console.log('Processing', files.length, 'DOCX files...');

  // Collect all sichos from all files
  const allSichos = {};

  for (const file of files) {
    console.log(`\nReading: ${file}`);
    const result = await mammoth.convertToHtml({ path: path.join(SRC_DIR, file) });
    const html = result.value;

    // Split by h2 headers which contain sicha numbers
    // Format varies: <h2><strong>1. <em>Title</em></strong></h2>
    // or: <h2>59. Title</h2>
    const parts = html.split(/<h2>/);

    for (const part of parts) {
      // Look for sicha number - strip tags first to find the number
      const stripped = part.replace(/<[^>]+>/g, '').trim();
      const numMatch = stripped.match(/^(\d+)\.\s/);
      if (!numMatch) continue;

      const sichaNum = parseInt(numMatch[1]);
      if (sichaNum < 1 || sichaNum > 310) continue;

      // Extract text content - remove HTML tags
      let text = part
        .replace(/<\/h2>/, '\n\n') // Keep h2 end as paragraph break
        .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/g, '') // Remove other headers
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<\/p>/g, '\n\n')
        .replace(/<[^>]+>/g, '') // Strip all HTML
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Remove the "N. Title" header from start
      text = text.replace(/^\d+\.\s*[^\n]+\n*/, '').trim();

      if (text.length < 20) continue;

      // Split into paragraphs
      const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 10);

      if (paragraphs.length > 0) {
        allSichos[sichaNum] = paragraphs;
      }
    }
  }

  console.log(`\nExtracted ${Object.keys(allSichos).length} sichos from DOCX files`);

  // Now match to existing JSON files
  let updated = 0, skipped = 0, notFound = 0;
  let segmentsAdded = 0;

  for (const [numStr, paragraphs] of Object.entries(allSichos)) {
    const num = parseInt(numStr);
    const jsonPath = path.join(TARGET_DIR, `sicha-${num}.json`);

    if (!fs.existsSync(jsonPath)) {
      notFound++;
      continue;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Check if already has English
    const hasEnglish = data.segments.some(s => s.en && s.en.length > 20);
    if (hasEnglish) {
      skipped++;
      continue;
    }

    // Match paragraphs to segments
    const segs = data.segments;
    if (paragraphs.length === 1) {
      // Single paragraph - put all in first segment
      segs[0].en = paragraphs[0];
      segmentsAdded++;
    } else if (paragraphs.length <= segs.length) {
      // Fewer or equal paragraphs - match 1:1
      for (let i = 0; i < paragraphs.length; i++) {
        segs[i].en = paragraphs[i];
        segmentsAdded++;
      }
    } else {
      // More paragraphs than segments - distribute evenly
      const ratio = Math.ceil(paragraphs.length / segs.length);
      for (let i = 0; i < segs.length; i++) {
        const start = i * ratio;
        const end = Math.min(start + ratio, paragraphs.length);
        segs[i].en = paragraphs.slice(start, end).join('\n\n');
        segmentsAdded++;
      }
    }

    data.hasEnglish = true;
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    updated++;
  }

  console.log(`\nResults:`);
  console.log(`  Updated: ${updated} sichos`);
  console.log(`  Skipped (already had English): ${skipped}`);
  console.log(`  Not found (no JSON): ${notFound}`);
  console.log(`  Segments with English added: ${segmentsAdded}`);
  console.log(`  Total sichos in DOCX: ${Object.keys(allSichos).length}`);
}

main().catch(e => console.error(e));
