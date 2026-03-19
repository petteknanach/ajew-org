/**
 * Build a concept graph from all Breslov teachings.
 *
 * This extracts key concepts from every torah/section and builds:
 * 1. A vocabulary of frequently-used spiritual concepts
 * 2. Co-occurrence data (which concepts appear together)
 * 3. Sequential/progression data (which concepts appear BEFORE and AFTER each other within a torah)
 * 4. A directed graph showing concept pathways
 *
 * Output: public/data/concept-graph.json
 */

const fs = require('fs');
const path = require('path');

const READER_BASE = path.join(__dirname, '../public/reader');
const OUTPUT = path.join(__dirname, '../public/data/concept-graph.json');

// ── Key spiritual concepts in Rabbi Nachman's teachings ──
// Hebrew keyword → English translation + category
const CONCEPT_VOCAB = {
  // Core spiritual concepts
  'אמונה': { en: 'Faith', cat: 'core' },
  'תפלה': { en: 'Prayer', cat: 'core' },
  'תשובה': { en: 'Repentance', cat: 'core' },
  'שמחה': { en: 'Joy', cat: 'core' },
  'התבודדות': { en: 'Hisbodidus', cat: 'core' },
  'צדיק': { en: 'Tzaddik', cat: 'core' },
  'תורה': { en: 'Torah', cat: 'core' },
  'אמת': { en: 'Truth', cat: 'core' },
  'חסד': { en: 'Kindness', cat: 'core' },
  'דעת': { en: 'Knowledge/Awareness', cat: 'core' },
  'רצון': { en: 'Will/Desire', cat: 'core' },
  'ביטול': { en: 'Nullification', cat: 'core' },

  // Middos / Character traits
  'ענוה': { en: 'Humility', cat: 'middos' },
  'גאוה': { en: 'Pride', cat: 'middos' },
  'כעס': { en: 'Anger', cat: 'middos' },
  'סבלנות': { en: 'Patience', cat: 'middos' },
  'יראה': { en: 'Fear of God', cat: 'middos' },
  'אהבה': { en: 'Love', cat: 'middos' },
  'קדושה': { en: 'Holiness', cat: 'middos' },
  'טהרה': { en: 'Purity', cat: 'middos' },
  'חכמה': { en: 'Wisdom', cat: 'middos' },
  'בינה': { en: 'Understanding', cat: 'middos' },
  'עצבות': { en: 'Sadness', cat: 'middos' },
  'תאוה': { en: 'Desire/Lust', cat: 'middos' },
  'קנאה': { en: 'Jealousy', cat: 'middos' },
  'שלום': { en: 'Peace', cat: 'middos' },
  'חן': { en: 'Grace/Favor', cat: 'middos' },
  'בטחון': { en: 'Trust', cat: 'middos' },
  'זכרון': { en: 'Memory', cat: 'middos' },

  // Spiritual processes
  'תיקון': { en: 'Rectification', cat: 'process' },
  'בריאה': { en: 'Creation', cat: 'process' },
  'גאולה': { en: 'Redemption', cat: 'process' },
  'משיח': { en: 'Messiah', cat: 'process' },
  'נשמה': { en: 'Soul', cat: 'process' },
  'ניצוצות': { en: 'Sparks', cat: 'process' },
  'עליה': { en: 'Ascent', cat: 'process' },
  'ירידה': { en: 'Descent', cat: 'process' },
  'דבקות': { en: 'Attachment to God', cat: 'process' },
  'התקרבות': { en: 'Drawing Close', cat: 'process' },
  'התחזקות': { en: 'Strengthening', cat: 'process' },

  // Torah concepts
  'שבת': { en: 'Shabbos', cat: 'torah' },
  'ברית': { en: 'Covenant', cat: 'torah' },
  'צדקה': { en: 'Charity', cat: 'torah' },
  'מצוה': { en: 'Mitzvah', cat: 'torah' },
  'לימוד': { en: 'Study', cat: 'torah' },
  'הלכה': { en: 'Halacha', cat: 'torah' },
  'תהלים': { en: 'Psalms', cat: 'torah' },
  'כשרות': { en: 'Kashrus', cat: 'torah' },

  // Places/times
  'ארץ ישראל': { en: 'Land of Israel', cat: 'place' },
  'ראש השנה': { en: 'Rosh Hashana', cat: 'time' },
  'פסח': { en: 'Pesach', cat: 'time' },

  // Na Nach specific
  'פתק': { en: 'The Petek', cat: 'nanach' },
  'נ נח נחמ נחמן': { en: 'Na Nach Nachma Nachman', cat: 'nanach' },
  'אומן': { en: 'Uman', cat: 'nanach' },

  // Key relationships
  'פרנסה': { en: 'Livelihood', cat: 'life' },
  'שידוך': { en: 'Marriage Match', cat: 'life' },
  'רפואה': { en: 'Healing', cat: 'life' },
  'בנים': { en: 'Children', cat: 'life' },
  'חלומות': { en: 'Dreams', cat: 'life' },
  'מחלוקת': { en: 'Controversy', cat: 'life' },
  'שקר': { en: 'Falsehood', cat: 'life' },
  'דיבור': { en: 'Speech', cat: 'core' },
  'שתיקה': { en: 'Silence', cat: 'core' },
  'ניגון': { en: 'Melody', cat: 'core' },
  'ריקוד': { en: 'Dance', cat: 'core' },
};

