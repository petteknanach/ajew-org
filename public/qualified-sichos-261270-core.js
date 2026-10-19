// Additive, independently pinned edition. Import has no DOM/storage/network effects.
export const PIN='6b861bdc206736a4f809ecd4e4f173ab67b004f3303b673c107a3a3dac057ad4';
export const SELECTED_PIN='1323b211a42507b64b2ec0465fce6729f617cf5bb71e4d270ce5d600b50fbdad';
export const SELECTED_BYTES=808370,PROJECTION_BYTES=838423;
export const ROUTE='/reader/reviewed/sichos-261-270',ASSET=ROUTE+'.json';
export const SOURCE_PREFIX='/reader/reviewed/sichos-261270-sources/';
export const ORDER=Object.freeze([[261,36],[262,4],[263,2],[264,3],[265,4],[266,5],[267,2],[268,6],[269,2],[270,2]].flatMap(([s,n])=>Array.from({length:n},(_,p)=>Object.freeze([s,p,p+1]))));
export const ASSET_PINS=Object.freeze({"selected-66.json":{"bytes":808370,"sha256":"1323b211a42507b64b2ec0465fce6729f617cf5bb71e4d270ce5d600b50fbdad"},"sicha-261-original.json":{"bytes":30379,"sha256":"a004e13ba0d57582ee7e6f903ec59e6c3f920c5be6016f24cf55a59f4c1295ba"},"sicha-262-original.json":{"bytes":5589,"sha256":"e8dc740cfc0593af3ea31bcea693581537a1c43052a8734bedcf80774b46f9a2"},"sicha-263-original.json":{"bytes":3093,"sha256":"5800a82256d3c843a3cc7a7299afac47cb446b44b0e8de4531624838418b4729"},"sicha-264-original.json":{"bytes":2946,"sha256":"537b6e05675dd28d056a3d49678520b26927e886f537a4c22858d2bb16107754"},"sicha-265-original.json":{"bytes":4659,"sha256":"dbf4322367c5f4ee7347f0e6cdb9cfd23e52419b69b0a480930eba7267c558e0"},"sicha-266-original.json":{"bytes":5070,"sha256":"e19361f37e3f7d4dda41805e7a3d986d560f888a7b13ee641f065c0198db11ee"},"sicha-267-original.json":{"bytes":2553,"sha256":"2a923f2fcfcdbde3c058f3fe3096af0fcad28fd55a022100efd2ccc5f7115a32"},"sicha-268-original.json":{"bytes":3105,"sha256":"6b3fdb00e2a09279570dfe55a84b1f5f4f6e2b207fc184324e61c60e36685fd5"},"sicha-269-original.json":{"bytes":2630,"sha256":"f723c6101d27f1e177f89e0e6f2abc1f1846341aadaa141fb61fc7385a81d172"},"sicha-270-original.json":{"bytes":2444,"sha256":"6bccad868b54f2386b6d40d551f3f9ac05ab27370d115a44baf2c3accd1f19c5"},"comparison-part4-html-text.txt":{"bytes":148671,"sha256":"e722769970c78c5cdeba349dc310e09ac4d316d516fa3d6e62cd22143a8d3379"},"comparison-part4-docx-text.txt":{"bytes":148313,"sha256":"d58eec5e66e0632147a9040018dcaaea5c9a96321e02195fb429136d175d4cce"}});
export const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const equal=(a,b)=>stable(a)===stable(b),editions=new WeakSet();
export function validateProjection(d,loaded,oracle=null){
 if(oracle&&!equal(d,oracle))throw Error('Independent complete projection drift');
 if(d.schema!=='qualified-sichos-261270/v1'||d.route!==ROUTE+'/'||d.scope!=="66 selected paragraphs from teachings 261–270. The source notes retain unresolved source, comparison, citation and written-mark limitations.")throw Error('Edition/scope claim drift');
 const names=['selected-66.json',...Array.from({length:10},(_,i)=>'sicha-'+(261+i)+'-original.json'),'comparison-part4-html-text.txt','comparison-part4-docx-text.txt'];
 if(!equal(Object.keys(loaded).sort(),[...names].sort())||!equal(d.assets.map(a=>a.name),names)||d.assets.some(a=>a.url!==SOURCE_PREFIX+a.name))throw Error('Closed source inventory');
 if(d.assets.some(a=>a.bytes!==ASSET_PINS[a.name]?.bytes||a.sha256!==ASSET_PINS[a.name]?.sha256))throw Error('Independent source asset pin drift');
 const bankAsset=d.assets[0];if(bankAsset.sha256!==SELECTED_PIN||bankAsset.bytes!==SELECTED_BYTES)throw Error('Independent selected-bank pin drift');
 const s=loaded['selected-66.json'];
 if(s.schema!=='qualified-sichos-261270-selected/v1'||s.route!==ROUTE+'/'||s.title!==d.title||s.notice!==d.notice||s.rows.length!==66)throw Error('Selected source scope drift');
 if(!equal(d.groups.map(g=>[g.id,g.section,g.canonical_url]),Array.from({length:10},(_,i)=>['sichos'+(261+i),261+i,'/reader/sichos-haran/1/'+(261+i)])))throw Error('Teaching scope drift');
 if(d.units.length!==66)throw Error('66 paragraph inventory');
 for(const g of d.groups)if(g.title!=='Teaching '+g.section||!equal(g.unit_ids,d.units.filter(u=>u.group===g.id).map(u=>u.owner)))throw Error('Teaching order drift');
 let notes=0;const ids=new Set(),qids=new Set();
 d.units.forEach((u,i)=>{
  const [section,position,index]=ORDER[i],r=s.rows[i],o=loaded['sicha-'+section+'-original.json'].segments[position],owner='sichos-'+section+'-position-'+position;
  if(ids.has(owner)||u.owner!==owner||r.owner!==owner||u.section!==section||r.section!==section||u.array_position!==position||r.position!==position||u.source_index!==index||r.source_index!==index||o.index!==index||u.event_position!==i||u.group!=='sichos'+section||u.anchor!==owner)throw Error('Paragraph source identity/order drift');ids.add(owner);
  for(const f of ['he','he_nikud','en'])if(typeof u[f]!=='string'||!u[f]||u[f]!==r.fields[f]||(f!=='en'&&u[f]!==o[f]))throw Error('Independent field drift');
  if(!equal(u.history,r.history)||u.history.earlier_supplied_English!==o.en||u.history.original_source_url!==SOURCE_PREFIX+'sicha-'+section+'-original.json'||u.history.original_owner_pointer!=='/segments/'+position)throw Error('Owner history drift');
  const h=u.history;if(typeof h.role!=='string'||!h.role||!equal(h.comparison_witnesses.map(c=>c.format),['html','docx']))throw Error('Malformed history');
  // DOCX bank uses two-LF paragraph joins; archive uses one LF. Preserve both exact literals.
  for(const c of h.comparison_witnesses)if(c.section_locator_not_equivalence_proof!==section||typeof c.whole_comparison_container_text!=='string'||!c.whole_comparison_container_text||typeof c.role!=='string'||!c.role||c.full_witness_text_url!==SOURCE_PREFIX+'comparison-part4-'+c.format+'-text.txt'||!(c.format==='docx'?loaded['comparison-part4-docx-text.txt'].replace(/\n/g,'\n\n'):loaded['comparison-part4-html-text.txt']).includes(c.whole_comparison_container_text))throw Error('Malformed comparison');
  if(!equal(u.qualifications,r.required_qualifications))throw Error('Current qualification drift');
  u.qualifications.forEach(q=>{notes++;if(qids.has(q.id)||q.owner!==owner||q.placement!=='after_this_complete_BODY_field'||typeof q.id!=='string'||typeof q.kind!=='string'||typeof q.text!=='string'||!q.text)throw Error('Qualification body/identity/placement drift');qids.add(q.id);});
  const origin=u.qualifications.filter(q=>q.kind==='current_origin_qualification');
  // Per-owner wording comes from the independently authenticated bank, never a blanket label.
  if(origin.length!==1)throw Error('Current origin inventory drift');
  if(origin[0].text.startsWith('Existing supplied English retained verbatim')&&u.en!==o.en)throw Error('Retained original English drift');
 });
 if(notes!==96)throw Error('96 qualification inventory');return d;
}
export async function authenticateEdition(raw,readAsset,digest){
 const bytes=new Uint8Array(raw);if(bytes.byteLength!==PROJECTION_BYTES||await digest(bytes)!==PIN)throw Error('Current projection authentication failed');
 const decode=b=>new TextDecoder('utf-8',{fatal:true}).decode(b),d=JSON.parse(decode(bytes)),loaded={};
 for(const a of d.assets){
  if(!/^(selected-66\.json|sicha-(26[1-9]|270)-original\.json|comparison-part4-(html|docx)-text\.txt)$/.test(a.name)||a.url!==SOURCE_PREFIX+a.name||Object.hasOwn(loaded,a.name))throw Error('Unbound source asset');
  const b=new Uint8Array(await readAsset(a)),hash=await digest(b);
  if(a.name==='selected-66.json'&&(b.byteLength!==SELECTED_BYTES||hash!==SELECTED_PIN))throw Error('Independent selected-bank authentication failed');
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
