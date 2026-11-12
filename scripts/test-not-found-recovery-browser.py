#!/usr/bin/env python3
"""Real Astro output + private nginx + Chrome recovery regression.
Requires a build from build-not-found-recovery-fixture.mjs, nginx and Playwright.
Never contacts production or substitutes the page initializer. Directory/source
controls must be genuine files supplied in --controls (see handoff).
"""
import argparse
import contextlib
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[1]
PATHS = json.loads((REPO/'scripts/fixtures/not-found-recovery-paths.json').read_text())
assert len(PATHS) == len(set(PATHS)) == 17

def sha(b): return hashlib.sha256(b).hexdigest()

def request(port, path, method='GET'):
    c = http.client.HTTPConnection('127.0.0.1',port,timeout=10)
    try:
        c.request(method,path)
        r=c.getresponse()
        return r.status,dict(r.getheaders()),r.read()
    finally: c.close()

@contextlib.contextmanager
def server(root, dist, nginx):
    with socket.socket() as reserve:
        reserve.bind(('127.0.0.1',0)); port=reserve.getsockname()[1]
    prefix=root/'nginx'; prefix.mkdir()
    config=prefix/'nginx.conf'
    config.write_text(f'''user root;
worker_processes 1;
pid {prefix}/pid;
error_log {prefix}/error.log;
events {{ worker_connections 64; }}
http {{ access_log off; default_type text/html;
 types {{ text/html html; text/plain txt; application/javascript js; text/css css; application/json json; }}
 client_body_temp_path {prefix}/client;
 proxy_temp_path {prefix}/proxy;
 fastcgi_temp_path {prefix}/fastcgi;
 uwsgi_temp_path {prefix}/uwsgi;
 scgi_temp_path {prefix}/scgi;
 server {{ listen 127.0.0.1:{port}; root {dist}; index index.html;
 include {REPO}/ops/nginx-static-404.conf;
 include {REPO}/ops/nginx-reader-static-status.conf;
 }} }}''')
    cmd=[str(nginx),'-p',str(prefix),'-c',str(config)]
    subprocess.run(cmd+['-t'],capture_output=True,check=True)
    p=subprocess.Popen(cmd+['-g','daemon off;'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            if p.poll() is not None: raise RuntimeError((prefix/'error.log').read_text())
            try:
                if request(port,'/missing')[0]==404: break
            except OSError: pass
            time.sleep(.05)
        else: raise RuntimeError('Private nginx did not start')
        yield port
    finally:
        p.terminate()
        try: p.wait(timeout=10)
        except subprocess.TimeoutExpired: p.kill();p.wait()

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--dist',type=Path,required=True)
    p.add_argument('--nginx',type=Path,required=True)
    p.add_argument('--controls',type=Path,required=True)
    p.add_argument('--sitemap',type=Path,required=True,help='Genuine final canonical sitemap-0.xml snapshot')
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args(); a.output.mkdir(parents=True,exist_ok=True)
    spec=importlib.util.spec_from_file_location('seo',REPO/'scripts/postbuild-seo-sitemaps.py')
    import sys
    sys.path.insert(0,str(REPO/'scripts'))
    assert spec is not None and spec.loader is not None
    seo=importlib.util.module_from_spec(spec);spec.loader.exec_module(seo)
    tree=ET.parse(a.sitemap)
    urls=[n.text for n in tree.findall('.//{'+seo.NS+'}loc')]
    text=seo.text_sitemap(urls)
    assert text.splitlines()==urls and len(set(urls))==len(urls)
    # These controls are downloaded genuine deployed artifacts, not fixtures
    # pretending to be teachings. No text/source producer runs in this test.
    controls=[x for x in a.controls.rglob('*') if x.is_file()]
    assert controls, 'Missing genuine positive controls'
    results=[]
    with tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR')) as tmp:
        root=Path(tmp); dist=root/'dist'; shutil.copytree(a.dist,dist)
        for source in controls:
            dest=dist/source.relative_to(a.controls);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest)
        (dist/'sitemap.txt').write_text(text)
        before={str(x.relative_to(dist)):sha(x.read_bytes()) for x in dist.rglob('*') if x.is_file()}
        with server(root,dist,a.nginx) as port:
            origin=f'http://127.0.0.1:{port}'
            body=(dist/'404.html').read_bytes()
            for path in PATHS:
                for method in ('GET','HEAD'):
                    status,headers,data=request(port,path,method)
                    assert status==404,(path,status)
                    assert 'text/html' in headers['Content-Type']
                    assert data==(body if method=='GET' else b'')
            for source in controls:
                rel=source.relative_to(a.controls).as_posix()
                path='/'+(rel[:-10] if rel.endswith('index.html') else rel)
                status,headers,data=request(port,path)
                assert status==200,(path,status)
                assert data==source.read_bytes(),path
                results.append({'validControl':path,'status':status,'sha256':sha(data)})
            for method in ('GET','HEAD'):
                status,headers,data=request(port,'/sitemap.txt',method)
                assert status==200 and headers['Content-Type'].startswith('text/plain')
                assert data==(text.encode() if method=='GET' else b'')
                assert 'Location' not in headers
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path=os.environ.get('CHROME_BIN','/usr/bin/google-chrome'),headless=True,args=['--no-sandbox'])
                try:
                    context=browser.new_context(viewport={'width':390,'height':844})
                    page=context.new_page(); errors=[]; outgoing=[]; referrers=[]; navigation_referrers=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.on('request',lambda r:outgoing.append(r.url))
                    page.on('request',lambda r:referrers.append(r.headers.get('referer','')))
                    page.on('request',lambda r:navigation_referrers.append(r.headers.get('referer','')) if r.is_navigation_request() else None)
                    for path in PATHS:
                        r=page.goto(origin+path+'?q=PRIVATE-ORIGINAL&target=UNTRUSTED#unchanged',wait_until='networkidle')
                        assert r.status==404
                        assert page.locator('#recovery-context').is_visible()
                        book=path.split('/')[2]; part='2' if book=='likutay-moharan' else '1'
                        assert page.locator('#recovery-book').input_value()==book
                        assert page.locator('#recovery-query').input_value()==''
                        links=page.locator('#recovery-context a:visible')
                        assert links.count()==1 and links.first.get_attribute('href')==f'/reader/{book}/{part}/'
                        assert page.locator('meta[name=robots]').get_attribute('content')=='noindex, nofollow'
                        assert page.locator('meta[name=referrer]').get_attribute('content')=='no-referrer'
                        assert not page.locator('link[rel=canonical]').count()
                        assert page.url==origin+path+'?q=PRIVATE-ORIGINAL&target=UNTRUSTED#unchanged'
                        assert page.evaluate('localStorage.length')==0
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),path
                        results.append({'invalidPath':path,'http':r.status,'book':book,'directory':links.first.get_attribute('href')})
                    unknown=[
                        '/reader/not-a-book/1/20',
                        '/reader/likutay-moharan-impostor/part-2/torah-354',
                        '/reader/likutay-moharan/part-2/%3Cimg%20src=x%20onerror=alert(1)%3E',
                        '/reader/likutay-moharan/part-2/%252e%252e',
                        '/reader/likutay-moharan%2Funknown/part-2/torah-354',
                        '/reader/likutay-moharan/part-2/../nonexistent',
                        '/reader/likutay-moharan/part-2/%2e%2e/nonexistent',
                        '/reader/likutay-moharan/part-2/a%5Cb',
                        '/reader/unknown/1/20?book=likutay-moharan&q=%3Cscript%3E',
                        '/totally-unknown',
                    ]
                    for path in unknown:
                        r=page.goto(origin+path,wait_until='networkidle')
                        assert r.status==404,(path,r.status)
                        assert not page.locator('#recovery-context').is_visible(),path
                        assert page.locator('#recovery-book').input_value()==''
                        assert page.locator('#recovery-query').input_value()==''
                        assert page.locator('main img, main script').count()==0
                        results.append({'hostileOrUnknown':path,'http':r.status,'context':False})
                    assert not errors,errors
                    assert all(urlsplit(u).netloc==f'127.0.0.1:{port}' for u in outgoing),outgoing
                    assert not any(referrers), 'Recovery must not transmit the incoming URL as Referer'
                    # Native keyboard traversal, visible focus and 44px targets.
                    page.goto(origin+PATHS[0],wait_until='networkidle')
                    page.keyboard.press('Tab'); assert page.locator(':focus').get_attribute('href')=='#main-content'
                    page.keyboard.press('Enter'); assert page.url.endswith('#main-content')
                    seen=set()
                    for _ in range(40):
                        page.keyboard.press('Tab')
                        info=page.evaluate('''() => {const e=document.activeElement,r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,href:e.getAttribute('href'),height:r.height,outline:s.outlineStyle,width:s.outlineWidth}}''')
                        if info['tag'] in ('A','BUTTON','SUMMARY','INPUT','SELECT'):
                            assert info['height']>=44,info
                            assert info['outline']!='none' and float(info['width'].replace('px',''))>=2,info
                        if info['id']: seen.add(info['id'])
                    assert {'recovery-book','recovery-query'}<=seen,seen
                    page.locator('#recovery-directories summary').focus();page.keyboard.press('Enter')
                    assert page.locator('#recovery-directories').get_attribute('open') is not None
                    # Real GET handoff to unchanged, Astro-built search controls.
                    for book,path in [('likutay-moharan',PATHS[0]),('likutay-tefilos',PATHS[12]),('sipurey-maasiyos',PATHS[13])]:
                        page.goto(origin+path+'?q=PRIVATE-ORIGINAL',wait_until='networkidle')
                        page.locator('#recovery-query').fill('אמונה')
                        with page.expect_navigation(wait_until='networkidle'):
                            page.locator('#recovery-query').press('Enter')
                        assert '/search-enhanced/' in page.url and 'PRIVATE-ORIGINAL' not in page.url
                        assert not navigation_referrers[-1], 'Search handoff must not transmit the incoming URL as Referer'
                        page.wait_for_function('window.enhancedSearch')
                        state=page.evaluate('window.enhancedSearch.getState()')
                        assert state['query']=='אמונה' and state['advancedOptions']['books']==[book],state
                    for width in (320,390,1280):
                        page.set_viewport_size({'width':width,'height':844})
                        page.goto(origin+PATHS[0],wait_until='networkidle')
                        for theme in ('light','dark'):
                            page.emulate_media(color_scheme=theme,reduced_motion='reduce')
                            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                            page.screenshot(path=str(a.output/f'recovery-{width}-{theme}.png'),full_page=True)
                    # 200% text enlargement at phone size retains all controls.
                    page.set_viewport_size({'width':390,'height':844})
                    page.evaluate('document.documentElement.style.fontSize="200%"')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    page.screenshot(path=str(a.output/'recovery-390-text200.png'),full_page=True)
                    # No-script and failed-asset behavior retain direct links.
                    for disabled in (True,False):
                        fallback=browser.new_context(java_script_enabled=not disabled,viewport={'width':390,'height':844})
                        if not disabled: fallback.route('**/not-found-recovery.js*',lambda route:route.abort())
                        fp=fallback.new_page(); r=fp.goto(origin+PATHS[0],wait_until='networkidle'); assert r.status==404
                        fp.locator('#recovery-directories summary').click()
                        assert fp.locator('#recovery-directories a:visible').count()==7
                        assert fp.locator('a[href="/reader/likutay-moharan/2/"]:visible').count()==1
                        assert fp.locator('form').get_attribute('action')=='/search-enhanced/'
                        fp.screenshot(path=str(a.output/f'recovery-fallback-{disabled}.png'),full_page=True)
                        fallback.close()
                    context.close()
                finally: browser.close()
        after={str(x.relative_to(dist)):sha(x.read_bytes()) for x in dist.rglob('*') if x.is_file()}
        assert before==after,'Browser/nginx changed a served source artifact'
    receipt={'pass':True,'invalidPaths':17,'hostileOrUnknownPaths':len(unknown),'genuineControlFiles':len(controls),'sitemapURLs':len(urls),'sitemapTextSHA256':sha(text.encode()),'sitemapXMLSHA256':sha(a.sitemap.read_bytes()),'rendered404SHA256':sha(body),'searchControlHandoffs':3,'sourceArtifactsUnchanged':before==after,'results':results,'boundaries':['isolated Astro build, not aggregate production build','real private nginx with unchanged routing snippets','unchanged search controls in QA shell, not full search engine','final live sitemap graph replay, not fresh whole-corpus admission','no screen-reader certification or deployment']}
    (a.output/'native-regression.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in receipt.items() if k!='results'},ensure_ascii=False,indent=2))

if __name__=='__main__': main()
