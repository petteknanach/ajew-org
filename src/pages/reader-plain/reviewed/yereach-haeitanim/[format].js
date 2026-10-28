import {loadEdition,plainExport} from '../../../../lib/qualified-yereach-haeitanim.mjs';
export const prerender=true;
export function getStaticPaths(){return ['txt','md','json'].map(format=>({params:{format:'index.'+format}}));}
export async function GET({params}){
 const format={'index.txt':'txt','index.md':'md','index.json':'json'}[params.format];
 if(!format)return new Response('Not found',{status:404});
 return new Response(plainExport(await loadEdition(),format),{status:200,headers:{'Content-Type':{txt:'text/plain',md:'text/markdown',json:'application/json'}[format]+'; charset=utf-8','X-Robots-Tag':'noindex, nofollow'}});
}
