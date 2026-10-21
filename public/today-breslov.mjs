import {MONTHS,HEBREW_MONTHS,fromGregorian,toGregorian,moveDay,hebrewNumber,matchesDay,todayDate} from './today-breslov-calendar.mjs?v=20261021-1';
const kinds={teaching:['Teaching','תורה'],letter:['Letter','מכתב'],yahrzeit:['Yahrzeit','יום פטירה'],decree:['Decree','גזירה'],history:['History','מאורע'],other:['Other','אחר']};
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pair=(en,he)=>`<span lang="en">${escapeHTML(en)}</span> <span lang="he" dir="rtl">${escapeHTML(he)}</span>`;
const formatCivil=(iso,lang)=>new Intl.DateTimeFormat(lang,{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(new Date(iso+'T12:00:00Z'));
function sourceURL(url){try{const u=new URL(url,'https://ajew.org');return u.protocol==='https:'?u.href:'#';}catch{return '#';}}
export function eventHTML(event){
 const year=event.year,converted=year?toGregorian(year,event.month,event.day):null;
 const yearEN=year?String(year):'Year not recorded',yearHE=year?hebrewNumber(year):'השנה לא נרשמה';
 const civilEN=converted?formatCivil(converted,'en'):year?'Civil date unresolved':'Civil date unknown';
 const civilHE=converted?formatCivil(converted,'he'):year?'התאריך הלועזי לא הוכרע':'התאריך הלועזי אינו ידוע';
 return `<article class="tb-card" data-event-id="${escapeHTML(event.id)}"><div class="tb-kind">${pair(...(kinds[event.kind]||kinds.other))}</div><h3>${pair(event.title.en,event.title.he)}</h3><p class="tb-event-date">${pair(`${event.day} ${event.month} ${yearEN} · ${civilEN}`,`${hebrewNumber(event.day)} ${HEBREW_MONTHS[event.month]||''} ${yearHE} · ${civilHE}`)}</p><div class="tb-pair"><p lang="en">${escapeHTML(event.description.en)}</p><p lang="he" dir="rtl">${escapeHTML(event.description.he)}</p></div>${event.dateNote?`<p class="tb-small">${pair(event.dateNote.en,event.dateNote.he)}</p>`:''}<div class="tb-sources">${event.sources.map(s=>`<a href="${escapeHTML(sourceURL(s.url))}">${pair(s.label.en,s.label.he)} ↗</a>`).join('')}</div>${event.sources.some(s=>s.quoteHe)?`<details><summary>${pair('Date in the source','התאריך במקור')}</summary>${event.sources.filter(s=>s.quoteHe).map(s=>`<blockquote lang="he" dir="rtl" data-source-original>${escapeHTML(s.quoteHe)}</blockquote>`).join('')}</details>`:''}</article>`;
}
export async function init(doc=document){
 const root=doc.getElementById('today-breslov');if(!root||root.dataset.ready)return;root.dataset.ready='loading';
 const $=id=>doc.getElementById('tb-'+id);
 // Keep the existing calendar and its listeners/preferences, but clear the reading area.
 const widget=doc.getElementById('compactYahrzeit'),dock=$('utilities');
 if(widget&&dock&&typeof dock.appendChild==='function')dock.appendChild(widget);
 let registry=null,followingToday=true,location={latitude:31.778,longitude:35.235,timeZone:'Asia/Jerusalem'},place=['Jerusalem','ירושלים'],sequence=0,intent=0,lastCards='',timer=null;
 const url=new URL(window.location.href);
 let selected=todayDate(new Date(),location).iso,browseKey='';
 const supported=iso=>{try{fromGregorian(iso);return iso>='1600-01-01'&&iso<='2199-12-31';}catch{return false;}};
 if(supported(url.searchParams.get('date'))){selected=url.searchParams.get('date');followingToday=false;}
 const requested=url.searchParams.get('month')+'|'+url.searchParams.get('day'),mode=url.searchParams.get('lang');
 function modeLabel(en,he){return root.dataset.mode==='he'?he:root.dataset.mode==='en'?en:`${en} / ${he}`;}
 function updateOptions(){
  for(const option of $('kind').options||[]){const labels=option.value==='all'?['Everything','הכל']:kinds[option.value]||kinds.other;option.textContent=modeLabel(...labels);}
  if(!registry){$('browse').innerHTML=`<option value="">${escapeHTML(modeLabel('Choose','בחירה'))}</option>`;return;}
  const dates=new Map();for(const e of registry.events){const k=e.month+'|'+e.day;dates.set(k,(dates.get(k)||0)+1);}
  $('browse').innerHTML=`<option value="">${escapeHTML(modeLabel('Choose','בחירה'))}</option>`+[...dates].sort(([a],[b])=>MONTHS.indexOf(a.split('|')[0])-MONTHS.indexOf(b.split('|')[0])||Number(a.split('|')[1])-Number(b.split('|')[1])).map(([k,n])=>{const[m,d]=k.split('|');return `<option value="${escapeHTML(k)}">${escapeHTML(modeLabel(`${d} ${m}`,`${hebrewNumber(Number(d))} ${HEBREW_MONTHS[m]}`))} (${n})</option>`;}).join('');
  $('browse').value=browseKey;
 }
 function setMode(value){root.dataset.mode=value;root.querySelectorAll('.tb-modes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===value)));updateOptions();}
 setMode(['en','he','both'].includes(mode)?mode:'both');
 root.querySelectorAll('.tb-modes button').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);saveURL();}));
 function saveURL(){const u=new URL(window.location.href);for(const key of ['date','month','day'])u.searchParams.delete(key);if(!followingToday&&!browseKey)u.searchParams.set('date',selected);if(browseKey){const [month,day]=browseKey.split('|');u.searchParams.set('month',month);u.searchParams.set('day',day);}u.searchParams.set('lang',root.dataset.mode||'both');history.replaceState(null,'',u);}
 function render(){
  const current=todayDate(new Date(),location);if(followingToday)selected=current.iso;
  const date=browseKey?{month:browseKey.split('|')[0],day:Number(browseKey.split('|')[1]),year:null}:fromGregorian(selected);
  $('date').value=selected;$('date').disabled=!!browseKey;
  $('prev').disabled=!!browseKey||selected==='1600-01-01';$('next').disabled=!!browseKey||selected==='2199-12-31';
  $('hebrew').textContent=`${hebrewNumber(date.day)} ${HEBREW_MONTHS[date.month]}${date.year?' '+hebrewNumber(date.year):''}`;
  $('gregorian').innerHTML=browseKey?pair(`${date.day} ${date.month} · All registered years`,`${hebrewNumber(date.day)} ${HEBREW_MONTHS[date.month]} · כל השנים הרשומות`):pair(formatCivil(selected,'en')+` · ${date.year}`,formatCivil(selected,'he')+` · ${date.year}`);
  const boundary=browseKey?['Showing this Hebrew day and month in every registered year.','מציג יום וחודש עבריים אלה בכל השנים הרשומות.']:!followingToday?['Historical browsing uses the daytime date; its Hebrew day begins the evening before.','בעיון היסטורי מוצג תאריך שעות היום; היום העברי מתחיל בערב שלפניו.']:current.sunset===null?['No local sunset on this date; showing the civil-day Hebrew date.','אין שקיעה מקומית בתאריך זה; מוצג התאריך העברי לפי היום האזרחי.']:current.afterSunset?['After sunset — the new Hebrew day has begun. The civil date above is its daytime date.','לאחר השקיעה — היום העברי החדש כבר התחיל. התאריך הלועזי לעיל הוא תאריך שעות היום שלו.']:['The Hebrew day changes at local sunset.','היום העברי מתחלף בשקיעה המקומית.'];
  $('boundary').innerHTML=pair(...boundary);$('place').innerHTML=pair(...place);
  if(!registry)return;
  const all=registry.events.filter(e=>matchesDay(e,date));
  const filtered=all.filter(e=>$('kind').value==='all'||e.kind===$('kind').value).sort((a,b)=>(a.year??9999)-(b.year??9999)||a.id.localeCompare(b.id));
  $('status').innerHTML=pair(`${filtered.length} registered event${filtered.length===1?'':'s'}${filtered.length!==all.length?' of '+all.length:''}`,`${filtered.length} מאורעות רשומים${filtered.length!==all.length?' מתוך '+all.length:''}`);
  const cards=filtered.length?filtered.map(eventHTML).join(''):`<div class="tb-empty">${pair(all.length?'No events of this type on this Hebrew date. Choose Everything to see the other events.':'No events registered for this Hebrew date yet. Choose another date or a registered Hebrew date above.',all.length?'לא נרשמו מאורעות מסוג זה בתאריך העברי הזה. בחרו הכל כדי לראות את שאר המאורעות.':'עדיין לא נרשמו מאורעות בתאריך העברי הזה. אפשר לבחור יום אחר או תאריך עברי רשום למעלה.')}</div>`;
  if(cards!==lastCards){$('events').innerHTML=cards;lastCards=cards;}
  if(date.month==='Adar I'||date.month==='Adar II')$('status').innerHTML+=' · '+pair('Unspecified Adar entries are included with their original label','רשומות אדר שלא פורט בו החודש מוצגות בתוויתן המקורית');
  $('events').setAttribute('aria-busy','false');root.dataset.ready='true';
 }
 function choose(iso){if(!supported(iso))return;intent++;selected=iso;followingToday=false;browseKey='';$('browse').value='';render();saveURL();}
 $('date').addEventListener('change',()=>choose($('date').value));
 $('prev').addEventListener('click',()=>{if(!browseKey)choose(moveDay(selected,-1));});$('next').addEventListener('click',()=>{if(!browseKey)choose(moveDay(selected,1));});
 $('today').addEventListener('click',()=>{intent++;followingToday=true;browseKey='';$('browse').value='';render();saveURL();});$('kind').addEventListener('change',render);
 $('browse').addEventListener('change',()=>{intent++;browseKey=$('browse').value;followingToday=false;render();saveURL();});
 $('location').addEventListener('click',()=>{
  if(!navigator.geolocation){$('location-status').innerHTML=pair('Location is unavailable; using Jerusalem.','המיקום אינו זמין; משתמש בירושלים.');return;}
  $('location-status').innerHTML=pair('Locating…','מאתר מיקום…');
  navigator.geolocation.getCurrentPosition(pos=>{location={latitude:pos.coords.latitude,longitude:pos.coords.longitude,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone};place=['Your location','המיקום שלך'];$('location-status').innerHTML='';render();},()=>{$('location-status').innerHTML=pair('Location was not available; keeping Jerusalem.','המיקום לא התקבל; נשאר לפי ירושלים.');},{timeout:10000,maximumAge:300000});
 });
 async function load(){
  const ticket=++sequence,initialIntent=intent;$('error').hidden=true;$('retry').hidden=true;$('events').setAttribute('aria-busy','true');
  try{
   const response=await fetch('/data/today-breslov-events.json?v=20261021-1');if(!response.ok)throw new Error('HTTP '+response.status);const data=await response.json();
   const bilingual=x=>x&&typeof x.en==='string'&&x.en.length>0&&typeof x.he==='string'&&x.he.length>0;
   if(!Array.isArray(data.events)||data.events.some(e=>!e.id||!MONTHS.includes(e.month)||!Number.isInteger(e.day)||e.day<1||e.day>30||!(e.year===null||Number.isInteger(e.year)&&e.year>=4000&&e.year<=7000)||!bilingual(e.title)||!bilingual(e.description)||!Array.isArray(e.sources)||!e.sources.length||e.sources.some(s=>!s||typeof s.url!=='string'||!bilingual(s.label))||e.dateNote&&!bilingual(e.dateNote)))throw new Error('Invalid event registry');
   if(ticket!==sequence)return;registry=data;
   if(intent===0&&intent===initialIntent&&registry.events.some(e=>e.month+'|'+e.day===requested)){browseKey=requested;followingToday=false;}
   updateOptions();$('coverage').innerHTML=pair(`${registry.events.length} registered events`,`${registry.events.length} מאורעות רשומים`);render();
  }catch(error){if(ticket!==sequence)return;root.dataset.ready='error';$('status').textContent='';$('events').setAttribute('aria-busy','false');$('error').innerHTML=pair('The event register could not be loaded. Please try again.','לא ניתן לטעון את מאגר המאורעות. נסו שוב.');$('error').hidden=false;$('retry').hidden=false;}
 }
 $('retry').addEventListener('click',load);render();await load();
 const refresh=()=>{if(followingToday)render();};
 const startTimer=()=>{if(timer===null)timer=setInterval(refresh,60000);};
 startTimer();window.addEventListener('pagehide',()=>{if(timer!==null)clearInterval(timer);timer=null;});
 window.addEventListener('pageshow',()=>{refresh();startTimer();});doc.addEventListener('visibilitychange',()=>{if(!doc.hidden)refresh();});
}
if(typeof document!=='undefined')init();
