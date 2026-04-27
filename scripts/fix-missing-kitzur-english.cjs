const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Kitzure lkm';

const html1 = fs.readFileSync(path.join(dir, '180 kitzur_likutay_moharan_toirahs_208_through_286_end_part_one.html'), 'utf8');
const html2 = fs.readFileSync(path.join(dir, '620 kitzur_likutay_moharan_part_two_60_through_125_complete.html'), 'utf8');

function extractTorah(html, torahNum) {
  const regex = new RegExp('Toirah\\s+' + torahNum + '\\b', 'i');
  const match = regex.exec(html);
  if (!match) return null;

  const startIdx = match.index;

  // Find next "Toirah N" after this one
  const afterStart = html.substring(startIdx + match[0].length);
  const nextMatch = afterStart.match(/Toirah\s+\d+/i);
  const endIdx = nextMatch
    ? startIdx + match[0].length + afterStart.indexOf(nextMatch[0])
    : html.length;

  const section = html.substring(startIdx, endIdx);

  // Strip HTML tags, decode entities
  let text = section
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Remove the "Toirah N" prefix
  text = text.replace(/^Toirah\s+\d+\.?\s*/i, '').trim();

  return text;
}

// Missing torahs
const tasks = [
  { part: 1, torah: 260, html: html1, jsonTorah: 260 },
  { part: 2, torah: 92, html: html2, jsonTorah: 93 },
  { part: 2, torah: 106, html: html2, jsonTorah: 94 },
  { part: 2, torah: 107, html: html2, jsonTorah: 95 },
  { part: 2, torah: 125, html: html2, jsonTorah: 96 },
];

for (const t of tasks) {
  const text = extractTorah(t.html, t.torah);
  if (!text) {
    console.log(`Part ${t.part} Torah ${t.torah}: NOT FOUND in HTML`);
    continue;
  }

  console.log(`Part ${t.part} Torah ${t.torah}: ${text.length} chars`);
  console.log(`  Preview: ${text.substring(0, 120)}`);

  const jsonPath = `public/reader/kitzur-likutay-moharan/part-${t.part}/torah-${t.jsonTorah}.json`;

  if (!fs.existsSync(jsonPath)) {
    console.log(`  -> JSON not found: ${jsonPath}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Put English in first segment (or distribute if multiple paras)
  const paras = text.split(/\n\n+/).filter(p => p.trim().length > 10);

  if (paras.length <= 1 || data.segments.length <= 1) {
    data.segments[0].en = text;
  } else {
    for (let i = 0; i < Math.min(paras.length, data.segments.length); i++) {
      data.segments[i].en = paras[i].trim();
    }
    if (paras.length > data.segments.length) {
      data.segments[data.segments.length - 1].en += '\n\n' + paras.slice(data.segments.length).join('\n\n');
    }
  }

  data.hasEnglish = true;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`  -> WRITTEN to ${jsonPath}`);
}
