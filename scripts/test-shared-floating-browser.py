#!/usr/bin/env python3
"""Actual live or compiled full-Layout regression; never inject candidate CSS/JS.
Requires playwright and a Linux Chrome executable. --base https://ajew.org
reads production; --dist serves a bounded real Astro build with --public assets.
All observations, failures, exact fetched frontend hashes and screenshots persist.
Exit status gates candidate checks AND repaired shared-control cases;
other existing failures remain explicit and are NOT a whole-site acceptance.
"""
import argparse, hashlib, json, mimetypes, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, urlsplit, unquote
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base')
parser.add_argument('--dist',type=Path)
parser.add_argument('--public',type=Path)
parser.add_argument('--out',type=Path,required=True)
args=parser.parse_args(); args.out.mkdir(parents=True,exist_ok=True)
server=None
if args.dist:
 assert args.public
 class Handler(BaseHTTPRequestHandler):
  def do_GET(self):
   rel=unquote(urlsplit(self.path).path).lstrip('/')
   for root in [args.dist,args.public]:
    p=root/rel
    if p.is_dir():p=p/'index.html'
    if p.is_file() and p.resolve().is_relative_to(root.resolve()):break
   else:
    try:self.send_error(404)
    except (BrokenPipeError,ConnectionResetError):pass
    return
   raw=p.read_bytes();self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(p)[0] or 'application/octet-stream');self.send_header('Content-Length',str(len(raw)));self.end_headers()
   try:self.wfile.write(raw)
   except (BrokenPipeError,ConnectionResetError):pass
  def log_message(self,format,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 args.base='http://127.0.0.1:'+str(server.server_port)
assert args.base
# Use actual text ranges and actual topmost hit targets, not bounding boxes alone.
OCCLUSION=r'''({root,selectors})=>{
 const scope=document.querySelector(root);if(!scope)throw Error('missing source root '+root);
 const controls=selectors.flatMap(s=>[...document.querySelectorAll(s)]).filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=='hidden'&&s.display!=='none'});
 let count=0,hits=[];const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let n;
 while(n=walker.nextNode()){
  if(n.parentElement.closest('script,style,#compactYahrzeit'))continue;
  for(let i=0;i<n.length;i++){
   if(!n.textContent[i].trim())continue;
   const range=document.createRange();range.setStart(n,i);range.setEnd(n,i+1);const r=range.getBoundingClientRect();
   if(!r.width||!r.height||r.bottom<56||r.top>innerHeight-64)continue;count++;
   for(const e of controls){const q=e.getBoundingClientRect();const l=Math.max(r.left,q.left,0),t=Math.max(r.top,q.top,56),rr=Math.min(r.right,q.right,innerWidth),bb=Math.min(r.bottom,q.bottom,innerHeight-64);
    if(rr<=l||bb<=t)continue;const hit=document.elementFromPoint((l+rr)/2,(t+bb)/2);
    if(e.contains(hit))hits.push({char:n.textContent[i],source:n.parentElement.className,control:e.id||e.className,rect:r.toJSON()});
   }
  }
 }
 return {visibleCharacters:count,hits,scrollY,viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth};
}'''
HIT=r'''e=>{const r=e.getBoundingClientRect();const points=[[.5,.5],[.15,.15],[.85,.15],[.15,.85],[.85,.85]].map(([x,y])=>{const px=r.left+x*r.width,py=r.top+y*r.height,t=document.elementFromPoint(px,py);return {x:px,y:py,ok:!!t&&e.contains(t),top:t?.tagName,id:t?.id}});return {rect:r.toJSON(),points,ok:!!r.width&&!!r.height&&points.every(p=>p.ok)}}'''
SELECTORS=['#compactYahrzeit','.commentary-sidebar-handle','.commentary-sidebar-toggle','.reader-toc-toggle','#ajew-audio-player','#backToTop']
rows=[];assets={};errors=[]
def save():
 report={'base':args.base,'kind':'compiled-full-Layout' if args.dist else 'actual-live','rows':rows,'assets':list(assets.values()),'pageErrors':errors}
 report['counts']={scope:{'total':sum(r['scope']==scope for r in rows),'failed':sum(r['scope']==scope and not r['pass'] for r in rows)} for scope in ['candidate','existing']}
 (args.out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 return report

def require(v):
 assert v
 return v

try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  for width in [320,390,768,1280]:
   for kind in ['chok','lens','reader']:
    c=b.new_context(viewport={'width':width,'height':900},device_scale_factor=1,locale='en-US',timezone_id='Asia/Jerusalem',has_touch=width<1024)
    page=c.new_page();page.set_default_timeout(15000)
    page.on('pageerror',lambda e:errors.append({'width':width,'kind':kind,'error':str(e)}))
    def asset(resp):
     url=resp.url
     if url.startswith(args.base) and (resp.request.resource_type in ['document','stylesheet','script']):
      try:
       raw=resp.body();key=urlsplit(url).path;assets[key]={'url':url,'path':key,'status':resp.status,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
      except Exception as e:assets[url]={'url':url,'error':str(e)}
    page.on('response',asset)
    def shot(name):
     p=args.out/f'{kind}-{width}-{name}.png';page.screenshot(path=str(p));return {'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    def check(name,fn,scope=None):
     scope=scope or ('existing' if kind=='reader' else 'candidate')
     row={'width':width,'page':kind,'name':name,'scope':scope}
     try:row['details']=fn();row['pass']=True
     except Exception as e:row['pass']=False;row['error']=str(e);row['screenshot']=shot('FAIL-'+name)
     rows.append(row);save();print(width,kind,name,'PASS' if row['pass'] else 'FAIL',flush=True)
     return row
    def hit(sel,click=False):
     loc=page.locator(sel).first;loc.evaluate('(e)=>e.scrollIntoView({block:"center",behavior:"instant"})');page.wait_for_timeout(150);r=loc.evaluate(HIT);assert r['ok'],r
     if click:loc.click();page.wait_for_timeout(350)
     return r
    def candle_corners():
     """Five real pointer activations, focus/Escape, and the close hit surface."""
     source=page.locator('.reader-content-original' if kind=='reader' else '.header-verse').all_text_contents()
     journeys=[]
     for index in range(5):
      target=hit('#yahrzeitToggleBtn');point=target['points'][index]
      page.mouse.click(point['x'],point['y']);page.wait_for_timeout(350)
      assert page.locator('#yahrzeitToggleBtn').get_attribute('aria-expanded')=='true'
      assert page.locator('#yahrzeitCloseBtn').evaluate('e=>e===document.activeElement')
      close=hit('#yahrzeitCloseBtn')
      if index==0:shot('followup-candle-expanded')
      page.keyboard.press('Escape');page.wait_for_timeout(350)
      assert page.locator('#yahrzeitToggleBtn').get_attribute('aria-expanded')=='false'
      assert page.locator('#yahrzeitToggleBtn').evaluate('e=>e===document.activeElement')
      journeys.append({'toggle':target,'activatedPoint':index,'close':close})
     assert source==page.locator('.reader-content-original' if kind=='reader' else '.header-verse').all_text_contents()
     return {'journeys':journeys,'screenshot':shot('followup-candle-collapsed')}
    path={'chok':'/reader/chok/?'+urlencode({'sec':'navi','week':'תולדות','day':'יום שלישי'}),'lens':'/torah-lens/','reader':'/reader/chayey-moharan/siman/241/'}[kind]
    page.goto(args.base+path,wait_until='domcontentloaded')
    page.wait_for_function("getComputedStyle(document.querySelector('#compactYahrzeit')).display!=='none'",timeout=22000)
    page.evaluate('document.fonts.ready');page.wait_for_timeout(500)
    check('viewport',lambda:require(page.evaluate('innerWidth')==width))
    if kind=='chok':
     page.wait_for_selector('.ck-nach-boundary',state='attached');page.wait_for_timeout(500)
     original=page.locator('#ck-content').inner_text()
     def scan(name):
      r=page.evaluate(OCCLUSION,{'root':'#ck-content','selectors':['#compactYahrzeit']});r['screenshot']=shot(name)
      assert r['visibleCharacters']>0 and not r['hits'],r
      return r
     check('deep-link-source-uncovered',lambda:scan('deep-link'))
     def other_fixed_controls():
      # Gate the Chok utility rail against actual source ink. The
      # desktop has no bottom tab bar: scan through the viewport's bottom.
      probe=OCCLUSION.replace('innerHeight-64','innerHeight') if width>=1024 else OCCLUSION
      v=page.evaluate(probe,{'root':'#ck-content','selectors':['#backToTop','.hitbodedut-fab','#voice-input-btn','#page-agent-toggle']})
      v['screenshot']=shot('other-fixed-controls')
      assert v['visibleCharacters']>0 and not v['hits'],v
      return v
     check('other-fixed-source-uncovered',other_fixed_controls,scope='existing')
     for sel,name in [('.ck-sec-head','reference'),('.ck-nach-boundary','boundary'),('.ck-nach-policy','policy')]:
      if page.locator(sel).count():
       page.locator(sel).first.evaluate('(e)=>e.scrollIntoView({block:"start",behavior:"instant"})');page.wait_for_timeout(200)
       check(name+'-uncovered',lambda n=name:scan(n))
     def normal_flow():
      v=page.locator('#compactYahrzeit').evaluate("e=>({position:getComputedStyle(e).position,header:e.parentElement.classList.contains('ck-header'),collapsed:e.classList.contains('collapsed')})")
      assert v=={'position':'relative','header':True,'collapsed':True},v
      return v
     check('normal-flow-opt-in',normal_flow)
     page.evaluate('scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(300)
     check('toggle-reachable',lambda:hit('#yahrzeitToggleBtn'))
     shot('header-collapsed')
     def expand():
      hit('#yahrzeitToggleBtn',True);r=page.locator('#compactYahrzeit').bounding_box();h=page.locator('.ck-header h1').bounding_box()
      assert r['y']+r['height']<=h['y'] and r['x']>=0 and r['x']+r['width']<=width,{'widget':r,'heading':h}
      assert page.locator('#yahrzeitCloseBtn').evaluate('(e)=>e===document.activeElement')
      assert page.locator('#compactYahrzeit').evaluate('(e)=>e.clientHeight>=44&&e.scrollHeight>=e.clientHeight')
      close=page.locator('#yahrzeitCloseBtn').bounding_box()
      first=page.locator('#compactYahrzeit .yahrzeit-section:visible').first.bounding_box()
      assert close['y']+close['height']<=first['y'],{'close':close,'firstDate':first}
      return {'widget':r,'heading':h,'close':hit('#yahrzeitCloseBtn'),'screenshot':shot('header-expanded')}
     check('expanded-header-uncovered',expand)
     def escape():
      page.locator('#yahrzeitCloseBtn').focus();page.keyboard.press('Escape');page.wait_for_timeout(350)
      assert page.locator('#yahrzeitToggleBtn').get_attribute('aria-expanded')=='false'
      assert page.locator('#yahrzeitToggleBtn').evaluate('(e)=>e===document.activeElement')
      return hit('#yahrzeitToggleBtn')
     check('escape-collapse-focus',escape)
     for theme in ['night','sepia','day']:
      page.locator('.ck-theme[data-t="'+theme+'"]').click();page.wait_for_timeout(200)
      check(theme+'-dates-access',lambda:hit('#yahrzeitToggleBtn'))
     check('source-preserved-through-disclosure',lambda:require(page.locator('#ck-content').inner_text()==original))
     def dismiss():
      hit('#yahrzeitToggleBtn',True);hit('#yahrzeitCloseBtn',True)
      assert not page.locator('#compactYahrzeit').is_visible()
      assert page.evaluate('Number(localStorage.getItem("ajew-yahrzeit-dismissed"))>Date.now()')
      page.reload(wait_until='domcontentloaded');page.wait_for_timeout(1500)
      assert not page.locator('#compactYahrzeit').is_visible()
      return True
     check('dismiss-persists',dismiss)
    elif kind=='lens':
     def lens_flow():
      v=page.locator('#compactYahrzeit').evaluate("e=>({position:getComputedStyle(e).position,header:e.parentElement.classList.contains('lens-header'),collapsed:e.classList.contains('collapsed')})")
      assert v=={'position':'relative','header':True,'collapsed':True},v
      return v
     check('lens-normal-flow-opt-in',lens_flow)
     check('candle-five-point-journeys',candle_corners)
     def lens_source():
      hit('#yahrzeitToggleBtn',True)
      v=page.evaluate(OCCLUSION,{'root':'.lens-header','selectors':['#compactYahrzeit']})
      widget=page.locator('#compactYahrzeit').bounding_box();title=page.locator('.header-ornament').bounding_box()
      assert widget['y']+widget['height']<=title['y'] and not v['hits'],v
      page.keyboard.press('Escape');page.wait_for_timeout(350)
      return v
     check('lens-expanded-source-uncovered',lens_source)
     for theme in ['light','dark']:
      if theme=='dark':
       toggle='#theme-toggle-sidebar' if width>=1024 else '#theme-toggle-mobile'
       check('theme-pointer-reachable',lambda:hit(toggle),scope='existing')
       # Retain the original keyboard contrast journey, plus real pointer use.
       def pointer_theme():
        states=[]
        for expected in ['sepia','night','day']:
         target=hit(toggle,True)
         state=page.evaluate("({saved:localStorage.getItem('ajew-theme'),rendered:document.documentElement.getAttribute('data-theme')||'day',dark:document.body.classList.contains('dark-mode')})")
         assert state=={'saved':expected,'rendered':expected,'dark':expected=='night'},state
         states.append({'state':state,'hit':target})
        return states
       check('theme-pointer-cycle',pointer_theme)
       page.locator(toggle).focus();page.keyboard.press('Space');page.keyboard.press('Space');page.wait_for_timeout(350)
       check('dark-theme-active',lambda:require(page.locator('body').evaluate('e=>e.classList.contains("dark-mode")')))
      page.locator('#lensInput').evaluate('(e)=>e.scrollIntoView({block:"center",behavior:"instant"})');page.wait_for_timeout(200)
      def contrast():
       v=page.locator('#lensInput').evaluate("e=>({placeholder:getComputedStyle(e,'::placeholder').color,opacity:getComputedStyle(e,'::placeholder').opacity,background:getComputedStyle(e.parentElement).backgroundColor,inputBackground:getComputedStyle(e).backgroundColor})")
       import re
       def lum(css):
        rgb=[float(x)/255 for x in re.findall(r'[\d.]+',css)[:3]]
        return sum((v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4)*w for v,w in zip(rgb,[.2126,.7152,.0722]))
       lo,hi=sorted([lum(v['placeholder']),lum(v['background'])]);v['ratio']=(hi+.05)/(lo+.05);v['screenshot']=shot(theme+'-placeholder')
       assert v['ratio']>=4.5 and v['opacity']=='1' and v['inputBackground']=='rgba(0, 0, 0, 0)',v
       return v
      check(theme+'-placeholder-contrast',contrast)
      check(theme+'-input-hit',lambda:hit('#lensInput'))
      check(theme+'-search-hit',lambda:hit('#lensSearchBtn'))
     def search():
      page.locator('#lensInput').fill('earthquake');hit('#lensSearchBtn',True);page.wait_for_selector('#lensResults',state='visible')
      text=page.locator('#lensResults').inner_text();assert len(text)>50;return {'length':len(text),'screenshot':shot('search-results')}
     check('search-still-works',search)
     def lens_dismiss():
      hit('#yahrzeitToggleBtn',True);close=hit('#yahrzeitCloseBtn',True)
      assert not page.locator('#compactYahrzeit').is_visible()
      page.reload(wait_until='domcontentloaded');page.wait_for_timeout(1500)
      assert not page.locator('#compactYahrzeit').is_visible()
      return close
     check('lens-candle-dismiss-persists',lens_dismiss)
    else:
     page.wait_for_selector('#ajew-audio-player',state='attached')
     if page.locator('#commentary-sidebar').evaluate('e=>e.classList.contains("is-open")'):
      check('initial-commentary-close',lambda:hit('#commentary-sidebar-close',True))
     page.locator('.reader-content-original .segment-he p').first.evaluate('(e)=>window.scrollTo({top:e.getBoundingClientRect().top+scrollY-150,behavior:"instant"})');page.wait_for_timeout(300)
     def reading():
      r=page.evaluate(OCCLUSION,{'root':'.reader-content-original','selectors':SELECTORS});r['screenshot']=shot('reading')
      assert r['visibleCharacters']>40 and not r['hits'],r
      return r
     check('idle-source-uncovered',reading)
     def audio():
      hit('#mobile-audio-btn' if width<1024 else '.ajew-ap-close',True)
      assert not page.locator('#ajew-audio-player').evaluate('e=>e.classList.contains("collapsed")')
      v=hit('.ajew-ap-close',True)
      if width<1024:assert page.locator('#mobile-audio-btn').evaluate('e=>e===document.activeElement')
      return v
     check('audio-open-close',audio)
     def toc():
      hit('.reader-toc-toggle',True);assert page.locator('.reader-toc').evaluate('e=>e.classList.contains("open")');return hit('.reader-toc-close',True)
     check('toc-open-close',toc)
     def commentary():
      hit('#commentary-sidebar-handle',True);assert page.locator('#commentary-sidebar').evaluate('e=>e.classList.contains("is-open")');return hit('#commentary-sidebar-close',True)
     check('commentary-open-close',commentary)
     check('candle-five-point-journeys',candle_corners,scope='candidate')
     def candle():
      hit('#yahrzeitToggleBtn',True);assert not page.locator('#compactYahrzeit').evaluate('e=>e.classList.contains("collapsed")');shot('candle-expanded');return hit('#yahrzeitCloseBtn',True)
     check('candle-open-dismiss',candle)
    check('no-horizontal-overflow',lambda:require(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')))
    c.close();save()
  b.close()
finally:
 if server:server.shutdown();server.server_close()
 report=save()
print(json.dumps(report['counts']))
assert len({(r['width'],r['page']) for r in rows})==12, 'incomplete width/page matrix'
assert not errors, errors
repaired=lambda r: r['name'] in ['candle-open-dismiss','theme-pointer-reachable']
assert len([r for r in rows if repaired(r)])==8, 'incomplete repaired-control matrix'
raise SystemExit(any(not r['pass'] for r in rows))
