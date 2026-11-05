import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';
const require = createRequire(import.meta.url);
const { load } = require('cheerio');
const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), 'utf8');
const beforeTemplates = JSON.parse(gunzipSync(fs.readFileSync(new URL('scripts/fixtures/reader-audio/english/consumer-baselines.json.gz', root))));
const source = read('public/unified-audio.js');
const original = read('scripts/fixtures/reader-audio/english/served-unified-audio.js');
const served = read('scripts/fixtures/reader-audio/english/served-reader.html');
const voice = (lang='en-US',name='Device English') => ({lang,name});
const fixture = (body='<p>First English paragraph.</p><div>Second body outside a paragraph.</div>') => `<div class="reader-container"><div id="audio-controls"><button id="audio-btn-en"></button><button id="audio-btn-he"></button><div id="audio-panel-he"></div><div id="audio-panel-en"><strong>English Audio</strong><button id="en-btn-play"></button><button id="en-btn-ryan"></button><button id="en-btn-guy"></button><button id="en-btn-connor"></button><div id="en-progress"><div id="en-progress-bar"></div></div></div></div><button id="btn-listen"></button><div class="segment-en"><span class="segment-number">I:51:1</span>${body}</div><audio></audio></div>`;
function setup({html=fixture(),code=source,voices=[voice()],unsupported=false,throwSpeak=false,syncError=null}={}) {
  const $=load(html), wrappers=new WeakMap(),events={},wevents={},timers=new Map(),spoken=[],canceled=[],callbacks=[];
  let clock=0,tid=0;
  function wrap(node) {
    if(!node)return null;if(wrappers.has(node))return wrappers.get(node);
    const el={node,style:{display:$(node).css("display")||""},disabled:false,tagName:(node.name||'').toUpperCase(),
      get textContent(){return $(node).text();},set textContent(v){$(node).text(v);},
      get id(){return $(node).attr('id');},set id(v){$(node).attr('id',v);},
      classList:{contains:k=>$(node).hasClass(k),add:k=>$(node).addClass(k),remove:k=>$(node).removeClass(k)},
      setAttribute:(k,v)=>$(node).attr(k,v),getAttribute:k=>$(node).attr(k),
      querySelector:s=>wrap($(node).find(s).get(0)),querySelectorAll:s=>$(node).find(s).toArray().map(wrap),
      appendChild:e=>{if(e.node)$(node).append(e.node);else $(node).append($.text?e.text:e.text);return e;},
      cloneNode:()=>wrap($(node).clone().get(0)),remove:()=>$(node).remove(),
      closest:s=>wrap($(node).closest(s).get(0)),
      addEventListener:(type,cb)=>{callbacks.push({node,type,cb});},
      pause:()=>{el.pauses=(el.pauses||0)+1;}
    };wrappers.set(node,el);return el;
  }
  const document={getElementById:id=>wrap($('#'+id).get(0)),querySelectorAll:s=>$(s).toArray().map(wrap),
    createElement:tag=>wrap($(`<${tag}></${tag}>`).get(0)),createTextNode:text=>({text}),
    addEventListener:(k,cb)=>(events[k]||=[]).push(cb)};
  const synth={getVoices:()=>voices,speak:u=>{if(throwSpeak)throw Error('blocked');spoken.push(u);if(syncError)u.onerror?.({error:syncError});},
    pause:()=>{},resume:()=>{},cancel:()=>{canceled.push(true);},addEventListener:(k,cb)=>(events[k]||=[]).push(cb)};
  const window={speechSynthesis:unsupported?undefined:synth,SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},
    addEventListener:(k,cb)=>(wevents[k]||=[]).push(cb)};
  const context=vm.createContext({document,window,SpeechSynthesisUtterance:window.SpeechSynthesisUtterance,
    setTimeout:(fn,ms)=>{timers.set(++tid,{fn,at:clock+ms});return tid;},clearTimeout:id=>timers.delete(id),console});
  vm.runInContext(code,context,{filename:'unified-audio.js'});
  const dispatch=(key,target)=>{for(const cb of events[key]||[])cb({target});};
  function tick(ms){clock+=ms;for(const [id,t] of [...timers])if(t.at<=clock){timers.delete(id);t.fn();}}
  return {window,document,synth,spoken,canceled,timers,tick,dispatch,events,wevents,context,$,
    setVoices:v=>{voices=v;dispatch('voiceschanged');},
    status:()=>document.getElementById('en-read-aloud-status')?.textContent||'',
    play:()=>window.enTogglePlay(),stop:()=>window.enStop(),
    finish:()=>{let guard=0;while(spoken.length && guard++<10000){const u=spoken.at(-1),n=spoken.length;u.onstart?.();u.onend?.();if(spoken.length===n)break;}assert.ok(guard<10000);}};
}
test('original served initializer reproduces long unchunked speech and silent engine error',()=>{
 const s=setup({html:served,code:original});s.play();assert.equal(s.spoken.length,1);assert.ok(s.spoken[0].text.length>1000);
 assert.equal(s.spoken[0].onerror,undefined);assert.equal(s.spoken[0].voice,undefined);
 assert.equal(s.document.getElementById('en-btn-play').textContent,'⏹ Stop');
});
test('original selector omits current non-paragraph English body',()=>{
 const s=setup({code:original});assert.equal(s.window.enGetText(),'First English paragraph.');
});
test('complete initializer conserves full served English bodies in bounded chunks',()=>{
 const s=setup({html:served});const texts=s.window.enGetTexts();assert.equal(texts.length,s.$('.reader-container .segment-en').filter((_,el)=>s.$(el).closest('.reader-content-original, .reader-content-aligned').css('display')!=='none').length);
 assert.ok(texts.join('').includes('But one who drinks salty waters'));assert.ok(!texts.join('').includes('I:51:1'));
 const expected=s.window.enGetText();s.play();s.finish();assert.equal(s.spoken.map(u=>u.text).join(''),expected);
 assert.ok(s.spoken.length>1);assert.ok(s.spoken.every(u=>u.text.length<=181 && /^en/.test(u.lang)&&u.voice));
 assert.match(s.status(),/finished/);assert.equal(s.timers.size,0);
});
test('selector includes direct text, lists and paragraphs, excluding controls and missing translations',()=>{
 const html=fixture('Direct body<p>Paragraph.</p><ul><li>List item.</li></ul><button>Copy</button>')+'<div class="segment-en">FOREIGN</div>';
 const s=setup({html});const t=s.window.enGetText();for(const v of ['Direct body','Paragraph.','List item.'])assert.ok(t.includes(v));
 for(const v of ['Copy','FOREIGN','I:51:1'])assert.ok(!t.includes(v));
 const e=setup({html:fixture('Translation not yet available')});e.play();assert.equal(e.spoken.length,0);assert.match(e.status(),/No English translation/);
});
test('empty-translation and empty body never enter playing state',()=>{
 for(const html of [fixture(''),fixture('Missing').replace('class="segment-en"','class="segment-en empty-translation"')]){
 const s=setup({html});s.play();assert.equal(s.spoken.length,0);assert.match(s.status(),/No English/);}
});
test('unsupported engine initializes with meaningful message and usable controls',()=>{
 const s=setup({unsupported:true});s.play();assert.match(s.status(),/not supported/);assert.equal(s.spoken.length,0);s.window.enSetVoice('guy');
});
test('voice wait is finite, canceled wait cannot start speech, empty events do not claim readiness',()=>{
 const s=setup({voices:[]});s.play();assert.match(s.status(),/Loading/);s.setVoices([]);assert.match(s.status(),/Loading/);s.tick(5001);assert.match(s.status(),/No English/);
 s.play();s.play();s.setVoices([voice()]);assert.equal(s.spoken.length,0);assert.match(s.status(),/stopped/);
});
test('delayed voices require fresh user tap, English preference selects actual device voice',()=>{
 const s=setup({voices:[]});s.play();s.setVoices([voice('he-IL'),voice('en-US'),voice('en-GB','British')]);
 assert.match(s.status(),/Tap Play/);assert.equal(s.spoken.length,0);s.play();assert.equal(s.spoken[0].voice.name,'British');
 s.window.enSetVoice('guy');s.play();assert.equal(s.spoken.at(-1).lang,'en-US');
});
test('non-English-only voices are explained; unavailable dialect falls back to English',()=>{
 const s=setup({voices:[voice('he-IL')]});s.play();assert.match(s.status(),/No English voice/);assert.equal(s.spoken.length,0);
 s.setVoices([voice('en-AU')]);s.play();assert.equal(s.spoken[0].lang,'en-AU');
});
test('pause/resume replays only current chunk and stale cancellation callbacks cannot advance',()=>{
 const s=setup({html:fixture('<p>'+('English words. '.repeat(70))+'</p>')});s.play();const old=s.spoken[0];s.play();old.onerror({error:'canceled'});old.onend();
 assert.match(s.status(),/Paused/);assert.equal(s.spoken.length,1);s.play();assert.equal(s.spoken[1].text,old.text);old.onend();assert.equal(s.spoken.length,2);
 s.stop();s.spoken[1].onend();assert.equal(s.spoken.length,2);assert.match(s.status(),/stopped/);
});
test('errors and thrown speak restore retry; synchronous errors have handlers installed first',()=>{
 for(const options of [{syncError:'not-allowed'},{throwSpeak:true},{}]){
 const s=setup(options);s.play();if(!options.syncError&&!options.throwSpeak)s.spoken[0].onerror({error:'network'});
 assert.match(s.status(),/retry/);assert.equal(s.document.getElementById('en-btn-play').textContent,'Play English read-aloud');assert.equal(s.timers.size,0);
 }
 const s=setup();s.play();s.spoken[0].onerror({error:'audio-busy'});s.play();assert.equal(s.spoken.length,2);
});
test('silent engine startup timeout restores retry without a stuck Stop button',()=>{
 const s=setup();s.play();s.tick(10001);assert.match(s.status(),/did not start/);s.spoken[0].onend();assert.equal(s.spoken.length,1);
});
test('language controls remain intact, Hebrew opener, recorded audio, Listen and pagehide coordinate',()=>{
 const s=setup();s.play();let opened=0;s.window.openAjewAudioPlayer=()=>opened++;s.window.toggleAudio('he');assert.equal(opened,1);assert.match(s.status(),/stopped/);
 s.play();s.dispatch('play',s.document.querySelectorAll('audio')[0]);assert.match(s.status(),/recorded audio/);
 s.play();s.dispatch('click',s.document.getElementById('btn-listen'));assert.match(s.status(),/stopped/);
 s.play();s.wevents.pagehide[0]();assert.match(s.status(),/stopped/);
 assert.ok(s.document.querySelectorAll('audio')[0].pauses>=1);
});
test('long unpunctuated and supplementary characters are conserved, page sessions do not leak',()=>{
 const a=setup({html:fixture('<div>'+('X'.repeat(370))+'😀'+('Y'.repeat(200))+'</div>')});a.play();a.finish();assert.equal(a.spoken.map(u=>u.text).join(''),a.window.enGetText());
 assert.ok(a.spoken.every(u=>u.text.length<=181));const b=setup({html:fixture('<p>Different page.</p>')});b.play();b.finish();assert.equal(b.spoken.map(u=>u.text).join(''),'Different page.');
});
test('every actual unified consumer is cache versioned with exact inverse source conservation',()=>{
 const consumers=JSON.parse(read('scripts/fixtures/reader-audio/english/consumers.json'));assert.ok(consumers.length>=30);
 for(const p of consumers){const before=Buffer.from(beforeTemplates[p], 'base64').toString('utf8'),after=read(p);
 let conserved=after.replaceAll('/unified-audio.js?v=english-device-20261105-r1"','/unified-audio.js"');
 if(p==='src/pages/reader/sefer-hamidos/[part]/[torah].astro'){
   // Invert only the separately approved availability guard; historical audio baselines remain fixed.
   const approved="const commentaryEntry = torahData && fs.existsSync(path.join(process.cwd(), 'public', lnUrl.slice(1))) ? {";
   assert.equal(conserved.split(approved).length,2,`${p}: expected exactly one approved commentary availability guard`);
   conserved=conserved.replace(approved,'const commentaryEntry = torahData ? {');
 }
 if(p==='src/pages/reader/likutay-halachos/[part]/[torah].astro'){
   // Adopt only the reviewed LH publication island and its aid navigation.
   // The original audio fixture and all other consumer bytes remain fixed.
   const adoption=JSON.parse(read('scripts/fixtures/lh5-reader/approved-template-delta.json'));
   assert.equal(adoption.path,p);
   for(const change of adoption.inverse){
     assert.ok(change.after.length>0);
     assert.equal(conserved.split(change.after).length,2,`${p}: expected exactly one approved LH delta`);
     conserved=conserved.replace(change.after,change.before);
   }
 }
 assert.equal(conserved,before,p);
 assert.ok(!/src="\/unified-audio\.js"/.test(after),p);}
 assert.equal(read('public/tts-fix.js'),read('scripts/fixtures/reader-audio/english/served-tts-fix.js'));
});

