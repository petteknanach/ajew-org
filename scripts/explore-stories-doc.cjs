/**
 * Explore the Stories Word doc to understand its structure
 */
const mammoth = require('mammoth');
const path = require('path');

const DOC_PATH = "C:/Users/Pettek/Documents/Translations/The Stories of Rabbi Nachman and Saba/Legendary Tales for Amazon 10 - converted from open office to word.docx";

async function main() {
  const result = await mammoth.extractRawText({ path: DOC_PATH });
  const text = result.value;

  console.log('Total length:', text.length);
  console.log('\n--- First 3000 chars ---');
  console.log(text.substring(0, 3000));
  console.log('\n--- SEARCHING FOR SECTION MARKERS ---');

  // Find all lines that could be section headers
  const lines = text.split('\n');
  console.log('Total lines:', lines.length);

  // Look for "Tale" or "Story" markers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (line.length < 100 && (
      /^tale\s/i.test(line) ||
      /^story\s/i.test(line) ||
      /^forward/i.test(line) ||
      /^foreword/i.test(line) ||
      /^preface/i.test(line) ||
      /^introduction/i.test(line) ||
      /^discourse/i.test(line) ||
      /^parable/i.test(line) ||
      /^wondrous/i.test(line) ||
      /^words\s+of/i.test(line) ||
      /^saba/i.test(line) ||
      /^chapter/i.test(line) ||
      /^part\s/i.test(line) ||
      /^section/i.test(line) ||
      /^the\s+(first|second|third|fourth|fifth|sixth|seventh)/i.test(line) ||
      /^after\s+the\s+stories/i.test(line) ||
      /^conversations/i.test(line) ||
      /^ad\s+kan/i.test(line) ||
      /^appendix/i.test(line) ||
      /^table\s+of/i.test(line) ||
      /^\d+\.\s/ .test(line) ||
      /^[IVX]+\.\s/.test(line)
    )) {
      console.log(`  Line ${i}: "${line}"`);
    }
  }

  // Also show the last 3000 chars to see what's at the end
  console.log('\n--- Last 3000 chars ---');
  console.log(text.substring(text.length - 3000));

  // Search for specific keywords
  console.log('\n--- KEYWORD SEARCH ---');
  const keywords = ['parable', 'wondrous', 'discourse', 'saba', 'ad kan', 'after the stories', 'chandelier', 'trust', 'faith'];
  for (const kw of keywords) {
    const idx = text.toLowerCase().indexOf(kw);
    if (idx >= 0) {
      console.log(`  "${kw}" found at position ${idx}: "...${text.substring(Math.max(0, idx - 30), idx + 80).replace(/\n/g, ' ')}..."`);
    } else {
      console.log(`  "${kw}" NOT found`);
    }
  }
}

main().catch(console.error);
