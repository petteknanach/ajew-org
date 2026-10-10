import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {setImmediate as immediate} from 'node:timers/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as core from '../src/lib/search-mode-core.mjs';
import {displayBookLabel} from '../src/lib/search-book-labels.mjs';
import {qualifiedSearchAnchor} from '../src/lib/qualified-search-arrival.mjs';

// Execute actual full page init and event/continuation callers. Imports are
// supplied unchanged; append read-only observations, never replace helpers.
const require = createRequire(import.meta.url);
const {parseFragment} = require('parse5');
const {transformSync} = require('esbuild');
const sourcePath = process.env.SEARCH_EXTRA_INFO_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
const script = readFileSync(sourcePath, 'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'actual page script required');
const normalizeBlock = script.slice(script.indexOf('      function normalizeForSearch'), script.indexOf('      const EN_STOP_WORDS'));
const fixtureNormalize = vm.runInNewContext(normalizeBlock + ';normalizeForSearch');
const withoutImports = script.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
const end = withoutImports.lastIndexOf('    });');
assert.ok(end > 0);
const observed = withoutImports.slice(0, end) + `
      window.probe = {state: () => ({activeSearchRequest, activeContinuation, lastSearchResults, jevPCount}), render: displayResults};
` + withoutImports.slice(end);
const code = transformSync(observed, {loader: 'ts', target: 'es2022'}).code;
const settle = async () => { for (let i = 0; i < 200; i++) await Promise.resolve(); };
async function waitCards(h, count) { const until = Date.now()+4000; while (h.cards() !== count && Date.now()<until) await immediate(); assert.equal(h.cards(),count,'bounded wait for actual card write'); }
class Element {
  constructor(hidden = false) {
    this.handlers = new Map(); this.children = []; this.style = {}; this.value = '';
    this.textContent = ''; this._html = ''; this.disabled = false;
    const classes = new Set(hidden ? ['hidden'] : []);
    this.classList = {add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c)};
  }
  addEventListener(type, fn) { this.handlers.set(type, fn); }
  fire(type, event = {}) { return this.handlers.get(type)?.call(this, event); }
  set innerHTML(value) { this._html = value; this.children = []; }
  get innerHTML() { return this._html; }
  appendChild(child) { this.children.push(child); return child; }
  querySelectorAll() { return []; }
  scrollIntoView() {}
}
const response = value => ({ok: true, status: 200, json: async () => value});
function harness({count = 1, doc, transport = (_id, _attempt, doc) => response(doc)} = {}) {
  const els = Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels','searchForm'].map(id => [id, new Element(['loading','resultsContainer','noResults'].includes(id))]));
  els['search-book-labels'].textContent = JSON.stringify(LABELS);
  const events = new Map(), calls = [], errors = [], timers = new Map(), attempts = new Map();
  let timerId = 0, bodyCalls = 0;
  const ids = Array.from({length: count}, (_, id) => id);
  const meta = {generatedAt: 'fixture-version', items: ids.map(id => ({p: '/reader/fixture/' + id}))};
  const shard = Object.fromEntries(fixtureNormalize(doc.n || '').split(' ').filter(Boolean).map(word => [word, ids]));
  const fetch = async (url, opts = {}) => {
    const path = String(url).split('?')[0]; calls.push({url: String(url), path, opts});
    if (path === '/reader-search/meta.json') return response(meta);
    if (path.startsWith('/reader-search/shards/')) return response(shard);
    if (path.includes('/letters/')) { const buffer = new ArrayBuffer(count * 4); const view = new DataView(buffer); ids.forEach((id, i) => view.setUint32(i * 4, id, true)); return {ok: true, arrayBuffer: async () => buffer}; }
    if (path.startsWith('/reader-search/docs/')) {
      const id = Number(path.match(/(\d+)\.json/)[1]);
      const attempt = (attempts.get(id) || 0) + 1; attempts.set(id, attempt);
      return transport(id, attempt, {...doc, p: count === 1 ? doc.p : '/reader/fixture/' + id});
    }
    throw new Error('unexpected fixture URL (providers forbidden): ' + path);
  };
  const window = {location: {origin: 'https://fixture.invalid', search: '?nojev=1', href: 'https://fixture.invalid/search-enhanced?nojev=1'}, history: {replaceState: (_, __, url) => { window.location.href = String(url); }}};
  const document = {querySelectorAll: () => [], dispatchEvent: event => events.get(event.type)?.(event), addEventListener: (type, fn) => { const old = events.get(type); events.set(type, event => { old?.(event); fn(event); }); }, getElementById: id => els[id] || null, createElement: () => new Element()};
  const ctx = vm.createContext({...core, displayBookLabel, qualifiedSearchAnchor, document, window, fetch, URL, URLSearchParams, AbortController, TextEncoder, DataView, CustomEvent: class {constructor(type, opts) {this.type = type; this.detail = opts.detail;}}, queueMicrotask, localStorage: {getItem: () => null, setItem() {}}, navigator: {}, console: {warn() {}, error: (...args) => errors.push(args)}, setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn, ms}); return id; }, clearTimeout: id => timers.delete(id)});
  vm.runInContext(code, ctx, {filename: String(sourcePath)});
  const component = readFileSync(new URL('../src/components/EnhancedSearch.astro', import.meta.url), 'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  vm.runInContext(transformSync(component, {loader: 'ts', target: 'es2022'}).code, ctx);
  events.get('DOMContentLoaded')();
  for (const [id, timer] of timers) if (timer.ms === 0) { timers.delete(id); timer.fn(); }
  return {
    els, calls, errors, timers, attempts, window,
    nonOK: status => ({ok: false, status, json: async () => { bodyCalls++; throw new Error('nonOK body must not be consumed'); }}),
    bodyCalls: () => bodyCalls,
    search: (query, mode = 'google', order = 'consecutive') => { events.get('advanced-search-options')({detail: {searchType: mode, acronymOrder: order}}); els.searchInput.value = query; assert.ok(els.searchForm.handlers.has('submit')); els.searchForm.fire('submit', {preventDefault() {}}); },
    render: (results, query) => window.probe.render(results, query, results.length),
    clear: () => els.clearResults.fire('click'),
    more: () => els.resultsList.children.at(-1),
    state: () => window.probe.state(),
    cards: () => (els.resultsList.innerHTML.match(/class="result-item"/g) || []).length,
    docCalls: id => calls.filter(c => c.path === '/reader-search/docs/' + id + '.json'),
    tick300: () => { const ready = [...timers].filter(([, t]) => t.ms === 300); for (const [id, t] of ready) { timers.delete(id); t.fn(); } return ready.length; },
  };
}


