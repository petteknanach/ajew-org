#!/usr/bin/env node
/** Offline corpus exactness and presentation regressions. No network/build. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sandbox={module:{exports:{}}};
require('node:vm').runInNewContext(fs.readFileSync(path.join(root,'public/tikkun-renderer.js'),'utf8'),sandbox);
const R=sandbox.module.exports;
const read = f => JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const fixed=read('public/tikkun/fixed-columns.json'), written=read('public/tikkun/written-overrides.json');
const strip = s => s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
const norm = s => s.replace(/\s+/g,' ').trim();
const fontCases=new Map();
let verses=0, spans=0, qk=0, overrides=0, shaChecks=0, repaired=0;
for (const [slug, overlay] of Object.entries(written.books)) {
  const file=path.join(root,'public/reader/medooyuk',slug+'.json'), raw=fs.readFileSync(file), d=JSON.parse(raw), snapshot=JSON.stringify(d);
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),overlay.sha256,slug+' unchanged corpus hash'); shaChecks++;
  for(const [c,ch] of Object.entries(d.ch)) for(const [v,original] of Object.entries(ch)) {
    verses++;
    const key=c+':'+v, verse=R.repaired(original,overlay,key);
    if(verse!==original) {repaired++;assert.equal(verse.t.length,original.t.length);assert.deepEqual(verse.m,original.m);}
    const html=R.readingVerse(verse,{mode:'full',marked:true}), unmarked=R.readingVerse(verse,{mode:'full',marked:false});
    assert.equal(strip(html),strip(unmarked),slug+key+' mark layers cannot change source text');
    for(const [_,records] of html.matchAll(/data-tk-marks="([^"]+)"/g)) for(const record of records.split(' ')) {
      const [kind,text]=record.split(':');spans++;assert.equal(Array.from(text).length,1);
      assert.match(text,{na:/^\u05B0$/,qk:/^[\u05B8\u05C7]$/,qb:/^[\u05B8\u05C7]$/,meteg:/^\u05BD$/}[kind]);if(kind==='qk')qk++;
    }
    assert(!html.includes('m-nach')); assert(!unmarked.includes('class="m-'));
    for(const mode of ['nikud','taamim','letters']) {
      const rendered=strip(R.readingVerse(verse,{mode,marked:true}));
      if(mode!=='taamim')assert(!/[\u0591-\u05AF\u05BD\u05C0]/.test(rendered));
      if(mode!=='nikud')assert(!/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(rendered));
    }
    verse.t.forEach((t,ti)=>{const html=R.token(t,(verse.m||[]).filter(m=>m[0]===ti),[],{mode:'full',marked:true});if(html.includes('data-tk-marks'))fontCases.set(t,{raw:t,html});});
    const ov=overlay.verses[key]; if(ov)overrides++;
    const bare=R.writtenVerse(original,ov), text=strip(bare);
    assert(!/[\u0591-\u05C3\u05C7]/.test(text),slug+key+' no pointing/maqaf/punctuation on written side');
    assert(!bare.includes('tk-brk')); assert(!bare.includes('class="m-'));
    // Compare ink letters with the WRITTEN source, not with qere.
    assert.equal(text.replace(/[^א-ת]/g,''),(ov||original).t.join('').replace(/[^א-ת]/g,''));
  }
  assert.equal(JSON.stringify(d),snapshot,'pure renderer mutated corpus');
}
assert.equal(shaChecks,39); assert.equal(overrides,1111); assert.equal(spans,121618); assert.equal(qk,397);
assert.equal(Object.keys(fixed.pages).length,245);
let rows=0, fixedLetters=0, extraDots=0, inverted=0, sized=0;
for(const [n,lines] of Object.entries(fixed.pages)) {
  assert.equal(lines.length,42,'42 physical rows in column '+n);rows+=lines.length;
  const h=R.fixedColumn(lines,+n);
  assert.equal((h.match(/class="tk-fixed-line/g)||[]).length,42);
  assert(!/tk-vnum|tk-verse|tk-brk|class="m-/.test(h));
  for(const l of lines) for(const [gi,g] of l.g.entries()) for(const [si,s] of g.entries()) {
    assert(!/[^א-ת\u05C4\u05C5\u05C6 ]/.test(s));
    fixedLetters+=(s.match(/[א-ת]/g)||[]).length;extraDots+=(s.match(/\u05C4/g)||[]).length;inverted+=(s.match(/\u05C6/g)||[]).length;
    for(const [idx,kind] of (l.L||{})[gi+':'+si]||[]) {assert(idx<s.replace(/[^א-ת]/g,'').length);assert(['sm','lg','split'].includes(kind));sized++;}
  }
}
assert.equal(rows,10290);assert.equal(fixedLetters,304801);assert.equal(inverted,2);assert.equal(extraDots,32);assert.equal(sized,9);
for(const n of [61,111,148,200])assert.equal(fixed.pages[n].filter(l=>l.g.flat().join('')==='').length,4);
assert.equal(fixed.pages[78][5].sourceLine,null);assert.equal(fixed.pages[78][36].sourceLine,null);
assert.equal(fixed.pages[78].slice(6,36).length,30);
assert(fixed.pages[78].slice(7,35).every(l=>l.g[0].length>=2));
assert.equal(Object.values(fixed.pages).flat().filter(l=>l.g.length===2).length,70,'Haazinu preserves 70 source double-halves');
assert(R.fixedColumn(fixed.pages[185],185).includes('tk-l-split">ו</span>'));
assert(R.fixedColumn(fixed.pages[1],1).includes('tk-l-lg">ב</span>'));
assert(R.fixedColumn(fixed.pages[111],111).includes('tk-l-sm">א</span>'));
assert.equal(R.bare('אב\u05BEגד\u05C3\u05C0\u05B0\u0591'),'אב גד');
assert.throws(()=>R.writtenVerse({t:['קרי'],k:[1]}),/Written spelling/);
assert.equal(strip(R.writtenVerse({t:['קרי'],k:[1]},{t:['כתיב']})),'כתיב');
assert.equal(strip(R.token('ב\u05B0',[[0,7,'na']],[],{marked:true})),'ב\u05B0','invalid indexes never color whole letters/words');
assert.equal(strip(R.continuous({1:{1:{t:['אב']},2:{t:['גד']}}},1,null,{mode:'full'})),'אב גד','verse boundary space retained');
const css=fs.readFileSync(path.join(root,'public/tikkun.css'),'utf8');
assert(css.includes('calc(1em + 0.02px)'));assert(css.includes('#tk-app option'));assert(css.includes('StamAshkenazCLM.ttf?v='));
const result={pass:true,corpusHashChecks:shaChecks,verses,markSpans:spans,qamatsSpans:qk,writtenOverrides:overrides,readingTailRepairs:repaired,columns:245,rows,fixedLetters,extraordinaryDots:extraDots,invertedNuns:inverted,specialLetters:sized};
if(process.argv[2])fs.writeFileSync(path.join(process.argv[2],'font-cases.json'),JSON.stringify([...fontCases.values()]));
console.log(JSON.stringify(result,null,2));
