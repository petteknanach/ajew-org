// Server-side search endpoint for Coolify
// Place at: /root/ajew-org/src/pages/api/search.ts

import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { join } from 'path';

interface SearchDoc {
  t: string;  // title
  h: string;  // hebrew title
  b: string;  // book slug
  l: string;  // link
  x: string;  // hebrew text
  e: string;  // english text
}

let index: SearchDoc[] | null = null;

function loadIndex(): SearchDoc[] {
  if (index) return index;
  const path = join(process.cwd(), 'public', 'data', 'light-search-index.json.gz');
  const buf = readFileSync(path);
  const json = gunzipSync(buf).toString('utf-8');
  index = JSON.parse(json);
  return index!;
}

export const GET: APIRoute = async ({ request, url }) => {
  const q = url.searchParams.get('q') || '';
  const book = url.searchParams.get('book') || '';
  const limit = parseInt(url.searchParams.get('limit') || '30');
  
  if (!q.trim()) {
    return new Response(JSON.stringify({ results: [], total: 0 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const data = loadIndex();
  const words = q.toLowerCase().trim().split(/\s+/).filter(w => w.length > 0);
  
  const results: Array<{
    title: string;
    hebrewTitle: string;
    snippet: string;
    link: string;
    book: string;
    relevance: number;
  }> = [];
  
  for (const doc of data) {
    if (book && doc.b !== book) continue;
    
    const searchText = (doc.t + ' ' + doc.h + ' ' + doc.x + ' ' + doc.e).toLowerCase();
    let matches = 0;
    for (const word of words) {
      if (searchText.includes(word)) matches++;
    }
    
    if (matches > 0) {
      results.push({
        title: doc.t,
        hebrewTitle: doc.h,
        snippet: (doc.x || doc.e).substring(0, 300),
        link: doc.l,
        book: doc.b,
        relevance: Math.round((matches / words.length) * 100),
      });
      
      if (results.length >= limit) break;
    }
  }
  
  results.sort((a, b) => b.relevance - a.relevance);
  
  return new Response(JSON.stringify({ results, total: results.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
