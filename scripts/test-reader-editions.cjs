// node scripts/test-reader-editions.cjs <app-root> <evidence-dir>
// All owned declared Tanach source verses; actual site adapter/renderer vs app.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {load:html}=require('cheerio');
const [app,out]=process.argv.slice(2);if(!app||!out)throw Error('Usage: <app-root> <evidence-dir>');
const root=path.resolve(__dirname,'..'),{load}=require(path.resolve(app,'tests/reader-marks-loader.cjs'));
const {BOOKS}=load('constants/books.ts'),{parseMedooyukVerse}=load('services/tikunModel.ts'),{attachReaderChapter,supportsReaderMarks}=load('services/readerMarkedHebrew.ts');
const w={},ctx={window:w,document:{getElementById:()=>true},console};vm.createContext(ctx);
for(const file of ['reader-source-exact.js','medooyuk.js'])vm.runInContext(fs.readFileSync(path.join(root,'public',file),'utf8'),ctx);
const a=w.AjewReaderSourceExact,r=w.AjewMarkedHebrew,tails=JSON.parse(fs.readFileSync(path.join(root,'public/reader-source-tails.json')));
let checks=0;const eq=(actual,expected,label)=>{assert.equal(actual,expected,label);checks++},manifest=[],counts={books:0,chapters:0,originalVerses:0,alternativeVerses:0,attached:0,psalmsAttached:0,psalmsVerses:0,reasons:{}};
function input(file){const b=fs.readFileSync(file);manifest.push({file:path.relative(root,file),sha256:crypto.createHash('sha256').update(b).digest('hex')});return JSON.parse(b);}
function text(v,special=true){return html(r.renderVerse(v,{specialNikud:special})).text();}
for(const b of BOOKS.filter(b=>supportsReaderMarks(b.id,1))){
 const source=input(path.join(root,'public/reader/medooyuk',b.id+'.json')); counts.books++;
 for(const [ch,raw] of Object.entries(source.ch)){
  counts.chapters++;
  const candidate=a.prepare(raw,b.id,ch,tails), appCandidate=Object.entries(raw).map(([n,v])=>parseMedooyukVerse(v,+n,b.id,+ch));
  eq(candidate.length,appCandidate.length);
  for(const v of candidate){
   const appV=appCandidate.find(x=>x.index===v.index);eq(a.text(v),appV.reading,'complete alternative including tail/qere');eq(text(v),appV.reading);eq(text(v,false),appV.reading);
   eq(a.bare(text(v)),a.bare(appV.reading));counts.alternativeVerses++;
  }
  const page=input(path.join(root,'public/reader',b.id,'part-1','torah-'+ch+'.json'));
  const attached=a.chapter(page.segments.map(s=>({index:s.index,text:s.he_nikud||s.he})),candidate), appAttached=attachReaderChapter(page.segments,true,appCandidate);
  for(let i=0;i<page.segments.length;i++){
   const s=page.segments[i],got=attached[i];eq(got.reason,appAttached.get(s.index).reason,b.id+'/'+ch+'/'+s.index);eq(got.sourceText,s.he_nikud||s.he);
   counts.originalVerses++;counts.reasons[got.reason]=(counts.reasons[got.reason]||0)+1;
   if(b.id==='tanach-tehillim')counts.psalmsVerses++;
   if(got.verse){eq(text(got.verse),s.he_nikud||s.he,'original renderer text must be exact');eq(text(got.verse,false),s.he_nikud||s.he);counts.attached++;if(b.id==='tanach-tehillim')counts.psalmsAttached++;}
  }
 }
}
// Negative controls pin every prohibited relaxation, including mark order and CGJ.
const source='בְּרֵאשִׁית בָּרָא אֱלֹהִים:',v={index:7,t:['בְּרֵאשִׁ֖ית','בָּרָ֣א','אֱלֹהִ֑ים׃'],m:[[0,0,'na']]};
eq(a.attach(source,7,v).reason,'attached');
let negativeControls=0;
for(const bad of [source.replace('ָ','ַ'),source.replace('בְּ','בְּ'),source.replace('רֵ','דֵ'),source+' תַּם',source.replace('רֵ','רֵֽ'),source.slice(0,-3),source.replace('רֵ','רֵ֗'),source.replace('רֵ','רֵ\u034f')]){eq(a.attach(bad,7,v).verse,null);negativeControls++;}
eq(a.attach(source,7,{...v,k:[1]}).reason,'qere');negativeControls++;
eq(a.attach(source,9,v).reason,'missing');negativeControls++;
eq(a.chapter([{index:7,text:source}],[v,v])[0].reason,'duplicate-index');negativeControls++;
eq(a.chapter([{index:7,text:source},{index:7,text:source}],[v])[0].reason,'duplicate-index');negativeControls++;
eq(a.attach('כָּל־ בְּנֵי:',7,{index:7,t:['כָּל־','בְּנֵי׃'],m:[]}).reason,'unsupported-spacing');negativeControls++;
assert.throws(()=>a.prepare({'1':{t:['שונה']}},'b','1',{'b/1/1':{readingKey:'old',readingTokens:['tail']}}));negativeControls++;
const mixed={index:7,t:['בָּתְּ','כָּל׃'],m:[[0,1,'nach',1],[1,0,'qk']]},mixedResult=a.attach('בָּתְּ כָּל:',7,mixed);
assert.match(r.renderVerse(mixedResult.verse),/ss03/);assert.match(r.renderVerse(mixedResult.verse),/ss02/);assert.doesNotMatch(r.renderVerse(mixedResult.verse),/ss01/);checks+=3;
eq(counts.books,39);eq(counts.originalVerses,23207);eq(counts.attached,834);eq(counts.psalmsVerses,2527);eq(counts.psalmsAttached,8);
// Verify the supplemental subset is exactly app-owned, never hand-edited text.
const appTails=JSON.parse(fs.readFileSync(path.join(app,'services/tikunKetiv.json'))).verses;
for(const [ref,tail] of Object.entries(tails)){eq(tail.readingKey,appTails[ref].readingKey);eq(JSON.stringify(tail.readingTokens),JSON.stringify(appTails[ref].readingTokens));}
for(const m of manifest)eq(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,m.file))).digest('hex'),m.sha256);
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'corpus.json'),JSON.stringify({checks,negativeControls,counts,scope:'All declared owned source verses, actual app/site adapters and site renderer; no new classifications'},null,2));fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({checks,negativeControls,counts},null,2));
