#!/usr/bin/env node
// Isolated Linux Chrome/CDP; real DOM/font checks, NOT Android evidence.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audit/psalms-text/browser');fs.mkdirSync(out,{recursive:true});
async function main(){
 const targets=await (await fetch('http://127.0.0.1:9367/json/list')).json();const t=targets.find(t=>t.type==='page');const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const wait=new Map();ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(wait.has(m.id)){const [ok,no]=wait.get(m.id);wait.delete(m.id);m.error?no(Error(JSON.stringify(m.error))):ok(m.result)}});
 const cdp=(method,params={})=>new Promise((ok,no)=>{const i=++id;wait.set(i,[ok,no]);ws.send(JSON.stringify({id:i,method,params}))});
 const ev=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
 const until=async expr=>{for(let i=0;i<80;i++){if(await ev(expr))return;await new Promise(r=>setTimeout(r,150));}throw Error('Timed out: '+expr)};
 const shot=async name=>{await ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');const {data}=await cdp('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data,'base64'))};
 await cdp('Page.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1100,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:'file://'+path.join(root,'audit/psalms-text/app-render/render-fixture.html')});await until("document.readyState==='complete' && document.querySelectorAll('.render').length===8");await ev('document.fonts.ready');assert.ok(await ev("document.fonts.check('36px Marked')"));
 const expected=JSON.parse(fs.readFileSync(path.join(root,'audit/psalms-text/app-render/render-expectations.json')));const actual=await ev("Array.from(document.querySelectorAll('.render')).map(e=>({ref:e.dataset.ref,text:e.textContent,hyphens:getComputedStyle(e).hyphens,wordBreak:getComputedStyle(e).wordBreak}))");for(const r of expected)assert.equal(actual.find(a=>a.ref===`${r.c}:${r.v}`).text,r.reading);
 await ev("document.querySelector('[data-ref=\"67:2\"]').parentElement.scrollIntoView({block:'center',behavior:'instant'})");await shot('fixture-desktop');
 await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await ev("document.querySelector('[data-ref=\"67:2\"]').parentElement.scrollIntoView({block:'center',behavior:'instant'})");await shot('fixture-mobile');
 const report={browser:await (await fetch('http://127.0.0.1:9367/json/version')).json(),fixtureRows:actual,fontLoaded:true};
 await cdp('Page.navigate',{url:'https://ajew.org/reader/tanach-tehillim/1/37/'});await until("document.readyState==='complete' && document.getElementById('btn-medooyuk')");
 await ev("if(document.getElementById('btn-medooyuk').getAttribute('aria-pressed')==='true')document.getElementById('btn-medooyuk').click(); localStorage.removeItem('ajew-special-nikud'); if(document.querySelector('[data-nikud]').textContent!==document.querySelector('[data-nikud]').getAttribute('data-nikud'))document.getElementById('btn-nikud').click()");
 await ev('document.fonts.ready');
 report.live37={url:await ev('location.href'),title:await ev('document.title'),rows:await ev("Array.from(document.querySelectorAll('[data-nikud]')).map(e=>({text:e.textContent,nikud:e.getAttribute('data-nikud'),hyphens:getComputedStyle(e).hyphens,wordBreak:getComputedStyle(e).wordBreak}))")};
 if(report.live37.rows.length){await ev("document.querySelectorAll('[data-nikud]')[8].scrollIntoView({block:'center',behavior:'instant'})");await shot('live37-original');}
 await cdp('Page.navigate',{url:'https://ajew.org/reader/tanach-tehillim/1/67/'});await until("document.readyState==='complete'");
 report.live67={before:await ev("Array.from(document.querySelectorAll('[data-nikud]')).map(e=>e.textContent)"),button:await ev("document.getElementById('btn-medooyuk')?.textContent")};
 if(report.live67.button){await ev("document.getElementById('btn-medooyuk').click()");await until("document.querySelectorAll('.marked-hebrew').length>0");await ev('document.fonts.ready');report.live67.after=await ev("Array.from(document.querySelectorAll('[data-nikud]')).map(e=>({text:e.textContent,hyphens:getComputedStyle(e).hyphens,wordBreak:getComputedStyle(e).wordBreak}))");await ev("document.querySelectorAll('[data-nikud]')[1].scrollIntoView({block:'center',behavior:'instant'})");await shot('live67-medooyuk');}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({fixtureRows:actual.length,live37Rows:report.live37.rows.length,live67Before:report.live67.before.length,live67After:report.live67.after?.length,liveTitle:report.live37.title}));ws.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