test('active or paused legacy Listen is not canceled or left with stale Resume state',()=>{
 const s=setup();s.$('#btn-listen').addClass('active').text('Resume');const before=s.canceled.length;s.play();
 assert.match(s.status(),/Listen control is already active/);assert.equal(s.canceled.length,before);assert.equal(s.spoken.length,0);
 s.$('#btn-listen').removeClass('active').text('Listen');s.play();assert.equal(s.spoken.length,1);
});
test('original unsupported engine throws while candidate reports the problem',()=>{
 const s=setup({code:original,unsupported:true});assert.throws(()=>s.play(),/speak/);
});
test('legacy tts-fix full initializer cannot patch private Reader functions and only reschedules',()=>{
 const pending=[];const context=vm.createContext({window:{},document:{readyState:'complete'},setTimeout:(fn,ms)=>pending.push({fn,ms}),console});
 vm.runInContext(read('public/tts-fix.js'),context);assert.equal(pending.length,1);pending.shift().fn();assert.equal(pending[0].ms,200);
 assert.equal(vm.runInContext('typeof speakSegments',context),'undefined');
 const reader=read('public/reader-script.js');assert.ok(reader.includes('(function() {'));assert.ok(!reader.includes('window.speakSegments'));
});
test('real cache-first SW honors changed query keys after old runtime is warmed',async()=>{
 const listeners={},store=new Map(),network=[];const origin='https://ajew.org';
 store.set(origin+'/unified-audio.js',new Response(original));
 const cache={match:async req=>store.get(typeof req==='string'?req:req.url),put:async(req,value)=>store.set(req.url,value),addAll:async()=>{}};
 const context=vm.createContext({self:{location:{origin},addEventListener:(k,fn)=>listeners[k]=fn},caches:{match:cache.match,open:async()=>cache},
 URL,Response,fetch:async req=>{network.push(req.url);return new Response(source);}});
 vm.runInContext(read('scripts/fixtures/reader-audio/english/sw.js'),context);
 let response;const req=url=>({url:origin+url,method:'GET',headers:{get:()=>null}});
 listeners.fetch({request:req('/unified-audio.js'),respondWith:p=>response=p});assert.equal(await (await response).text(),original);assert.equal(network.length,0);
 listeners.fetch({request:req('/unified-audio.js?v=english-device-20261105-r1'),respondWith:p=>response=p});assert.equal(await (await response).text(),source);assert.equal(network.length,1);
});

