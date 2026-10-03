#!/usr/bin/env python3
"""One disposable real Chrome: authentic page/helper/SW/CacheStorage.

Shared exact mutation operations come from the app regression script. Counter
instrumentation observes real Cache.put calls without replacing their behavior.
Old-worker controls use the unedited candidate Git HEAD worker, not a fake SW.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from html.parser import HTMLParser
from playwright.sync_api import sync_playwright

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--app', type=Path, required=True)
p.add_argument('--site', type=Path, required=True)
p.add_argument('--evidence', type=Path, required=True)
p.add_argument('--before', type=Path)
a = p.parse_args()
a.evidence.mkdir(parents=True, exist_ok=False)
ledger = json.loads((a.app / 'scripts/data/psalms-annotation-ledger.json').read_bytes())
final = json.loads((a.site / 'public/reader/medooyuk/tanach-tehillim.json').read_bytes())
states = {'final': final}
for state in ['before', 'qatan']:
    states[state] = copy.deepcopy(final)
    for e in ledger['entries']:
        states[state]['ch'][str(e['chapter'])][str(e['verse'])]['m'] = copy.deepcopy(e['states'][state]['m'])
cases = json.loads(subprocess.check_output(['node', str(a.app / 'scripts/test-psalms-cache-integrity.cjs'), str(a.site), '--fixtures']))['cases']
books = dict(states)
for case in cases:
    b = copy.deepcopy(final)
    for op in case['ops']:
        row = b
        for key in op['path'][:-1]:
            row = row[key]
        key = op['path'][-1]
        if op['remove']:
            del row[key]
        else:
            row[key] = op['value']
    books[case['name']] = b
old_worker = subprocess.check_output(['git', 'show', 'HEAD:public/sw-v2.js'], cwd=a.site)
class HelperSource(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []
    def handle_starttag(self, tag, attrs):
        src = dict(attrs).get('src') or ''
        if tag == 'script' and src.startswith('/psalms-data.js?'):
            self.sources.append(src)
page_sources = []
for rel in ['src/pages/reader/tikkun.astro', 'src/pages/reader/chok.astro', 'src/pages/reader/tanach-tehillim/[part]/[torah].astro']:
    parser = HelperSource()
    parser.feed((a.site / rel).read_text())
    assert len(parser.sources) == 1 and parser.sources[0].endswith('&integrity=sha256-20261003')
    page_sources.extend(parser.sources)
assert len(set(page_sources)) == 1
helper_url = page_sources[0]
assert helper_url in (a.site / 'public/sw-v2.js').read_text()
state = {'book': 'final'}
checks = []
requests = []
current = '/reader/medooyuk/tanach-tehillim.json?v=psalms-annotations-20261002-r1'
legacy = '/reader/medooyuk/tanach-tehillim.json'
cache_name = 'ajew-v2-capital-t-20261002-r1'

def raw(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    def do_GET(self):
        path = urlsplit(self.path).path
        requests.append({'path': self.path, 'book': state['book']})
        status, kind = 200, 'application/javascript'
        if path == '/test':
            data = ('<meta charset="utf-8"><script src="' + helper_url.replace('&', '&amp;') + '"></script>').encode()
            kind = 'text/html'
        elif path == '/reader/medooyuk/tanach-tehillim.json':
            data, kind = raw(books[state['book']]), 'application/json'
        elif path == '/old-sw.js':
            data = old_worker
        elif path in ['/psalms-data.js', '/sw-v2.js']:
            data = ((a.before or a.site) / 'public' / path.lstrip('/')).read_bytes()
        elif path == '/book-index':
            data, kind = raw({'torahs': [{'url': current}]}), 'application/json'
        else:
            data, status, kind = b'not found', 404, 'text/plain'
        self.send_response(status)
        self.send_header('Content-Type', kind + '; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Service-Worker-Allowed', '/')
        self.end_headers()
        self.wfile.write(data)

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f'http://127.0.0.1:{server.server_port}'

def put(page, key, book):
    page.evaluate('async x=>{const c=await caches.open(x.cache);await c.put(x.key,new Response(x.text,{headers:{"Content-Type":"application/json"}}));}', {'cache': cache_name, 'key': key, 'text': raw(book).decode()})

def readcache(page):
    return page.evaluate('async()=>{const c=await caches.open("' + cache_name + '");const out={};for(const r of await c.keys()){if(new URL(r.url).pathname==="/reader/medooyuk/tanach-tehillim.json")out[r.url]=await(await c.match(r)).text();}return out;}')

def load(page, name, expected):
    result = page.evaluate('async()=>{try{const b=await AjewPsalmsData.load();return {ok:true,current:AjewPsalmsData.valid(b,true),text:JSON.stringify(b)};}catch(e){return {ok:false,message:String(e)};}}')
    if expected is None:
        assert not result['ok'], (name, result)
        checks.append({'name': name, 'rejected': True})
    else:
        if isinstance(expected, list):
            expected = next((s for s in expected if result['ok'] and json.loads(result['text']) == states[s]), None)
            assert expected is not None, name
        assert result['ok'] and json.loads(result['text']) == states[expected], name
        assert result['current'] == (expected == 'final'), name
        checks.append({'name': name, 'state': expected, 'current': result['current'], 'exactReturnedObject': True})

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        ctx = browser.new_context()
        page = ctx.new_page()
        page.goto(origin + '/test')
        assert not page.evaluate('!!navigator.serviceWorker.controller')
        state['book'] = cases[0]['name']
        load(page, 'direct-held-no-cache-rejected', None)  # meaningful archived RED
        for s in states:
            state['book'] = s
            load(page, 'direct-reviewed-' + s, s)
        put(page, current, final)
        put(page, legacy, states['before'])
        for case in cases:
            state['book'] = case['name']
            snapshot = readcache(page)
            load(page, 'direct-' + case['name'], 'final')
            assert readcache(page) == snapshot
            checks.append({'name': 'direct-no-cache-mutation-' + case['name'], 'preserved': True})
        put(page, current, books[cases[0]['name']])
        load(page, 'direct-corrupt-current-uses-legacy', 'before')
        # Legacy data under a current fallback key is not relabelled as current.
        put(page, current, states['qatan'])
        page.evaluate('async()=>{const c=await caches.open("' + cache_name + '");await c.delete("' + legacy + '");}')
        state['book'] = cases[0]['name']
        load(page, 'legacy-at-current-key-not-authorized', None)
        put(page, legacy, states['before'])
        state['book'] = 'final'
        page.evaluate('async()=>{await navigator.serviceWorker.register("/sw-v2.js");await navigator.serviceWorker.ready;}')
        page.reload()
        page.wait_for_function('!!navigator.serviceWorker.controller')
        worker = ctx.service_workers[0]
        worker.evaluate('()=>{self.psalmsPuts=[];const orig=Cache.prototype.put;Cache.prototype.put=function(key,response){if(new URL(typeof key==="string"?key:key.url,self.location.origin).pathname==="/reader/medooyuk/tanach-tehillim.json")self.psalmsPuts.push(typeof key==="string"?key:key.url);return orig.call(this,key,response);};}')
        load(page, 'new-worker-valid-control', 'final')
        assert len(worker.evaluate('self.psalmsPuts')) == 1
        for case in cases:
            state['book'] = case['name']
            snapshot = readcache(page)
            worker.evaluate('self.psalmsPuts=[]')
            load(page, 'new-worker-' + case['name'], 'final')
            assert worker.evaluate('self.psalmsPuts') == []
            assert readcache(page) == snapshot
            checks.append({'name': 'new-worker-zero-writes-preserved-' + case['name'], 'putCalls': 0, 'allCopyBytesPreserved': True})
            ctx.set_offline(True)
            page.reload()
            load(page, 'offline-reopen-' + case['name'], 'final')
            ctx.set_offline(False)
        # Bad previously-current cache: skip it without destroying honest legacy.
        put(page, current, books[cases[0]['name']])
        state['book'] = cases[0]['name']
        snapshot = readcache(page)
        worker.evaluate('self.psalmsPuts=[]')
        load(page, 'new-worker-corrupt-current-fallback', 'before')
        assert readcache(page) == snapshot and not worker.evaluate('self.psalmsPuts')
        # Explicit cache messages use the same actual authenticated route.
        for command in [{'type': 'CACHE_SPECIFIC_URLS', 'urls': [current]}, {'type': 'CACHE_READER_BOOK', 'bookUrl': origin + '/book-index'}]:
            worker.evaluate('self.psalmsPuts=[]')
            worker.evaluate('async data=>{const e=new ExtendableMessageEvent("message",{data});let pending=[];Object.defineProperty(e,"waitUntil",{value:p=>pending.push(p)});self.dispatchEvent(e);await Promise.all(pending);}', command)
            assert readcache(page) == snapshot and worker.evaluate('self.psalmsPuts') == []
            checks.append({'name': command['type'] + '-invalid-zero-writes', 'putCalls': 0, 'scope': 'actual listener with waitUntil capture'})
        state['book'] = 'final'
        worker.evaluate('self.psalmsPuts=[]')
        load(page, 'new-worker-valid-online-recovery', 'final')
        assert len(worker.evaluate('self.psalmsPuts')) == 1
        assert json.loads(readcache(page)[origin + legacy]) == states['before']
        ctx.set_offline(True)
        page.reload()
        load(page, 'recovered-offline-reopen', 'final')
        # Every exact legacy state remains readable without a current cache.
        for s in states:
            page.evaluate('async()=>{const c=await caches.open("' + cache_name + '");await c.delete("' + current + '");}')
            put(page, legacy, states[s])
            load(page, 'new-worker-offline-reviewed-' + s, s)
        put(page, legacy, books[cases[0]['name']])
        load(page, 'new-worker-all-copies-invalid', None)
        ctx.close()
        # Old real SW remains installed: current page must guard its responses.
        ctx = browser.new_context()
        page = ctx.new_page()
        state['book'] = 'before'
        page.goto(origin + '/test')
        page.evaluate('async()=>{await navigator.serviceWorker.register("/old-sw.js",{scope:"/"});await navigator.serviceWorker.ready;}')
        old_helper = None
        old_helper_path = a.evidence.parent / 'before/site-annotation-delivery/public/psalms-data.js'
        if old_helper_path.exists():
            old_helper = old_helper_path.read_text()
            page.evaluate('async text=>{const c=await caches.open("' + cache_name + '");await c.put("/psalms-data.js?v=psalms-annotations-20261002-r1",new Response(text,{headers:{"Content-Type":"application/javascript"}}));}', old_helper)
        page.reload()
        page.wait_for_function('!!navigator.serviceWorker.controller')
        if old_helper is not None:
            assert page.evaluate('async()=>await(await caches.match("/psalms-data.js?v=psalms-annotations-20261002-r1")).text()') == old_helper
            state['book'] = cases[0]['name']
            assert not page.evaluate('b=>AjewPsalmsData.valid(b,true)', books[cases[0]['name']])
            checks.append({'name': 'old-worker-cached-weak-helper-bypassed', 'oldHelperBytesPreserved': True, 'threeActualPageCallers': page_sources, 'newHelperRejectsHeld': True})
        for s in states:
            put(page, current, states[s])
            put(page, legacy, states[s])
            ctx.set_offline(True)
            page.reload()
            load(page, 'old-worker-offline-reviewed-' + s, s)
            ctx.set_offline(False)
        put(page, current, books[cases[0]['name']])
        put(page, legacy, states['before'])
        ctx.set_offline(True)
        load(page, 'old-worker-invalid-response-valid-legacy-fallback', 'before')
        ctx.set_offline(False)
        state['book'] = 'final'
        # Old SW revalidation races the page's validated cache fallback: either
        # authenticated state is correct, never the stale unauthorized object.
        load(page, 'old-worker-online-stale-authenticated-fallback', ['before', 'final'])
        page.wait_for_function('async()=>{const r=await caches.match(AjewPsalmsData.url);return r&&AjewPsalmsData.valid(await r.json(),true);}')
        load(page, 'old-worker-online-recovery-next-load', 'final')
        ctx.set_offline(True)
        page.reload()
        load(page, 'old-worker-recovered-offline-reopen', 'final')
        ctx.set_offline(False)
        # Benchmark original and candidate synchronous API in the same browser.
        state['book'] = 'final'
        benchmark = page.evaluate('async b=>{const times=[];for(let i=0;i<12;i++){const t=performance.now();if(!AjewPsalmsData.valid(b,true))throw Error("benchmark invalid");times.push(performance.now()-t);}return times;}', final)
        checks.append({'name': 'runtime-Chrome-current', 'milliseconds': benchmark, 'scope': 'WSL headless Chrome, not Android'})
        before_text = (a.evidence.parent / 'before/site-annotation-delivery/public/psalms-data.js').read_text() if (a.evidence.parent / 'before/site-annotation-delivery/public/psalms-data.js').exists() else None
        if before_text:
            page.evaluate('text=>{self.reviewedNew=AjewPsalmsData;(0,eval)(text);}', before_text)
            benchmark = page.evaluate('b=>{const times=[];for(let i=0;i<12;i++){const t=performance.now();if(!AjewPsalmsData.valid(b,true))throw Error("benchmark invalid");times.push(performance.now()-t);}return times;}', final)
            checks.append({'name': 'runtime-Chrome-before', 'milliseconds': benchmark, 'scope': 'same browser, authentic preserved earlier helper'})
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join()
    (a.evidence / 'results.json').write_text(json.dumps({'count': len(checks), 'cases': len(cases), 'checks': checks, 'requests': requests, 'scope': 'one disposable real Chrome, local authentic corpus; page and real service worker; no native/live claim'}, indent=2) + '\n')
print(json.dumps({'PASS': len(checks), 'mutationCases': len(cases)}))
