import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as cal from '../public/today-breslov-calendar.mjs';
import {init,eventHTML,escapeHTML} from '../public/today-breslov.mjs';
const registry=JSON.parse(fs.readFileSync(new URL('../public/data/today-breslov-events.json',import.meta.url)));
test('historical and present Hebrew dates round-trip without a service',()=>{
 for(const [iso,year,month,day] of [['1810-10-16',5571,'Tishrei',18],['2026-10-21',5787,'Cheshvan',10],['2024-03-24',5784,'Adar II',14],['2024-02-23',5784,'Adar I',14]]){assert.deepEqual(cal.fromGregorian(iso),{year,month,day});assert.equal(cal.toGregorian(year,month,day),iso);}
 for(let year=1750;year<2100;year+=7)for(let month=1;month<=12;month++){const iso=`${year}-${String(month).padStart(2,'0')}-15`,h=cal.fromGregorian(iso);assert.equal(cal.toGregorian(h.year,h.month,h.day),iso);}
});
test('invalid dates and leap months are never silently rolled forward',()=>{assert.throws(()=>cal.fromGregorian('2026-02-30'));assert.throws(()=>cal.fromGregorian('x'));assert.equal(cal.toGregorian(5785,'Adar I',14),null);assert.equal(cal.toGregorian(5784,'Adar',14),null);assert.equal(cal.toGregorian(5787,'Nisan',31),null);assert.equal(cal.toGregorian(null,'Nisan',1),null);});
test('sunset boundary and midnight remain on the intended Hebrew day',()=>{const iso='2026-10-21',sunset=cal.sunsetUTC(iso,31.778,35.235);assert.ok(sunset>Date.parse(iso+'T13:00Z')&&sunset<Date.parse(iso+'T16:00Z'));assert.equal(cal.todayDate(new Date(sunset-1000)).iso,iso);assert.equal(cal.todayDate(new Date(sunset+1000)).iso,'2026-10-22');assert.equal(cal.todayDate(new Date('2026-10-21T23:00Z')).iso,'2026-10-22');assert.equal(cal.todayDate(new Date('2026-10-22T04:00Z')).iso,'2026-10-22');assert.equal(cal.sunsetUTC('2026-06-21',89,0),null);});
test('Adar ambiguities retain the source label, without assigning an invented year',()=>{assert.ok(cal.matchesDay({month:'Adar',day:14},{month:'Adar II',day:14}));assert.ok(!cal.matchesDay({month:'Adar I',day:14},{month:'Adar II',day:14}));assert.ok(!cal.matchesDay({month:'Adar',day:13},{month:'Adar II',day:14}));assert.ok(!cal.hebrewNumber(15).includes('יה'));assert.ok(!cal.hebrewNumber(16).includes('יו'));});
test('real registry cards preserve bilingual descriptions and exact source evidence',()=>{assert.ok(registry.events.length>0);for(const event of registry.events){const html=eventHTML(event);assert.ok(html.includes(escapeHTML(event.description.he)));assert.ok(html.includes(escapeHTML(event.description.en)));assert.ok(html.includes('data-event-id="'+escapeHTML(event.id)+'"'));for(const s of event.sources)if(s.quoteHe)assert.ok(html.includes(escapeHTML(s.quoteHe)));}});
test('all injected content is escaped and dangerous source protocols cannot become links',()=>{const e=structuredClone(registry.events[0]);e.title.en='<img src=x onerror=alert(1)>';e.description.he='"<&';e.sources=[{url:'javascript:alert(1)',label:{en:'<b>x</b>',he:'מקור'},quoteHe:'<svg onload=x>'}];const html=eventHTML(e);assert.ok(!html.includes('<img'));assert.ok(!html.includes('href="javascript:'));assert.ok(html.includes('&lt;svg'));});
function fixture(href='https://ajew.org/today-in-breslov?date=2026-10-21'){
 class Element { constructor(id){this.id=id;this.value='';this.dataset={};this.hidden=false;this.writes=0;this._html='';this.textContent='';this.handlers={};this.attrs={};}get innerHTML(){return this._html;}set innerHTML(value){this._html=value;this.writes++;}addEventListener(type,fn){this.handlers[type]=fn;}setAttribute(k,v){this.attrs[k]=v;}querySelectorAll(){return modes;}}
 const elements=new Map(),modes=['both','en','he'].map(value=>{const e=new Element(value);e.dataset.mode=value;return e;});
 const doc={hidden:false,handlers:{},getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},addEventListener(type,fn){this.handlers[type]=fn;}};
 const root=doc.getElementById('today-breslov');root.dataset.mode='both';doc.getElementById('tb-kind').value='all';
 global.window={location:{href},handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};
 global.history={replaceState(a,b,url){window.location.href=String(url);}};
 return {doc,root,modes,$:id=>doc.getElementById('tb-'+id)};
}
test('full initialization, registry-driven browsing, filters, modes and navigation use real data',async()=>{
 const timer=global.setInterval;global.setInterval=()=>({unref(){}});const beforeFetch=global.fetch;
 try{global.fetch=async url=>{assert.equal(url,'/data/today-breslov-events.json?v=20261021-1');return {ok:true,json:async()=>registry};};const f=fixture();await init(f.doc);assert.equal(f.root.dataset.ready,'true');assert.equal(f.$('events').attrs['aria-busy'],'false');assert.ok(f.$('browse').innerHTML.includes('<option'));
 const e=registry.events.find(e=>e.month!=='Adar');f.$('browse').value=e.month+'|'+e.day;f.$('browse').handlers.change();assert.ok(f.$('events').innerHTML.includes('data-event-id="'+e.id+'"'));assert.equal(f.$('date').disabled,true);assert.ok(window.location.href.includes('month='));
 f.$('kind').value='never';f.$('kind').handlers.change();assert.ok(f.$('events').innerHTML.includes('No events of this type'));f.$('kind').value='all';f.$('kind').handlers.change();assert.ok(f.$('events').innerHTML.includes(e.id));
 f.modes[2].handlers.click();assert.equal(f.root.dataset.mode,'he');assert.equal(f.modes[2].attrs['aria-pressed'],'true');f.$('today').handlers.click();assert.equal(f.$('date').disabled,false);assert.equal(f.$('browse').value,'');f.$('next').handlers.click();assert.ok(window.location.href.includes('date='));f.$('date').value='';assert.doesNotThrow(()=>f.$('date').handlers.change());
 }finally{global.fetch=beforeFetch;global.setInterval=timer;}
});
test('full initialization handles real fetch failure and retry instead of an empty success',async()=>{const timer=global.setInterval;global.setInterval=()=>0;const before=global.fetch;try{let failed=true;global.fetch=async()=>{if(failed)throw new Error('network');return {ok:true,json:async()=>registry};};const f=fixture();await init(f.doc);assert.equal(f.root.dataset.ready,'error');assert.equal(f.$('error').hidden,false);assert.equal(f.$('retry').hidden,false);failed=false;await f.$('retry').handlers.click();assert.equal(f.root.dataset.ready,'true');assert.equal(f.$('error').hidden,true);}finally{global.fetch=before;global.setInterval=timer;}});
