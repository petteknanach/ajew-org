// Pure scoped core: no DOM, storage or network side effects at import.
export const PIN='fad5efa4cdddf8962bbb6eb8d44e0b410c361546732a1f6fb5ada90bd5be92a4';
export const ROUTE='/reader/reviewed/wrapup-18-19-92-209';
export const ASSET=ROUTE+'.json';
export const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const equal=(a,b)=>stable(a)===stable(b);
export function validateProjection(d,loaded,oracle=null){
 if(oracle&&!equal(d,oracle))throw Error('Independent complete projection oracle drift');
 if(d.schema!=='qualified-wrapup-projection/v1'||d.route!==ROUTE||d.canonical_replacement!==false||d.publication_approved!==false)throw Error('Edition/scope claim drift');
 const ids=new Set();let notes=0;
 if(!equal(d.groups.map(g=>[g.id,g.section,g.canonical_url]),[['alim18',18,'/reader/alim-litrufa/2/18'],['alim19',19,'/reader/alim-litrufa/2/19'],['sichos92',92,'/reader/sichos-haran/1/92'],['sichos209',209,'/reader/sichos-haran/1/209']]))throw Error('Group scope');
 for(const g of d.groups){
  const wrapper=loaded[g.selection+'-selected.json'],original=loaded[g.original+'-original.json'];if(!wrapper||!original)throw Error('Missing bound source');
  const sourceRows=g.selection==='sichos'?wrapper.rows.filter(r=>r.section===g.section):wrapper.rows;
  const units=d.units.filter(u=>u.group===g.id);if(units.length!==sourceRows.length||units.length!==original.segments.length)throw Error('Complete scope drift');
  if(!equal(g.original_metadata,Object.fromEntries(Object.entries(original).filter(([k])=>k!=='segments')))||!equal(g.unit_ids,units.map(u=>u.owner)))throw Error('Complete original metadata drift');
  const apparatus=g.selection==='sichos'?sourceRows.flatMap(r=>r.apparatus):wrapper.editorial_apparatus;if(!equal(g.apparatus,apparatus))throw Error('Apparatus ownership drift');
  units.forEach((u,i)=>{const r=sourceRows[i],o=original.segments[i],s=g.selection==='sichos',owner=s?r.owner:r.id,pos=s?r.array_position:r.position,index=s?r.source_index:r.index;
   if(ids.has(owner))throw Error('Duplicate owner');ids.add(owner);
   if(u.owner!==owner||u.array_position!==pos||pos!==i||u.source_index!==index||index!==o.index||u.event_position!==d.units.indexOf(u)||u.anchor!=='unit-'+owner.replace(':','-')||u.selection_key!==g.selection)throw Error('Source index/event/owner drift');
   if(!equal(u.source_row,r)||!equal(u.original_segment,o))throw Error('Complete source/history row drift');
   for(const f of ['he','he_nikud','en'])if(u[f]!== (s?(f==='en'?r.selected_english:r.source[f].text):r[f])||(f!=='en'&&u[f]!==o[f]))throw Error('Independent field drift');
   const legacy=s?r.source.en.text:(r.displaced_English||r.legacy_English).text;if(u.displacedEnglish!==legacy||legacy!==o.en)throw Error('Retained English drift');
   if(!equal(u.qualifications,r.qualifications))throw Error('Current qualification drift');
   for(const q of u.qualifications){notes++;if(q.owner!==owner||!['after_pair','after-pair'].includes(q.placement)||typeof q.text!=='string'||!q.text)throw Error('Qualification owner/placement');}
  });
 }
 if(ids.size!==41||d.units.length!==41||notes!==33)throw Error('Complete current inventory');
 return d;
}
export function ranges(text,query){
 // Matching is derived; UTF-16 boundaries point back to exact original strings.
 // No normalization, point removal, whitespace collapse or replacement of source.
 if(!query)return [];const out=[];let start=0;const hay=text.toLowerCase(),needle=query.toLowerCase();if(hay.length!==text.length||needle.length!==query.length)return [];
 for(;;){const i=hay.indexOf(needle,start);if(i<0)break;out.push([i,i+query.length]);start=i+query.length;}return out;
}
export function fullBodyPayload(d,owners){
 if(!owners.length||new Set(owners).size!==owners.length)throw Error('Ambiguous payload owners');
 const units=owners.map(owner=>{const all=d.units.filter(u=>u.owner===owner);if(all.length!==1)throw Error('Unknown owner');return all[0];});
 const content=d.notice+'\n\n'+units.map(u=>'Original owner '+u.owner+'\n\nPrimary supplied he\n'+u.he+'\n\nIndependently supplied he_nikud\n'+u.he_nikud+'\n\nSelected qualified English\n'+u.en+'\n\n'+u.qualifications.map(q=>'REQUIRED QUALIFICATION — '+q.owner+' / '+q.id+'\n'+q.text).join('\n\n')).join('\n\n')+'\n\nSource: https://ajew.org'+ROUTE;
 return {schema:'qualified-full-body-payload/v1',projection_sha256:PIN,owners:[...owners],content,source:ROUTE,requiredQualifications:units.flatMap(u=>u.qualifications),sourceUnits:units};
}
export function appendLegacyCollection(raw,entry){
 const d=raw===null?{sections:[]}:JSON.parse(raw);if(!d||typeof d!=='object'||Array.isArray(d)||!Array.isArray(d.sections))throw Error('Invalid legacy collection');
 const existing=d.sections.filter(s=>s.id===entry.id);if(existing.length){if(existing.length!==1||!equal(existing[0],entry))throw Error('Saved identity conflict');return raw;}d.sections.push(entry);return JSON.stringify(d);
}
