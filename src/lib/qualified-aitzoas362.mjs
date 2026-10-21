import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {ASSET,authenticateEdition,historyEntries,assertAudienceSafe,displayPlan} from '../../public/qualified-aitzoas362-core.mjs';
export {PIN} from '../../public/qualified-aitzoas362-core.mjs';
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function loadEdition(root=process.cwd(),readAsset=null){
 const read=readAsset??(name=>fs.readFile(path.join(root,'public',name)));
 return authenticateEdition(await read(ASSET.slice(1)),a=>read(a.name),sha);
}
export const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
export function historyHTML(r){return '<details data-owner-history="'+r.owner+'"><summary>Earlier translation</summary>'+historyEntries(r).map(e=>'<section><h4>'+escape(e.label)+'</h4>'+(e.href?'<a data-history-field="'+e.key+'" href="'+escape(e.href)+'">'+escape(e.text)+'</a>':'<p data-history-field="'+e.key+'">'+escape(e.text)+'</p>')+'</section>').join('')+'</details>';}
export function noteHTML(r,english=true){return displayPlan(r,{english}).notes.map(q=>'<p data-note-id="'+q.id+'" data-owner="'+r.owner+'">'+escape(q.text)+'</p>').join('');}
export {assertAudienceSafe};
