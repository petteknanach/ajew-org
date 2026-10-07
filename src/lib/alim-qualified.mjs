/* Exact bounded edition adapter. Saved-text acceptance is not publication. */
import crypto from 'node:crypto';
export const PIN='0cb13fcaea47bd382b80609aaca9d0509bb0a05d6af2c1c3b2da83bf313d1b2e';
export const ROUTE='/reader/alim-litrufa/reviewed/part-2-17-62-63/';
export const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
export function validate(raw,wrappers,oracle,{checksums=true,wrapperOracle}={}) {
 if(!checksums&&!wrapperOracle)throw Error('Checksum-disabled fixtures require independent complete wrapper oracle');
 if(wrapperOracle&&JSON.stringify(wrappers)!==JSON.stringify(wrapperOracle))throw Error('Complete wrapper descriptor/owner/order/type drift');
 if(checksums&&sha(raw)!==PIN)throw Error('Raw source drift');
 const d=typeof raw==='string'?JSON.parse(raw):JSON.parse(raw.toString('utf8'));
 // The separately authenticated full descriptor oracle binds exact type, order,
 // owner, scope, pointer, IDs and hashes even in checksum-disabled negative tests.
 if(JSON.stringify(d)!==JSON.stringify(oracle))throw Error('Exact projection/descriptor relationship drift');
 if(JSON.stringify(d.letters.map(l=>l.letter))!=='[17,62,63]')throw Error('Render group scope');
 let count=0,notes=0,pairs=0,fields=0,archive=0;const ids=new Set();
 for(const l of d.letters) {
  const w=wrappers[l.letter];if(!w||w.letter!==l.letter)throw Error('Wrapper letter relationship');
  const r=w.candidate.reader_candidate;
  if(r.part!==2||r.torah!==l.letter||r.segments.length!==l.segments.length)throw Error('Reader/group relationship');
  for(const s of l.segments) {
   const row=r.segments[s.position];if(s.owner_letter!==l.letter||!row||row.index!==s.index)throw Error('Paragraph/render owner');
   const unit=`al-2-${l.letter}-p${s.position}`;
   if(ids.has(unit))throw Error('Duplicate owner');ids.add(unit);count++;
   if(row.en!==s.selected_en||sha(s.selected_en)!==s.selected_en_sha256)throw Error('English binding');fields++;
   for(const f of s.source_fields){if(f.present){fields++;if(row[f.field]!==f.text||sha(f.text)!==f.sha256)throw Error('Hebrew field binding');}else if(row[f.field]!=null||f.text!==null||f.sha256!==null)throw Error('Absent witness fabricated');}
   const selected=w.candidate.pairs.filter(p=>p.position===s.position);pairs+=selected.length;
   if(JSON.stringify(selected.map(p=>p.id))!==JSON.stringify(s.pair_ids))throw Error('Span owner/order');
   if(selected.map(p=>p.he).join('')!==row.he)throw Error('Primary span conservation');
   // Pair English separators are editorial body assembly, not inferred witness alignment.
   for(const p of selected){if(p.index!==s.index||p.reader_path!==`public/reader/alim-litrufa/part-2/letter-${l.letter}.json`)throw Error('Span grouping');}
   for(const [i,q] of s.qualification_occurrences.entries()){
    notes++;fields++;if(q.owner_letter!==l.letter||q.owner_position!==s.position||q.ordinal!==i||q.qualification.placement!=='after_original_segment'||(q.qualification.owner_position!=null&&q.qualification.owner_position!==s.position))throw Error('Qualification ownership/placement');
    if(sha(q.qualification.text)!==q.text_sha256||JSON.stringify(w.original_segment_provenance[s.position].reader_facing_provenance[i])!==JSON.stringify(q.qualification))throw Error('Qualification provenance descriptor');
   }
  }
  archive+=l.archival_apparatus.length+l.complete_archival_english_witness_nodes.length;
 }
 if(count!==27||pairs!==65||notes!==98||fields!==168||archive!==81)throw Error('Complete inventory');
 return {data:d,counts:{paragraphs:count,spans:pairs,notes,primary_secondary_english_fields:fields-notes,archive_text_fields:archive,total_reader_fields:fields+archive}};
}
export function searchProjection(d) {
 const out=[];for(const l of d.letters)for(const s of l.segments){
  const base={owner:`al-2-${l.letter}-p${s.position}`,url:ROUTE+`#letter-${l.letter}-segment-${s.position}`,qualification_occurrences:s.qualification_occurrences};
  for(const [field,text] of [['he',s.source_fields.find(f=>f.field==='he').text],['en',s.selected_en]])out.push({...base,field,literal:text,search_text:text.replace(/\s+/gu,' ').trim(),normalization:'DERIVED SEARCH ONLY: whitespace collapse; literal source unchanged'});
 }return out;
}
export function plainProjection(d,wrappers) {
 const parts=['PRIVATE QUALIFIED CANDIDATE — complete Part 2 letters 17, 62, 63 only. Not a whole-book review; not human/source-owner/native-print/Jev/publication approval.'];
 for(const l of d.letters){parts.push(`LETTER 2/${l.letter}`);for(const s of l.segments){parts.push(`Owned original paragraph al-2-${l.letter}-p${s.position}`);for(const f of s.source_fields)parts.push(`${f.field} — ${f.present?'supplied independent witness':'ABSENT (not generated)'}`,f.present?f.text:'');parts.push('SELECTED ENGLISH',s.selected_en,'REQUIRED QUALIFICATIONS — after this owned original paragraph',...s.qualification_occurrences.map(q=>q.qualification.text));}
 parts.push('ARCHIVAL WITNESS NODES — source-node ownership only; no unsupported paragraph alignment; not selected translation or approved commentary');for(const n of l.complete_archival_english_witness_nodes)parts.push('History-only witness node '+n.ordinal,n.text,JSON.stringify({...n,text:undefined},null,2));parts.push('ARCHIVAL APPARATUS/HISTORY — actual declared owners; history-only / unapproved commentary');for(const a of l.archival_apparatus)parts.push('History-only / unapproved apparatus — actual owner '+a.owner,a.text,...(a.complete_prior_descriptor_json?[a.complete_prior_descriptor_json]:[]),JSON.stringify({...a,text:undefined,complete_prior_descriptor_json:undefined},null,2));parts.push('FULL SOURCE PROVENANCE/HISTORY WRAPPER — retained historical flags are not this edition approval',JSON.stringify(wrappers[l.letter],null,2));}
 return parts.join('\n\n');
}
