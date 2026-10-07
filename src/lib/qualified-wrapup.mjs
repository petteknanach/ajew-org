import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {PIN,validateProjection} from '../../public/qualified-wrapup-core.mjs';
export {PIN};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function loadEdition(root=process.cwd()){
 const p=path.join(root,'public/reader/reviewed/wrapup-18-19-92-209.json'),raw=fs.readFileSync(p);if(sha(raw)!==PIN)throw Error('Current exact projection SHA drift');const data=JSON.parse(raw),loaded={};
 for(const a of data.assets){if(path.basename(a.name)!==a.name)throw Error('Asset traversal');const b=fs.readFileSync(path.join(path.dirname(p),'wrapup-sources',a.name));if(b.length!==a.bytes||sha(b)!==a.sha256)throw Error('Exact source/archival asset drift: '+a.name);if(a.name.endsWith('.json'))loaded[a.name]=JSON.parse(b);}
 validateProjection(data,loaded);return data;
}
export const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