// Source-faithful first mapped rows, bounded at their original end offsets.
const DOC1 = {"t": "Obstacles", "h": "מְנִיעוֹת", "c": "aitzoas-hamivooaroas", "p": "/reader/aitzoas-hamivooaroas/1/10", "en": "One must know that all kinds of obstacles that arise for a person, because of which he cannot fulfill the commandments of the Torah and strengthen himself in the service of Hashem properly—one must know that Hashem sends them so that he will prevail with greater longing and desire to fulfill the commandments and good deeds against which the obstacles arise. For such is the nature of a person: the more the obstacles increase, the more the desires and longings within him to fulfill the matter against which the obstacles arose intensify. Therefore, when a Jew comes to fulfill a commandment or a good deed, which are an eternal good for him, and particularly when he wishes to travel to a true Tzadik, upon which all his Jewishness depends—because through the journey to the Tzadik he strengthens himself greatly and merits all the good traits—then a strong will and very intense longing are necessary. Therefore Hashem brings upon him many obstacles, so that he will prevail over them and merit genuine closeness, which he can merit only through very great longing. Consequently, when the obstacles intensify, one must know that they were sent to him by Hashem, so that he will prevail over them to fulfill the commandment or the good deed with great longing, as stated above. And when he merits to prevail over the obstacles with longing and yearning, Hashem then assists him to break and nullify them, and he will be able to fulfill the commandment and the good deed; and in particular he will merit to actualize his drawing close to the true Tzadik, which is the foundation and root of Jewishness, as explained in this section.", "he": "צריך לדעת כי כל מיני מניעות שמתעוררות אצל האדם, שבגללן אינו יכול לקים את מצוות התורה ולהתחזק בעבודת ה' כראוי, יש לדעת כי השם יתברך שולח אותן, בכדי שיתגבר ביתר חשק ורצון לקיום המצוות והמעשים טובים שכנגדן מתעוררות המניעות. כי כך הוא טבעו של אדם, שככל שמתרבות המניעות, כן מתגברים בו הרצונות והכסופים לקים את הדבר שנגדו התעוררו המניעות. על כן, כאשר אדם מישראל בא לקים מצוה או מעשה טוב, שהם טובה נצחית עבורו, ובפרט כשחפץ לנסע לצדיק אמתי, שבזה תלוי כל יהדותו, משום שעל ידי הנסיעה לצדיק, מתחזק הוא מאד וזוכה לכל המדות טובות, אזי צריך רצון חזק וחשק עז מאד. על כן מזמין לו השם יתברך מניעות רבות כדי שיתגבר עליהן ויזכה להתקרבות אמתית, שלזה יכול לזכות רק על ידי חשק גדול מאד. לזאת צריך לדעת בהתגברות המניעות, כי הללו נשלחו אליו מאתו יתברך, כדי שיתגבר עליהן לקים את המצוה או המעשה הטוב בחשק גדול כמובא למעלה. וכאשר הוא זוכה להתגבר בחשק וכסופים על המניעות, אזי השם יתברך מסיעו לשבר אותן ולבטלן, ויוכל לקים את המצוה והדבר הטוב ובפרט יזכה להוציא לפעל את התקרבותו לצדיק האמת, שזה יסוד ושרש היהדות, כמבאר בסעיף זה:", "m": [[1, 1, 0, 997, 0, 1634]]};
const LM = {"t": "Ashray Temeemay Durech", "h": "אשרי תמימי דרך", "c": "likutay-moharan", "p": "/reader/likutay-moharan/1/1", "en": "Likutay Moharan 1:1 קי\"ט:א / Psalms 119:1): Happy are those whose way is perfect, who walk in the Torah of Hashem. The verse from Tehillim that opens this teaching: those who live a whole and straight life, walking with Hashem's Torah, are truly happy. The Rebbe will now show how Torah brings real grace and favor to a Jew's every need — in heaven and on earth. K", "he": "אשרי תמימי דרך ההולכים בתורת ה (תהלים קי''ט). הפסוק הפותח — שאלו שדרכם שלמה והולכים בתורת ה' הם המאושרים האמתיים. הרבי יגלה כאן כיצד התורה ממשיכה חן וחשיבות לכל מה שהיהודי צריך — ברוחניות ובגשמיות.", "m": [[1, 1, 0, 197, 0, 364]]};
const LABELS = {"aitzoas-hamivooaroas": "Aitzoas HaMivooaroas (Elucidated Advice) · עצות המבוארות", "likutay-moharan": "Likutay Moharan · ליקוטי מוהר\"ן", "hazard-label": "Book <b>title</b> &amp; \"quoted\" · עברית"};

