/**
 * Build a concept co-occurrence graph from the search index.
 *
 * Reads public/data/search-index-v2.json, finds ~50 key Breslov/Torah concepts
 * in each document, builds a co-occurrence matrix, and outputs
 * public/data/concept-graph.json with concept nodes and weighted edges.
 *
 * Output format:
 * {
 *   "concepts": [{ id, he, en, count, connections: [{ to, weight }] }],
 *   "generated": "ISO timestamp",
 *   "totalDocuments": N,
 *   "totalConcepts": N
 * }
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'public/data/search-index-v2.json');
const OUTPUT_PATH = path.join(ROOT, 'public/data/concept-graph.json');

// Strip nikud from text for matching
function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

// ~50 important Breslov/Torah concepts
// Each: [id, hebrew (no nikud), english label]
const CONCEPTS = [
  // Core Breslov
  ['teshuva', 'תשובה', 'Repentance'],
  ['simcha', 'שמחה', 'Joy'],
  ['emuna', 'אמונה', 'Faith'],
  ['tefilla', 'תפילה', 'Prayer'],
  ['tzaddik', 'צדיק', 'Tzaddik'],
  ['hitbodedut', 'התבודדות', 'Meditation'],
  ['pshitus', 'פשיטות', 'Simplicity'],
  ['emet', 'אמת', 'Truth'],
  ['anava', 'ענוה', 'Humility'],
  ['azut_dkedusha', 'עזות דקדושה', 'Holy Boldness'],
  ['nekudot_tovot', 'נקודות טובות', 'Good Points'],
  ['tikun_habrit', 'תיקון הברית', 'Covenant Repair'],
  ['ratzon', 'רצון', 'Will / Desire'],
  ['bitachon', 'בטחון', 'Trust in God'],
  ['dvekut', 'דבקות', 'Clinging to God'],
  ['hispaalut', 'התפעלות', 'Enthusiasm'],
  ['dibbur', 'דיבור', 'Speech'],

  // Sefirot / Consciousness
  ['daat', 'דעת', 'Knowledge'],
  ['chochma', 'חכמה', 'Wisdom'],
  ['bina', 'בינה', 'Understanding'],
  ['mochin', 'מוחין', 'Consciousness'],
  ['chesed', 'חסד', 'Kindness'],
  ['din', 'דין', 'Judgment'],
  ['rachamim', 'רחמים', 'Mercy'],
  ['malchut', 'מלכות', 'Kingship'],
  ['tiferet', 'תפארת', 'Beauty / Harmony'],

  // Torah / Mitzvot
  ['torah', 'תורה', 'Torah'],
  ['shabbat', 'שבת', 'Shabbat'],
  ['rosh_hashana', 'ראש השנה', 'Rosh Hashana'],
  ['eretz_yisrael', 'ארץ ישראל', 'Land of Israel'],
  ['tzedaka', 'צדקה', 'Charity'],
  ['brit_mila', 'ברית מילה', 'Circumcision'],
  ['tefillin', 'תפילין', 'Tefillin'],
  ['mikva', 'מקוה', 'Mikva'],
  ['mitzva', 'מצוה', 'Mitzvah'],
  ['tehillim', 'תהלים', 'Psalms'],

  // Middot / Character
  ['shalom', 'שלום', 'Peace'],
  ['kavod', 'כבוד', 'Honor'],
  ['mamon', 'ממון', 'Money'],
  ['machloket', 'מחלוקת', 'Controversy'],
  ['gaava', 'גאוה', 'Pride'],
  ['taava', 'תאוה', 'Desire / Lust'],
  ['yiush', 'יאוש', 'Despair'],
  ['ahava', 'אהבה', 'Love'],
  ['yira', 'יראה', 'Fear of God'],

  // Redemption / Spiritual
  ['geula', 'גאולה', 'Redemption'],
  ['mashiach', 'משיח', 'Mashiach'],
  ['neshama', 'נשמה', 'Soul'],
  ['olam_haba', 'עולם הבא', 'World to Come'],
  ['yetzer_hara', 'יצר הרע', 'Evil Inclination'],
  ['kedusha', 'קדושה', 'Holiness'],
  ['niggun', 'ניגון', 'Melody / Song'],
  ['tikun', 'תיקון', 'Rectification'],
  ['tzimtzum', 'צמצום', 'Contraction'],
];

function main() {
  console.log('Building concept co-occurrence graph from search index...\n');

  // Load search index
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('Search index not found at:', INDEX_PATH);
    process.exit(1);
  }

  console.log('Loading search index...');
  const raw = fs.readFileSync(INDEX_PATH, 'utf8');
  const index = JSON.parse(raw);
  const docs = index.documents;
  console.log(`  Loaded ${docs.length} documents\n`);

  // Strip nikud from concept terms (in case any snuck in)
  const concepts = CONCEPTS.map(([id, he, en]) => ({
    id,
    he: stripNikud(he),
    en,
    count: 0
  }));

  const n = concepts.length;

  // Phase 1: For each document, find which concepts appear
  console.log('Scanning documents for concept occurrences...');
  const docConcepts = new Array(docs.length); // doc index -> array of concept indices

  for (let di = 0; di < docs.length; di++) {
    const content = docs[di].content || '';
    const found = [];
    for (let ci = 0; ci < n; ci++) {
      if (content.includes(concepts[ci].he)) {
        found.push(ci);
        concepts[ci].count++;
      }
    }
    docConcepts[di] = found;
  }

  // Report concept counts
  console.log('\nConcept occurrence counts (docs containing concept):');
  const sorted = [...concepts].sort((a, b) => b.count - a.count);
  for (const c of sorted) {
    console.log(`  ${c.he} (${c.en}): ${c.count} docs`);
  }

  // Phase 2: Build co-occurrence matrix
  console.log('\nBuilding co-occurrence matrix...');
  const cooccur = new Int32Array(n * n);

  for (let di = 0; di < docs.length; di++) {
    const found = docConcepts[di];
    for (let i = 0; i < found.length; i++) {
      for (let j = i + 1; j < found.length; j++) {
        const a = found[i];
        const b = found[j];
        cooccur[a * n + b]++;
        cooccur[b * n + a]++;
      }
    }
  }

  // Phase 3: For each concept, find top 8 co-occurring concepts
  console.log('Finding top connections per concept...');
  const MAX_CONNECTIONS = 8;

  const result = {
    concepts: [],
    generated: new Date().toISOString(),
    totalDocuments: docs.length,
    totalConcepts: n
  };

  for (let ci = 0; ci < n; ci++) {
    const c = concepts[ci];
    // Gather all co-occurrence weights for this concept
    const pairs = [];
    for (let oi = 0; oi < n; oi++) {
      if (oi === ci) continue;
      const w = cooccur[ci * n + oi];
      if (w > 0) {
        pairs.push({ to: concepts[oi].id, weight: w });
      }
    }
    // Sort by weight descending, take top N
    pairs.sort((a, b) => b.weight - a.weight);
    const connections = pairs.slice(0, MAX_CONNECTIONS);

    result.concepts.push({
      id: c.id,
      he: c.he,
      en: c.en,
      count: c.count,
      connections
    });
  }

  // Sort concepts by count descending in output
  result.concepts.sort((a, b) => b.count - a.count);

  // Save
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');

  const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`\n=== Done! ===`);
  console.log(`Concept graph saved to: ${OUTPUT_PATH}`);
  console.log(`  ${result.concepts.length} concepts, ${sizeMB} MB`);
  console.log(`\nTop 10 most frequent concepts:`);
  for (const c of result.concepts.slice(0, 10)) {
    const topConn = c.connections.slice(0, 3).map(x => `${x.to}(${x.weight})`).join(', ');
    console.log(`  ${c.he} (${c.en}): ${c.count} docs - top connections: ${topConn}`);
  }
}

main();
