// Standalone exact-five edition. Import has no DOM/storage/network effects.
export const PIN='7056d578419823f6dbd82356fd53bbca8499397436f1129a8f9cdc2ee0083e8b';
export const ROUTE='/reader/reviewed/sichos-224-225-229-230';
export const ASSET=ROUTE+'.json';
export const SOURCE_PREFIX='/reader/reviewed/sichos-five-sources/';
export const ORDER=[[224,2,3],[225,10,11],[229,2,3],[230,1,2],[230,2,3]];
export const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const equal=(a,b)=>stable(a)===stable(b);
export function validateProjection(d,loaded,oracle=null){
 if(oracle&&!equal(d,oracle))throw Error('Independent complete projection drift');
 if(d.schema!=='qualified-sichos-five-projection/v1'||d.route!==ROUTE||d.scope!=='exactly-five-paragraphs'||d.canonical_replacement!==false||d.source_approval!==false)throw Error('Edition/scope claim drift');
 const names=['selected-five.json',...['224','225','229','230'].map(n=>'sicha-'+n+'-original.json')];
 if(!equal(Object.keys(loaded).sort(),[...names].sort())||!equal(d.assets.map(a=>a.name),names)||d.assets.some(a=>a.url!==SOURCE_PREFIX+a.name))throw Error('Closed source inventory');
 const s=loaded['selected-five.json'];
 if(s.schema!=='qualified-sichos-five-selected/v1'||s.route!==ROUTE||s.scope!==d.scope||s.canonical_replacement!==false||s.source_approval!==false||s.title!==d.title||s.notice!==d.notice||s.rows.length!==5)throw Error('Selected source scope drift');
 if(!equal(d.groups.map(g=>[g.id,g.section,g.canonical_url]),[224,225,229,230].map(n=>['sichos'+n,n,'/reader/sichos-haran/1/'+n])))throw Error('Teaching scope drift');
 if(d.units.length!==5)throw Error('Five paragraph inventory');
 let notes=0;const ids=new Set();
 for(const g of d.groups){
  const original=loaded['sicha-'+g.section+'-original.json'];
  if(g.title!=='Teaching '+g.section||!equal(g.original_metadata,Object.fromEntries(Object.entries(original).filter(([k])=>k!=='segments')))||!equal(g.unit_ids,d.units.filter(u=>u.group===g.id).map(u=>u.owner)))throw Error('Original metadata/order drift');
 }
 d.units.forEach((u,i)=>{
  const [section,position,index]=ORDER[i],r=s.rows[i],o=loaded['sicha-'+section+'-original.json'].segments[position],owner='sichos-'+section+'-position-'+position;
  if(ids.has(owner)||u.owner!==owner||r.owner!==owner||u.section!==section||r.section!==section||u.array_position!==position||r.array_position!==position||u.source_index!==index||r.source_index!==index||o.index!==index||u.event_position!==i||u.group!=='sichos'+section||u.anchor!=='unit-'+owner)throw Error('Paragraph source identity/order drift');ids.add(owner);
  if(!equal(u.source_row,r)||!equal(u.original_segment,o)||!equal(u.field_sha256,r.field_sha256))throw Error('Complete source/history row drift');
  for(const f of ['he','he_nikud','en'])if(u[f]!==r[f]||(f!=='en'&&u[f]!==o[f]))throw Error('Independent field drift');
  if(u.displacedEnglish!==r.displacedEnglish||u.displacedEnglish!==o.en)throw Error('Earlier English drift');
  if(!equal(u.qualifications,r.qualifications)||u.qualifications.length!==(i===4?3:2))throw Error('Current qualification drift');
  u.qualifications.forEach((q,j)=>{notes++;if(q.id!==owner+'-qualification-'+j||q.owner!==owner||q.mandatory!==true||q.placement!=='after-pair'||q.current_en_sha256!==u.field_sha256.en||typeof q.text!=='string'||!q.text)throw Error('Qualification body/identity/placement drift');});
 });
 if(notes!==11)throw Error('Eleven qualification inventory');
 return d;
}
// Authenticate bytes before parsing/projecting. Reader and static endpoints share this contract.
export async function authenticateEdition(raw,readAsset,digest){
 const bytes=new Uint8Array(raw);if(await digest(bytes)!==PIN)throw Error('Current projection authentication failed');
 const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),loaded={};
 for(const a of d.assets){
  if(!/^(selected-five|sicha-(224|225|229|230)-original)\.json$/.test(a.name)||a.url!==SOURCE_PREFIX+a.name||Object.hasOwn(loaded,a.name))throw Error('Unbound source asset');
  const b=new Uint8Array(await readAsset(a));if(b.byteLength!==a.bytes||await digest(b)!==a.sha256)throw Error('Missing/changed bound source: '+a.name);
  loaded[a.name]=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
 }
 validateProjection(d,loaded);
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};return freeze(d);
}
export function ranges(text,query){
 if(!query)return [];const out=[];let start=0;const hay=text.toLowerCase(),needle=query.toLowerCase();if(hay.length!==text.length||needle.length!==query.length)return [];
 for(;;){const i=hay.indexOf(needle,start);if(i<0)break;out.push([i,i+query.length]);start=i+query.length;}return out;
}
export function fullBodyPayload(d,owners){
 if(!Array.isArray(owners)||!owners.length||new Set(owners).size!==owners.length)throw Error('Ambiguous payload paragraphs');
 const units=d.units.filter(u=>owners.includes(u.owner));
 if(units.length!==owners.length||!equal(units.map(u=>u.owner),owners))throw Error('Unknown or reordered paragraphs');
 const content=d.notice+'\n\n'+units.map(u=>'Teaching '+u.section+', paragraph '+u.source_index+'\n\nSupplied Hebrew\n'+u.he+'\n\nSupplied pointed Hebrew\n'+u.he_nikud+'\n\nEnglish\n'+u.en+'\n\n'+u.qualifications.map(q=>'Source note\n'+q.text).join('\n\n')).join('\n\n')+'\n\nSource: https://ajew.org'+ROUTE+'/';
 return {schema:'qualified-full-body-payload/v1',projection_sha256:PIN,owners:[...owners],content,source:ROUTE,requiredQualifications:units.flatMap(u=>u.qualifications),sourceUnits:units};
}
export function appendLegacyCollection(raw,entry){
 const d=raw===null?{sections:[]}:JSON.parse(raw);if(!d||typeof d!=='object'||Array.isArray(d)||!Array.isArray(d.sections))throw Error('Invalid saved collection');
 const existing=d.sections.filter(s=>s.id===entry.id);if(existing.length){if(existing.length!==1||!equal(existing[0],entry))throw Error('Saved identity conflict');return raw;}d.sections.push(entry);return JSON.stringify(d);
}
