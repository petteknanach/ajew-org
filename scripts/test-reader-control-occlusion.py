#!/usr/bin/env python3
"""Live or actual compiled Reader/Tikun control regression. No injected CSS."""
import argparse, hashlib, json, threading, mimetypes
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, unquote
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--base');p.add_argument('--dist',type=Path);p.add_argument('--public',type=Path);p.add_argument('--out',type=Path,required=True);p.add_argument('--init-outcome',choices=['normal','error','timeout'],default='normal');a=p.parse_args();a.out.mkdir(parents=True,exist_ok=False)
server=None
if a.dist:
 assert a.public
 class Handler(BaseHTTPRequestHandler):
  def do_GET(self):
   rel=unquote(urlsplit(self.path).path).lstrip('/')
   for root in [a.dist,a.public]:
    f=root/rel
    if f.is_dir():f=f/'index.html'
    if f.is_file() and f.resolve().is_relative_to(root.resolve()):break
   else:
    try:self.send_error(404)
    except (BrokenPipeError,ConnectionResetError):pass
    return
   raw=f.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(f)[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(raw)));self.end_headers()
   try:self.wfile.write(raw)
   except (BrokenPipeError,ConnectionResetError):pass
  def log_message(self,format,*x):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();a.base=f'http://127.0.0.1:{server.server_port}'
