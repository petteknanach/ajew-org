import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {PIN,ASSET,SOURCE_PREFIX,authenticateEdition,fullBodyPayload,historyEntries} from '../../public/qualified-sichos-231240-core.mjs';
export {PIN};
export async function loadEdition(root=process.cwd()){
 const raw=await fs.readFile(path.join(root,'public',ASSET));
 return authenticateEdition(raw,a=>fs.readFile(path.join(root,'public',SOURCE_PREFIX,a.name)),b=>crypto.createHash('sha256').update(b).digest('hex'));
}
export const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
export function historyHTML(u){return '<details class="qualified-history" data-owner-history="'+u.owner+'"><summary>Earlier English and native comparison history — not the current translation</summary>'+historyEntries(u).map(e=>'<section><h4>'+escape(e.label)+'</h4>'+(e.href?'<a data-history-field="'+e.key+'" href="'+escape(e.href)+'">'+escape(e.text)+'</a>':'<p data-history-field="'+e.key+'">'+escape(e.text)+'</p>')+'</section>').join('')+'</details>';}
export function plainExport(d,format){
 const payload=fullBodyPayload(d,d.units.map(u=>u.owner));
 if(format==='json')return JSON.stringify({title:d.title,notice:d.notice,scope:d.scope,...payload},null,2)+'\n';
 if(format==='txt')return d.title+'\n\n'+payload.content+'\n';
 if(format==='md')return '# '+d.title+'\n\n'+payload.content+'\n';
 if(format==='html')return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+escape(d.title)+'</title><style>body{max-width:72rem;margin:auto;padding:1rem;font:18px/1.65 system-ui;color:#111;background:#fff}p{white-space:pre-wrap;overflow-wrap:anywhere}article{border-top:1px solid #888;margin-top:2rem}.source-notes{border-top:1px solid #bbb}a{overflow-wrap:anywhere}@media print{p{color:black;background:white}}</style></head><body><h1>'+escape(d.title)+'</h1><p>'+escape(d.notice)+'</p>'+d.units.map(u=>'<article id="'+u.anchor+'"><h2>Teaching '+u.section+', paragraph '+u.source_index+'</h2><h3>Supplied Hebrew</h3><p lang="he" dir="rtl" data-source-field="he">'+escape(u.he)+'</p><h3>Supplied pointed Hebrew</h3><p lang="he" dir="rtl" data-source-field="he_nikud">'+escape(u.he_nikud)+'</p><h3>English</h3><p data-source-field="en">'+escape(u.en)+'</p><section class="source-notes"><h3>Source notes</h3>'+u.qualifications.map(q=>'<p data-qualification="'+q.id+'">'+escape(q.text)+'</p>').join('')+'</section>'+historyHTML(u).replace('<details','<section').replace(/<summary>.*?<\/summary>/,'<h3>Historical comparison — not current English or independent authority</h3>').replace('</details>','</section>')+'</article>').join('')+'<p>Source: <a href="https://ajew.org'+payload.source+'/">'+escape(d.title)+'</a></p></body></html>';
 throw Error('Unsupported qualified format');
}