// Exact real keyboard/toggle/stop function bodies; speech/scroll endpoints alone
// are doubled. No synthetic keyboard shortcut or fabricated legacy state machine.
function installLegacy(s) {
 const reader=read('public/reader-script.js');
 const between=(a,b)=>reader.slice(reader.indexOf(a),reader.indexOf(b,reader.indexOf(a)));
 const code=between('  function setupKeyboard() {','  function toggleShortcuts() {')+
   between('  function toggleSpeaking() {','  // --- Related Teachings ---');
 vm.runInContext(`var speechSynthesis=window.speechSynthesis;
 var ttsState={speaking:false,paused:false,currentSeg:0},ttsVoicesReady=true,ttsErrorCount=0;
 var state={searchOpen:false,tocOpen:false,fullscreen:false};
 function isPrayerReader(){return false;} function closeShortcuts(){}
 function highlightSegment(){} function speakSegments(){speechSynthesis.speak(new window.SpeechSynthesisUtterance('Legacy Listen body'));}
 ${code}
 setupKeyboard();`,s.context);
 return key=>{for(const cb of s.events.keydown||[])cb({key,target:{tagName:'BODY'}});};
}
test('idle English Stop and Hebrew opener preserve real keyboard-started legacy Listen',()=>{
 for(const opener of [true,false]){
  const s=setup(),key=installLegacy(s);key('l');
  if(opener)s.window.openAjewAudioPlayer=()=>{};
  const before=s.canceled.length;s.stop();s.window.toggleAudio('he');
  assert.equal(s.canceled.length,before,'idle English must not cancel legacy speech');
  assert.equal(vm.runInContext('ttsState.speaking',s.context),true);
  assert.ok(s.$('#btn-listen').hasClass('active'));key('l');
  assert.equal(vm.runInContext('ttsState.paused',s.context),true);
 }
});
test('paused English Resume refuses actual l-key legacy Listen start and pause',()=>{
 for(const pauseLegacy of [false,true]){
  const s=setup(),key=installLegacy(s);s.play();s.play();key('l');if(pauseLegacy)key('l');
  const before=s.canceled.length,n=s.spoken.length;s.play();
  assert.equal(s.canceled.length,before,'Resume must not cancel legacy speech');
  assert.equal(s.spoken.length,n,'Resume must not queue English over legacy speech');
  assert.match(s.status(),/Listen control is already active/);
  key('Escape');s.play();assert.equal(s.spoken.length,n+1);
 }
});
test('waiting and paused English relinquish without canceling foreign speech',()=>{
 const waiting=setup({voices:[]});const key=installLegacy(waiting);waiting.play();key('l');
 const before=waiting.canceled.length;waiting.tick(5001);assert.equal(waiting.canceled.length,before);
 const paused=setup();const key2=installLegacy(paused);paused.play();paused.play();key2('l');
 const before2=paused.canceled.length;paused.stop();assert.equal(paused.canceled.length,before2);
});
test('voice wait non-English event and idle pagehide never cancel legacy speech',()=>{
 const s=setup({voices:[]}),key=installLegacy(s);s.play();key('l');const before=s.canceled.length;
 s.setVoices([voice('he-IL')]);assert.equal(s.canceled.length,before);assert.match(s.status(),/No English voice/);
 s.wevents.pagehide[0]();assert.equal(s.canceled.length,before);
});

test('actual original/aligned consumer wrappers select one English representation, never both',()=>{
 const page=read('src/pages/reader/likutay-tefilos/[part]/[torah].astro');
 assert.ok(page.includes('reader-content-original'));assert.ok(page.includes('reader-content-aligned'));
 for(const aligned of [false,true]){
  const body=`<div class="reader-content-original" style="display:${aligned?'none':'contents'}"><div class="segment-en"><p>Original complete English.</p></div></div><div class="reader-content-aligned" style="display:${aligned?'block':'none'}"><div class="segment-en"><p>Aligned complete English.</p></div></div>`;
  const s=setup({html:fixture('').replace('<audio>',body+'<audio>')});
  assert.equal(s.window.enGetText(),aligned?'Aligned complete English.':'Original complete English.');
 }
});

test('real l-key Listen start takes ownership before playing English can cancel it later',()=>{
 const s=setup(),key=installLegacy(s);s.play();const old=s.spoken[0];key('l');
 assert.match(s.status(),/stopped/);const before=s.canceled.length;old.onend();s.tick(10001);
 assert.equal(s.canceled.length,before);assert.equal(s.spoken.length,2);
 assert.equal(vm.runInContext('ttsState.speaking',s.context),true);
});