// Preserve supplied typed m rows; normalization only builds synthetic postings.
const prepared = doc => ({...doc, n: fixtureNormalize([doc.t,doc.h,doc.en,doc.he].join(' ')), m: doc.m || []});
const attr = (n,k) => n.attrs?.find(a=>a.name===k)?.value;
const kids = n => n.childNodes || [];
const all = n => [n,...kids(n).flatMap(all)];
const cls = (n,c) => (attr(n,'class') || '').split(' ').includes(c);
const text = n => n.nodeName==='#text' ? n.value : kids(n).map(text).join('');
let receiptId=0;
function inspect(h,count,label) {
  const html=h.els.resultsList.innerHTML, cards=all(parseFragment(html)).filter(n=>cls(n,'result-item'));
  if(process.env.TEST_EVIDENCE_DIR){mkdirSync(process.env.TEST_EVIDENCE_DIR,{recursive:true});writeFileSync(process.env.TEST_EVIDENCE_DIR+'/'+(++receiptId)+'-'+label+'.html',html);}
  assert.equal(cards.length,count);
  const raw=h.state().lastSearchResults.slice(0,count); assert.equal(raw.length,count);
  const records=cards.map((card,i)=>{
    const r=raw[i], nodes=all(card), badge=nodes.find(n=>cls(n,'result-match-info')), cat=nodes.find(n=>cls(n,'result-subcategory'));
    const expected=r.extraInfo || '', expectedCat=displayBookLabel(r.subcategory || r.book || '',LABELS);
    // Receipt is emitted BEFORE assertions, preserving genuine baseline failures.
    const record={label,index:i,rawExtraInfo:expected,text:badge && text(badge),descendants:badge && all(badge).slice(1).filter(n=>n.tagName).map(n=>n.tagName),category:cat && text(cat),rawResult:r};
    console.log(JSON.stringify(record));
    assert.equal(!!badge,!!expected,'empty badge omission');
    if(badge) {assert.equal(text(badge),expected,'badge literal plaintext equality'); assert.equal(all(badge).slice(1).some(n=>n.tagName),false,'badge has no element descendants');}
    assert.equal(!!cat,!!expectedCat); if(cat){assert.equal(text(cat),expectedCat,'subcategory escape exactly once');assert.equal(all(cat).slice(1).some(n=>n.tagName),false);}
    const a=nodes.find(n=>n.tagName==='h4').childNodes.find(n=>n.tagName==='a'), he=all(a).find(n=>cls(n,'result-he-title'));
    assert.equal(kids(a).filter(n=>n!==he).map(text).join(''),(r.title || 'Unknown')+(r.hebrewTitle?' ':''));
    if(he) assert.equal(text(he),r.hebrewTitle);
    const snippet=nodes.find(n=>cls(n,'result-snippet')), share=nodes.find(n=>cls(n,'share-btn')), view=nodes.find(n=>cls(n,'view-link'));
    assert.equal(text(snippet),r.snippet || '');
    assert.equal(attr(share,'data-share-title'),r.title || 'Unknown'); assert.equal(attr(share,'data-share-snippet'),r.snippet || '');
    assert.equal(attr(share,'data-share-link'),attr(a,'href'));assert.equal(attr(view,'href'),attr(a,'href'));
    assert.ok(attr(a,'href').startsWith((r.link || '#').split('#')[0]));
    for(const field of [a,snippet]) for(const n of all(field)){if(n===field || n===he || n.nodeName==='#text')continue; assert.equal(n.tagName,'mark');assert.equal(n.attrs.length,0);}
    record.marks=all(snippet).filter(n=>n.tagName==='mark').map(text);return record;
  });
  assert.equal(h.errors.length,0);assert.equal(h.calls.some(c=>c.path.includes('jev')),false);
  return records;
}
async function searched(doc,query,opts={}){const h=harness({doc:prepared(doc),...opts});h.search(query,opts.mode,opts.order);await waitCards(h,opts.count?50:1);return h;}
test('GENUINE doc1 first mapped row via initialized component submit/page listener',async()=>{
 const h=await searched(DOC1,'obstacles');const r=inspect(h,1,'genuine-doc1')[0];assert.equal(r.rawExtraInfo,'Paragraph 1');assert.equal(r.category,LABELS[DOC1.c]);assert.match(r.rawResult.link,/#seg-1$/);assert.ok(r.marks.some(x=>x.toLowerCase()==='obstacles'));
});
test('GENUINE LM4146 first mapped row and approved catalog label',async()=>{
 const h=await searched(LM,'Happy');const r=inspect(h,1,'genuine-LM')[0];assert.equal(r.rawExtraInfo,'Likutay Moharan I:1:1');assert.equal(r.category,LABELS[LM.c]);assert.match(r.rawResult.link,/#seg-1$/);
});
test('GENUINE pointed Hebrew title and mapped Hebrew source slice',async()=>{
 const h=await searched(DOC1,'מניעות');const r=inspect(h,1,'genuine-he')[0];assert.equal(r.rawResult.hebrewTitle,DOC1.h);assert.equal(r.rawExtraInfo,'Paragraph 1');
});
test('SYNTHETIC normalized letter words discard delimiters before Found',async()=>{
 const h=await searched({t:'Alpha beta',h:'בַּ',en:'<b>alpha</b> &amp; beta',p:'/reader/fixture/0',c:'ordinary'},'ab',{mode:'acronym',order:'any'});const r=inspect(h,1,'normalized-Found')[0];assert.equal(r.rawExtraInfo,'Found: alpha ... beta');assert.deepEqual(r.marks,['alpha','beta']);
});
test('SYNTHETIC fallback category hazard through actual producer',async()=>{
 const h=await searched({t:'alpha',h:'בַּ',en:'alpha',p:'/reader/fixture/0',c:'<b>badge</b> &amp; "quote"'},'alpha');inspect(h,1,'producer-hazard');
});
// These invoke the actual renderer AFTER full page and component init, not submit producers.
const cases=[
 ['literal-angles','Literal <b>badge</b> & tea','alpha', 'alpha'],
 ['literal-entities','&amp; &lt;b&gt; &quot; &#39;','alpha','alpha'],
 ['literal-quotes','"double" and \'single\' <x> &','alpha','alpha'],
 ['closing-span','</span><img src=x onerror="bad()">','alpha','alpha'],
 ['ordinary','Paragraph 7','alpha','Alpha alpha'],
 ['Found-empty','Found:','alpha','Alpha alpha'],
 ['Found-normal','Found: alpha ... beta','AB','Alpha alpha beta'],
 ['empty-omission','','alpha','alpha'],
 ['catalog-escape-once','Paragraph 1','alpha','alpha'],
];
for(const [label,extraInfo,query,snippet] of cases)test('SYNTHETIC renderer-after-init '+label,()=>{
 const h=harness({doc:prepared(DOC1)}), r={title:'Alpha <b> &amp; "title"',hebrewTitle:'ב\u05BC\u05B7 &amp;',snippet,link:'/reader/fixture/0#seg-1',extraInfo,subcategory:label==='empty-omission'?'':'hazard-label',relevance:85};
 const before=JSON.stringify(r);h.state().lastSearchResults.push(r);h.render([r],query);const rows=inspect(h,1,label);assert.equal(JSON.stringify(r),before,'raw result/ranking fields unmutated');
 if(label==='Found-normal')assert.deepEqual(rows[0].marks,['alpha','beta']);
 if(label==='Found-empty')assert.deepEqual(rows[0].marks,['Alpha','alpha']);
});
test('SYNTHETIC async continuation and cached expansion same sink/order/raw fields',async()=>{
 const h=await searched({t:'alpha',h:'בַּ',en:'alpha',p:'/reader/fixture/0',c:'<b>badge</b> &amp;'},'alpha',{count:120});inspect(h,50,'initial');assert.equal(h.state().activeContinuation.cursor,96);
 await h.more().fire('click');await waitCards(h,100);inspect(h,100,'async');assert.equal(h.state().activeContinuation,null);const calls=h.calls.length, before=JSON.stringify(h.state().lastSearchResults);
 await h.more().fire('click');await waitCards(h,120);inspect(h,120,'cached');assert.equal(h.calls.length,calls);assert.equal(JSON.stringify(h.state().lastSearchResults),before);
});
