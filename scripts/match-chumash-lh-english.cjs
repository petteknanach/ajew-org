/**
 * Match Chumash LH segments to Likutay Halachos English translations
 *
 * Pass 1: n-gram matching (3-gram then 2-gram)
 * Pass 2: For unmatched segments, try neighbor propagation
 *         (if surrounding segments matched same halacha, fill gaps from adjacent LH segments)
 * Pass 3: For still-unmatched, try single distinctive word matching
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const CLH_DIR = path.join(READER_DIR, 'chumash-lh');
const LH_DIR = path.join(READER_DIR, 'likutay-halachos');

function cleanHebrew(text) {
  if (!text) return [];
  return text
    .replace(/[\u0591-\u05C7]/g, '')
    .split(/[^א-ת]+/)
    .filter(w => w.length >= 2);
}

function getNgrams(words, n) {
  const ngrams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function jaccard(setA, setB) {
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Containment: how much of setA is contained in setB
function containment(setA, setB) {
  if (setA.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  return intersection / setA.size;
}

function loadLH() {
  console.log('Loading Likutay Halachos...');
  const allSegments = [];
  const byKey = new Map(); // key = "part-halacha-segIndex"

  for (let p = 1; p <= 8; p++) {
    const dir = path.join(LH_DIR, `part-${p}`);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter(f => f.startsWith('halacha-'));
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      for (const seg of data.segments) {
        if (!seg.he || seg.he.length < 15) continue;
        const words = cleanHebrew(seg.he);
        if (words.length < 3) continue;

        const entry = {
          part: p,
          halacha: data.torah,
          title: data.title,
          segIndex: seg.index,
          he: seg.he,
          en: seg.en || null,
          words,
          ngrams2: getNgrams(words, 2),
          ngrams3: getNgrams(words, 3),
        };
        allSegments.push(entry);
        byKey.set(`${p}-${data.torah}-${seg.index}`, entry);
      }
    }
  }

  console.log(`  Loaded ${allSegments.length} LH segments`);
  return { allSegments, byKey };
}

function findBestMatch(clhWords, lhSegments, ngramSize, minScore) {
  if (clhWords.length < ngramSize + 1) return null;

  const clhNgrams = getNgrams(clhWords, ngramSize);
  if (clhNgrams.size === 0) return null;

  let bestScore = 0;
  let bestMatch = null;
  const field = ngramSize === 3 ? 'ngrams3' : 'ngrams2';

  for (const lhSeg of lhSegments) {
    if (!lhSeg.en) continue;

    // Quick pre-filter: at least one shared ngram
    let hasShared = false;
    for (const ng of clhNgrams) {
      if (lhSeg[field].has(ng)) { hasShared = true; break; }
    }
    if (!hasShared) continue;

    // Use containment (how much of CLH is found in LH) instead of Jaccard
    // This handles the case where CLH segment is a subset of a longer LH segment
    const cont = containment(clhNgrams, lhSeg[field]);
    const jacc = jaccard(clhNgrams, lhSeg[field]);
    const score = Math.max(cont * 0.7, jacc); // weighted blend favoring containment

    if (score > bestScore) {
      bestScore = score;
      bestMatch = lhSeg;
    }
  }

  if (bestScore >= minScore && bestMatch) {
    return { ...bestMatch, score: bestScore };
  }
  return null;
}

function main() {
  const { allSegments: lhSegments, byKey } = loadLH();

  let totalClhSegs = 0;
  let matchedSegs = 0;
  let pass2Matched = 0;
  let updatedFiles = 0;

  for (let p = 1; p <= 6; p++) {
    const partDir = path.join(CLH_DIR, `part-${p}`);
    if (!fs.existsSync(partDir)) continue;

    const files = fs.readdirSync(partDir).filter(f => f.startsWith('torah-') && f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(partDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let fileModified = false;

      console.log(`\nProcessing: Part ${p} - ${data.title} (${data.segments.length} segments)`);

      // PASS 1: Direct n-gram matching
      for (const seg of data.segments) {
        if (!seg.he || seg.he.length < 25) continue;
        if (seg.en) continue; // already has English from previous run
        totalClhSegs++;

        const clhWords = cleanHebrew(seg.he);

        // Try 3-gram first
        let match = findBestMatch(clhWords, lhSegments, 3, 0.02);

        // If no 3-gram match, try 2-gram
        if (!match) {
          match = findBestMatch(clhWords, lhSegments, 2, 0.04);
        }

        if (match) {
          seg.en = match.en;
          seg.lhSource = `${match.title} (Part ${match.part}, Halacha ${match.halacha}, §${match.segIndex})`;
          seg._matchScore = match.score;
          matchedSegs++;
          fileModified = true;
        }
      }

      // PASS 2: Neighbor propagation for unmatched segments
      // If seg N-1 and seg N+1 both matched to same halacha, try adjacent LH segments
      for (let i = 0; i < data.segments.length; i++) {
        const seg = data.segments[i];
        if (seg.en || !seg.he || seg.he.length < 25) continue;

        const prev = data.segments[i - 1];
        const next = data.segments[i + 1];

        // Get sources from neighbors
        const sources = [];
        if (prev?.lhSource) sources.push(prev.lhSource);
        if (next?.lhSource) sources.push(next.lhSource);

        for (const src of sources) {
          // Parse "Title (Part X, Halacha Y, §Z)"
          const m = src.match(/Part (\d+), Halacha (\d+), §(\d+)/);
          if (!m) continue;

          const [, sp, sh, ss] = m.map(Number);

          // Try the LH segments around the neighbor's match
          for (let offset = -3; offset <= 3; offset++) {
            const key = `${sp}-${sh}-${ss + offset}`;
            const lhSeg = byKey.get(key);
            if (!lhSeg || !lhSeg.en) continue;

            const clhWords = cleanHebrew(seg.he);
            const clhNg2 = getNgrams(clhWords, 2);
            if (clhNg2.size === 0) continue;

            const cont = containment(clhNg2, lhSeg.ngrams2);
            if (cont >= 0.15) {
              seg.en = lhSeg.en;
              seg.lhSource = `${lhSeg.title} (Part ${lhSeg.part}, Halacha ${lhSeg.halacha}, §${lhSeg.segIndex})`;
              seg._matchScore = cont;
              pass2Matched++;
              fileModified = true;
              break;
            }
          }
          if (seg.en) break;
        }
      }

      if (fileModified) {
        // Clean up internal fields
        for (const seg of data.segments) {
          delete seg._matchScore;
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        updatedFiles++;
        const fileMatched = data.segments.filter(s => s.en).length;
        const fileTotal = data.segments.filter(s => s.he && s.he.length >= 25).length;
        console.log(`  Matched: ${fileMatched}/${fileTotal} segments (${pass2Matched} from neighbors)`);
      }
    }
  }

  const totalMatched = matchedSegs + pass2Matched;
  // totalClhSegs only counts segments that didn't already have English
  console.log('\n=== RESULTS ===');
  console.log(`New segments processed: ${totalClhSegs}`);
  console.log(`Pass 1 (n-gram): ${matchedSegs}`);
  console.log(`Pass 2 (neighbor): ${pass2Matched}`);
  console.log(`Total newly matched: ${totalMatched}`);
  console.log(`Files updated: ${updatedFiles}`);
}

main();
