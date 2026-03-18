export const prerender = false;

/**
 * Search API v3 - Full-featured Hebrew-aware search
 *
 * Search Types:
 *  - google:    Smart relevance search (any/all words, ranked by frequency & position)
 *  - exact:     Exact phrase match
 *  - all:       ALL words must appear (AND logic)
 *  - any:       ANY of the words can appear (OR logic), ranked by match count
 *  - proximity: Words within N words of each other
 *  - boolean:   AND / OR / NOT operators
 *  - acronym:   ראשי תיבות - match first letters of consecutive words in text
 *  - endletters: סופי תיבות - match last letters of consecutive words in text
 *  - startsWith: Text begins with the query
 *  - endsWith:   Text ends with the query
 */

interface SearchDoc {
  id: string;
  part: number;
  torah: number;
  displayNumber: number;
  title: string;
  hebrewTitle: string;
  themes: string[];
  url: string;
  wordCount: number;
  content: string;
  preview: string;
  hasEnglish: boolean;
  englishContent: string;
}

interface SearchIndex {
  version: number;
  totalDocuments: number;
  documents: SearchDoc[];
}

let indexCache: SearchIndex | null = null;

function stripNikud(text: string): string {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

async function getIndex(reqUrl: string): Promise<SearchDoc[]> {
  if (indexCache) return indexCache.documents;
  const origin = new URL(reqUrl).origin;
  const res = await fetch(origin + '/data/search-index-v2.json');
  if (!res.ok) {
    const oldRes = await fetch(origin + '/data/enhanced-search-index.json');
    if (!oldRes.ok) throw new Error('Could not load search index');
    const oldJson = await oldRes.json();
    const docs = Object.values(oldJson.documents || {}) as any[];
    indexCache = { version: 1, totalDocuments: docs.length, documents: docs };
    return docs;
  }
  indexCache = await res.json();
  return indexCache!.documents;
}

function extractContext(text: string, matchIndex: number, matchLength: number, contextChars = 120): string {
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(text.length, matchIndex + matchLength + contextChars);
  let snippet = text.substring(start, end).replace(/\n/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

// --- Search Functions ---

function searchExact(content: string, query: string) {
  const idx = content.indexOf(query);
  return { match: idx !== -1, index: idx, score: 100 };
}

function searchAll(content: string, words: string[]) {
  let firstIndex = -1;
  let matchCount = 0;
  for (const w of words) {
    const idx = content.indexOf(w);
    if (idx !== -1) {
      matchCount++;
      if (firstIndex === -1 || idx < firstIndex) firstIndex = idx;
    }
  }
  return {
    match: matchCount === words.length,
    index: firstIndex,
    score: 85,
    matchCount
  };
}

function searchAny(content: string, words: string[]) {
  let firstIndex = -1;
  let matchCount = 0;
  for (const w of words) {
    const idx = content.indexOf(w);
    if (idx !== -1) {
      matchCount++;
      if (firstIndex === -1 || idx < firstIndex) firstIndex = idx;
    }
  }
  // Score based on how many words matched
  const ratio = matchCount / words.length;
  return {
    match: matchCount > 0,
    index: firstIndex,
    score: Math.round(50 + ratio * 50),
    matchCount
  };
}

function searchGoogle(content: string, words: string[]) {
  // Smart search: rank by frequency, position, and match count
  let firstIndex = -1;
  let matchCount = 0;
  let totalFreq = 0;

  for (const w of words) {
    const idx = content.indexOf(w);
    if (idx !== -1) {
      matchCount++;
      if (firstIndex === -1 || idx < firstIndex) firstIndex = idx;
      // Count frequency
      const freq = content.split(w).length - 1;
      totalFreq += Math.min(freq, 20);
    }
  }

  if (matchCount === 0) return { match: false, index: -1, score: 0, matchCount: 0 };

  // Check for exact phrase first (bonus)
  const phrase = words.join(' ');
  const phraseIdx = content.indexOf(phrase);
  let score = 60;

  if (phraseIdx !== -1) {
    score = 95; // Exact phrase match gets top score
    firstIndex = phraseIdx;
  } else if (matchCount === words.length) {
    score = 80; // All words present
  } else {
    score = 50 + (matchCount / words.length) * 30; // Partial match
  }

  // Frequency boost
  score += Math.min(totalFreq, 10);

  return { match: true, index: firstIndex, score: Math.min(score, 100), matchCount };
}

function searchProximity(content: string, words: string[], maxGap: number) {
  if (words.length < 2) {
    const idx = content.indexOf(words[0]);
    return { match: idx !== -1, index: idx, score: 90 };
  }
  const escaped = words.map(w => w.replace(/[.*+?^$()|[\]\\]/g, '\\$&'));
  const regexStr = escaped.join('(?:\\W+\\w+){0,' + maxGap + '}\\W+');
  const m = new RegExp(regexStr, 'i').exec(content);
  if (m) return { match: true, index: m.index, score: 90 };
  // Reverse
  const rev = [...escaped].reverse().join('(?:\\W+\\w+){0,' + maxGap + '}\\W+');
  const rm = new RegExp(rev, 'i').exec(content);
  if (rm) return { match: true, index: rm.index, score: 88 };
  return { match: false, index: -1, score: 0 };
}

function searchBoolean(content: string, queryStr: string) {
  // Parse AND, OR, NOT operators
  const tokens = queryStr.split(/\s+/);
  const must: string[] = [];
  const should: string[] = [];
  const mustNot: string[] = [];

  let mode: 'and' | 'or' | 'not' = 'and';
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === 'and' || lower === '&&') { mode = 'and'; continue; }
    if (lower === 'or' || lower === '||') { mode = 'or'; continue; }
    if (lower === 'not' || lower === '!') { mode = 'not'; continue; }
    if (mode === 'not') mustNot.push(token);
    else if (mode === 'or') should.push(token);
    else must.push(token);
  }

  // Check NOT conditions first
  for (const w of mustNot) {
    if (content.includes(w)) return { match: false, index: -1, score: 0 };
  }

  // Check MUST conditions
  let firstIndex = -1;
  for (const w of must) {
    const idx = content.indexOf(w);
    if (idx === -1) return { match: false, index: -1, score: 0 };
    if (firstIndex === -1) firstIndex = idx;
  }

  // Check SHOULD conditions (boost score if found)
  let shouldCount = 0;
  for (const w of should) {
    if (content.includes(w)) shouldCount++;
  }

  const score = 80 + (should.length > 0 ? (shouldCount / should.length) * 15 : 0);
  return { match: true, index: firstIndex >= 0 ? firstIndex : 0, score };
}

/**
 * Acronym search (ראשי תיבות)
 * Given letters like "אבג", find consecutive words in the text
 * whose FIRST letters are א, ב, ג in order.
 */
function searchAcronym(content: string, letters: string) {
  // Split content into words
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const targetLetters = [...letters];
  const len = targetLetters.length;

  if (len === 0 || words.length < len) return { match: false, index: -1, score: 0 };

  // Slide through words looking for consecutive first-letter match
  for (let i = 0; i <= words.length - len; i++) {
    let found = true;
    for (let j = 0; j < len; j++) {
      const firstChar = words[i + j][0];
      if (firstChar !== targetLetters[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      // Find the character index in the original content
      const matchedPhrase = words.slice(i, i + len).join(' ');
      const idx = content.indexOf(matchedPhrase);
      return { match: true, index: idx >= 0 ? idx : 0, score: 95, matchedWords: matchedPhrase };
    }
  }
  return { match: false, index: -1, score: 0 };
}

/**
 * End-letters search (סופי תיבות)
 * Given letters like "אבג", find consecutive words in the text
 * whose LAST letters are א, ב, ג in order.
 */
function searchEndLetters(content: string, letters: string) {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const targetLetters = [...letters];
  const len = targetLetters.length;

  if (len === 0 || words.length < len) return { match: false, index: -1, score: 0 };

  // Handle final-form Hebrew letters: map final to regular for comparison
  const finalToRegular: Record<string, string> = {
    '\u05DA': '\u05DB', // ך -> כ
    '\u05DD': '\u05DE', // ם -> מ
    '\u05DF': '\u05E0', // ן -> נ
    '\u05E3': '\u05E4', // ף -> פ
    '\u05E5': '\u05E6', // ץ -> צ
  };
  const regularToFinal: Record<string, string> = {};
  for (const [f, r] of Object.entries(finalToRegular)) regularToFinal[r] = f;

  function normalizeChar(ch: string): string {
    return finalToRegular[ch] || ch;
  }

  for (let i = 0; i <= words.length - len; i++) {
    let found = true;
    for (let j = 0; j < len; j++) {
      const word = words[i + j];
      const lastChar = word[word.length - 1];
      const target = targetLetters[j];
      // Compare with final-form normalization
      if (normalizeChar(lastChar) !== normalizeChar(target)) {
        found = false;
        break;
      }
    }
    if (found) {
      const matchedPhrase = words.slice(i, i + len).join(' ');
      const idx = content.indexOf(matchedPhrase);
      return { match: true, index: idx >= 0 ? idx : 0, score: 95, matchedWords: matchedPhrase };
    }
  }
  return { match: false, index: -1, score: 0 };
}

function searchStartsWith(content: string, query: string) {
  // Find words that start with the query
  const regex = new RegExp('(?:^|\\s)(' + query.replace(/[.*+?^$()|[\]\\]/g, '\\$&') + '\\S*)', 'i');
  const m = regex.exec(content);
  return { match: !!m, index: m ? m.index : -1, score: 85 };
}

function searchEndsWith(content: string, query: string) {
  // Find words that end with the query
  const regex = new RegExp('(\\S*' + query.replace(/[.*+?^$()|[\]\\]/g, '\\$&') + ')(?:\\s|$)', 'i');
  const m = regex.exec(content);
  return { match: !!m, index: m ? m.index : -1, score: 85 };
}

// --- Main Handler ---

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const searchType = url.searchParams.get('searchType') || 'google';
    const proximityStr = url.searchParams.get('proximity') || '0';
    const proximity = parseInt(proximityStr, 10);
    const booksParam = url.searchParams.get('books');
    const books = booksParam ? booksParam.split(',').filter(Boolean) : [];
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
    const minWords = parseInt(url.searchParams.get('minWords') || '0', 10);

    if (!query.trim()) {
      return new Response(JSON.stringify({ results: [], total: 0, page: 1, searchType }),
        { headers: { 'Content-Type': 'application/json' } });
    }

    const documents = await getIndex(request.url);
    const normalizedQuery = stripNikud(query).toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

    const results: any[] = [];

    for (const doc of documents) {
      // Book filter
      if (books.length > 0) {
        const bookId = (doc as any).bookId || '';
        const partMatch = books.some(b =>
          b === bookId || b === `part-${doc.part}` || b === 'likutay-moharan'
        );
        if (!partMatch && bookId && !books.includes(bookId)) continue;
      }

      const content = (doc.content || '').toLowerCase();
      if (!content) continue;

      let matched = false;
      let score = 0;
      let matchIndex = -1;
      let extraInfo = '';

      switch (searchType) {
        case 'exact': {
          const r = searchExact(content, normalizedQuery);
          matched = r.match; matchIndex = r.index; score = r.score;
          break;
        }
        case 'all':
        case 'contains': {
          const r = searchAll(content, queryWords);
          matched = r.match; matchIndex = r.index; score = r.score;
          break;
        }
        case 'any': {
          const r = searchAny(content, queryWords);
          matched = r.match; matchIndex = r.index; score = r.score;
          if (minWords > 0 && r.matchCount < minWords) matched = false;
          extraInfo = `${r.matchCount}/${queryWords.length} words`;
          break;
        }
        case 'google': {
          const r = searchGoogle(content, queryWords);
          matched = r.match; matchIndex = r.index; score = r.score;
          if (minWords > 0 && r.matchCount < minWords) matched = false;
          extraInfo = `${r.matchCount}/${queryWords.length} words`;
          break;
        }
        case 'proximity': {
          const gap = proximity > 0 ? proximity : 5;
          const r = searchProximity(content, queryWords, gap);
          matched = r.match; matchIndex = r.index; score = r.score;
          break;
        }
        case 'boolean': {
          const r = searchBoolean(content, normalizedQuery);
          matched = r.match; matchIndex = r.index; score = r.score;
          break;
        }
        case 'acronym': {
          const r = searchAcronym(content, normalizedQuery.replace(/\s/g, ''));
          matched = r.match; matchIndex = r.index; score = r.score;
          if (r.match) extraInfo = `Found: ${(r as any).matchedWords || ''}`;
          break;
        }
        case 'endletters': {
          const r = searchEndLetters(content, normalizedQuery.replace(/\s/g, ''));
          matched = r.match; matchIndex = r.index; score = r.score;
          if (r.match) extraInfo = `Found: ${(r as any).matchedWords || ''}`;
          break;
        }
        case 'startsWith': {
          const r = searchStartsWith(content, normalizedQuery);
          matched = r.match; matchIndex = r.index; score = r.score;
          break;
        }
        case 'endsWith': {
          const r = searchEndsWith(content, normalizedQuery);
          matched = r.match; matchIndex = r.index; score = r.score;
          break;
        }
        default: {
          // Fallback to google-style
          const r = searchGoogle(content, queryWords);
          matched = r.match; matchIndex = r.index; score = r.score;
          break;
        }
      }

      if (matched) {
        // Title/theme boost
        const titleLower = stripNikud(doc.title || '').toLowerCase() +
          ' ' + stripNikud(doc.hebrewTitle || '').toLowerCase();
        if (queryWords.some(w => titleLower.includes(w))) score += 15;
        if (doc.themes?.some((t: string) => queryWords.some(w => t.toLowerCase().includes(w)))) score += 8;

        const snippet = matchIndex >= 0
          ? extractContext(doc.content || doc.preview, matchIndex,
              searchType === 'exact' ? normalizedQuery.length : queryWords[0]?.length || 5)
          : doc.preview || '';

        results.push({
          id: doc.id,
          title: doc.title || 'Unknown',
          hebrewTitle: doc.hebrewTitle || '',
          snippet,
          category: doc.part === 1 ? 'Likutay Moharan Part 1' :
                    doc.part === 2 ? 'Likutay Moharan Part 2 (Tinyana)' : 'Other',
          link: doc.url || '#',
          wordCount: doc.wordCount || 0,
          relevance: Math.min(Math.round(score), 100),
          part: doc.part,
          torah: doc.torah,
          displayNumber: doc.displayNumber,
          extraInfo
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return new Response(JSON.stringify({
      results: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      query,
      searchType
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, results: [], total: 0 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
