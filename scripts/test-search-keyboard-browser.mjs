// Real Chromium tests against an actual Astro-compiled search page, not a DOM mock.
// SEARCH_URL=http://127.0.0.1:PORT/search-enhanced/ PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs
// SEARCH_EVIDENCE=/absolute/output.json node scripts/test-search-keyboard-browser.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.SEARCH_URL || 'http://127.0.0.1:4321/search-enhanced/';
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const results = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
// Never call optional AI services or analytics in a regression run.
// UI/event/URL tests do not claim corpus-result coverage. Abort corpus requests
// rather than synthesize search data or wait for thousands of unrelated docs.
await context.route(/google-analytics|googletagmanager|\/api\/|\/reader-search\/|\/data\/.*search/, r => r.abort());
await context.addInitScript(() => {
  window.__searchEvidence = { submits: [], searches: [], inputs: [], focus: [], errors: [] };
  document.addEventListener('submit', e => window.__searchEvidence.submits.push(e.submitter?.id || e.submitter?.className), true);
  document.addEventListener('enhanced-search', e => window.__searchEvidence.searches.push(JSON.parse(JSON.stringify(e.detail))), true);
  document.addEventListener('input', e => { if(e.target.id === 'searchInput') window.__searchEvidence.inputs.push({value:e.target.value, inputType:e.inputType, data:e.data}); }, true);
  for(const type of ['focusin','focusout']) document.addEventListener(type, e => window.__searchEvidence.focus.push({type,id:e.target.id,cls:e.target.className}), true);
});
const page = await context.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
async function open(query='') {
  await page.goto(url + query, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => !!window.enhancedSearch);
}
async function setup(value='אבגד', start=2, end=start) {
  await open();
  await page.locator('#hebKbToggle').click();
  await page.locator('#searchInput').fill(value);
  await page.locator('#searchInput').evaluate((el, p) => {el.focus(); el.setSelectionRange(p[0],p[1]); window.__searchEvidence.inputs=[]; window.__searchEvidence.focus=[];}, [start,end]);
}
async function state() {
  return page.evaluate(() => ({...window.__searchEvidence, value:searchInput.value, start:searchInput.selectionStart, end:searchInput.selectionEnd, active:document.activeElement.id || document.activeElement.className, open:getComputedStyle(hebKeyboard).display !== 'none', words:totalWordsCount.textContent, url:location.href}));
}
async function check(name, action) {
  try { const evidence=await action(); results.push({name,pass:true,evidence}); }
  catch(e) { results.push({name,pass:false,error:e.message,evidence:await state().catch(()=>null)}); }
}
try {
  for(const [name, selector, expected] of [
    ['letter at caret','.heb-key[data-char="ק"]','אבקגד'],
    ['space at caret','.heb-space','אב גד'],
    ['delete before caret','#hebDel','אגד'],
  ]) await check(name+' without submit, blur or collapse',async()=>{
    await setup(); await page.locator(selector).tap(); const s=await state();
    assert.equal(s.searches.length,0,'editing must not search'); assert.equal(s.submits.length,0,'editing must not submit');
    assert.equal(s.value,expected); assert.equal(s.start,name.startsWith('delete')?1:3); assert.equal(s.end,s.start);
    assert.equal(s.active,'searchInput'); assert.equal(s.focus.length,0,'pointer edit must not blur/refocus'); assert.equal(s.open,true);
    assert.equal(s.inputs.length,1,'one bubbling input per edit'); assert.equal(new URL(s.url).search,''); return s;
  });
  await check('selection replacement and input listeners',async()=>{
    await setup('אב גד',1,4); await page.locator('.heb-key[data-char="ק"]').click(); const s=await state();
    assert.equal(s.value,'אקד'); assert.equal(s.start,2); assert.equal(s.end,2); assert.equal(s.words,'1');
    assert.equal(s.inputs.length,1); assert.equal(s.inputs[0].inputType,'insertText'); return s;
  });
  await check('delete selection rather than final character',async()=>{
    await setup('אבגד',1,3); await page.locator('#hebDel').click(); const s=await state();
    assert.equal(s.value,'אד'); assert.equal(s.start,1); assert.equal(s.inputs.length,1); assert.equal(s.inputs[0].inputType,'deleteContentBackward'); return s;
  });
  await check('delete start is no-op',async()=>{
    await setup('אבגד',0); await page.locator('#hebDel').click(); const s=await state(); assert.equal(s.value,'אבגד'); assert.equal(s.start,0); assert.equal(s.inputs.length,0); return s;
  });
  for(const value of ['א😀ב','אשָׁב']) await check('delete complete previous grapheme '+value,async()=>{
    await setup(value,value.length-1); await page.locator('#hebDel').click(); const s=await state(); assert.equal(s.value,'אב'); assert.equal(s.start,1); return s;
  });
  await check('cancelable beforeinput is respected',async()=>{
    await setup(); await page.locator('#searchInput').evaluate(el=>el.addEventListener('beforeinput',e=>e.preventDefault(),{once:true}));
    await page.locator('.heb-space').click(); const s=await state(); assert.equal(s.value,'אבגד'); assert.equal(s.inputs.length,0); return s;
  });
  await check('Tab navigation and Enter/Space activation retain key focus',async()=>{
    await setup(); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    assert.equal(await page.locator('.heb-key').first().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Enter'); await page.keyboard.press('Space'); const s=await state();
    assert.equal(s.value,'אבקקגד'); assert.equal(s.searches.length,0); assert.equal(s.submits.length,0);
    assert.equal(await page.locator('.heb-key').first().evaluate(el=>el===document.activeElement),true); return s;
  });
  await check('toggle accessible expanded state follows visibility',async()=>{
    await open(); const t=page.locator('#hebKbToggle'); assert.equal(await t.getAttribute('aria-controls'),'hebKeyboard'); assert.equal(await t.getAttribute('aria-expanded'),'false');
    await t.press('Enter'); assert.equal(await t.getAttribute('aria-expanded'),'true'); await t.press('Space'); assert.equal(await t.getAttribute('aria-expanded'),'false'); return await state();
  });
  await check('composition Enter does not prematurely search (synthetic, not native IME proof)',async()=>{
    await setup(); await page.locator('#searchInput').evaluate(el=>{
      el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'א'}));
      el.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Enter',isComposing:true}));
      el.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key:'Enter',keyCode:229}));
      el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'א'}));
    }); const s=await state(); assert.equal(s.searches.length,0); return s;
  });
  for(const how of ['Enter','button']) await check('explicit '+how+' submits Hebrew query once',async()=>{
    await setup('שמחה ואמונה',11); if(how==='Enter') await page.locator('#searchInput').press('Enter'); else await page.locator('.search-button').click();
    const s=await state(); assert.equal(s.searches.length,1); assert.equal(s.searches[0].query,'שמחה ואמונה'); assert.equal(new URL(s.url).searchParams.get('q'),'שמחה ואמונה'); return s;
  });
  await check('query URL legacy proximity and Google cleanup',async()=>{
    await open('?q='+encodeURIComponent('בית ילדותו')+'&proximity=7');
    assert.equal(await page.locator('.mode-btn.active').getAttribute('data-mode'),'proximity');
    assert.equal(await page.locator('#proximityDistance').inputValue(),'7');
    await page.locator('.mode-btn[data-mode="google"]').click(); const s=await state();
    assert.equal(new URL(s.url).searchParams.has('proximity'),false); assert.equal(new URL(s.url).searchParams.has('searchType'),false); assert.equal(s.searches.at(-1).advancedOptions.searchType,'google'); return s;
  });
  for(const mode of ['google','exact','all','any','proximity','boolean','acronym','endletters','startsWith','endsWith']) await check('mode URL round-trip '+mode,async()=>{
    await open('?q='+encodeURIComponent('שמחה אמונה')+'&searchType='+mode+'&proximity=5&acronymOrder=any&minWords=2');
    assert.equal(await page.locator('.mode-btn.active').getAttribute('data-mode'),mode);
    await page.locator('.search-button').click(); const s=await state(); const p=new URL(s.url).searchParams;
    assert.equal(s.searches.length,1); assert.equal(s.searches[0].advancedOptions.searchType,mode);
    assert.equal(p.get('searchType'),mode==='google'?null:mode); assert.equal(p.has('proximity'),mode==='proximity');
    assert.equal(p.has('acronymOrder'),['acronym','endletters'].includes(mode)); assert.equal(p.has('minWords'),['google','any'].includes(mode)); return s;
  });
  await check('all fallback controls are non-submit buttons',async()=>{ await open(); const types=await page.locator('.heb-key').evaluateAll(xs=>xs.map(x=>x.type)); assert.equal(types.length,29); assert.ok(types.every(x=>x==='button')); return {types}; });
  await check('every fallback letter/space/delete can be activated without submission',async()=>{
    await setup('אב',1);
    const evidence=[]; const keys=page.locator('.heb-key');
    for(let i=0;i<await keys.count();i++) {
      await page.locator('#searchInput').fill('אב');
      await page.locator('#searchInput').evaluate(el=>{el.focus();el.setSelectionRange(1,1);window.__searchEvidence.inputs=[];window.__searchEvidence.focus=[];});
      const char=await keys.nth(i).getAttribute('data-char'); await keys.nth(i).tap(); const s=await state();
      assert.equal(s.value,char===null?'ב':'א'+char+'ב'); assert.equal(s.inputs.length,1);
      assert.equal(s.searches.length,0); assert.equal(s.submits.length,0); assert.equal(s.focus.length,0); assert.equal(s.open,true); evidence.push({char,value:s.value});
    } return evidence;
  });
  for (const width of [320,390,768,1280]) await check('all fallback keys fit and remain hit-testable at '+width,async()=>{
    await page.setViewportSize({width,height:1000}); await setup();
    const keys=await page.locator('.heb-key').evaluateAll(xs=>xs.map(el=>{
      const r=el.getBoundingClientRect(); const box=document.getElementById('hebKeyboard').getBoundingClientRect();
      return {text:el.textContent,left:r.left,right:r.right,boxLeft:box.left,boxRight:box.right,width:r.width,height:r.height,
        hit:el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))};
    }));
    assert.ok(keys.every(k=>k.left>=k.boxLeft && k.right<=k.boxRight && k.left>=0 && k.right<=width),'key clipped outside keyboard/viewport');
    assert.ok(keys.every(k=>k.hit),'key center must be reachable'); return keys;
  });
  await page.setViewportSize({width:390,height:844});
  await setup(); await page.locator('.heb-key[data-char="ק"]').tap();
  if(process.env.SEARCH_EVIDENCE) await page.screenshot({path:process.env.SEARCH_EVIDENCE.replace(/\.json$/,'.png'),fullPage:false});
} finally {
  await browser.close();
  const output={url,browser:'isolated Linux headless Chromium; touch viewport, NOT Android/Gboard',passed:results.filter(x=>x.pass).length,total:results.length,pageErrors:errors,results};
  if(process.env.SEARCH_EVIDENCE) await fs.writeFile(process.env.SEARCH_EVIDENCE,JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify(output,null,2)); process.exitCode=results.some(x=>!x.pass)||errors.length?1:0;
}
