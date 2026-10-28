import {loadEdition} from './qualified-yereach-haeitanim.mjs';
export const PRIMARY='/reader/reviewed/yereach-haeitanim/';
export async function loadDirectory(root=process.cwd()){const d=await loadEdition(root);return {title:d.title,hebrewTitle:'ירח האיתנים',url:PRIMARY,items:d.groups.map(g=>({number:g.section,displayNumber:g.section===1?'Intro':String(g.section-1),title:g.title,hebrewTitle:g.sourceTitle,url:PRIMARY+'#group-'+g.id}))};}
