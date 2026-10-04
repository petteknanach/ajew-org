#!/usr/bin/env node
// Verse-end presentation regression: location is metadata, never source ink.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),s={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'public/tikkun-boundaries.js'),'utf8'),s);
const B=s.window.TikkunBoundaries,read=n=>JSON.parse(fs.readFileSync(path.join(root,'public/tikkun',n)));
const map=read('verse-boundaries.json'),fixed=read('fixed-columns.json'),pointing=read('column-pointing.json');
const validated=B.validateBoundaries(map,s.window.TikkunBoundaryPins,fixed,pointing);
assert.equal(validated.status,'ready');assert.equal(validated.coverage,'complete');
// RED on the old CSS: above-word punctuation can be mistaken for an accent.
const css=B.BOUNDARY_CSS.match(/\.study-word\[data-verse-end="true"\]::after\{([^}]+)\}/)[1];
assert(css.includes("content:'׃'"));assert(css.includes('left:-.38em'));assert(css.includes('top:.02em'));assert(css.includes('font:700 1em/1'));
assert(!css.includes('bottom:calc(100%'));assert(!css.includes('transform:translateX'));
let words=0,ends=0,starts=0;
for(const r of map.records){
 const input=`<span class="study-word" data-boundary-key="${B.boundaryKey(r)}">SOURCE</span>`;
 const on=B.decorateBoundaries(input,validated,false,true),off=B.decorateBoundaries(input,validated,false,false),labels=B.decorateBoundaries(input,validated,true,false);
 assert.equal(on.includes('data-verse-end="true"'),r.isEnd);assert(!off.includes('data-verse-end'));assert(!labels.includes('data-verse-end'));assert.equal(labels.includes('data-verse-label'),r.isStart);
 assert.equal(on.replace(/<[^>]+>/g,''),'SOURCE');words++;ends+=Number(r.isEnd);starts+=Number(r.isStart);
}
assert.equal(words,79976);assert.equal(ends,5853);assert.equal(starts,5853);
assert(!B.decorateBoundaries('<span data-boundary-key="999/1/0/0">SOURCE</span>',validated,false,true).includes('data-verse-end'));
console.log(JSON.stringify({pass:true,words,ends,starts,verseEnds:'baseline after terminal word; unchanged source text',bareAndLabels:'no ends',map:'authenticated complete'}));
