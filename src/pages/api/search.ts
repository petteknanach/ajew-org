export const prerender = false;

/**
 * Search API v2 - Fast Hebrew-aware search
 * Uses the lightweight 2.8MB index instead of the 249MB one.
 * Strips nikud for proper Hebrew matching.
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
    // Fallback to old index
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

function extractContext(text: string, matchIndex: number, queryLength: number, contextChars = 120): string {
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(text.length, matchIndex + queryLength + contextChars);
  let snippet = text.substring(start, end).replace(/\n/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

function searchExact(content: string, query: string): { match: boolean; index: number } {
  const idx = content.indexOf(query);
  return { match: idx !== -1, index: idx };
}

function searchContains(content: string, words: string[]): { match: boolean; index: number; matchCount: number } {
  let matchCount = 0;
  let firstIndex = -1;

  for (const word of words) {
    const idx = content.indexOf(word);
    if (idx !== -1) {
      matchCount++;
      if (firstIndex === -1 || idx < firstIndex) firstIndex = idx;
    }
  }

  // Require all words to match
  return {
    match: matchCount === words.length,
    index: firstIndex,
    matchCount
  };
}

function searchProximity(content: string, words: string[], maxGap: number): { match: boolean; index: number } {
  if (words.length < 2) {
    const idx = content.indexOf(words[0]);
    return { match: idx !== -1, index: idx };
  }

  const escaped = words.map(w => w.replace(/[.*+?^$()|[\]\\]/g, '\\$&'));
  const regexStr = escaped.join('(?:\\W+\\w+){0,' + maxGap + '}\\W+');
  const regex = new RegExp(regexStr, 'i');

  const match = regex.exec(content);
  if (match) return { match: true, index: match.index };

  // Try reverse order
  const reverseStr = [...escaped].reverse().join('(?:\\W+\\w+){0,' + maxGap + '}\\W+');
  const reverseMatch = new RegExp(reverseStr, 'i').exec(content);
  if (reverseMatch) return { match: true, index: reverseMatch.index };

  return { match: false, index: -1 };
}

export async function GET({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const searchType = url.searchParams.get('searchType') || 'contains';
    const proximityStr = url.searchParams.get('proximity') || '0';
    const proximity = parseInt(proximityStr, 10);
    const booksParam = url.searchParams.get('books');
    const books = booksParam ? booksParam.split(',').filter(Boolean) : [];
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);

    if (!query.trim()) {
      return new Response(JSON.stringify({ results: [], total: 0, page: 1 }),
        { headers: { 'Content-Type': 'application/json' } });
    }

    const documents = await getIndex(request.url);

    // Normalize query: strip nikud and lowercase
    const normalizedQuery = stripNikud(query).toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);

    const results: any[] = [];

    for (const doc of documents) {
      // Book filter
      if (books.length > 0) {
        const bookId = (doc as any).bookId || '';
        const partMatch = books.some(b =>
          b === bookId ||
          b === `part-${doc.part}` ||
          b === 'likutay-moharan'
        );
        if (!partMatch && bookId && !books.includes(bookId)) continue;
      }

      // Get searchable content (already nikud-stripped in v2 index)
      const content = (doc.content || '').toLowerCase();
      if (!content) continue;

      let matched = false;
      let score = 0;
      let matchIndex = -1;

      if (searchType === 'exact') {
        const result = searchExact(content, normalizedQuery);
        matched = result.match;
        matchIndex = result.index;
        score = 100;
      } else if (proximity > 0) {
        const result = searchProximity(content, queryWords, proximity);
        matched = result.match;
        matchIndex = result.index;
        score = 90;
      } else {
        // Default: contains (all words must appear)
        const result = searchContains(content, queryWords);
        matched = result.match;
        matchIndex = result.index;
        score = 75 + (result.matchCount / queryWords.length) * 25;
      }

      if (matched) {
        // Calculate relevance boost based on:
        // - Title match: +20
        // - Theme match: +10
        // - Word frequency: +1-10
        const titleLower = stripNikud(doc.title || '').toLowerCase() +
          ' ' + stripNikud(doc.hebrewTitle || '').toLowerCase();
        if (queryWords.some(w => titleLower.includes(w))) score += 20;
        if (doc.themes?.some((t: string) => queryWords.some(w => t.toLowerCase().includes(w)))) score += 10;

        // Count word frequency for better ranking
        const freq = queryWords.reduce((sum, w) => {
          const matches = content.split(w).length - 1;
          return sum + Math.min(matches, 10);
        }, 0);
        score += Math.min(freq, 15);

        const snippet = matchIndex >= 0
          ? extractContext(doc.content || doc.preview, matchIndex, normalizedQuery.length)
          : doc.preview || '';

        results.push({
          id: doc.id,
          title: doc.title || 'Unknown',
          hebrewTitle: doc.hebrewTitle || '',
          snippet,
          category: doc.part === 1 ? 'Likutay Moharan Part 1' :
                    doc.part === 2 ? 'Likutay Moharan Part 2 (Tinyana)' :
                    'Other',
          link: doc.url || '#',
          wordCount: doc.wordCount || 0,
          relevance: Math.min(score, 100),
          part: doc.part,
          torah: doc.torah,
          displayNumber: doc.displayNumber
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Paginate
    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return new Response(JSON.stringify({
      results: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      query
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, results: [], total: 0 }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
