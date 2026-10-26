import {loadEdition} from './qualified-yimai-hatlaos.mjs';
export const PRIMARY='/reader/reviewed/yimai-hatlaos/';
export async function loadDirectory(root=process.cwd()){
 const d=await loadEdition(root);
 return {title:d.title,hebrewTitle:'ימי התלאות',url:PRIMARY,items:d.groups.map(g=>({number:g.section,displayNumber:g.section===1?'Intro':g.section===36?'Account':String(g.section-1),title:g.title,hebrewTitle:g.sourceTitle,url:PRIMARY+'#group-'+g.id}))};
}
