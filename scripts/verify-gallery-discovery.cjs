const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS', name); }
(async () => {
 const root = process.cwd();
 const helper = await import(pathToFileURL(path.join(root, 'src/lib/gallery-metadata.mjs')));
 const filename = 'nanach-karate-kid.jpg';
 const row = helper.getGalleryMetadata('nanach', filename);
 check('exact existing image bytes retained', () => assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/images/nanach/' + filename)).digest('hex'), 'c35088da5ac40424f4091737860962720261a9eed870f9e03f3a661e4beb0e3c'));
 check('edited still classified, not documentary photograph', () => assert.equal(row.mediaKind, 'composite'));
 check('stable detailed destination', () => assert.equal(row.detailPage, '/gallery/nanach/mr-miyagi-karate-kid-na-nach-beanie/'));
 const text = helper.gallerySearchText('nanach', filename, row).toLowerCase().normalize('NFD').replace(/[\u0591-\u05c7\u0300-\u036f]/g,'').replace(/[-_]+/g,' ');
 const queries = ['Mr Miyagi', 'Mr. Miyagi', 'Pat Morita', 'Karate Kid', 'Karate Kid sensei', 'sensi Nanach', 'karate teacher beanie', 'the sensei from karate kid wearing a nanach beanie', 'מר מיאגי', 'מיסטר מיאגי', 'פט מוריטה', 'קראטה קיד', 'קרטה קיד', 'סנסיי', 'סנסאי', 'כובע ננח', 'כיפת נ נח'];
 for (const q of queries) check('query: ' + q, () => assert.ok(q.toLowerCase().split(/\s+/).every(term => text.includes(term))));
 const local = helper.gallerySearchText('nanach', 'unit-only-no-file.png', { title: 'Fixture', aliases:['local-alias'], archivedAliases:['old-alias'], subjects:['local-subject'], tags:['local-tag'], reviewNote:'forbidden-negative-caveat' });
 for (const q of ['local-alias','old-alias','local-subject','local-tag']) check('legacy positive field: '+q, () => assert.ok(local.includes(q)));
 check('private/negative review caveats excluded', () => assert.ok(!local.includes('forbidden-negative-caveat')));
 check('malformed positive lists are ignored safely', () => assert.doesNotThrow(() => helper.gallerySearchText('nanach','unit-only-no-file.png',{aliases:{bad:true},subjects:'not-an-array',tags:[null,17,'valid-tag']})));
 const source = fs.readFileSync('src/components/GallerySearch.astro','utf8');
 const inline = source.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
 function setup(url) {
  const listeners = {};
  const input = {value:'',dataset:{},addEventListener:(name,fn)=>listeners['input:'+name]=fn,focus:()=>input.focused=true};
  const kind = {value:'', options:[{value:''},{value:'composite'},{value:'photograph'}],addEventListener:(name,fn)=>listeners['kind:'+name]=fn};
  const clear = {addEventListener:(name,fn)=>listeners['clear:'+name]=fn};
  const status = {textContent:''};
  function card(search,src,mediaKind) {
   const attrs = {'data-search':search}; const img = src ? {getAttribute:k=>k==='src'?src:k==='alt'?search:null} : null;
   return {dataset:{mediaKind},hidden:false,textContent:search,getAttribute:k=>attrs[k]??null,querySelector:s=>s==='img'?img:null};
  }
  const target=card(text,'/images/nanach/'+filename,'composite');
  const duplicate=card(text,'/images/nanach/'+filename,'composite');
  const other=card('controlled landscape fixture','/unit-only-tree.png','photograph');
  const directory=card('gallery directory',null,'');
  const items=[target,duplicate,other,directory];
  const sections=[{hidden:false,querySelectorAll:()=>[target,duplicate]},{hidden:false,querySelectorAll:()=>[other]}];
  const byId={gallerySearchInput:input,galleryMediaKind:kind,gallerySearchStatus:status,gallerySearchClear:clear};
  const state={preserve:'existing-state'};
  const window={location:{href:url},history:{state,replaceState:(s,unused,relative)=>{assert.equal(s,state);window.location.href=new URL(relative,window.location.href).href;}}};
  const document={readyState:'complete',getElementById:id=>byId[id],querySelectorAll:selector=>selector==='.category-section'?sections:items,documentElement:{classList:{toggle:()=>{}}}};
  vm.runInNewContext(inline,{window,document,URL});
  return {input,kind,clear,status,target,duplicate,other,sections,listeners,window};
 }
 const page=setup('https://ajew.org/gallery/?keep=yes&q=Mr%20Miyagi&type=composite#arrival');
 check('query-bearing link initializes search',()=>assert.equal(page.input.value,'Mr Miyagi'));
 check('image type initializes from URL',()=>assert.equal(page.kind.value,'composite'));
 check('initial filter really hides unrelated items',()=>assert.ok(!page.target.hidden && page.other.hidden));
 check('repeated category placements count once',()=>assert.ok(page.status.textContent.startsWith('1 matching picture')));
 page.input.value='מיאגי';page.listeners['input:input']();
 check('Hebrew search survives a shareable URL',()=>assert.equal(new URL(page.window.location.href).searchParams.get('q'),'מיאגי'));
 check('unrelated query and fragment preserved',()=>assert.equal(new URL(page.window.location.href).searchParams.get('keep')+new URL(page.window.location.href).hash,'yes#arrival'));
 page.kind.value='photograph';page.listeners['kind:change']();
 check('kind mismatch gives zero image results',()=>assert.ok(page.target.hidden && page.status.textContent.startsWith('0 matching pictures')));
 page.listeners['clear:click']();
 check('clear restores pictures and categories',()=>assert.ok(!page.target.hidden && !page.other.hidden && page.sections.every(x=>!x.hidden)));
 check('clear removes only search URL fields',()=>{const u=new URL(page.window.location.href);assert.equal(u.searchParams.get('keep'),'yes');assert.ok(!u.searchParams.has('q')&&!u.searchParams.has('type'));assert.equal(u.hash,'#arrival');});
 check('clear focuses search input',()=>assert.ok(page.input.focused));
 const bad=setup('https://ajew.org/gallery/?type=not-a-real-type');
 check('unknown URL image type does not blank gallery',()=>assert.equal(bad.kind.value,''));
 const detailSource=fs.readFileSync('src/pages/gallery/nanach/mr-miyagi-karate-kid-na-nach-beanie.astro','utf8');
 check('detail uses Layout main, not a nested main landmark',()=>assert.ok(detailSource.includes('<article class="picture-page">')&&!/<main[\s>]/.test(detailSource)));
 const gallerySource=fs.readFileSync('src/pages/gallery/nanach.astro','utf8');
 const detailsHandler=gallerySource.match(/href=\{imageMetadata\[img\]\.detailPage\} onclick="([^"]+)"/)[1];
 const lightboxSource=fs.readFileSync('public/gallery-lightbox.js','utf8');
 const itemHandler=lightboxSource.match(/item\.addEventListener\('click', function\(e\) \{([\s\S]*?)\}\);/)[1];
 function activate(details) { let stopped=false,prevented=false,opened=false;const e={stopPropagation:()=>stopped=true,preventDefault:()=>prevented=true};if(details)vm.runInNewContext(detailsHandler,{event:e});if(!stopped)vm.runInNewContext(itemHandler,{e,i:0,openLightbox:()=>opened=true});return {prevented,opened}; }
 check('detail-anchor handler keeps navigation and skips lightbox',()=>assert.deepEqual(activate(true),{prevented:false,opened:false}));
 check('ordinary image handler still opens the lightbox',()=>assert.deepEqual(activate(false),{prevented:true,opened:true}));
 const {transform}=require('@astrojs/compiler');
 const astroFiles=['src/components/GallerySearch.astro','src/pages/gallery/index.astro','src/pages/gallery/nanach.astro','src/pages/gallery/nanach/mr-miyagi-karate-kid-na-nach-beanie.astro'];
 for(const filename of astroFiles){await transform(fs.readFileSync(filename,'utf8'),{filename});passed++;console.log('PASS Astro compile',filename);}
 console.log(JSON.stringify({status:'PASS',checks:passed,scope:'Real helper/metadata plus actual inline-search source in controlled unit DOM; actual Astro compiler. Not a native-browser receipt.'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
