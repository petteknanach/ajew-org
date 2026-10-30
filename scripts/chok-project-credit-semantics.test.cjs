'use strict';
// Focused shipping regression, registered through the genuine settings owning caller.
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {documentFor}=require('./qualified-earlier-parsha-test-dom.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
const SOURCE_NOTICES_SHA='b1964e0c449f831e8cc9b5786efe7221b70ccc50f1316cf503413c377f6e9e11';
const GROUPS=[['credit-32','credit-34'],['credit-43','credit-44','credit-45','credit-46']];
const URIS=[
 'http://he.wikisource.org/wiki/%D7%AA%D7%9C%D7%9E%D7%95%D7%93_%D7%91%D7%91%D7%9C%D7%99',
 'http://mobile.tora.ws/',
 'http://www.daat.ac.il/daat/olam_hatanah/tnh_text.asp?id=130',
 'http://www.toratemetfreeware.com/index.html?downloads'
];
const text=html=>documentFor('<main>'+html+'</main>').querySelector('main').textContent;
const scope=b=>b.kind==='qualified'?`${b.payload.split('/').pop()} · ${b.section} · ${b.owner} · ${b.note}`:`${b.owner} · credit ${b.creditIndex+1}`;
function verify(bank,rendered){
 // Independently frozen original 46 notices, exact raw HTML and ordered bindings.
 assert.equal(sha(JSON.stringify(bank.sourceNotices)),SOURCE_NOTICES_SHA,'ORIGINAL_NOTICE_PROVENANCE');
 const originals=new Map(bank.sourceNotices.map(e=>[e.id,e])),byId=new Map(bank.entries.map(e=>[e.id,e]));
 const expectedIds=bank.sourceNotices.map(e=>e.id).filter(id=>!GROUPS.some(g=>g.slice(1).includes(id)));
 assert.deepEqual(bank.entries.map(e=>e.id),expectedIds,'semantic group membership, not a count target');
 assert.deepEqual(bank.entries.flatMap(e=>e.sourceIds).slice().sort(),[...originals.keys()].sort(),'every original identity exactly once');
 // Grouping can change traversal order; preserve the binding multiset, not a false new order claim.
 const bag=bs=>bs.map(b=>JSON.stringify(b)).sort();
 assert.deepEqual(bag(bank.entries.flatMap(e=>e.bindings)),bag(bank.sourceNotices.flatMap(e=>e.bindings)),'ALL_OWNER_BINDINGS');
 let variants=0;
 for(const ids of GROUPS){
  const e=byId.get(ids[0]),node=rendered.querySelector('[data-project-credit="'+e.id+'"]');assert(node);
  assert.deepEqual(e.sourceIds,ids);assert.deepEqual(e.bindings,ids.flatMap(id=>originals.get(id).bindings));
  const probes=ids.map(id=>documentFor('<main>'+originals.get(id).html+'</main>').querySelector('main'));
  for(const index of [0,1]){
   const common=probes[0].children[index].innerHTML;
   assert(probes.every(p=>p.children[index].innerHTML===common));
   assert.equal([...node.querySelectorAll('p')].filter(p=>p.innerHTML===common).length,1,'DUPLICATE_COMMON_CITATION:'+ids[0]);
  }
  assert.equal(e.variants.length,ids.length);assert.equal(node.querySelectorAll('[data-credit-variant]').length,ids.length);
  for(let i=0;i<ids.length;i++){
   const v=e.variants[i],old=originals.get(ids[i]),p=probes[i].children[2];
   assert.equal(v.sourceId,old.id);assert.equal(v.changeHTML,'<p dir="ltr">'+p.innerHTML+'</p>');assert.deepEqual(v.bindings,old.bindings);
   assert.equal(v.prefix+v.specific+v.suffix,p.innerHTML,'EXACT_SCOPED_CHANGE:'+old.id);
   const n=node.querySelector('[data-credit-variant="'+old.id+'"]');assert(n);
   assert.equal(n.querySelector('p').textContent,text(v.specific));
   assert.deepEqual([...n.querySelectorAll('li')].map(li=>li.textContent),old.bindings.map(scope),'VARIANT_OWNER_SCOPE:'+old.id);
   if(ids[0]==='credit-32'){assert.equal(v.prefix,'');assert.equal(v.suffix,'');}
   variants++;
  }
  if(ids[0]==='credit-43'){
   for(const field of ['prefix','suffix']){
    assert(e.variants[0][field].length>0);
    assert(e.variants.every(v=>v[field]===e.variants[0][field]));
    const p=node.querySelector('[data-shared-change="'+field+'"]');assert(p);assert.equal(p.innerHTML,e.variants[0][field]);
    assert.equal([...node.querySelectorAll('p')].filter(p=>p.innerHTML===e.variants[0][field]).length,1,'SHARED_CHANGE_ONCE');
   }
  }
 }
 let sourceAnchors=0;
 for(const e of bank.entries){
  const n=rendered.querySelector('[data-project-credit="'+e.id+'"]');assert(n);
  if(!e.variants){
   // Anchor insertion is the ONLY permitted raw projection difference otherwise.
   let restored=e.html;for(const uri of URIS)restored=restored.split('<a href="'+uri+'">'+uri+'</a>').join(uri);
   assert.equal(restored,originals.get(e.id).html,'NON_GROUPED_HTML_EXACT:'+e.id);
  }
  for(const a of n.querySelectorAll('a'))assert.equal(a.querySelectorAll('a').length,0,'NO_NESTED_ANCHORS');
  for(const uri of URIS){
   const expected=e.sourceIds.reduce((sum,id)=>sum+(originals.get(id).html.split(uri).length-1),0);
   if(!expected)continue;
   const anchors=[...n.querySelectorAll('a')].filter(a=>a.getAttribute('href')===uri);
   assert.equal(anchors.length,expected,'SOURCE_URI_TEXT_ONLY:'+e.id+':'+uri);
   for(const a of anchors){assert.equal(a.textContent,uri);assert.notEqual(a.getAttribute('tabindex'),'-1');assert(!a.hasAttribute('hidden'));}
   sourceAnchors+=anchors.length;
  }
 }
 assert.equal(sourceAnchors,10,'all original plain HTTP source occurrences');
 // Projection helper is idempotent, never rewrites existing/HTTPS anchors or script-like carriers.
 const {anchorSources}=require('./chok-project-credits.cjs'),uri=URIS[1];
 const skipped='<a href="'+uri+'">'+uri+'</a><script>var u="'+uri+'";</script><style>/* '+uri+' */</style><code>'+uri+'</code><pre>'+uri+'</pre><textarea>'+uri+'</textarea><template>'+uri+'</template>';
 assert.equal(anchorSources(skipped),skipped);
 const sample='<p>source '+uri+' end</p>',linked='<p>source <a href="'+uri+'">'+uri+'</a> end</p>';
 assert.equal(anchorSources(sample),linked);assert.equal(anchorSources(linked),linked);
 assert.equal(anchorSources('<p>'+uri+'longer</p>'),'<p>'+uri+'longer</p>');
 return{originalNoticeIdentities:bank.sourceNotices.length,semanticGroups:GROUPS.length,scopedVariants:variants,exactHTTPAnchors:sourceAnchors,exactProvenance:true,allOwnerBindings:true};
}
module.exports={verify};
