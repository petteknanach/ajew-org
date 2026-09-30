#!/usr/bin/env node
// No Astro build: compile actual page, preserve authored body and real assets.
// Run: node scripts/test-tikkun-column-display.cjs <evidence-dir> [app-repo]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=process.argv[2],app=process.argv[3];
if(!out)throw Error('Expected evidence directory');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const source=fs.readFileSync(path.join(root,'src/pages/reader/tikkun.astro'),'utf8');
 const result=await require('@astrojs/compiler').transform(source,{filename:'src/pages/reader/tikkun.astro'});
 assert(!result.diagnostics.some(d=>d.severity===1),JSON.stringify(result.diagnostics));
 const body=source.slice(source.indexOf('<Layout')).replace(/^<Layout[\s\S]*?>/,'').replace('</Layout>','');
 fs.writeFileSync(path.join(out,'website.html'),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}</style></head><body>'+body+'</body></html>');
 // Plain browser version of the shared helper with independently read data.
 const data=JSON.parse(fs.readFileSync(path.join(root,'public/tikkun/column-pointing.json')));
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'public/tikkun-column-display.js'),'utf8'),sandbox);
 Object.assign(sandbox.window.TikkunColumnPointing,data);
 Object.assign(sandbox.window.TikkunColumnNavigation,JSON.parse(fs.readFileSync(path.join(root,'public/tikkun/selection-index.json'))));
 const D=sandbox.window.TikkunColumnDisplay;
 for(const w of [320,390,768,1280]) for(let c=1;c<=245;c++) {
  const size=D.fixedDisplaySize(w,c,1);assert(size*(D.fixedColumnUnits(c)+1.8)+38<=w+.001);
  assert.equal(D.fixedDisplaySize(w,c,2),size*2);
 }
 assert.equal(D.COLUMN_POINTING_AVAILABLE,false);
 assert(D.renderColumnPointingAdvice(1,true,false).includes('pointing-unavailable'));
 assert(!D.renderColumnPointingAdvice(1,false,false));
 assert.equal(D.getColumnPointingRecords(1).filter(r=>r.status==='invalid').length,0);
 const tuple=Object.values(data.columns[1]).flat().find(r=>r.length===3),old=tuple[2];
 tuple[2]+='א';assert(D.getColumnPointingRecords(1).some(r=>r.status==='invalid'),'source mutation must fail closed');tuple[2]=old;
 const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const nav=JSON.parse(fs.readFileSync(path.join(root,'public/tikkun/selection-index.json')));
 assert.equal(Object.keys(nav.verses).length,5853);
 assert.equal(nav.fixedSha256,sha(path.join(root,'public/tikkun/fixed-columns.json')));
 assert.equal(nav.fixedSha256,data.sources.fixedSha256);
 if(app) for(const [s,a] of [['column-pointing.json','column-pointing.json'],['selection-index.json','selection-index.json']])assert.equal(sha(path.join(root,'public/tikkun',s)),sha(path.join(app,'assets/data/tikun-fixed',a)));
 const rendererSandbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(root,'public/tikkun-renderer.js'),'utf8'),rendererSandbox);
 const R=rendererSandbox.module.exports,fixed=JSON.parse(fs.readFileSync(path.join(root,'public/tikkun/fixed-columns.json')));
 let rows=0,letters=0;
 for(let n=1;n<=245;n++) {
  assert.equal(fixed.pages[n].length,42);const html=R.fixedColumn(fixed.pages[n],n);
  assert.equal((html.match(/class="tk-fixed-line/g)||[]).length,42);
  assert(!/tk-cluster|tk-verse|tk-vnum/.test(html));rows+=42;
  letters+=fixed.pages[n].flatMap(l=>l.g.flat()).join('').replace(/[^א-ת]/g,'').length;
 }
 assert.equal(letters,304801);
 const report={pass:true,rows,letters,columns:245,verses:5853,alignment:data.stats,astroDiagnostics:result.diagnostics,pointing:'blocked by blank fixed-font glyphs',harness:'Actual page body/assets; standalone shell, not full Layout build'};
 fs.writeFileSync(path.join(out,'website-unit-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
