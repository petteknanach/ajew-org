#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),s={window:{}},read=p=>JSON.parse(fs.readFileSync(path.join(root,p))),copy=x=>JSON.parse(JSON.stringify(x));
for(const f of ['tikkun-boundaries.js','tikkun-qatan.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'public',f),'utf8'),s);
const Q=s.window.TikkunQatanOccurrences,ledger=read('scripts/data/tikkun-qatan-occurrences-20261004.json');let qk=0,added=0,negative=0;
for(const slug of ['tanach-bereishit','tanach-shemos','tanach-vayikra','tanach-bamidbar','tanach-devarim','tanach-tehillim']){
 const book=read('public/reader/medooyuk/'+slug+'.json'),raw=JSON.stringify(book),after=Q.applyBook(book,slug);
 assert.equal(JSON.stringify(book),raw,'input mutated');assert.equal(JSON.stringify(Q.applyBook(after,slug)),JSON.stringify(after),'not idempotent');
 const expected=ledger.records.filter(r=>r.slug===slug);
 const restored=copy(after);
 for(const [c,ch] of Object.entries(book.ch))for(const [v,verse] of Object.entries(ch)){
  const records=expected.filter(r=>r.chapter===+c&&r.verse===+v),a=after.ch[c][v];
  assert.equal(JSON.stringify({...a,m:verse.m}),JSON.stringify(verse),'source fields changed');
  assert.equal(JSON.stringify(a.m),JSON.stringify(verse.m.concat(records.map(r=>[r.token,r.letter,'qk',0]))),'out-of-scope annotations');
  restored.ch[c][v].m=copy(verse.m);added+=records.length;if(slug!=='tanach-tehillim')qk+=a.m.filter(m=>m[2]==='qk').length;
 }
 assert.equal(JSON.stringify(restored),raw,'not exact inverse');
 if(expected.length){
  for(const change of [b=>b.ch[1][1].t[0]+='א',b=>b.ch[1][1].k[0]=1,b=>b.ch[1][1].m.push([0,0,'qk',0]),b=>b.extra=true,b=>delete b.slug,b=>b.slug='tanach-vayikra',b=>b.slug='corrupted-slug']){
   const wrong=copy(book);change(wrong);assert.throws(()=>Q.applyBook(wrong,slug),/source mismatch/);negative++;
  }
  assert.throws(()=>Q.applyBook(book),/source mismatch/,'requested identifier required');negative++;
 }
 if(slug==='tanach-tehillim')assert.equal(after,book,'Psalms touched');
}
assert.equal(qk,401);assert.equal(added,4);
const marks=read('public/tikkun/column-marks.json'),raw=JSON.stringify(marks),after=Q.applyColumnMarks(marks);
assert.equal(JSON.stringify(marks),raw);assert.equal(Object.keys(after.rows).length,18764);assert.equal(JSON.stringify(Q.applyColumnMarks(after)),JSON.stringify(after));
for(const [k,v] of Object.entries(marks.rows))assert.equal(JSON.stringify(after.rows[k]),JSON.stringify(v),'old column row changed');
for(const r of ledger.records){assert(!marks.rows[r.columnKey]);assert.equal(JSON.stringify(after.rows[r.columnKey][1]),JSON.stringify([[0,'qk']]));}
for(const change of [m=>m.rows['1/34:0:0/6']=['כָּל',[[0,'qk']],'tanach-bereishit/1/21'],m=>m.rows[Object.keys(m.rows)[0]][0]+='א',m=>m.extra=true]){
 const wrong=copy(marks);change(wrong);assert.throws(()=>Q.applyColumnMarks(wrong),/source mismatch/);negative++;
}
assert.equal(after.sourceSha256['tanach-bereishit'],marks.sourceSha256['tanach-bereishit']);
console.log(JSON.stringify({pass:true,existingQatan:397,additionalQatan:added,torahQatan:qk,columnRows:Object.keys(after.rows).length,rejectingControls:negative,sourceFields:'unchanged; exact in-memory inverse',psalms:'untouched',scope:'four occurrences, not all kol'}));
