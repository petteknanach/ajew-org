#!/usr/bin/env node
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {boot,sources,days}=require('./verify-chok-verse-breslov.cjs');
const root=path.resolve(__dirname,'..');
const policy=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/breslov-reading-notes.json'),'utf8'));
test('Breslov presents only exact source-bound reader notes; no production chatter, all bodies remain',async()=>{
 const run=await boot('נח','יום שישי',false);
 try{
  const d=run.d,weekly=d.querySelector('.ck-breslov');weekly.open=true;
  assert(!weekly.textContent.includes('This passage includes printed punctuation and vowel signs.'));
  assert(!weekly.textContent.includes('original character encoding'));
  assert(!weekly.querySelector('[data-note-id="C-P074-01::qualification::/qualifications/3"]'));
  for(const n of weekly.querySelectorAll('[data-note-id]')){
   const p=policy.notes.find(q=>q.id===n.getAttribute('data-note-id'));
   assert(p&&p.readerText!==null);assert.equal(n.querySelector('[data-note-text]').textContent,p.readerText);
  }
  assert(weekly.querySelector('[data-note-id="C-P074-01::qualification::/qualifications/1"]').textContent.includes('your place'));
  assert.equal(weekly.querySelectorAll('[data-pair-id]').length,sources[0].units.reduce((n,u)=>n+u.pairs.length,0));
  for(const p of d.querySelectorAll('.ck-verse-breslov'))assert(!p.open);
 }finally{run.env.close();}
});
test('bonus Mishna explicitly says to finish the entire Mishna, qualified and ordinary schedule paths',async()=>{
 for(const [w,day] of [['נח','יום שישי'],['בראשית','יום שני']]){
  const run=await boot(w,day,false);
  try{const summaries=run.d.querySelectorAll('.ck-bonus summary');assert(summaries.length,w+' actual bonus');for(const s of summaries)assert(s.textContent.includes('To finish the entire Mishna'));for(const b of run.d.querySelectorAll('.ck-bonus'))assert(!b.open);}finally{run.env.close();}
 }
});
test('reading-note policy rejects missing, foreign, drifted, duplicate and undispositioned rows',async()=>{
 const run=await boot('לך לך','יום ראשון',false);
 try{
  const api=run.env.box.window.ChokVerseBreslov;
  const projection=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/lech-lichuh-breslov-projections.json'),'utf8'));
  const selected=await api.validate(sources[1],projection,true);
  const fresh=()=>api.present(selected,structuredClone(policy));
  await fresh();
  const mutations=[p=>p.notes.pop(),p=>p.notes[49].owner='foreign',p=>p.notes[49].pair_id='foreign',p=>p.notes[49].sourceTextSHA256='bad',p=>p.notes[49].projectionSHA256='bad',p=>{const n=p.notes.find(q=>q.portion==='Lech'&&q.readerText);n.readerText+=' drift';},p=>{p.notes[50]=structuredClone(p.notes[49]);},p=>delete p.notes[49].readerText];
  for(const mutate of mutations){const p=structuredClone(policy);mutate(p);await assert.rejects(async()=>api.present(selected,p));await fresh();}
 }finally{run.env.close();}
});
