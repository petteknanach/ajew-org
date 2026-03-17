export const prerender = false;

let documentsCache: any[] = [];

async function getIndex(reqUrl: string) {
  if (documentsCache.length > 0) return documentsCache;
  const origin = new URL(reqUrl).origin;
  
  const res = await fetch(origin + '/data/enhanced-search-index.json');
  if (!res.ok) throw new Error("Could not fetch index from CDN");
  
  const json = await res.json();
  const docs = Object.values(json.documents || {});
  documentsCache = docs;
  return docs;
}

function extractContext(text: string, matchIndex: number, matchLength: number) {
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + matchLength + 80);
  let snippet = text.substring(start, end).replace(/\n/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

function checkProximity(text: string, query: string, maxWords: number) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lowerText = text.toLowerCase();
  
  if (words.length < 2) {
    const idx = lowerText.indexOf(words[0]);
    if (idx === -1) return { match: false, snippet: '' };
    return { match: true, snippet: extractContext(text, idx, words[0].length) };
  }
  
  const maxGap = maxWords || 3;
  const regexStr = words.map(w => w.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('(?:\\W+\\w+){0,' + maxGap + '}\\W+');
  const regex = new RegExp(regexStr, 'i');
  
  const match = regex.exec(text);
  if (match) {
    return { match: true, snippet: extractContext(text, match.index, match[0].length) };
  }
  
  // reverse check
  const reverseRegexStr = [...words].reverse().map(w => w.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('(?:\\W+\\w+){0,' + maxGap + '}\\W+');
  const reverseRegex = new RegExp(reverseRegexStr, 'i');
  
  const reverseMatch = reverseRegex.exec(text);
  if (reverseMatch) {
    return { match: true, snippet: extractContext(text, reverseMatch.index, reverseMatch[0].length) };
  }
  
  return { match: false, snippet: '' };
}

export async function GET({ request }) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const searchType = url.searchParams.get('searchType') || 'contains';
    const proximityStr = url.searchParams.get('proximity') || '0';
    const proximity = parseInt(proximityStr, 10);
    const booksParam = url.searchParams.get('books');
    const books = booksParam ? booksParam.split(',') : [];
    
    if (!query.trim()) {
      return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
    }

    const documents = await getIndex(request.url);
    
    let results = [];
    const lowerQuery = query.toLowerCase().trim();
    
    for (const doc of documents as any[]) {
      if (books.length > 0 && doc.bookId) {
        if (!books.includes(doc.bookId)) {
          continue;
        }
      }
      
      const content = doc.content || '';
      const lowerContent = content.toLowerCase();
      let match = false;
      let score = 0;
      let snippet = '';
      
      if (searchType === 'exact') {
        const idx = lowerContent.indexOf(lowerQuery);
        if (idx !== -1) {
          match = true;
          score = 100;
          snippet = extractContext(content, idx, lowerQuery.length);
        }
      } else if (searchType === 'boolean') {
        const words = lowerQuery.split(/\s+/).filter(w => !['and','or','not'].includes(w));
        match = words.every(w => lowerContent.includes(w));
        if (match) {
          score = 80;
          const firstIdx = lowerContent.indexOf(words[0]);
          snippet = extractContext(content, firstIdx, words[0].length);
        }
      } else {
        if (proximity > 0) {
          const result = checkProximity(content, query, proximity);
          match = result.match;
          if (match) {
            score = 90;
            snippet = result.snippet;
          }
        } else {
          const words = lowerQuery.split(/\s+/).filter(w => w.length > 0);
          match = words.every(w => lowerContent.includes(w));
          if (match) {
            score = 75;
            const idx = lowerContent.indexOf(words[0]);
            snippet = extractContext(content, idx, words[0].length);
          }
        }
      }
      
      if (match) {
        results.push({
          id: doc.id,
          title: doc.title || doc.englishTitle || 'Unknown',
          snippet: snippet,
          category: doc.type || 'Book',
          subcategory: doc.subcategory || doc.category || '',
          link: doc.path || '#',
          wordCount: doc.wordCount || 0,
          relevance: score
        });
      }
      
      // Keep it lightweight
      if (results.length >= 100) break;
    }
    
    results.sort((a, b) => b.relevance - a.relevance);

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}