#!/usr/bin/env python3
"""Owned headless Chrome, real SW/CacheStorage, authentic Psalms fixtures only."""
import argparse, hashlib, json, subprocess, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(); p.add_argument('--site',type=Path,required=True); p.add_argument('--evidence',type=Path,required=True); args=p.parse_args()
site=args.site; out=args.evidence; out.mkdir(parents=True,exist_ok=False)
base='9ab41624dd7f9367e216f3c774bdd0a25a9d6a48'
oldsw=subprocess.check_output(['git','show',f'{base}:public/sw-v2.js'],cwd=site)
oldbook=subprocess.check_output(['git','show','56f18b2bbe52a77ad0927de17b421d41abe8de4e:public/reader/medooyuk/tanach-tehillim.json'],cwd=site)
final=(site/'public/reader/medooyuk/tanach-tehillim.json').read_bytes()
state={'sw':'old','book':'old'}; requests=[]; results=[]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*a): pass
 def do_GET(self):
  path=urlsplit(self.path).path; requests.append({'url':self.path,**state})
  code=200; kind='application/javascript'
  if path=='/sw-v2.js': data=oldsw if state['sw']=='old' else (site/'public/sw-v2.js').read_bytes()
  elif path=='/reader/medooyuk/tanach-tehillim.json':
   kind='application/json'; data=oldbook if state['book']=='old' else final
   if state['book']=='invalid': data=b'{"book":"Psalms","slug":"tanach-tehillim","ch":{}}'
   if state['book']=='error': code=503; data=b'{}'
  elif path=='/cache-test':
   kind='text/html'; data=b'<html><head><script src="/psalms-data.js?v=psalms-annotations-20261002-r1"></script></head><body>Owned Psalms cache test</body></html>'
  elif path=='/psalms-data.js': data=(site/'public/psalms-data.js').read_bytes()
  else:
   # Unrelated real files; missing precache assets deliberately fail normally.
   candidate=site/'public'/path.lstrip('/')
   if candidate.is_file(): data=candidate.read_bytes(); kind='application/json' if path.endswith('.json') else 'application/octet-stream'
   else: data=b'not found'; code=404; kind='text/plain'
  self.send_response(code); self.send_header('Content-Type',kind+'; charset=utf-8'); self.send_header('Cache-Control','no-store'); self.send_header('Service-Worker-Allowed','/'); self.end_headers(); self.wfile.write(data)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler); thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start(); origin=f'http://127.0.0.1:{server.server_port}'
cache='ajew-v2-capital-t-20261002-r1'; legacy='/reader/medooyuk/tanach-tehillim.json'; rev=legacy+'?v=psalms-annotations-20261002-r1'
def record(name,actual,expected):
 assert actual==expected,(name,actual,expected); results.append({'name':name,'actual':actual,'expected':expected})
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(); page=context.new_page(); page.goto(origin+'/cache-test')
  page.evaluate("async()=>{await navigator.serviceWorker.register('/sw-v2.js');await navigator.serviceWorker.ready;}")
  page.reload(); page.wait_for_function('!!navigator.serviceWorker.controller')
  # Seed authentic pre-repair stale data under the historical URL.
  page.evaluate('(u)=>fetch(u).then(r=>r.json())',legacy)
  page.wait_for_function('(key)=>caches.match(key).then(Boolean)',arg=legacy)
  measure="async()=>{const b=await AjewPsalmsData.load();return {current:AjewPsalmsData.valid(b,true),qk:Object.values(b.ch).flatMap(Object.values).flatMap(v=>v.m).filter(m=>m[2]==='qk').length};}"
  context.set_offline(True)
  record('old-SW-offline-upgrade-preserves-legacy-copy',page.evaluate(measure),{'current':False,'qk':0})
  page.reload()
  record('old-SW-offline-upgrade-reopen',page.evaluate(measure),{'current':False,'qk':0})
  context.set_offline(False)
  state['book']='final'
  record('old-SW-warm-legacy-new-query-first-load',page.evaluate(measure),{'current':True,'qk':29})
  # Retain a stale current-query entry, then genuinely upgrade the worker.
  page.evaluate('async([cache,old,newer])=>{const c=await caches.open(cache);await c.put(newer,await c.match(old));}',[cache,legacy,rev])
  state['sw']='new'
  page.evaluate("async()=>{const r=await navigator.serviceWorker.getRegistration(); await new Promise(async(resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('SW update timeout')),15000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timeout);resolve();},{once:true}); await r.update();});}")
  record('new-SW-warm-stale-current-query-network-first',page.evaluate(measure),{'current':True,'qk':29})
  record('old-copy-preserved-after-replacement',page.evaluate('async([cache,url])=>{const r=await (await caches.open(cache)).match(url);return AjewPsalmsData.valid(await r.json(),true);}',[cache,legacy]),False)
  page.reload(); record('online-reopen',page.evaluate(measure),{'current':True,'qk':29})
  context.set_offline(True); record('offline-current',page.evaluate(measure),{'current':True,'qk':29})
  page.reload(); record('offline-reopen-current',page.evaluate(measure),{'current':True,'qk':29})
  # Isolated disconnected upgrade: remove only the test's new copy, never legacy.
  page.evaluate('async([cache,url])=>(await caches.open(cache)).delete(url)',[cache,rev])
  record('honest-offline-previous-metadata',page.evaluate(measure),{'current':False,'qk':0})
  context.set_offline(False)
  for mode in ['invalid','error','old']:
   state['book']=mode
   record('reject-'+mode+'-replacement-retains-old',page.evaluate(measure),{'current':False,'qk':0})
   record('no-'+mode+'-replacement-written',page.evaluate('async([cache,url])=>!!(await (await caches.open(cache)).match(url))',[cache,rev]),False)
  state['book']='final'; record('recover-after-failed-refresh',page.evaluate(measure),{'current':True,'qk':29})
  # An unrelated book stays on the existing stale-while-revalidate route.
  genesis='/reader/medooyuk/tanach-bereishit.json'
  page.evaluate('(u)=>fetch(u).then(r=>r.json())',genesis)
  page.wait_for_function('(u)=>caches.match(u).then(Boolean)',arg=genesis)
  keys=page.evaluate('async()=>await caches.keys()'); record('no-global-cache-namespace-bump',sorted(keys),[cache])
  context.set_offline(True); page.reload(); record('reopen-after-valid-refresh-offline',page.evaluate(measure),{'current':True,'qk':29})
  record('unrelated-offline-book-preserved',page.evaluate('(u)=>fetch(u).then(r=>r.json()).then(b=>b.book)',genesis),'Genesis')
  browser.close()
finally: server.shutdown(); server.server_close()
(out/'results.json').write_text(json.dumps({'PASS':len(results),'browser':'owned headless /usr/bin/google-chrome; no CDP9334/native/emulator','checks':results,'requests':requests,'site_sha256':hashlib.sha256(final).hexdigest()},indent=2)+'\n')
print(json.dumps({'PASS':len(results),'browser':'real Chrome service worker / CacheStorage'}))