assert a.base
HIT='''e=>{const r=e.getBoundingClientRect(), inset=parseFloat(getComputedStyle(e).borderTopLeftRadius)>Math.min(r.width,r.height)/3?.15:.1;const points=[[.5,.5],[inset,inset],[1-inset,inset],[inset,1-inset],[1-inset,1-inset]].map(([x,y])=>{let t=document.elementFromPoint(r.left+x*r.width,r.top+y*r.height);return {ok:!!t&&e.contains(t),target:t?.id||t?.className}});return {rect:r.toJSON(),points,ok:r.width>0&&r.height>0&&points.every(p=>p.ok)}}'''
SCAN=r'''({root,selectors})=>{const scope=document.querySelector(root);if(!scope)throw Error('missing source');let controls=selectors.flatMap(s=>[...document.querySelectorAll(s)]).filter(e=>{let r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.display!=='none'&&s.visibility!=='hidden'});let n,count=0,hits=[],w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);while(n=w.nextNode()){if(n.parentElement.closest('script,style,#compactYahrzeit'))continue;for(let i=0;i<n.length;i++){if(!n.textContent[i].trim())continue;let g=document.createRange();g.setStart(n,i);g.setEnd(n,i+1);let r=g.getBoundingClientRect();if(!r.width||!r.height||r.top<56||r.bottom>innerHeight-64)continue;count++;for(let e of controls){let q=e.getBoundingClientRect(),l=Math.max(r.left,q.left,0),t=Math.max(r.top,q.top,56),rr=Math.min(r.right,q.right,innerWidth),bb=Math.min(r.bottom,q.bottom,innerHeight-64);if(rr<=l||bb<=t)continue;let top=document.elementFromPoint((l+rr)/2,(t+bb)/2);if(e.contains(top))hits.push({char:n.textContent[i],control:e.id||e.className});}}}return {count,hits,scrollY,overflow:document.documentElement.scrollWidth-innerWidth}}'''
rows=[];assets={};errors=[]
def save():
 d={'base':a.base,'compiled':bool(a.dist),'initialization':a.init_outcome,'rows':rows,'assets':assets,'pageerrors':errors,'total':len(rows),'passed':sum(r['pass'] for r in rows),'failed':sum(not r['pass'] for r in rows)};(a.out/'results.json').write_text(json.dumps(d,ensure_ascii=False,indent=2));return d
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in [320,390,768,1280]:
   for kind,path in [('reader','/reader/tanach-tehillim/1/16/'),('tikkun','/reader/tikkun/')]:
    if a.init_outcome!='normal' and kind=='reader':continue
    c=b.new_context(viewport={'width':width,'height':900},has_touch=width<1024,timezone_id='Asia/Jerusalem');page=c.new_page();page.set_default_timeout(20000)
    if a.init_outcome=='error':page.route('https://www.hebcal.com/**',lambda route:route.abort())
    if a.init_outcome=='timeout':page.route('https://www.hebcal.com/**',lambda route:None)
    page.on('pageerror',lambda e:errors.append(str(e)))
    def asset(resp):
     if resp.url.startswith(a.base) and resp.request.resource_type in ['document','script','stylesheet','font']:
      try:raw=resp.body();assets[urlsplit(resp.url).path]={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'status':resp.status}
      except Exception as e:assets[resp.url]={'error':str(e)}
    page.on('response',asset)
    def check(name,fn):
     r={'width':width,'kind':kind,'name':name}
     try:r['detail']=fn();r['pass']=True
     except Exception as e:r['pass']=False;r['error']=str(e);page.screenshot(path=str(a.out/f'{kind}-{width}-FAIL-{name}.png'))
     rows.append(r);save();print(width,kind,name,r['pass'],flush=True)
    def require(x):assert x;return x
    def hit(sel):
     l=page.locator(sel).first;l.evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})');page.wait_for_timeout(120);d=l.evaluate(HIT);assert d['ok'],d;return d
    def scan(root):
     d=page.evaluate(SCAN,{'root':root,'selectors':['#compactYahrzeit','.reader-toc-toggle']});assert d['count']>0 and not d['hits'] and d['overflow']<=1,d;return d
    page.goto(a.base+path,wait_until='domcontentloaded');page.wait_for_function("document.querySelector('#compactYahrzeit').style.display==='block'",timeout=25000);page.evaluate('document.fonts.ready')
    check('viewport',lambda:require(page.evaluate('innerWidth')==width))
    if kind=='reader':
     page.wait_for_selector('#btn-reader-special');source=page.locator('.reader-content').text_content()
     # Put the exact original failure at the floating TOC's centre height.
     page.locator('#btn-reader-special').evaluate('e=>scrollTo({top:scrollY+e.getBoundingClientRect().top+e.getBoundingClientRect().height/2-innerHeight/2,behavior:"instant"})');page.wait_for_timeout(150)
     check('special-nikud-five-points',lambda:hit('#btn-reader-special'))
     def special():
      before=page.locator('#btn-reader-special').get_attribute('aria-pressed');page.locator('#btn-reader-special').click();assert page.locator('#btn-reader-special').get_attribute('aria-pressed')!=before;page.locator('#btn-reader-special').click();assert page.locator('#btn-reader-special').get_attribute('aria-pressed')==before;return True
     check('special-nikud-real-toggle',special)
     def toc():
      hit('.reader-toc-toggle');page.locator('.reader-toc-toggle').click();assert page.locator('.reader-toc').evaluate("e=>e.classList.contains('open')");hit('.reader-toc-close');page.locator('.reader-toc-close').click();assert not page.locator('.reader-toc').evaluate("e=>e.classList.contains('open')");return True
     check('toc-open-close',toc)
     check('source-preserved',lambda:require(page.locator('.reader-content').text_content()==source))
    else:
     page.wait_for_selector('#tk-content .tk-fixed-line');source=page.locator('#tk-content').text_content()
     if a.init_outcome!='normal':
      expected='Check back soon' if a.init_outcome=='error' else 'Loading...'
      check('controlled-'+a.init_outcome+'-path',lambda:require(expected in page.locator('#upcomingList').inner_text()))
     def header():
      box=page.locator('#compactYahrzeit');d=box.evaluate("e=>({position:getComputedStyle(e).position,parent:e.parentElement.className,collapsed:e.classList.contains('collapsed')})");assert d=={'position':'relative','parent':'tk-header','collapsed':True},d;return d
     check('calendar-normal-flow',header)
     def dates():
      hit('#yahrzeitToggleBtn');page.locator('#yahrzeitToggleBtn').click();assert page.locator('#yahrzeitToggleBtn').get_attribute('aria-expanded')=='true';hit('#yahrzeitCloseBtn');page.screenshot(path=str(a.out/f'tikkun-{width}-dates-expanded.png'));h=page.locator('.tk-header h1').bounding_box();box=page.locator('#compactYahrzeit').bounding_box();assert box['y']+box['height']<=h['y'],{'box':box,'heading':h};page.keyboard.press('Escape');assert page.locator('#yahrzeitToggleBtn').get_attribute('aria-expanded')=='false';return True
     check('calendar-open-escape-source-clear',dates)
     check('source-preserved',lambda:require(page.locator('#tk-content').text_content()==source))
    root='.reader-content' if kind=='reader' else '#tk-content'
    for frac in [0,.25,.5,.75,1]:
     page.locator(root).evaluate('(e,f)=>scrollTo({top:scrollY+e.getBoundingClientRect().top+f*Math.max(0,e.offsetHeight-innerHeight+150)-150,behavior:"instant"})',frac);page.wait_for_timeout(150);check('source-scroll-'+str(frac),lambda:scan(root))
    page.screenshot(path=str(a.out/f'{kind}-{width}-final.png'));check('no-overflow',lambda:require(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')));c.close()
  b.close()
finally:
 if server:server.shutdown();server.server_close()
 d=save()
expected=84 if a.init_outcome=='normal' else 44
assert len(rows)==expected,('incomplete matrix',len(rows),expected)
assert len({(r['width'],r['kind']) for r in rows})==(8 if a.init_outcome=='normal' else 4)
print(json.dumps({k:d[k] for k in ['total','passed','failed','pageerrors']}));raise SystemExit(bool(d['failed'] or errors))
