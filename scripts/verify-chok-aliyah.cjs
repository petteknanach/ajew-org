'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const current=read('public/chok.js'),fixture=JSON.parse(read('scripts/fixtures/chok-genesis-aliyot.json'));
const base=cp.execFileSync('git',['-c','core.packedGitWindowSize=1m','-c','core.packedGitLimit=4m','show','9bded14f0da3c26e5578635947570143bdd43ae5:public/chok.js'],{cwd:root,encoding:'utf8',maxBuffer:1048576});
const start=current.indexOf('  /* CHOK_ALIYAH_BEGIN'),end=current.indexOf('  /* CHOK_ALIYAH_END */')+'  /* CHOK_ALIYAH_END */\n'.length;
assert(start>=0&&end>start);const block=current.slice(start,end);
const changed="return aliyahHeading(slug, parsha, kind, it.c, it.x) + '<article class=\"ck-verse\" data-verse-ref=\"'",original="return '<article class=\"ck-verse\" data-verse-ref=\"'";
let inverse=current.slice(0,start).concat(current.slice(end)).replace(changed,original);
if(inverse.includes('  /* CHOK_FRIDAY_BEGIN')) {
 const fa=inverse.indexOf('  /* CHOK_FRIDAY_BEGIN'),fb=inverse.indexOf('  /* CHOK_FRIDAY_END */')+'  /* CHOK_FRIDAY_END */\n'.length;
 inverse=inverse.slice(0,fa)+inverse.slice(fb);
 const fc=inverse.indexOf('          var fridayPlans = fridayNachPlans('),fd=inverse.indexOf('          var sec = d[pair[0]];',fc);assert(fc>=0&&fd>fc);
 inverse=inverse.slice(0,fc)+inverse.slice(fd);
}
assert.equal(inverse,base,'whole owning main inverse, separately exercised Friday addition excluded');
const sourceBook=JSON.parse(fs.readFileSync(process.env.CHOK_TEST_BOOK||path.join(root,'public/reader/medooyuk/tanach-bereishit.json'),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setup(code,newTarget){
 const box={Promise,state:{tanachen:false,language:'he',targum:false},book:()=>Promise.resolve(sourceBook),targ:()=>Promise.resolve(null),en:()=>Promise.resolve(null),scheduledBible:()=>Promise.resolve(null),coloredVerse:v=>escape(v.t.join(' ')),esc:escape,plainHeNum:n=>String(n),refLabelHTML:s=>s,rashiHTML:()=>Promise.resolve(''),rashiSuper:()=>Promise.resolve(''),verseCommHTML:()=>Promise.resolve(''),hkLine:()=>'',voiceLine:()=>'',window:{ChokSources:{isTuesday:()=>false,weekUnit:()=>null,bound:()=>null,english:()=>'',meaningNotes:()=>'',verseAccess:()=>''}}};
 vm.createContext(box);if(newTarget)vm.runInContext(block,box);
 const a=code.indexOf('  function versesHTML('),b=code.indexOf('  function dcommFor(',a);assert(a>=0&&b>a);vm.runInContext(code.slice(a,b),box);return box;
}
(async()=>{
 const newer=setup(current,true),older=setup(base,false),ordered=[];
 for(const [c,verses]of Object.entries(sourceBook.ch))for(const v of Object.keys(verses))ordered.push([+c,+v]);ordered.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 let headings=0,portions=0;const weeks=Object.keys(fixture);assert.equal(weeks.length,12);
 for(let wi=0;wi<weeks.length;wi++){
  const week=weeks[wi],rows=fixture[week];assert.equal(rows.length,8);assert.deepEqual(rows.map(r=>r[3]),['1','2','3','4','5','6','7','M']);
  for(const [c,v,label,id]of rows){assert(sourceBook.ch[c][v]);const got=newer.aliyahHeading('tanach-bereishit',week,'torah',c,v);assert(got.includes('data-aliyah="'+id+'"')&&got.includes('>'+label+'</h3>'));assert.equal(newer.aliyahHeading('tanach-bereishit',week,'navi',c,v),'');}
  const from={c:rows[0][0],v:rows[0][1]};let last=ordered.at(-1);
  if(wi+1<weeks.length){const n=fixture[weeks[wi+1]][0],i=ordered.findIndex(r=>r[0]===n[0]&&r[1]===n[1]);assert(i>0);last=ordered[i-1];}
  const to={c:last[0],v:last[1]};const args=['tanach-bereishit',from,to,'torah',null,week,'יום שישי'];
  const before=await older.versesHTML(...args),after=await newer.versesHTML(...args);const matches=[...after.matchAll(/<h3 class="ck-aliyah-heading"[^>]*>([^<]+)<\/h3>/g)];assert.equal(matches.length,8,week);assert.deepEqual(matches.map(m=>m[1]),rows.map(r=>r[2]));
  assert.equal(after.replace(/<h3 class="ck-aliyah-heading"[^>]*>[^<]+<\/h3>/g,''),before,'every complete original verse/article preserved:'+week);headings+=matches.length;portions++;
 }
 assert.equal(newer.aliyahHeading('tanach-shemos','בראשית','torah',1,1),'');assert.equal(newer.aliyahHeading('tanach-bereishit','unknown','torah',1,1),'');assert.equal(newer.aliyahHeading('tanach-bereishit','לך לך','torah',14,2),'');
 const template=read('src/pages/reader/chok.astro');assert(template.includes('#ck-content .marked-qere { text-decoration-skip-ink: none; }'));assert(template.includes('<style is:global>'));
 const compiler=require(path.join(process.env.AJEW_TEST_DEPENDENCIES||root,'node_modules/@astrojs/compiler'));const result=await compiler.transform(template,{filename:'src/pages/reader/chok.astro'});assert.equal(result.diagnostics.filter(d=>d.severity===1).length,0);
 console.log(JSON.stringify({pass:true,completeTorahPortionsCompared:portions,actualRenderedHeadings:headings,allOriginalArticlesByteExactAfterHeadingRemoval:true,outsideNamespaceNegatives:true,wholeMainInverse:true,actualAstroTransformErrors:0,sourceBookUnmodified:true,qereRule:'Chok-scoped text-decoration-skip-ink:none',nativePixelClaim:false}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
