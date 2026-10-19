// Additive, independently pinned edition. Import has no DOM/storage/network effects.
export const PIN='d0be35aee0498ad18e60b8e7a3463566c19197f6685b1992112467c22af4a09f';
export const SELECTED_PIN='4ad752d42de72d020bbfc5a0edc97997331431a312e132c85f044bb0787548cb';
export const SELECTED_BYTES=241108,PROJECTION_BYTES=264008;
export const ROUTE='/reader/reviewed/sichos-241-250',ASSET=ROUTE+'.json';
export const SOURCE_PREFIX='/reader/reviewed/sichos-241250-sources/';
export const ORDER=Object.freeze([[241,1],[242,9],[243,2],[244,3],[245,8],[246,2],[247,5],[248,2],[249,16],[250,1]].flatMap(([s,n])=>Array.from({length:n},(_,p)=>[s,p,p+1]).filter(([s,p])=>s!==249||![8,14].includes(p))).map(Object.freeze));
export const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const equal=(a,b)=>stable(a)===stable(b),editions=new WeakSet();
export function validateProjection(d,loaded,oracle=null){
 if(oracle&&!equal(d,oracle))throw Error('Independent complete projection drift');
 if(d.schema!=='qualified-sichos-241250/v1'||d.route!==ROUTE+'/'||d.scope!=='47 selected paragraphs from teachings241–250. Two additional paragraphs are not included because their English remains withheld for unresolved meaning. Their earlier supplied wording is comparison history, not an adopted fallback.')throw Error('Edition/scope claim drift');
 const names=['selected-47.json',...Array.from({length:10},(_,i)=>'sicha-'+(241+i)+'-original.json'),'comparison-part4-html-text.txt','comparison-part4-docx-text.txt'];
 if(!equal(Object.keys(loaded).sort(),[...names].sort())||!equal(d.assets.map(a=>a.name),names)||d.assets.some(a=>a.url!==SOURCE_PREFIX+a.name))throw Error('Closed source inventory');
 const bankAsset=d.assets[0];if(bankAsset.sha256!==SELECTED_PIN||bankAsset.bytes!==SELECTED_BYTES)throw Error('Independent selected-bank pin drift');
 const s=loaded['selected-47.json'];
 if(s.schema!=='qualified-sichos-241250-selected/v1'||s.route!==ROUTE+'/'||s.title!==d.title||s.notice!==d.notice||s.rows.length!==47)throw Error('Selected source scope drift');
 if(!equal(d.groups.map(g=>[g.id,g.section,g.canonical_url]),Array.from({length:10},(_,i)=>['sichos'+(241+i),241+i,'/reader/sichos-haran/1/'+(241+i)])))throw Error('Teaching scope drift');
 if(d.units.length!==47)throw Error('47 paragraph inventory');
 for(const g of d.groups)if(g.title!=='Teaching '+g.section||!equal(g.unit_ids,d.units.filter(u=>u.group===g.id).map(u=>u.owner)))throw Error('Teaching order drift');
 let notes=0;const ids=new Set(),qids=new Set();
 d.units.forEach((u,i)=>{
  const [section,position,index]=ORDER[i],r=s.rows[i],o=loaded['sicha-'+section+'-original.json'].segments[position],owner='sichos-'+section+'-position-'+position;
  if(ids.has(owner)||u.owner!==owner||r.owner!==owner||u.section!==section||r.section!==section||u.array_position!==position||r.position!==position||u.source_index!==index||r.source_index!==index||o.index!==index||u.event_position!==i||u.group!=='sichos'+section||u.anchor!==owner)throw Error('Paragraph source identity/order drift');ids.add(owner);
  for(const f of ['he','he_nikud','en'])if(typeof u[f]!=='string'||!u[f]||u[f]!==r.fields[f]||(f!=='en'&&u[f]!==o[f]))throw Error('Independent field drift');
  if(!equal(u.history,r.history)||u.history.earlier_supplied_English!==o.en||u.history.original_source_url!==SOURCE_PREFIX+'sicha-'+section+'-original.json'||u.history.original_owner_pointer!=='/segments/'+position)throw Error('Owner history drift');
  const h=u.history;if(typeof h.role!=='string'||!h.role||!equal(h.comparison_witnesses.map(c=>c.format),['html','docx']))throw Error('Malformed history');
  for(const c of h.comparison_witnesses)if(c.section_locator_not_equivalence_proof!==section||typeof c.whole_comparison_container_text!=='string'||!c.whole_comparison_container_text||typeof c.role!=='string'||!c.role||c.full_witness_text_url!==SOURCE_PREFIX+'comparison-part4-'+c.format+'-text.txt'||!loaded['comparison-part4-'+c.format+'-text.txt'].includes(c.whole_comparison_container_text))throw Error('Malformed comparison');
  if(!equal(u.qualifications,r.required_qualifications))throw Error('Current qualification drift');
  u.qualifications.forEach(q=>{notes++;if(qids.has(q.id)||q.owner!==owner||q.placement!=='after_this_complete_BODY_field'||typeof q.id!=='string'||typeof q.kind!=='string'||typeof q.text!=='string'||!q.text)throw Error('Qualification body/identity/placement drift');qids.add(q.id);});
  const origin=u.qualifications.filter(q=>q.kind==='current_origin_qualification');
  const text=owner==='sichos-247-position-4'?'The English in this paragraph is retained verbatim from the earlier supplied English; it is not a newly written editorial translation.':'The English here is an editorial translation from the supplied Hebrew, not a recovered passage from the supplied English or an adoption of the comparison edition’s English.';
  if(origin.length!==1||origin[0].text!==text||(owner==='sichos-247-position-4'&&u.en!==o.en))throw Error('Current origin drift');
 });
 if(notes!==133)throw Error('133 qualification inventory');return d;
}
export async function authenticateEdition(raw,readAsset,digest){
 const bytes=new Uint8Array(raw);if(bytes.byteLength!==PROJECTION_BYTES||await digest(bytes)!==PIN)throw Error('Current projection authentication failed');
 const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b),d=JSON.parse(decode(bytes)),loaded={};
 for(const a of d.assets){
  if(!/^(selected-47\.json|sicha-(24[1-9]|250)-original\.json|comparison-part4-(html|docx)-text\.txt)$/.test(a.name)||a.url!==SOURCE_PREFIX+a.name||Object.hasOwn(loaded,a.name))throw Error('Unbound source asset');
  const b=new Uint8Array(await readAsset(a)),hash=await digest(b);
  if(a.name==='selected-47.json'&&(b.byteLength!==SELECTED_BYTES||hash!==SELECTED_PIN))throw Error('Independent selected-bank authentication failed');
  if(b.byteLength!==a.bytes||hash!==a.sha256)throw Error('Missing/changed bound source: '+a.name);loaded[a.name]=a.name.endsWith('.json')?JSON.parse(decode(b)):decode(b);
 }
 validateProjection(d,loaded);
 for(const u of d.units)for(const f of ['he','he_nikud','en'])if(await digest(new TextEncoder().encode(u[f]))!==u.field_sha256[f])throw Error('Full-field hash drift');
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};freeze(d);editions.add(d);return d;
}
export function historyEntries(u){const h=u.history;return [{key:'role',label:'Historical role',text:h.role},{key:'earlier',label:'Earlier supplied English — comparison record',text:h.earlier_supplied_English},{key:'original',label:'Complete original teaching archive',text:h.original_source_url,href:h.original_source_url},{key:'pointer',label:'Original paragraph location',text:h.original_owner_pointer},...h.comparison_witnesses.flatMap(c=>[{key:c.format+'-role',label:c.format.toUpperCase()+' comparison — not adopted, not independent authority',text:c.role},{key:c.format+'-locator',label:'Section locator — not equivalence proof',text:String(c.section_locator_not_equivalence_proof)},{key:c.format+'-text',label:c.format.toUpperCase()+' whole comparison container',text:c.whole_comparison_container_text},{key:c.format+'-archive',label:c.format.toUpperCase()+' full comparison witness text',text:c.full_witness_text_url,href:c.full_witness_text_url}])];}
export const historyText=u=>'Historical comparison — not independent textual authority\n'+historyEntries(u).map(e=>e.label+'\n'+e.text).join('\n\n');
export function ranges(text,query){
 if(!query)return [];const out=[];let start=0;const hay=text.toLowerCase(),needle=query.toLowerCase();if(hay.length!==text.length||needle.length!==query.length)return [];
 for(;;){const i=hay.indexOf(needle,start);if(i<0)break;out.push([i,i+query.length]);start=i+query.length;}return out;
}
export function fullBodyPayload(d,owners){
 if(!editions.has(d))throw Error('Unauthenticated outward source');
 if(!Array.isArray(owners)||!owners.length||new Set(owners).size!==owners.length)throw Error('Ambiguous payload paragraphs');
 const units=d.units.filter(u=>owners.includes(u.owner));if(units.length!==owners.length||!equal(units.map(u=>u.owner),owners))throw Error('Unknown or reordered paragraphs');
 const content=d.notice+'\n\n'+units.map(u=>'Teaching '+u.section+', paragraph '+u.source_index+'\n\nSupplied Hebrew\n'+u.he+'\n\nSupplied pointed Hebrew\n'+u.he_nikud+'\n\nEnglish\n'+u.en+'\n\n'+u.qualifications.map(q=>'Source note\n'+q.text).join('\n\n')+'\n\n'+historyText(u)).join('\n\n')+'\n\nSource: https://ajew.org'+ROUTE+'/';
 return {schema:'qualified-full-body-payload/v1',owners:[...owners],content,source:ROUTE,requiredQualifications:units.flatMap(u=>u.qualifications),sourceUnits:units};
}
export function appendLegacyCollection(raw,entry){const d=raw===null?{sections:[]}:JSON.parse(raw);if(!d||typeof d!=='object'||Array.isArray(d)||!Array.isArray(d.sections))throw Error('Invalid saved collection');const existing=d.sections.filter(s=>s.id===entry.id);if(existing.length){if(existing.length!==1||!equal(existing[0],entry))throw Error('Saved identity conflict');return raw;}d.sections.push(entry);return JSON.stringify(d);}
