// Topic navigation is a projection, never a replacement source or owner namespace.
// All text, translations, notes, history, saved identities and source pins remain
// in the authenticated final-four edition. No import-time I/O or DOM effects.
import {requireEdition} from './qualified-aitzoas-runtime.js?v=29760feeb82d8d2d3ec1078b02e78a22ccb1d6145f1bf8f47b2e75947e0b508f';
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const must=(ok,msg)=>{if(!ok)throw Error(msg);};
export const TOPIC_STARTS=freeze([[8,'truth-and-faith'],[42,'eating'],[54,'land-of-israel'],[61,'covenant'],[69,'children'],[74,'trust'],[77,'garments'],[83,'pride-and-humility'],[92,'understanding'],[97,'speech'],[101,'secluded-personal-prayer'],[109,'strengthening-oneself'],[115,'g-dliness'],[118,'memory-and-forgetfulness'],[121,'midnight'],[124,'travel'],[126,'fear-and-service'],[131,'honor'],[133,'anger'],[137,'mockery'],[139,'money'],[151,'thoughts'],[155,'controversy'],[158,'obstacles'],[161,'ritual-bath'],[164,'festivals'],[184,'melody'],[186,'eyes'],[189,'counsel'],[195,'tzadik'],[214,'tzedakah'],[220,'tzitzis'],[224,'will'],[229,'joy'],[233,'torah-study'],[238,'prayer'],[253,'tefillin'],[257,'rebuke'],[260,'repentance'],[272,'wholeness-and-simplicity']]);
export const HEADER_IDS=freeze([62,63,193]);
export const APPARATUS=freeze([
 {slug:'front-matter',title:'Front matter',hebrewTitle:'פתיחה',start:1,end:7},
 {slug:'closing',title:'Closing',hebrewTitle:'סיום',start:280,end:281},
 {slug:'page-headers',title:'Retained inline source artifacts',hebrewTitle:'פריטי מקור נלווים שנשמרו',ids:HEADER_IDS},
 {slug:'source-appendix',title:'Repeated source witnesses — appendix',hebrewTitle:'נספח עדי נוסח חוזרים',start:282,end:366}
]);
const BASE='/reader/aitzoas-yeshuroas';
const cache=new WeakMap(),views=new WeakSet();
const letters={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ל:30,מ:40,נ:50,ס:60,ע:70,פ:80,צ:90,ק:100,ר:200,ש:300,ת:400};
export function printedNumber(he){const m=/^~?([א-ת]+)\.\s/u.exec(he);return m?freeze({he:m[1],decimal:[...m[1]].reduce((n,c)=>n+letters[c],0)}):null;}
export function topicStructure(d){
 requireEdition(d);if(cache.has(d))return cache.get(d);
 const topics=TOPIC_STARTS.map(([start,slug],i)=>{
  const end=(TOPIC_STARTS[i+1]?.[0]??280)-1,heading=d.rows[start-1];
  must(heading.stableIndex===start&&!printedNumber(heading.he),'Topic heading drift');
  const rows=d.rows.filter(r=>r.stableIndex>=start&&r.stableIndex<=end&&!HEADER_IDS.includes(r.stableIndex));
  let number=0;for(const r of rows.slice(1)){const n=printedNumber(r.he);must(n&&n.decimal===++number,'Original local teaching number drift');}
  return {slug,start,end,title:heading.en,hebrewTitle:heading.he,url:`${BASE}/topics/${slug}/`,headingOwner:heading.owner,rows,teachingCount:number,artifactIds:HEADER_IDS.filter(n=>n>=start&&n<=end)};
 });
 const byId={};
 for(const r of d.rows){
  const i=r.stableIndex,topic=topics.find(t=>i>=t.start&&i<=t.end),number=printedNumber(r.he);
  let kind=i<=7?'front-matter':i>=282?'repeated-witness':i>=280?'closing':HEADER_IDS.includes(i)?'page-header-artifact':i===topic?.start?'topic-heading':'teaching';
  const primary=i>=282?d.rows.find(x=>x.stableIndex<282&&x.he===r.he):null;
  if(i===283){kind='appendix-artifact';must(!primary,'Unique appendix artifact drift');}
  if(i>=282&&i!==283)must(primary,'Repeated Hebrew witness drift');
  const label=kind==='teaching'?`${topic.title} — ${number.he} (${number.decimal})`:kind==='topic-heading'?`${topic.hebrewTitle} — ${topic.title}`:kind==='page-header-artifact'?`Inline source artifact — source owner ${i}`:kind==='repeated-witness'?`Repeated witness — ${byId[primary.stableIndex].label}`:kind==='appendix-artifact'?'Retained appendix artifact — ט״ל':kind==='closing'?'Closing — '+(i===280?'תם ונשלם':'סליק ספר עצות ישרות'):'Front matter — '+({1:'Opening formula',2:'Divine Names',3:'Divine Name',4:'Book title',5:'Title page',6:'Introduction',7:'Introduction text'}[i]);
  const readingUrl=topic&&!HEADER_IDS.includes(i)?topic.url+`#seg-${i}`:BASE+'/apparatus/'+(i<=7?'front-matter':i>=282?'source-appendix':i>=280?'closing':'page-headers')+`/#seg-${i}`;
  byId[i]={owner:r.owner,stableIndex:i,sourceUrl:r.canonicalUrl,kind,topicSlug:topic?.slug??null,number,label,readingUrl,primaryOwner:primary?.owner??null,primaryIndex:primary?.stableIndex??null};
 }
 const s=freeze({topics,byId,apparatus:APPARATUS.map(a=>({...a,url:`${BASE}/apparatus/${a.slug}/`,rows:d.rows.filter(r=>a.ids?a.ids.includes(r.stableIndex):r.stableIndex>=a.start&&r.stableIndex<=a.end)}))});
 cache.set(d,s);return s;
}
export function ownerNavigation(d,index){const m=topicStructure(d).byId[index];must(m,'Unknown source owner');return m;}
export function projectionForPath(d,pathname){
 requireEdition(d);const s=topicStructure(d),p=pathname.replace(/\/$/,'');let item,key,previous=null,next=null,kind;
 const source=new RegExp('^'+BASE+'/1/([1-6])$').exec(p);
 if(source){const section=Number(source[1]);key='source-'+section;kind='source';item={title:`Retained source batch ${section}`,hebrewTitle:'ארכיון המקור',rows:d.rows.filter(r=>r.section===section),url:`${BASE}/1/${section}`,section};if(section>1)previous={title:`Source batch ${section-1}`,url:`${BASE}/1/${section-1}`};if(section<6)next={title:`Source batch ${section+1}`,url:`${BASE}/1/${section+1}`};}
 else if(p.startsWith(BASE+'/topics/')){const slug=p.slice((BASE+'/topics/').length),pos=s.topics.findIndex(t=>t.slug===slug);must(pos>=0,'Unknown topic route');item=s.topics[pos];key='topic-'+slug;kind='topic';previous=s.topics[pos-1]??s.apparatus[0];next=s.topics[pos+1]??s.apparatus[1];}
 else {const slug=p.startsWith(BASE+'/apparatus/')?p.slice((BASE+'/apparatus/').length):null;item=s.apparatus.find(a=>a.slug===slug);must(item,'Unknown Aitzoas route');key='apparatus-'+slug;kind='apparatus';if(slug==='front-matter')next=s.topics[0];if(slug==='closing')previous=s.topics.at(-1);}
 const notice=kind==='topic'?`${item.hebrewTitle} — ${item.title}. Original local teaching numbers are shown in Hebrew and decimal. Source owner IDs are stable references, not teaching numbers.`:kind==='source'?'Retained source batch: original owner order, including front matter, source artifacts and repeated witnesses. Use the Book Index for the non-repeating topic sequence.':'Separate source apparatus, not part of the primary teaching sequence. All source text, English, required notes and history are retained.';
 const v=freeze({key,kind,title:item.title,hebrewTitle:item.hebrewTitle,url:item.url,section:item.section??null,notice,rows:item.rows,labels:item.rows.map(r=>s.byId[r.stableIndex].label),artifactIds:item.artifactIds??[],previous,next});views.add(v);return v;
}
export function assertProjection(d,v,pathname,key){requireEdition(d);must(views.has(v),'Unauthenticated reading projection');const now=projectionForPath(d,pathname);must(now.key===v.key&&key===v.key&&now.rows.length===v.rows.length&&now.rows.every((r,i)=>r===v.rows[i]),'Route/topic ownership drift');return v;}
