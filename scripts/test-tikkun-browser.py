#!/usr/bin/env python3
"""Playwright/real Chrome integration + paint QA. Use the narrow harness, not a full Astro build.
Usage: python scripts/test-tikkun-browser.py --url http://127.0.0.1:8768/reader/tikkun --cdp http://127.0.0.1:9341 --out <evidence>
Requires existing playwright + Pillow. Does not install packages or modify corpus.
"""
import argparse,json,math,pathlib,io
from playwright.sync_api import sync_playwright
from PIL import Image
ap=argparse.ArgumentParser();ap.add_argument('--url',required=True);ap.add_argument('--cdp',required=True);ap.add_argument('--out',type=pathlib.Path,required=True);a=ap.parse_args();a.out.mkdir(parents=True,exist_ok=True)
report={'matrices':[],'errors':[]}
def lum(c):
    c=[v/255 for v in c];c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c];return sum(v*w for v,w in zip(c,[.2126,.7152,.0722]))
def contrast(x,y):
    x,y=sorted([lum(x),lum(y)]);return (y+.05)/(x+.05)
def rgb(s):return [float(v) for v in s[s.index('(')+1:s.index(')')].split(',')[:3]]
with sync_playwright() as p:
    browser=p.chromium.connect_over_cdp(a.cdp,timeout=30000)
    context=browser.new_context(viewport={'width':1440,'height':1100},device_scale_factor=2)
    page=context.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.goto(a.url,wait_until='domcontentloaded');page.wait_for_selector('.tk-fixed-line');page.evaluate('document.fonts.ready')
    cdp=context.new_cdp_session(page);cdp.send('DOM.enable');cdp.send('CSS.enable')
    def fonts(selector):
        doc=cdp.send('DOM.getDocument');n=cdp.send('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':selector})['nodeId']
        return cdp.send('CSS.getPlatformFontsForNode',{'nodeId':n})['fonts']
    report['scrollFonts']=fonts('.tk-fixed-fragment');assert any(x['isCustomFont'] and 'Stam' in x['familyName'] for x in report['scrollFonts'])
    page.select_option('#tk-view','study');page.evaluate('document.fonts.ready');report['readingFonts']=fonts('.tk-study-flow')
    assert any(x['isCustomFont'] and 'Tikun Vowels' in x['familyName'] for x in report['readingFonts'])
    for width,height in [(1440,1100),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        for dark in [False,True]:
            page.evaluate('(v)=>{document.body.classList.toggle("dark-mode",v);document.documentElement.dataset.theme=v?"dark":"light"}',dark)
            for theme in ['day','sepia','night']:
                page.click(f'[data-t="{theme}"]');page.select_option('#tk-view','study');page.evaluate('document.fonts.ready')
                assert page.locator('#tk-content [data-tk-marks*="na:"]').count()>0
                styles=page.evaluate('''()=>{let r={};for(let s of ['#tk-content','.tk-tagline','.tk-controls','select','option','.tk-theme','.tk-sefer-note']){let e=document.querySelector('#tk-app '+s)||document.querySelector(s),c=getComputedStyle(e);r[s]=[c.color,c.backgroundColor]};r.bg=getComputedStyle(document.querySelector('#tk-app')).backgroundColor;r.panel=getComputedStyle(document.querySelector('.tk-controls')).backgroundColor;return r}''')
                ratios={}
                for sel,(fg,bg) in [(k,v) for k,v in styles.items() if isinstance(v,list)]:
                    if bg=='rgba(0, 0, 0, 0)':bg=styles['bg']
                    ratios[sel]=round(contrast(rgb(fg),rgb(bg)),3)
                    assert ratios[sel]>=4.5,(width,dark,theme,sel,ratios[sel])
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('outer overflow',width,theme)
                name=f'after-{width}-{theme}-global-{int(dark)}'
                page.screenshot(path=str(a.out/(name+'-study.png')))
                page.locator('.tk-study-flow').scroll_into_view_if_needed();page.screenshot(path=str(a.out/(name+'-study-text.png')))
                page.select_option('#tk-view','sefer');page.wait_for_selector('.tk-fixed-line');page.evaluate('document.fonts.ready')
                assert page.locator('.tk-fixed-line').count()==84
                assert not page.locator('.tk-fixed-ink .tk-cluster,.tk-fixed-ink .tk-vnum').count()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('outer scroll overflow',width,theme)
                page.screenshot(path=str(a.out/(name+'-scroll.png')))
                page.locator('.tk-scroll-viewport').scroll_into_view_if_needed();page.screenshot(path=str(a.out/(name+'-scroll-text.png')))
                report['matrices'].append({'width':width,'globalDark':dark,'theme':theme,'contrast':ratios})
    page.set_viewport_size({'width':1440,'height':1100});page.click('[data-t="day"]')
    page.evaluate('document.body.classList.remove("dark-mode")')
    # ALL fixed columns, at three zoom sizes: no wrapped rows/overlapping fragments.
    report['layout']=page.evaluate('''async()=>{const f=await(await fetch('/tikkun/fixed-columns.json?v=1')).json(),box=document.getElementById('tk-content'),app=document.getElementById('tk-app');let errors=[],count=0;for(const size of [16,26,44]){app.style.setProperty('--tk-size',size+'px');for(const [n,ls] of Object.entries(f.pages)){box.innerHTML=TikkunRenderer.fixedColumn(ls,+n);for(const l of box.querySelectorAll('.tk-fixed-line')){count++;let r=l.getBoundingClientRect(),fr=[...l.querySelectorAll('.tk-fixed-fragment')].map(e=>{let q=document.createRange();q.selectNodeContents(e);let t=q.getBoundingClientRect();return {l:t.left,r:t.right,w:t.width}}).filter(t=>t.w>0);if(Math.abs(r.height-size*1.65)>1)errors.push([size,n,l.dataset.line,'height',r.height]);for(let i=0;i<fr.length;i++){if(fr[i].l<r.left-1||fr[i].r>r.right+1)errors.push([size,n,l.dataset.line,'overflow',fr[i],{l:r.left,r:r.right}]);if(i&&fr[i].r>fr[i-1].l+1)errors.push([size,n,l.dataset.line,'overlap']);}}}}app.style.setProperty('--tk-size','26px');return {measuredRows:count,errors}}''')
    (a.out/'layout-results.json').write_text(json.dumps(report['layout'],ensure_ascii=False,indent=2))
    assert not report['layout']['errors'],report['layout']['errors'][:10]
    # Interactions: both song layouts, book boundary, written spelling, settings.
    for n in [1,2,78,111,185,210,242,243]:
        page.select_option('#tk-column',str(n));page.wait_for_selector(f'.tk-fixed-page[data-column="{n}"]');page.evaluate('document.fonts.ready')
        page.locator('.tk-scroll-viewport').scroll_into_view_if_needed();page.screenshot(path=str(a.out/f'after-column-{n}.png'));page.locator(f'.tk-fixed-page[data-column="{n}"]').screenshot(path=str(a.out/f'full-column-{n}.png'))
    page.select_option('#tk-view','verses');page.check('#tk-shnayim');page.select_option('#tk-layout','side');page.wait_for_selector('.tk-line-scroll')
    assert page.locator('.tk-line-scroll').evaluate_all('(es)=>es.every(e=>!/[\\u0591-\\u05C3\\u05C7]/.test(e.textContent))')
    page.select_option('#tk-layout','tap');page.locator('.tk-tapverse').first.click();page.locator('.tk-tapverse').first.click();assert page.locator('.tk-tapverse .tk-line-read').count()>0
    # Fresh reading sample for actual colored-mark pixel proof (same origin/font).
    page.goto(a.url+'?b=tanach-bereishit&c=1&view=study',wait_until='domcontentloaded');page.wait_for_selector('#tk-content');page.uncheck('#tk-shnayim');page.select_option('#tk-view','study');page.wait_for_selector('.tk-study-flow');page.evaluate('document.fonts.ready')
    page.evaluate('''()=>{let e=document.createElement('div');e.id='paint-proof';e.dir='rtl';e.style.cssText='font-family:var(--tk-reading);font-size:60px;line-height:2;background:var(--tk-bg);color:var(--tk-ink);padding:20px;width:360px';e.innerHTML='<span id="paint-word">'+TikkunRenderer.token('ב\\u05B0',[[0,0,'na']],[],{mode:'full',marked:true})+'</span>';document.getElementById('tk-app').prepend(e)}''')
    paint=[]
    for theme in ['day','sepia','night']:
        page.click(f'[data-t="{theme}"]');loc=page.locator('#paint-proof');loc.scroll_into_view_if_needed();page.evaluate('document.fonts.ready');png=loc.screenshot();(a.out/f'paint-{theme}.png').write_bytes(png)
        fg=page.locator('#paint-proof').evaluate('(e)=>getComputedStyle(e).getPropertyValue("--tk-na")');fg='rgb('+','.join(str(int(fg.strip()[i:i+2],16)) for i in [1,3,5])+')';ink=page.locator('#paint-proof').evaluate('(e)=>getComputedStyle(e).color')
        im=Image.open(io.BytesIO(png)).convert('RGB');pts=[];base=[];col=rgb(fg);bcol=rgb(ink)
        for y in range(im.height):
            for x in range(im.width):
                v=im.getpixel((x,y))
                if sum(abs(v[i]-col[i]) for i in range(3))<24:pts.append((x,y))
                if sum(abs(v[i]-bcol[i]) for i in range(3))<24:base.append((x,y))
        assert len(pts)>10,(theme,'no teal pixels');assert len(base)>100
        box=lambda ps:[min(x for x,y in ps),min(y for x,y in ps),max(x for x,y in ps),max(y for x,y in ps)]
        m,b=box(pts),box(base);assert m[1]>b[3],(theme,'letter colored rather than subscript',m,b)
        paint.append({'theme':theme,'color':fg,'coloredPixels':len(pts),'markBBox':m,'baseBBox':b,'contrast':contrast(col,rgb(page.locator('#paint-proof').evaluate('(e)=>getComputedStyle(e).backgroundColor')))})
    report['paint']=paint
    assert not report['errors'],report['errors']
    report['pass']=True;(a.out/'browser-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));context.close()
