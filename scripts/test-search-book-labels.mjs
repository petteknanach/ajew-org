import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { displayBookLabel } from '../src/lib/search-book-labels.mjs';
const root=new URL('../',import.meta.url);
const catalog=JSON.parse(fs.readFileSync(new URL('public/reader/catalog.json',root),'utf8'));
const labels=Object.fromEntries(catalog.books.map(b=>[b.id,[b.title,b.hebrewTitle].filter(Boolean).join(' · ')]));
test('every approved catalog title is reused verbatim without transliteration rewrite',()=>{
 for(const book of catalog.books) assert.equal(displayBookLabel(book.id,labels),labels[book.id]);
});
test('unknown IDs remain usable without slug punctuation or inherited properties',()=>{
 assert.equal(displayBookLabel('future-book',labels),'future book');
 assert.equal(displayBookLabel('constructor',labels),'constructor');
 assert.equal(displayBookLabel('',labels),'');
});
test('display labels are embedded safely and escaped without adding search fetches',()=>{
 const page=fs.readFileSync(new URL('src/pages/search-enhanced.astro',root),'utf8');
 assert.match(page,/JSON\.stringify\(searchBookLabels\)\.replace\(/);
 assert.match(page,/id="search-book-labels"/);
 assert.match(page,/escapeAttr\(displayBookLabel\(/);
 assert.doesNotMatch(page,/fetch\(['"]\/reader\/catalog/);
});
