const fs = require('fs');
const path = require('path');

// Review Likutay Moharan translations for quality issues
// OUTPUT: lm-translation-review-log.md

const readerDir = 'public/reader/likutay-moharan';
const logFile = 'lm-translation-review-log.md';

const issues = [];
const checked = [];

function reviewSegment(partNum, torahNum, segIdx, he, en) {
  if (!en || en.length < 10) return;

  const problems = [];

  // 1. Unreadable: very long sentences without periods (over 300 chars between periods)
  const sentences = en.split(/[.!?]/);
  const longSentences = sentences.filter(s => s.trim().length > 300);
  if (longSentences.length > 0) {
    problems.push({
      type: 'long-sentence',
      severity: 'minor',
      desc: `${longSentences.length} sentence(s) over 300 chars without punctuation`,
      snippet: longSentences[0].substring(0, 150) + '...'
    });
  }

  // 2. Broken newlines in middle of words/phrases
  const brokenNewlines = en.match(/[a-zA-Z]\n[a-zA-Z]/g);
  if (brokenNewlines && brokenNewlines.length > 2) {
    problems.push({
      type: 'broken-newlines',
      severity: 'moderate',
      desc: `${brokenNewlines.length} newlines breaking words/phrases`,
      snippet: en.substring(0, 150)
    });
  }

  // 3. Hebrew characters in English field (untranslated portions)
  const hebrewInEn = en.match(/[\u0590-\u05FF]{3,}/g);
  if (hebrewInEn && hebrewInEn.length > 0) {
    // Filter out known transliterations and source refs
    const realHebrew = hebrewInEn.filter(h => h.length > 5);
    if (realHebrew.length > 3) {
      problems.push({
        type: 'hebrew-in-english',
        severity: 'moderate',
        desc: `${realHebrew.length} Hebrew phrases in English field`,
        snippet: realHebrew.slice(0, 3).join(', ')
      });
    }
  }

  // 4. Repeated phrases (same 20+ word chunk appearing twice)
  const words = en.split(/\s+/);
  for (let i = 0; i < words.length - 20; i++) {
    const chunk = words.slice(i, i + 15).join(' ').toLowerCase();
    const rest = words.slice(i + 15).join(' ').toLowerCase();
    if (rest.includes(chunk) && chunk.length > 60) {
      problems.push({
        type: 'repeated-text',
        severity: 'moderate',
        desc: 'Repeated phrase detected',
        snippet: chunk.substring(0, 100)
      });
      break;
    }
  }

  // 5. Parenthetical overload (too many nested parentheses = hard to read)
  const parenCount = (en.match(/\(/g) || []).length;
  if (parenCount > 10 && en.length < 2000) {
    problems.push({
      type: 'parenthetical-overload',
      severity: 'minor',
      desc: `${parenCount} parentheses in ${en.length} chars - may be hard to read`,
      snippet: ''
    });
  }

  // 6. Formatting artifacts: CSS, HTML tags
  if (en.match(/<[a-z]+|{[^}]*font|style=|class=/i)) {
    problems.push({
      type: 'html-css-artifact',
      severity: 'major',
      desc: 'HTML/CSS artifacts in English text',
      snippet: en.match(/<[a-z]+[^>]*>|{[^}]*}/i)?.[0] || ''
    });
  }

  // 7. Sentence fragments at start (starting with lowercase or conjunction)
  if (en.match(/^[a-z]/) && !en.startsWith('i.e.') && !en.startsWith('etc.')) {
    problems.push({
      type: 'fragment-start',
      severity: 'minor',
      desc: 'Starts with lowercase (possible fragment)',
      snippet: en.substring(0, 80)
    });
  }

  // 8. Very poor readability: multiple "that that", "which which", "the the"
  const doubles = en.match(/\b(that|which|the|and|of|in|is|to|for)\s+\1\b/gi);
  if (doubles && doubles.length > 0) {
    problems.push({
      type: 'word-doubling',
      severity: 'minor',
      desc: `Doubled words: ${doubles.join(', ')}`,
      snippet: ''
    });
  }

  for (const p of problems) {
    issues.push({
      part: partNum,
      torah: torahNum,
      segment: segIdx,
      ...p
    });
  }
}

// Process all files
for (const partNum of [1, 2]) {
  const partDir = path.join(readerDir, 'part-' + partNum);
  const files = fs.readdirSync(partDir)
    .filter(f => f.startsWith('torah-') && f.endsWith('.json'))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });

  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8'));
    const torahNum = data.torah || parseInt(f.match(/\d+/)[0]);

    for (let i = 0; i < data.segments.length; i++) {
      const seg = data.segments[i];
      reviewSegment(partNum, torahNum, i + 1, seg.he, seg.en);
    }

    checked.push(`part-${partNum}/torah-${torahNum}`);
  }
}

// Generate markdown log
let md = `# Likutay Moharan Translation Review Log\n\n`;
md += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
md += `**Torahs Reviewed:** ${checked.length}\n`;
md += `**Issues Found:** ${issues.length}\n\n`;
md += `> **NOTE:** This is an automated scan. All issues are flagged for human review.\n`;
md += `> No changes have been made to any files.\n\n`;

// Group by severity
const major = issues.filter(i => i.severity === 'major');
const moderate = issues.filter(i => i.severity === 'moderate');
const minor = issues.filter(i => i.severity === 'minor');

if (major.length > 0) {
  md += `## 🔴 Major Issues (${major.length})\n\n`;
  for (const i of major) {
    md += `### Part ${i.part}, Torah ${i.torah}, Segment ${i.segment}\n`;
    md += `**Type:** ${i.type}\n`;
    md += `**Description:** ${i.desc}\n`;
    if (i.snippet) md += `**Snippet:** \`${i.snippet}\`\n`;
    md += `\n`;
  }
}

if (moderate.length > 0) {
  md += `## 🟡 Moderate Issues (${moderate.length})\n\n`;
  for (const i of moderate) {
    md += `- **Part ${i.part}, Torah ${i.torah}, Seg ${i.segment}** — ${i.type}: ${i.desc}`;
    if (i.snippet) md += ` — \`${i.snippet.substring(0, 80)}\``;
    md += `\n`;
  }
  md += `\n`;
}

if (minor.length > 0) {
  md += `## 🟢 Minor Issues (${minor.length})\n\n`;
  for (const i of minor) {
    md += `- **Part ${i.part}, Torah ${i.torah}, Seg ${i.segment}** — ${i.type}: ${i.desc}`;
    if (i.snippet) md += ` — \`${i.snippet.substring(0, 60)}\``;
    md += `\n`;
  }
  md += `\n`;
}

md += `## ✅ Checked Torahs (${checked.length})\n\n`;
md += checked.join(', ') + '\n';

fs.writeFileSync(logFile, md);
console.log(`Review complete: ${checked.length} torahs, ${issues.length} issues`);
console.log(`Major: ${major.length}, Moderate: ${moderate.length}, Minor: ${minor.length}`);
console.log(`Log saved to: ${logFile}`);
