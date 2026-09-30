#!/usr/bin/env python3
"""Real isolated Chromium tests. Actual site body/assets + RN Web screen.
No emulator, Android build, release or full Astro build.
Run AFTER test-tikkun-column-display.cjs and build-tikun-ui-harness.cjs:
python scripts/test-tikkun-column-browser.py --out <evidence> [--app <app>]
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument('--out', type=Path, required=True)
ap.add_argument('--app', type=Path)
a = ap.parse_args()
out = a.out.resolve()
report = {'platform': 'Private Linux Chromium; site standalone authored-body harness and React Native Web. NOT Android / not full Layout build.', 'website': [], 'app': [], 'errors': [], 'geometry': []}
geometry = r'''e=>{
 const viewport=e.matches('.fixed-viewport,.tk-scroll-viewport')?e:e.querySelector('.fixed-viewport,.tk-scroll-viewport');
 const ink=viewport.querySelector('.fixed-ink,.tk-fixed-ink'), page=viewport.querySelector('.fixed-page,.tk-fixed-page')||viewport.closest('.fixed-page,.tk-fixed-page');
 const fs=parseFloat(getComputedStyle(page).fontSize);
 return {column:+page.dataset.column,size:fs,client:viewport.clientWidth,scroll:viewport.scrollWidth,rows:ink.children.length,inkWidth:ink.getBoundingClientRect().width,first:ink.textContent,outerOverflow:document.documentElement.scrollWidth>innerWidth+1};
}'''
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    def route(req):
        parsed = urlparse(req.request.url)
        path = Path(parsed.path.lstrip('/'))
        file = out/'website.html' if parsed.path.startswith('/reader/tikkun') else ROOT/'public'/path
        if file.is_file():
            suffix = file.suffix
            content_type = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.json':'application/json','.css':'text/css','.ttf':'font/ttf'}.get(suffix,'application/octet-stream')
            req.fulfill(body=file.read_bytes(), content_type=content_type)
        else:
            req.fulfill(status=404, body='Not in isolated fixture')
    context.route('http://scroll.test/**', route)
    page = context.new_page()
    page.on('pageerror', lambda e: report['errors'].append(str(e)))
    def web_open(width, query=''):
        page.set_viewport_size({'width':width,'height':844})
        page.goto('http://scroll.test/reader/tikkun?'+query)
        page.wait_for_selector('.tk-fixed-line')
        page.evaluate("async()=>{await document.fonts.load('28px \"Tikkun Scroll\"');await document.fonts.ready}")
        page.wait_for_function("document.querySelector('.tk-scroll-viewport').style.fontSize !== ''")
    for width in [320,390,768,1280]:
        web_open(width)
        page.click('#tk-column-fit')
        for column in [1,78,242,243,245]:
            page.select_option('#tk-column',str(column))
            page.wait_for_selector(f'.tk-fixed-page[data-column="{column}"]')
            page.evaluate('document.fonts.ready')
            measure = page.locator('.tk-scroll-viewport').evaluate(geometry)
            assert measure['rows'] == 42 and measure['scroll'] <= measure['client']+1, (width,column,measure)
            assert not measure['outerOverflow'],(width,column)
            ink_before = page.locator('.tk-fixed-ink').inner_html()
            rect_before = page.locator('.tk-fixed-ink').evaluate('e=>{const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}}')
            page.check('#tk-column-nikud')
            page.check('#tk-column-taamim')
            page.wait_for_selector('.pointing-unavailable')
            assert page.locator('.tk-fixed-ink').inner_html() == ink_before
            rect_after = page.locator('.tk-fixed-ink').evaluate('e=>{const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}}')
            assert rect_after == rect_before,('pointing moved ink',rect_before,rect_after)
            assert page.locator('#tk-view').input_value() == 'sefer'
            assert page.locator('.tk-study-flow').count() == 0
            page.uncheck('#tk-column-nikud')
            assert page.locator('#tk-column-taamim').is_checked()
            page.locator('.column-pointing-advice summary').click()
            assert not page.locator('.column-companion').evaluate(r"e=>/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/.test(e.textContent)")
            page.uncheck('#tk-column-taamim')
            if column in [1,78,242]:
                page.screenshot(path=str(out/f'website-{width}-column-{column}-fit.png'),full_page=True)
            report['website'].append({'width':width,'column':column,'fit':{k:v for k,v in measure.items() if k!='first'},'independentToggles':True,'unchangedInk':True,'pointing':'explicitly blocked; authentic companion outside ink'})
        # Site controls >=44px at desktop as well as phone sizes, live hit tests.
        controls = page.locator('#tk-column-controls button,#tk-column-controls select,#tk-column-controls .tk-column-chk').evaluate_all('''es=>es.map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.className,h:r.height,w:r.width,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})''')
        assert all(c['h']>=44 for c in controls),controls
        page.select_option('#tk-column','78')
        page.click('#tk-column-more');page.click('#tk-column-more');page.click('#tk-column-more');page.click('#tk-column-more')
        zoomed = page.locator('.tk-scroll-viewport').evaluate(geometry)
        if width<=768: assert zoomed['scroll']>zoomed['client']+10,zoomed
        assert not zoomed['outerOverflow']
        saved = page.evaluate("JSON.parse(localStorage.getItem('tk-settings'))")
        assert saved['columnZoom']==2
        reading_size=page.locator('#tk-size').input_value()
        page.select_option('#tk-view','study');page.wait_for_selector('.tk-study-flow')
        page.locator('#tk-size').fill('44');page.locator('#tk-size').dispatch_event('input')
        page.select_option('#tk-view','sefer');page.wait_for_selector('.tk-fixed-line')
        assert page.locator('.tk-scroll-viewport').evaluate(geometry)['size']==zoomed['size'],'reading size changed column zoom'
        page.screenshot(path=str(out/f'website-{width}-song-zoom.png'),full_page=True)
        page.reload();page.wait_for_selector('.tk-fixed-line')
        assert page.locator('#tk-column-fit').inner_text()=='Fit · 200%'
        assert page.locator('#tk-size').input_value()=='44'
        page.click('#tk-column-fit')
    # Real loaded Stam, not fallback. The font explicitly has blank mark glyphs.
    cdp=context.new_cdp_session(page);cdp.send('DOM.enable');cdp.send('CSS.enable')
    doc=cdp.send('DOM.getDocument');node=cdp.send('DOM.querySelector',{'nodeId':doc['root']['nodeId'],'selector':'.tk-fixed-fragment'})['nodeId']
    fonts=cdp.send('CSS.getPlatformFontsForNode',{'nodeId':node})['fonts']
    report['websiteFonts']=fonts
    assert any(f['isCustomFont'] and 'Stam' in f['familyName'] for f in fonts),fonts
    # All columns x widths x fit/zoom levels; actual loaded font and source rows.
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':844})
        measured=page.evaluate(r'''async width=>{
          const f=await(await fetch('/tikkun/fixed-columns.json')).json(),box=document.getElementById('tk-content'),D=TikkunColumnDisplay;
          let errors=[],rows=0,columns=0;
          for(const zoom of [.5,1,3]) for(const [n,ls] of Object.entries(f.pages)) {
            box.innerHTML='<div class="tk-scroll-viewport"><div class="tk-fixed-strip">'+TikkunRenderer.fixedColumn(ls,+n)+'</div></div>';
            let v=box.firstElementChild,sz=D.fixedDisplaySize(v.getBoundingClientRect().width+36,+n,zoom);v.style.fontSize=sz+'px';columns++;
            if(zoom===1 && v.scrollWidth>v.clientWidth+1)errors.push([zoom,n,'fit-overflow',v.scrollWidth,v.clientWidth]);
            for(const l of box.querySelectorAll('.tk-fixed-line')) {
              rows++;const r=l.getBoundingClientRect(),parts=[...l.querySelectorAll('.tk-fixed-fragment')].map(e=>{const q=document.createRange();q.selectNodeContents(e);return q.getBoundingClientRect();}).filter(r=>r.width>0);
              if(Math.abs(r.height-sz*1.65)>.6)errors.push([zoom,n,l.dataset.line,'row-wrap',r.height,sz]);
              for(let i=0;i<parts.length;i++) {
                if(parts[i].left<r.left-1||parts[i].right>r.right+1)errors.push([zoom,n,l.dataset.line,'fragment-overflow']);
                if(i && parts[i].right>parts[i-1].left+1)errors.push([zoom,n,l.dataset.line,'fragment-overlap']);
              }
            }
          }
          return {width,columns,rows,errors};
        }''',width)
        report['geometry'].append(measured)
        (out/'column-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
        assert measured['rows']==30870 and measured['columns']==735
        assert not measured['errors'],measured['errors'][:10]
    # Reading request failure must not hide source-fixed columns/navigation.
    offline=context.new_page()
    offline.route('**/reader/medooyuk/**',lambda route:route.abort('failed'))
    offline.goto('http://scroll.test/reader/tikkun?b=tanach-shemos&c=15')
    offline.wait_for_selector('.tk-fixed-page[data-column="78"]')
    offline.select_option('#tk-column','242')
    offline.wait_for_selector('.tk-fixed-page[data-column="242"]')
    assert offline.locator('#tk-book').input_value()=='tanach-devarim'
    assert offline.locator('#tk-chapter').input_value()=='31','cross-book offline owner/chapter metadata must follow the navigation index'
    report['websiteOffline']='Fixed ink + complete navigation survive independent reading-book request failures. Static files still required; not a site offline-download claim.'
    offline.close()
    # Pointing data failure remains visible, ink intact.
    bad=context.new_page();bad.route('**/column-pointing.json*',lambda route:route.fulfill(status=500,body='error'))
    bad.goto('http://scroll.test/reader/tikkun')
    bad.wait_for_selector('.tk-fixed-line');bad.check('#tk-column-nikud')
    bad.wait_for_selector('.pointing-unavailable')
    assert 'unavailable' in bad.locator('.pointing-unavailable').inner_text()
    assert bad.locator('.tk-fixed-line').count()==42
    report['pointingFetchFailure']='Visible unavailability; no swapped/reflowed ink'
    bad.close()
    # All three local themes and actual checkbox/zoom surfaces.
    web_open(390)
    for theme in ['day','sepia','night']:
        page.click(f'[data-t="{theme}"]');page.check('#tk-column-nikud');page.check('#tk-column-taamim')
        page.screenshot(path=str(out/f'website-390-{theme}-controls.png'),full_page=True)
        assert page.locator('.tk-fixed-line').count()==42
    context.close()
    if a.app:
        context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
        page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
        for width in [320,390,768,1280]:
            page.set_viewport_size({'width':width,'height':844})
            for book,chapter,column in [('bereishit',1,1),('shemos',15,78),('devarim',32,242)]:
                page.goto((out/'tikun-ui.html').as_uri()+f'?book=tanach-{book}&chapter={chapter}&offline=1')
                frame=page.frame_locator('[data-testid="tikun-document"]')
                frame.locator(f'.fixed-page[data-column="{column}"]').wait_for()
                # onLayout is exercised by the native-webview stub's RN View.
                page.wait_for_function(f"document.querySelector('iframe').contentDocument.querySelector('.fixed-page') && Math.abs(parseFloat(getComputedStyle(document.querySelector('iframe').contentDocument.querySelector('.fixed-page')).fontSize)-({min(28,(width-38)/(29.8 if column==78 else 23.8 if column in [242,243] else 22.8))}))<.01")
                frame.locator('html').evaluate("async()=>{await document.fonts.load('28px FixedStam');await document.fonts.ready}")
                measure=frame.locator('.fixed-viewport').evaluate(geometry)
                assert measure['rows']==42 and measure['scroll']<=measure['client']+1,measure
                assert not measure['outerOverflow']
                ink=frame.locator('.fixed-ink').inner_html()
                page.get_by_role('switch',name='ניקוד נלווה',exact=True).click()
                frame.locator('.pointing-unavailable').wait_for()
                assert frame.locator('.fixed-ink').inner_html()==ink
                page.get_by_role('switch',name='טעמים נלווים',exact=True).click()
                page.wait_for_function('window.qa.saved.columnNikud && window.qa.saved.columnTaamim')
                assert frame.locator('.fixed-ink').inner_html()==ink
                page.get_by_role('switch',name='ניקוד נלווה',exact=True).click()
                page.wait_for_function('window.qa.saved.columnNikud===false && window.qa.saved.columnTaamim===true')
                assert frame.locator('.fixed-line').count()==42 and not frame.locator('.reading-verse').count()
                page.get_by_role('switch',name='טעמים נלווים',exact=True).click()
                page.get_by_role('button',name='+',exact=True).click()
                page.wait_for_function('window.qa.saved.columnZoom===1.25')
                zoom=frame.locator('.fixed-viewport').evaluate(geometry)
                assert zoom['scroll']>zoom['client']+10 if width<=768 else True
                assert abs(zoom['size']/measure['size']-1.25)<.005
                page.get_by_role('button',name='התאמה · 125%',exact=True).click()
                page.wait_for_function('window.qa.saved.columnZoom===1')
                buttons=page.get_by_role('button',name='+',exact=True).bounding_box()
                assert buttons is not None
                assert buttons['width']>=44 and buttons['height']>=44
                assert page.locator('html').evaluate('e=>e.scrollWidth<=innerWidth+1')
                page.screenshot(path=str(out/f'app-rn-web-{width}-column-{column}-fit.png'))
                report['app'].append({'width':width,'column':column,'fit':{k:v for k,v in measure.items() if k!='first'},'zoom':1.25,'independentPersistedControls':True,'offline':True,'pointing':'source blocker explicitly visible, not fake overlay'})
        context.close()
    assert not report['errors'],report['errors']
    report['pass']=True;report['browserVersion']=browser.version
    browser.close()
(out/'column-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['website','app']},ensure_ascii=False,indent=2))