function stripNikud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function main() {
  console.log('Building concept graph from all teachings...\n');

  // Load all documents
  const catalog = JSON.parse(fs.readFileSync(path.join(READER_BASE, 'catalog.json'), 'utf8'));
  const documents = [];

  for (const book of catalog.books) {
    for (const part of book.parts) {
      const partDir = part.indexUrl.replace(/\/index\.json$/, '').replace(/^\/reader\//, '');
      const fullDir = path.join(READER_BASE, partDir);
      if (!fs.existsSync(fullDir)) continue;

      const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.json') && f !== 'index.json');
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(fullDir, file), 'utf8'));
          const fullText = stripNikud(data.segments.map(s => s.he).join(' '));
          documents.push({
            id: data.id,
            book: book.id,
            bookTitle: book.title,
            bookHebrew: book.hebrewTitle,
            part: data.part,
            num: data.torah || data.displayNumber,
            title: data.hebrewTitle,
            url: data.navigation?.nextUrl ? data.navigation.nextUrl.replace(/\/\d+$/, '/' + (data.torah || data.displayNumber)) : `/reader/${book.id}/${data.part}/${data.torah || data.displayNumber}`,
            text: fullText,
            segments: data.segments.map(s => stripNikud(s.he)),
            hasEnglish: data.hasEnglish
          });
        } catch (e) { /* skip bad files */ }
      }
    }
  }

  console.log(`Loaded ${documents.length} documents\n`);

  // ── Step 1: Count concept occurrences per document ──
  const conceptDocs = {}; // concept -> [{ docIdx, count, positions }]
  const docConcepts = {}; // docIdx -> [{ concept, count, firstPos }]
  const conceptKeys = Object.keys(CONCEPT_VOCAB);

  for (let d = 0; d < documents.length; d++) {
    const doc = documents[d];
    const text = doc.text;
    docConcepts[d] = [];

    for (const concept of conceptKeys) {
      // Count occurrences and find position (as fraction of text length)
      let count = 0;
      let firstPos = -1;
      let searchFrom = 0;
      while (true) {
        const idx = text.indexOf(concept, searchFrom);
        if (idx === -1) break;
        count++;
        if (firstPos === -1) firstPos = idx / text.length; // Normalized position 0-1
        searchFrom = idx + concept.length;
      }

      if (count > 0) {
        if (!conceptDocs[concept]) conceptDocs[concept] = [];
        conceptDocs[concept].push({ docIdx: d, count, firstPos });
        docConcepts[d].push({ concept, count, firstPos });
      }
    }

    // Sort by position in text (for progression analysis)
    docConcepts[d].sort((a, b) => a.firstPos - b.firstPos);
  }

  // ── Step 2: Build co-occurrence matrix ──
  // How often do two concepts appear in the same document?
  const cooccurrence = {}; // "conceptA|conceptB" -> count

  for (const d in docConcepts) {
    const concepts = docConcepts[d].map(c => c.concept);
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const key = [concepts[i], concepts[j]].sort().join('|');
        cooccurrence[key] = (cooccurrence[key] || 0) + 1;
      }
    }
  }

  // ── Step 3: Build progression/flow data ──
  // When concept A appears BEFORE concept B in a torah, it suggests A leads to B
  const flow = {}; // "from|to" -> count (directed)

  for (const d in docConcepts) {
    const concepts = docConcepts[d];
    if (concepts.length < 2) continue;

    // For each pair where A appears before B
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        // Only count if positions are meaningfully different (not in same sentence)
        if (concepts[j].firstPos - concepts[i].firstPos > 0.05) {
          const key = `${concepts[i].concept}|${concepts[j].concept}`;
          flow[key] = (flow[key] || 0) + 1;
        }
      }
    }
  }

  // ── Step 4: Build the output graph ──

  // Concept nodes
  const nodes = [];
  for (const [concept, info] of Object.entries(CONCEPT_VOCAB)) {
    const docs = conceptDocs[concept] || [];
    if (docs.length === 0) continue;

    const totalOccurrences = docs.reduce((s, d) => s + d.count, 0);

    // Find top books this concept appears in
    const bookCounts = {};
    for (const d of docs) {
      const bookId = documents[d.docIdx].book;
      bookCounts[bookId] = (bookCounts[bookId] || 0) + d.count;
    }
    const topBooks = Object.entries(bookCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));

    nodes.push({
      id: concept,
      en: info.en,
      cat: info.cat,
      docs: docs.length,
      occurrences: totalOccurrences,
      topBooks,
    });
  }

  nodes.sort((a, b) => b.occurrences - a.occurrences);

  // Edges (co-occurrence)
  const coEdges = Object.entries(cooccurrence)
    .filter(([, count]) => count >= 5) // Minimum 5 co-occurrences
    .map(([key, count]) => {
      const [a, b] = key.split('|');
      return { source: a, target: b, weight: count, type: 'cooccurrence' };
    })
    .sort((a, b) => b.weight - a.weight);

  // Flow edges (directed progression)
  const flowEdges = Object.entries(flow)
    .filter(([, count]) => count >= 3) // Minimum 3 progressions
    .map(([key, count]) => {
      const [from, to] = key.split('|');
      // Check if reverse flow is also significant
      const reverseKey = `${to}|${from}`;
      const reverseCount = flow[reverseKey] || 0;
      // Net direction: if A->B is much stronger than B->A, it's a strong flow
      const netFlow = count - reverseCount;
      return { from, to, count, reverseCount, netFlow, type: 'flow' };
    })
    .filter(e => e.netFlow > 0) // Only keep net positive flows
    .sort((a, b) => b.netFlow - a.netFlow);

  // Sample teachings for each concept (top 5 most relevant)
  const conceptTeachings = {};
  for (const concept of conceptKeys) {
    const docs = conceptDocs[concept] || [];
    if (docs.length === 0) continue;

    const top = docs
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(d => {
        const doc = documents[d.docIdx];
        // Get a snippet around the first occurrence
        const text = doc.text;
        const idx = text.indexOf(concept);
        const start = Math.max(0, idx - 60);
        const end = Math.min(text.length, idx + concept.length + 60);
        const snippet = text.substring(start, end).trim();

        return {
          id: doc.id,
          book: doc.bookHebrew,
          bookEn: doc.bookTitle,
          title: doc.title,
          num: doc.num,
          url: doc.url,
          count: d.count,
          snippet,
          hasEnglish: doc.hasEnglish
        };
      });

    conceptTeachings[concept] = top;
  }

  // ── Write output ──
  const graph = {
    meta: {
      totalDocuments: documents.length,
      totalConcepts: nodes.length,
      totalCoEdges: coEdges.length,
      totalFlowEdges: flowEdges.length,
      generated: new Date().toISOString(),
    },
    nodes,
    coEdges: coEdges.slice(0, 500), // Top 500 co-occurrences
    flowEdges: flowEdges.slice(0, 300), // Top 300 flows
    teachings: conceptTeachings,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(graph, null, 2), 'utf8');
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);

  console.log('=== Concept Graph Built ===');
  console.log(`Concepts: ${nodes.length}`);
  console.log(`Co-occurrence edges: ${coEdges.length}`);
  console.log(`Flow edges: ${flowEdges.length}`);
  console.log(`Output: ${OUTPUT} (${sizeMB} MB)`);
  console.log('\nTop 15 concepts by occurrence:');
  nodes.slice(0, 15).forEach(n => console.log(`  ${n.id} (${n.en}): ${n.occurrences} in ${n.docs} docs`));
  console.log('\nTop 10 concept flows (A leads to B):');
  flowEdges.slice(0, 10).forEach(e => {
    const fromEn = CONCEPT_VOCAB[e.from]?.en || e.from;
    const toEn = CONCEPT_VOCAB[e.to]?.en || e.to;
    console.log(`  ${e.from} (${fromEn}) → ${e.to} (${toEn}): ${e.netFlow} net flow`);
  });
}

main();
