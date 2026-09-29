#!/usr/bin/env python3
"""Real-browser ink: intact COLR clusters vs unsplit original font marks.
All-word OpenType preservation is separately tested by test-tikkun-font-shaping.py.
"""
import argparse,pathlib,json,io
from PIL import Image
from playwright.sync_api import sync_playwright
ap=argparse.ArgumentParser();ap.add_argument('--url',required=True);ap.add_argument('--cdp',required=True);ap.add_argument('--out',type=pathlib.Path,required=True);a=ap.parse_args()
cases=[{'t':'ב\u05b0','base':'ב','m':[[0,0,'na']],'color':(0,102,91),'kind':'na'}, {'t':'ב\u05b8','base':'ב','m':[[0,0,'qk']],'color':(161,46,37),'kind':'qk'}, {'t':'א\u05bd','base':'א','m':[],'color':(105,68,170),'kind':'meteg'}]
results=[]
with sync_playwright() as p:
 b=p.chromium.connect_over_cdp(a.cdp);cx=b.new_context(viewport={'width':1440,'height':1100},device_scale_factor=3);page=cx.new_page();page.goto(a.url+'?view=study');page.wait_for_selector('.tk-study-flow');page.evaluate('document.fonts.ready');page.click('[data-t="day"]')
 page.evaluate('''()=>{let e=document.createElement('div');e.id='pixel-baseline';e.dir='rtl';e.style.cssText='width:300px;height:160px;box-sizing:border-box;padding:20px;background:var(--tk-bg);color:var(--tk-ink);font-family:var(--tk-reading);line-height:120px';document.getElementById('tk-app').prepend(e)}''')
 for size in [16,26,60]:
  for index,case in enumerate(cases):
   loc=page.locator('#pixel-baseline');loc.evaluate('(e,n)=>e.style.fontSize=n+"px"',size)
   loc.evaluate('(e,c)=>e.innerHTML=TikkunRenderer.token(c.t,c.m,[],{mode:"full",marked:true})',case);loc.scroll_into_view_if_needed();page.evaluate('document.fonts.ready')
   marked=Image.open(io.BytesIO(loc.screenshot())).convert('RGB')
   loc.evaluate('(e,c)=>e.textContent=c.t',case);plain=Image.open(io.BytesIO(loc.screenshot())).convert('RGB')
   loc.evaluate('(e,c)=>e.textContent=c.base',case);base=Image.open(io.BytesIO(loc.screenshot())).convert('RGB')
   if size==60 or (size==16 and index==1):marked.save(a.out/f'anchor-{size}-{index}-marked.png');plain.save(a.out/f'anchor-{size}-{index}-plain.png');base.save(a.out/f'anchor-{size}-{index}-base.png')
   original=[];colored=[];changed_base=0;base_pixels=0
   # These three non-descending bases deliberately isolate BELOW-base ink.
   # Full-word ligatures/descenders are checked by the separate HarfBuzz suite.
   base_bottom=max(y for y in range(base.height) for x in range(base.width) if max(base.getpixel((x,y)))<130)
   for y in range(base_bottom+1,marked.height):
    for x in range(marked.width):
     m=marked.getpixel((x,y))
     # Recognize anti-aliased palette ink by its blend direction. A broad
     # RGB-distance threshold mistakes red LCD edges of BLACK letters for qk.
     bg=(255,253,247);direction=[bg[i]-case['color'][i] for i in range(3)];delta=[bg[i]-m[i] for i in range(3)]
     alpha=sum(delta[i]*direction[i] for i in range(3))/sum(d*d for d in direction)
     if .2<alpha<1.03 and max(abs(delta[i]-alpha*direction[i]) for i in range(3))<9:colored.append((x,y))
   assert colored,(size,index,'no color')
   x0,y0=min(x for x,y in colored)-2,min(y for x,y in colored)-2
   x1,y1=max(x for x,y in colored)+2,max(y for x,y in colored)+2
   # Compare to the UNCHANGED POINTED word, not the bare consonant: fonts may
   # insert spacing glyphs only when a vowel is present. A displaced mark has
   # no original black ink in this region and therefore fails this test.
   for y in range(plain.height):
    for x in range(plain.width):
     v=plain.getpixel((x,y));m=marked.getpixel((x,y))
     if y>base_bottom:
      if max(v)<130:original.append((x,y))
     elif max(v)<70:
      base_pixels+=1
      if max(abs(m[i]-v[i]) for i in range(3))>40:changed_base+=1
   assert original and colored,(size,index,'missing actual pixels')
   center=lambda pts:(sum(x for x,y in pts)/len(pts),sum(y for x,y in pts)/len(pts))
   u,v=center(original),center(colored);dx,dy=(v[0]-u[0])/3,(v[1]-u[1])/3
   assert abs(dx)<1 and abs(dy)<1,(size,index,dx,dy,'colorbox',(x0,y0,x1,y1),'referencebox',(min(x for x,y in original),min(y for x,y in original),max(x for x,y in original),max(y for x,y in original)),'counts',len(colored),len(original))
   assert changed_base==0,(size,index,'consonant altered',changed_base)
   if size==60 and case['kind']=='na':assert len(colored)>len(original),'sheva is not visibly emboldened'
   results.append({'size':size,'kind':case['kind'],'dxCssPixels':round(dx,4),'dyCssPixels':round(dy,4),'referencePixels':len(original),'coloredPixels':len(colored),'basePixels':base_pixels,'changedBasePixels':changed_base})
 cx.close()
report={'pass':True,'comparisons':results,'maxAbsoluteDelta':max(max(abs(r['dxCssPixels']),abs(r['dyCssPixels'])) for r in results)}
(a.out/'anchor-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
