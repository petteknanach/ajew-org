#!/usr/bin/env node
/**
 * Build directed concept progression graph.
 * Analyzes the ORDER in which concepts appear within texts
 * to determine "Concept A leads to Concept B" relationships.
 *
 * Output: public/data/concept-progression.json
 */
const fs = require('fs');
const path = require('path');

// Same 54 concepts from build-concept-graph.cjs
const CONCEPTS = [
  { id: 'teshuva', he: 'תשובה', en: 'Repentance' },
  { id: 'simcha', he: 'שמחה', en: 'Joy' },
  { id: 'emuna', he: 'אמונה', en: 'Faith' },
  { id: 'tefila', he: 'תפילה', en: 'Prayer' },
  { id: 'tzaddik', he: 'צדיק', en: 'Righteous One' },
  { id: 'torah', he: 'תורה', en: 'Torah' },
  { id: 'daat', he: 'דעת', en: 'Knowledge' },
  { id: 'chesed', he: 'חסד', en: 'Kindness' },
  { id: 'din', he: 'דין', en: 'Judgment' },
  { id: 'shalom', he: 'שלום', en: 'Peace' },
  { id: 'emet', he: 'אמת', en: 'Truth' },
  { id: 'kedusha', he: 'קדושה', en: 'Holiness' },
  { id: 'rachamim', he: 'רחמים', en: 'Mercy' },
  { id: 'yirah', he: 'יראה', en: 'Awe/Fear' },
  { id: 'ahava', he: 'אהבה', en: 'Love' },
  { id: 'bitachon', he: 'בטחון', en: 'Trust' },
  { id: 'shabbat', he: 'שבת', en: 'Shabbat' },
  { id: 'hitbodedut', he: 'התבודדות', en: 'Seclusion/Meditation' },
  { id: 'tikkun', he: 'תיקון', en: 'Repair' },
  { id: 'neshama', he: 'נשמה', en: 'Soul' },
  { id: 'olam-haba', he: 'עולם הבא', en: 'World to Come' },
  { id: 'geula', he: 'גאולה', en: 'Redemption' },
  { id: 'mashiach', he: 'משיח', en: 'Messiah' },
  { id: 'avoda', he: 'עבודה', en: 'Service/Work' },
  { id: 'tzedaka', he: 'צדקה', en: 'Charity' },
  { id: 'kavana', he: 'כוונה', en: 'Intent' },
  { id: 'ratzon', he: 'רצון', en: 'Will/Desire' },
  { id: 'mochin', he: 'מוחין', en: 'Consciousness' },
  { id: 'chochma', he: 'חכמה', en: 'Wisdom' },
  { id: 'bina', he: 'בינה', en: 'Understanding' },
  { id: 'malchut', he: 'מלכות', en: 'Kingship' },
  { id: 'eretz-yisrael', he: 'ארץ ישראל', en: 'Land of Israel' },
  { id: 'yerushalayim', he: 'ירושלים', en: 'Jerusalem' },
  { id: 'brit', he: 'ברית', en: 'Covenant' },
  { id: 'nigun', he: 'ניגון', en: 'Melody' },
  { id: 'anava', he: 'ענווה', en: 'Humility' },
  { id: 'gaava', he: 'גאווה', en: 'Pride' },
  { id: 'taava', he: 'תאווה', en: 'Desire' },
  { id: 'yetzer', he: 'יצר', en: 'Inclination' },
  { id: 'kapara', he: 'כפרה', en: 'Atonement' },
  { id: 'nevua', he: 'נבואה', en: 'Prophecy' },
  { id: 'devekut', he: 'דביקות', en: 'Clinging/Attachment' },
  { id: 'galut', he: 'גלות', en: 'Exile' },
  { id: 'parnasa', he: 'פרנסה', en: 'Livelihood' },
  { id: 'refua', he: 'רפואה', en: 'Healing' },
  { id: 'shira', he: 'שירה', en: 'Song' },
  { id: 'tzimtzum', he: 'צמצום', en: 'Contraction' },
  { id: 'hod', he: 'הוד', en: 'Splendor' },
  { id: 'netzach', he: 'נצח', en: 'Eternity/Victory' },
  { id: 'tiferet', he: 'תפארת', en: 'Beauty' },
  { id: 'gevura', he: 'גבורה', en: 'Strength' },
  { id: 'yesod', he: 'יסוד', en: 'Foundation' },
  { id: 'keter', he: 'כתר', en: 'Crown' },
  { id: 'tikva', he: 'תקווה', en: 'Hope' },
];

// Strip nikud for matching
function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

// Build progression: for each document, find what order concepts appear
function analyzeProgression(text) {
  const stripped = stripNikud(text);
  const positions = [];

  for (const concept of CONCEPTS) {
    const idx = stripped.indexOf(concept.he);
    if (idx !== -1) {
      // Find FIRST occurrence position
      positions.push({ id: concept.id, pos: idx });
    }
  }

  // Sort by position
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map(p => p.id);
}

