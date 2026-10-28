import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {PIN,ASSET,SOURCE_PREFIX,authenticateEdition,fullBodyPayload,historyEntries,displayEnglish,recordLabel} from '../../public/qualified-yereach-haeitanim-core.js';
export {PIN,displayEnglish,recordLabel};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export async function loadEdition(root=process.cwd()){
 const raw=await fs.readFile(path.join(root,'public',ASSET));
 return authenticateEdition(raw,a=>fs.readFile(path.join(root,'public',SOURCE_PREFIX,a.name)),sha);
}
export const escape=s=>{if(typeof s!=='string')throw Error('Non-text outward field');return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');};
export function historyHTML(u){return '<details class="qualified-history" data-owner-history="'+u.owner+'"><summary>Earlier English — kept for comparison</summary>'+historyEntries(u).map(e=>'<section><h4>'+escape(e.label)+'</h4>'+(e.href?'<a data-history-field="'+e.key+'" href="'+escape(e.href)+'">'+escape(e.text)+'</a>':'<p data-history-field="'+e.key+'">'+escape(e.text)+'</p>')+'</section>').join('')+'</details>';}
export function plainExport(d,format){const p=fullBodyPayload(d,d.units.map(u=>u.owner));if(format==='json')return JSON.stringify({title:d.title,notice:d.notice,scope:d.scope,...p},null,2)+'\n';if(format==='txt')return d.title+'\n\n'+p.content+'\n';if(format==='md')return '# '+d.title+'\n\n'+p.content+'\n';throw Error('Unsupported reading format');}
