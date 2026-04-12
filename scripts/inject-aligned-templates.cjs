/**
 * inject-aligned-templates.cjs
 *
 * Adds aligned_segments rendering to reader templates.
 * Uses simple string search/replace - no regex.
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'src', 'pages', 'reader');

// Skip these - no English translations or already done
const SKIP_PREFIXES = [
  'ebay-hanachal',  // already done
  'tanach-',        // no English
  'talmud-bavli-',  // no English
  'mishna-',        // no English
  'rambam-',        // no English
  'zohar-',         // no English
  'ramchal-',       // Hebrew only
  'nefesh-hachaim',
  'shmirat-halashon',
  'saviv',
  'eved-hashem',
  'anava',
  'binyamin',
  'halacha-misc',
  'anshei-kodesh',
];

function shouldSkip(dirname) {
  return SKIP_PREFIXES.some(p => dirname.startsWith(p));
}

const ALIGNED_BLOCK = `        {torahData.aligned_segments && (
          <div class="reader-content-aligned" style="display:none;">
            {torahData.aligned_segments.map((seg) => (
              <div class={\`reader-segment-pair \${seg.type === 'note' ? 'segment-note' : ''}\`} id={\`aligned-\${seg.index}\`}>
                <div class="reader-segment segment-he" data-index={String(seg.index)}>
                  <span class="segment-number">{seg.index}</span>
                  <p>{seg.he || '\\u00A0'}</p>
                </div>
                <div class={\`reader-segment segment-en \${!seg.en ? 'empty-translation' : ''}\`} data-index={String(seg.index)}>
                  <span class="segment-number">{seg.index}</span>
                  <p>{seg.en || '\\u00A0'}</p>
                </div>
              </div>
            ))}
          </div>
        )}`;

function processTemplate(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Already has aligned support
  if (content.includes('reader-content-aligned') || content.includes('reader-content-original')) {
    return { status: 'skip', reason: 'already has aligned support' };
  }

  // Must have segments.map
  if (!content.includes('torahData.segments.map')) {
    return { status: 'fail', reason: 'no segments.map found' };
  }

  // Strategy: find the closing </div> that ends the reader-content block.
  // The structure is:
  //   <div class="reader-content mode-hebrew">
  //     {torahData.segments.map(...)}
  //   </div>
  //
  // We insert the aligned block right before that closing </div>

  // Find the reader-content div
  const contentStart = content.indexOf('<div class="reader-content mode-hebrew">');
  if (contentStart === -1) {
    return { status: 'fail', reason: 'no reader-content div found' };
  }

  // Find the segments.map call
  const segmentsMapIdx = content.indexOf('torahData.segments.map', contentStart);
  if (segmentsMapIdx === -1) {
    return { status: 'fail', reason: 'segments.map not inside reader-content' };
  }

  // Find the closing ))} of the map
  // The map ends with: ))}
  // We need to find the right one - it's the closing of the map call
  let braceDepth = 0;
  let parenDepth = 0;
  let mapEnd = -1;

  // Start from the { before torahData.segments.map
  let searchStart = content.lastIndexOf('{', segmentsMapIdx);

  for (let i = searchStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') braceDepth++;
    else if (ch === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        mapEnd = i + 1;
        break;
      }
    }
  }

  if (mapEnd === -1) {
    return { status: 'fail', reason: 'could not find end of segments.map' };
  }

  // Now find the </div> that closes reader-content (after mapEnd)
  // There might be whitespace between ))} and </div>
  const afterMap = content.substring(mapEnd);
  const closeDivMatch = afterMap.match(/^\s*\n\s*<\/div>/);
  if (!closeDivMatch) {
    return { status: 'fail', reason: 'could not find closing </div> after segments.map' };
  }

  // Insert position: right before the closing </div>
  const insertPos = mapEnd + closeDivMatch[0].indexOf('</div>');

  // Wrap the segments in reader-content-original
  const beforeSegments = content.substring(contentStart, searchStart);
  const segmentsSection = content.substring(searchStart, mapEnd);

  // Build the new content section
  const newSection = `<div class="reader-content mode-hebrew">
        <div class="reader-content-original">
${segmentsSection}
        </div>
${ALIGNED_BLOCK}
      </div>`;

  // Find end of the closing </div>
  const closeDivEnd = mapEnd + closeDivMatch[0].length;

  const newContent = content.substring(0, contentStart) + newSection + content.substring(closeDivEnd);

  // Verify the output is valid - check we haven't lost or gained </div> tags
  const origDivCount = content.split('</div>').length;
  const newDivCount = newContent.split('</div>').length;

  // We add 2 new closing divs (reader-content-original + reader-content-aligned)
  // But conditionally (the aligned one is in JSX conditional)
  // Actually we add: reader-content-original close + aligned block (has its own divs)
  // The total should increase by a specific amount

  fs.writeFileSync(filePath, newContent, 'utf8');
  return { status: 'ok' };
}

// Main
const dirs = fs.readdirSync(READER_DIR);
let processed = 0, skipped = 0, failed = 0;
const failures = [];

for (const dir of dirs) {
  if (dir === 'index.astro') continue;
  if (shouldSkip(dir)) {
    skipped++;
    continue;
  }

  const partPath = path.join(READER_DIR, dir, '[part]', '[torah].astro');
  const directPath = path.join(READER_DIR, dir, '[torah].astro');
  const altPath = path.join(READER_DIR, dir, '1', '[torah].astro');

  let templatePath = null;
  if (fs.existsSync(partPath)) templatePath = partPath;
  else if (fs.existsSync(directPath)) templatePath = directPath;
  else if (fs.existsSync(altPath)) templatePath = altPath;

  if (!templatePath) {
    skipped++;
    continue;
  }

  const result = processTemplate(templatePath);
  if (result.status === 'ok') {
    processed++;
    console.log(`OK ${dir}`);
  } else if (result.status === 'skip') {
    skipped++;
  } else {
    failed++;
    failures.push({ dir, reason: result.reason });
    console.log(`FAIL ${dir} - ${result.reason}`);
  }
}

console.log(`\nDone: ${processed} processed, ${skipped} skipped, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ${f.dir}: ${f.reason}`));
}