// Main
const searchIndexPath = path.join(process.cwd(), 'public', 'search-index', 'search-index.json');
let documents;

try {
  const indexData = JSON.parse(fs.readFileSync(searchIndexPath, 'utf8'));
  documents = indexData.documents || indexData;
  console.log(`Loaded ${Array.isArray(documents) ? documents.length : 'N/A'} documents`);
} catch (e) {
  console.log('Search index not found, scanning reader files instead...');
  documents = [];

  // Scan Breslov reader files
  const readerDir = path.join(process.cwd(), 'public', 'reader');
  const bookDirs = ['likutay-moharan', 'sefer-hamidos', 'sichos-haran', 'likutay-halachos',
    'likutay-tefilos', 'likutay-eitzos', 'shivchay-haran', 'hashtatfchus-hanefesh',
    'meshivas-nefesh', 'parparos-lechochma'];

  for (const bookDir of bookDirs) {
    const bookPath = path.join(readerDir, bookDir);
    if (!fs.existsSync(bookPath)) continue;

    function scanDir(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name));
        } else if (entry.name.endsWith('.json') && entry.name !== 'index.json') {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
            if (data.segments) {
              const text = data.segments.map(s => s.he || '').join(' ');
              documents.push({ content: text, title: data.title || entry.name });
            }
          } catch (e) { /* skip */ }
        }
      }
    }
    scanDir(bookPath);
  }
  console.log(`Scanned ${documents.length} reader files`);
}

// Build directed edges: concept A → concept B means A appears BEFORE B
const edges = {}; // edges[fromId][toId] = count

for (const doc of documents) {
  const text = doc.content || doc.text || '';
  if (!text || text.length < 50) continue;

  const order = analyzeProgression(text);

  // For each pair where A comes before B, increment edge
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const from = order[i];
      const to = order[j];
      if (!edges[from]) edges[from] = {};
      edges[from][to] = (edges[from][to] || 0) + 1;
    }
  }
}

// Build output: for each concept, top 5 "leads to" and top 5 "comes from"
const progression = CONCEPTS.map(c => {
  const leadsTo = [];
  if (edges[c.id]) {
    for (const [toId, weight] of Object.entries(edges[c.id])) {
      leadsTo.push({ to: toId, weight });
    }
    leadsTo.sort((a, b) => b.weight - a.weight);
  }

  const comesFrom = [];
  for (const [fromId, targets] of Object.entries(edges)) {
    if (targets[c.id]) {
      comesFrom.push({ from: fromId, weight: targets[c.id] });
    }
  }
  comesFrom.sort((a, b) => b.weight - a.weight);

  return {
    ...c,
    leadsTo: leadsTo.slice(0, 8),
    comesFrom: comesFrom.slice(0, 8),
    totalLeadsTo: leadsTo.reduce((s, e) => s + e.weight, 0),
    totalComesFrom: comesFrom.reduce((s, e) => s + e.weight, 0),
  };
});

// Find strongest multi-step pathways (3+ concepts)
const pathways = [];
function findPathways(current, path, depth) {
  if (depth >= 4) {
    const minWeight = Math.min(...path.map((p, i) => {
      if (i === 0) return Infinity;
      return edges[path[i-1]]?.[p] || 0;
    }).filter(w => w !== Infinity));
    if (minWeight > 100) {
      pathways.push({ path: [...path], strength: minWeight });
    }
    return;
  }

  const targets = edges[current];
  if (!targets) return;

  const sorted = Object.entries(targets)
    .filter(([to]) => !path.includes(to))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [to, weight] of sorted) {
    if (weight > 50) {
      findPathways(to, [...path, to], depth + 1);
    }
  }
}

// Start pathways from top concepts
const topConcepts = progression
  .sort((a, b) => b.totalLeadsTo - a.totalLeadsTo)
  .slice(0, 15);

for (const c of topConcepts) {
  findPathways(c.id, [c.id], 1);
}

pathways.sort((a, b) => b.strength - a.strength);
const topPathways = pathways.slice(0, 20);

const output = {
  concepts: progression,
  pathways: topPathways,
  generated: new Date().toISOString(),
  totalDocuments: documents.length,
};

fs.writeFileSync('public/data/concept-progression.json', JSON.stringify(output, null, 2));
console.log(`\nGenerated concept-progression.json`);
console.log(`${progression.length} concepts with directed edges`);
console.log(`${topPathways.length} multi-step pathways found`);

// Show top 5 pathways
console.log('\nTop pathways:');
topPathways.slice(0, 5).forEach(p => {
  const names = p.path.map(id => CONCEPTS.find(c => c.id === id)?.en || id);
  console.log(`  ${names.join(' → ')} (strength: ${p.strength})`);
});
