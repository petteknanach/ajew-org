'use strict';
// Static project metadata only. Uses actual selected inputs and their authentic
// typed legal-credit renderers; no historical/hidden corpus or text classifier.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash,webcrypto}=require('node:crypto');
const {documentFor,dependencies}=require('./qualified-earlier-parsha-test-dom.cjs');
const parse5=dependencies('parse5');
const {boot}=require('./verify-chok-qualified-daily.cjs');
const sha=b=>createHash('sha256').update(b).digest('hex');
// Projection only: original HTML/identities/bindings are retained in sourceNotices.
const HTTP_SOURCES=Object.freeze([
 'http://he.wikisource.org/wiki/%D7%AA%D7%9C%D7%9E%D7%95%D7%93_%D7%91%D7%91%D7%9C%D7%99',
 'http://mobile.tora.ws/',
 'http://www.daat.ac.il/daat/olam_hatanah/tnh_text.asp?id=130',
 'http://www.toratemetfreeware.com/index.html?downloads'
]);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/>/g,'&gt;');
function anchorSources(html){
 const tree=parse5.parseFragment(html,{sourceCodeLocationInfo:true}),edits=[];
 function walk(node,blocked=false){
  blocked=blocked||['a','script','style','textarea','title','code','pre','template'].includes(node.tagName);
  if(!blocked&&node.nodeName==='#text'&&node.sourceCodeLocation){
   const {startOffset,endOffset}=node.sourceCodeLocation,raw=html.slice(startOffset,endOffset);
   for(const uri of HTTP_SOURCES)for(let at=raw.indexOf(uri);at!==-1;at=raw.indexOf(uri,at+uri.length)){
    // Do not convert a prefix of another URI. No URL normalization/migration.
    if(at+uri.length<raw.length&&!/[\s<)\],.;]/.test(raw[at+uri.length]))continue;
    edits.push({at:startOffset+at,end:startOffset+at+uri.length,text:'<a href="'+esc(uri)+'">'+uri+'</a>'});
   }
  }
  for(const child of node.childNodes||[])walk(child,blocked);
 }
 walk(tree);for(const e of edits.sort((a,b)=>b.at-a.at))html=html.slice(0,e.at)+e.text+html.slice(e.end);return html;
}
const SEMANTIC_GROUPS=Object.freeze([['credit-32','credit-34'],['credit-43','credit-44','credit-45','credit-46']]);
function triple(notice){const match=notice.html.match(/^(<p dir="ltr">[\s\S]*?<\/p><p dir="ltr">[\s\S]*?<\/p>)(<p dir="ltr">([\s\S]*)<\/p>)$/);assert(match,'PROJECT_CREDIT_TRIPLE:'+notice.id);return{common:match[1],changeHTML:match[2],change:match[3]};}
function bindingText(b){return b.kind==='qualified'?`${b.payload.split('/').pop()} · ${b.section} · ${b.owner} · ${b.note}`:`${b.owner} · credit ${b.creditIndex+1}`;}
function projectNotices(sourceNotices){
 const byId=new Map(sourceNotices.map(e=>[e.id,e])),groupFor=new Map();
 for(const ids of SEMANTIC_GROUPS)for(const id of ids)groupFor.set(id,ids);
 return sourceNotices.flatMap(source=>{
  const ids=groupFor.get(source.id);if(!ids)return[{...source,html:anchorSources(source.html),sourceIds:[source.id]}];
  if(source.id!==ids[0])return[];
  const originals=ids.map(id=>{assert(byId.has(id),'PROJECT_CREDIT_ID:'+id);return byId.get(id);}),parts=originals.map(triple);
  assert(parts.every(p=>p.common===parts[0].common),'PROJECT_COMMON_CITATION');
  let prefix='',suffix='';
  if(ids[0]==='credit-43'){
   // Exact shared sentence and word-boundary suffix, not legal paraphrases.
   prefix='Ramban, Commentary on the Torah. English translation and annotations by Charles B. Chavel, Shilo Publishing House, 1971–1976; supplied through the exact source links in the packet under CC BY 3.0. ';
   suffix="translator footnotes separated from Ramban's classical body. New reader explanations and the two explicitly identified source-aligned successor translations are separate contributions.";
  }
  const variants=originals.map((e,i)=>{
   const p=parts[i];assert(p.change.startsWith(prefix)&&p.change.endsWith(suffix),'PROJECT_SHARED_CHANGES');
   const specific=p.change.slice(prefix.length,suffix?p.change.length-suffix.length:undefined);
   return{sourceId:e.id,changeHTML:p.changeHTML,prefix,specific,suffix,bindings:e.bindings};
  });
  const scope=v=>'<details><summary>Applicability · תחולה</summary><ul>'+v.bindings.map(b=>'<li dir="ltr">'+esc(bindingText(b))+'</li>').join('')+'</ul></details>';
  const html=parts[0].common+(prefix?'<p dir="ltr" data-shared-change="prefix">'+prefix+'</p>':'')+
   '<ul data-credit-variants="">'+variants.map(v=>'<li data-credit-variant="'+v.sourceId+'"><p dir="ltr">'+v.specific+'</p>'+scope(v)+'</li>').join('')+'</ul>'+
   (suffix?'<p dir="ltr" data-shared-change="suffix">'+suffix+'</p>':'');
  return[{id:source.id,html:anchorSources(html),bindings:originals.flatMap(e=>e.bindings),sourceIds:ids,variants}];
 });
}
async function generate(root){
 const inputs={},entries=[],seen=new Map();
 function read(relative){const bytes=fs.readFileSync(path.join(root,relative));inputs[relative]=sha(bytes);return bytes.toString('utf8');}
 function retain(html,binding){let e=seen.get(html);if(!e){e={id:'credit-'+(entries.length+1),html,bindings:[]};seen.set(html,e);entries.push(e);}e.bindings.push(binding);}
 const {entries:selected}=boot(root);
 // The selected manifest is also an input, not merely the containing library.
 read('public/chok-qualified-daily-classical-selected-v1.js');
 const lib=read('public/chok-qualified-daily.js'),host={};
 const marker='  var api = Object.freeze(';assert.equal(lib.split(marker).length,2);
 vm.runInNewContext(lib.replace(marker,'  host.__projectCredits = sourceCredits;\n'+marker),{window:host});
 for(const e of selected){
  const relative='public'+e.url,raw=read(relative);assert.equal(sha(raw),e.payloadSHA256);const packet=JSON.parse(raw);
  for(const [section,s] of Object.entries(packet.sections)){
   if(s.disposition==='not-prescribed')continue;
   const doc=documentFor('<main>'+host.__projectCredits(s.units)+'</main>');
   for(const note of doc.querySelectorAll('[data-daily-note]'))retain(note.innerHTML,{kind:'qualified',payload:relative,section,owner:note.getAttribute('data-note-owner'),note:note.getAttribute('data-daily-note'),role:note.getAttribute('data-field-role')});
  }
 }
 const env={window:{crypto:webcrypto},TextEncoder,Uint8Array};
 const otherCode=read('public/chok-other-layers.js'),creditsMarker=' root.ChokOtherLayers=Object.freeze(';
 assert.equal(otherCode.split(creditsMarker).length,2);
 vm.runInNewContext(otherCode.replace(creditsMarker,' root.__projectCredits=credits;\n'+creditsMarker),env);
 const other=await env.window.ChokOtherLayers.load(async url=>read('public'+url.split('?')[0]));
 for(const row of other.rows){
  const doc=documentFor('<main>'+env.window.__projectCredits(row)+'</main>');
  const ps=[...doc.querySelector('.ck-source-credits').children].filter(n=>n.tagName.toLowerCase()==='p');assert.equal(ps.length,row.credits.length*3);
  for(let i=0;i<ps.length;i+=3){const wrapper=doc.createElement('div');ps.slice(i,i+3).forEach(n=>wrapper.appendChild(n));retain(wrapper.innerHTML,{kind:'other-layer',owner:row.id,creditIndex:i/3});}
 }
 return {schema:'chok-project-credits-v1',scope:'Actual currently selected qualified readings and admitted OtherLayers only. Notices apply only to their named editions, fields and contributions, not universally. Original sources, provenance, qualifications and holds remain authoritative.',inputs,sourceNotices:entries,entries:projectNotices(entries)};
}
if(require.main===module)generate(path.resolve(__dirname,'..')).then(bank=>{
 const target=path.resolve(__dirname,'../src/data/chok-project-credits.json'),out=JSON.stringify(bank,null,2)+'\n';
 if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),out,'PROJECT_CREDIT_BANK_STALE');
 else {fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,out);}
 console.log(JSON.stringify({entries:bank.entries.length,bindings:bank.entries.reduce((n,e)=>n+e.bindings.length,0),inputs:Object.keys(bank.inputs).length,mode:process.argv.includes('--check')?'check':'generate'}));
}).catch(e=>{console.error(e.stack);process.exitCode=1;});
module.exports={generate,anchorSources,HTTP_SOURCES,SEMANTIC_GROUPS};
