const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('C:/Users/Pettek/Documents/Claude Desktop projects/Finished/yimai_hatlaos (1).html', 'utf8');

// Split by section-header divs
const parts = html.split(/<div class="section-header">/i);
const chapters = [];

for (let i = 1; i < parts.length; i++) {
  const part = parts[i];
  // Extract chapter number from header
  const headerEnd = part.indexOf('</div>');
  const header = part.substring(0, headerEnd).replace(/<[^>]+>/g, '').trim();

  // Map chapter name to number
  let num;
  const numMatch = header.match(/Chapter\s+(\w+)/i);
  if (numMatch) {
    const hebrewMap = {
      'Aleph': 1, 'Bais': 2, 'Gimel': 3, 'Daled': 4, 'Heh': 5,
      'Vav': 6, 'Zayin': 7, 'Ches': 8, 'Tes': 9, 'Yud': 10,
      'Yud-Aleph': 11, 'Yud-Bais': 12, 'Yud-Gimel': 13, 'Yud-Daled': 14,
      'Tes-Vav': 15, 'Tes-Zayin': 16, 'Yud-Zayin': 17, 'Yud-Ches': 18,
      'Yud-Tes': 19, 'Kaf': 20, 'Kaf-Aleph': 21, 'Kaf-Bais': 22,
      'Kaf-Gimel': 23, 'Kaf-Daled': 24, 'Kaf-Heh': 25, 'Kaf-Vav': 26,
      'Kaf-Zayin': 27, 'Kaf-Ches': 28, 'Kaf-Tes': 29, 'Lamed': 30,
      'Lamed-Aleph': 31, 'Lamed-Bais': 32, 'Lamed-Gimel': 33, 'Lamed-Daled': 34,
    };
    num = hebrewMap[numMatch[1]];
    if (!num) {
      // Try compound: "Tes-Vav" etc
      const compound = numMatch[1] + (part.match(/—\s*(\w+)/) ? '-' + part.match(/—\s*(\w+)/)[1] : '');
      num = hebrewMap[compound];
    }
  }

  if (!num && header.includes('What R')) {
    num = 35; // epilogue -> section 35
  }

  if (!num) {
    console.log('Could not map:', header);
    continue;
  }

  // Extract content after the header div
  const content = part.substring(headerEnd + 6);

  // Strip HTML, keep paragraph breaks
  let text = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length > 20) {
    chapters.push({ num, text, header });
  }
}

console.log('Parsed', chapters.length, 'chapters');
console.log('Numbers:', chapters.map(c => c.num).join(', '));

// Import into reader JSON
const readerDir = 'public/reader/yemei-hatlaos';
let imported = 0, skipped = 0, notFound = 0;

for (const ch of chapters) {
  const jsonFile = path.join(readerDir, 'section-' + ch.num + '.json');
  if (!fs.existsSync(jsonFile)) {
    console.log('NOT FOUND:', jsonFile);
    notFound++;
    continue;
  }

  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

  // Check if already has English
  if (data.segments.some(s => s.en && s.en.length > 50)) {
    skipped++;
    continue;
  }

  // Split English into paragraphs
  const paras = ch.text.split(/\n\n+/).filter(p => p.trim().length > 15);

  if (data.segments.length === 1 || paras.length <= 1) {
    data.segments[0].en = ch.text;
  } else {
    for (let i = 0; i < Math.min(paras.length, data.segments.length); i++) {
      data.segments[i].en = paras[i].trim();
    }
    if (paras.length > data.segments.length) {
      const last = data.segments[data.segments.length - 1];
      last.en = (last.en || '') + '\n\n' + paras.slice(data.segments.length).join('\n\n');
    }
  }

  data.hasEnglish = true;
  fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
  imported++;
  console.log('IMPORTED: section-' + ch.num + ' (' + ch.text.length + ' chars, ' + paras.length + ' paras)');
}

console.log('\n=== SUMMARY ===');
console.log('Imported:', imported);
console.log('Skipped (had English):', skipped);
console.log('Not found:', notFound);
