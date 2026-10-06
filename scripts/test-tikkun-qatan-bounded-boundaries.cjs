#!/usr/bin/env node
'use strict';
// Bounded equivalent SHA-256 backend; frozen candidate code is never edited.
// The portable source's Array.from(byteString) exceeds256MiB for the full map.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.argv[2];assert(out);fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'public/tikkun-boundaries.js'),'utf8'),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const portable={window:{}};vm.runInNewContext(source,portable);
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'public/tikkun',n)));
const map=read('verse-boundaries.json'),fixed=read('fixed-columns.json'),pointing=read('column-pointing.json');
let equivalences=0;
for(const value of [null,{},[],{he:'אב\u05B8\u05BD'},fixed.pages[1],...map.records.slice(0,100),...Object.values(pointing.columns).slice(0,5)]){assert.equal(portable.window.TikkunBoundaries.boundaryHash(value),hash(value));equivalences++;}
// Instrument the hashing backend only: REAL SHA-256 over the same byte sequence,
// no precomputed return, omitted authentication, source edits, or corpus patch.
const a=source.indexOf('function boundaryHash(value) {'),b=source.indexOf('\nfunction validateBoundaries',a);assert(a>=0&&b>a);
const bounded={window:{},__nativeHash:hash};vm.runInNewContext(source.slice(0,a)+'function boundaryHash(value) { return __nativeHash(value); }'+source.slice(b),bounded);
const B=bounded.window.TikkunBoundaries,pins=bounded.window.TikkunBoundaryPins,validated=B.validateBoundaries(map,pins,fixed,pointing);
assert.equal(validated.status,'ready');assert.equal(validated.coverage,'complete');
let words=0,ends=0,starts=0;
for(const r of map.records){
 const input=`<span class="study-word" data-boundary-key="${B.boundaryKey(r)}">SOURCE</span>`,on=B.decorateBoundaries(input,validated,false,true),off=B.decorateBoundaries(input,validated,false,false),labels=B.decorateBoundaries(input,validated,true,false);
 assert.equal(on.includes('data-verse-end="true"'),r.isEnd);assert(!off.includes('data-verse-end'));assert(!labels.includes('data-verse-end'));assert.equal(labels.includes('data-verse-label'),r.isStart);assert.equal(on.replace(/<[^>]+>/g,''),'SOURCE');words++;ends+=Number(r.isEnd);starts+=Number(r.isStart);
}
const bad=JSON.parse(JSON.stringify(map));bad.records[0].isEnd=!bad.records[0].isEnd;assert.equal(B.validateBoundaries(bad,pins,fixed,pointing).status,'unavailable');
assert.equal(words,79976);assert.equal(ends,5853);assert.equal(starts,5853);
const report={pass:true,words,ends,starts,portableNativeHashEquivalences:equivalences,exactNativePayloadHash:hash(map),tamperedPayloadRejected:true,sourceChanged:false,limitation:'Original all-map portable-hash test OOM at256MiB; only this test backend uses native equivalent SHA-256. Original failed output retained.'};
fs.writeFileSync(path.join(out,'bounded-boundaries-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
