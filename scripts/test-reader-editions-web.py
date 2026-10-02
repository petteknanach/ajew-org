"""Actual Astro Reader + real source/renderer in local Chromium, phone and desktop.
Usage: python scripts/test-reader-editions-web.py <base-url> <evidence-dir>
No renderer/network fixture replacements except deliberate failure/delay controls.
"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright
base,out=sys.argv[1],pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
reports=[]
def assert_source(page, pointed=True):
    expected=page.evaluate(r"""async pointed=>{const m=location.pathname.match(/reader\/(tanach-[^/]+)\/1\/(\d+)/);const d=await (await fetch('/reader/'+m[1]+'/part-1/torah-'+m[2]+'.json')).json();return d.segments.map(s=>pointed?(s.he_nikud||s.he):s.he)}""",pointed)
    assert page.locator('.reader-content .segment-he p').all_text_contents()==expected
    return expected
def original(page):page.locator('[data-edition=original]').click()
def alternate(page):
    page.locator('[data-edition=uxlc]').click();page.wait_for_function("document.querySelector('#reader-edition-status').textContent.includes('available verses.')")
def goto(page,book='tehillim',ch=67):
    page.goto(f'{base}/reader/tanach-{book}/1/{ch}/');page.locator('#btn-reader-special').wait_for()
    tools=page.locator('#reader-tools-toggle')
    if tools.is_visible() and tools.get_attribute('aria-expanded')=='false': tools.click()
def wait_status(page,text):page.wait_for_function('(s)=>document.querySelector("#reader-edition-status").textContent.includes(s)',arg=text)
def all_alt(page):
    expected=page.evaluate(r"""async()=>{const m=location.pathname.match(/reader\/(tanach-[^/]+)\/1\/(\d+)/),a=AjewReaderSourceExact;const [d,t]=await Promise.all([fetch('/reader/medooyuk/'+m[1]+'.json').then(r=>r.json()),fetch('/reader-source-tails.json?v=1').then(r=>r.json())]);return a.prepare(d.ch[m[2]],m[1],m[2],t).map(v=>a.text(v))}""")
    assert page.locator('.reader-content .segment-he p').all_text_contents()==expected
    return expected
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox'])
    for width in [390,1365]:
        context=browser.new_context(viewport={'width':width,'height':900},is_mobile=width==390,has_touch=width==390)
        context.add_init_script("if(!localStorage.getItem('ajew-reader-prefs'))localStorage.setItem('ajew-reader-prefs',JSON.stringify({nikud:true,mode:'both',fontFamily:'david',fontSize:24}));window.qaCopies=[];Object.defineProperty(navigator,'clipboard',{value:{writeText:async s=>{qaCopies.push(s)}}});")
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));requests=[];page.on('request',lambda r:requests.append(r.url))
        goto(page);assert page.locator('[data-edition=original]').get_attribute('aria-pressed')=='true';assert page.locator('#btn-reader-special').get_attribute('aria-pressed')=='false'
        assert not any('/medooyuk/' in u for u in requests);source=assert_source(page)
        for selector in ['[data-edition=original]','[data-edition=uxlc]','#btn-reader-special']:
            box=page.locator(selector).bounding_box();assert box['height']>=44 and box['x']>=0 and box['x']+box['width']<=width
        # Legacy same-page source stays byte-exact when special is opted in.
        page.locator('#btn-reader-special').click();wait_status(page,'0/8 source-matched');assert_source(page)
        assert 'יָאֵר' in source[1] or 'יָאֵֽר' in source[1] or '־' not in source[1]
        page.locator('details:has(summary:text("Edition and mark details"))').evaluate('(e)=>e.open=true')
        page.locator('.reader-edition-controls').screenshot(path=str(out/f'site-{width}-controls.png'))
        alternate(page);expected=all_alt(page);assert 'יָ֤אֵ֥־ר' in expected[1];assert page.locator('[data-mode=english]').is_disabled()
        assert page.evaluate("AjewReader.getState().mode")=='both'
        page.keyboard.press('e');assert page.evaluate("AjewReader.getState().mode")=='both'
        page.locator('#seg-2 .ajew-segment-actions button').filter(has_text='Copy teaching').click()
        copied=page.evaluate('qaCopies.at(-1)');assert copied.startswith(expected[1]+'\n\n— ');assert 'edition=uxlc' in copied;assert 'UXLC annotated alternative' in copied
        page.evaluate('document.fonts.ready');assert page.evaluate("document.fonts.check('24px AjewMarked-day')")
        page.locator('#seg-2 .segment-he').screenshot(path=str(out/f'site-{width}-uxlc67-2.png'))
        # Search sees contiguous displayed text, not fragmented vowel spans.
        page.locator('#btn-search').click();page.locator('.reader-search-bar input').fill('אלהים יחננו');page.wait_for_function("document.querySelectorAll('.search-highlight').length>0")
        assert page.locator('.reader-content .marked-hebrew').count()==0;all_alt(page)
        page.locator('.reader-search-bar input').fill('');page.wait_for_function("document.querySelectorAll('.reader-content .marked-hebrew').length>0")
        page.locator('.search-close').click()
        # Bare toggle cannot restore a pointed snapshot; emphasis is independent.
        page.locator('#btn-nikud').click();bare=page.evaluate('(rows)=>rows.map(AjewReaderSourceExact.bare)',expected)
        assert page.locator('.reader-content .segment-he p').all_text_contents()==bare;assert page.locator('.mark').count()==0
        original(page);assert_source(page,False);assert page.locator('.reader-content').evaluate("e=>e.classList.contains('mode-both')")
        page.locator('#btn-nikud').click();assert_source(page)
        # Original eligible chapter paint and source, theme + font preference retained.
        goto(page,'bereishit',1);wait_status(page,'12/31 source-matched');assert_source(page)
        assert page.locator('.mark.na').count()>0;page.locator('#seg-1').screenshot(path=str(out/f'site-{width}-original-matched.png'))
        page.locator('[data-theme-btn=night]').click();assert_source(page)
        page.evaluate('document.fonts.ready');assert page.evaluate("document.fonts.check('24px AjewMarked-night')")
        page.locator('#seg-1').screenshot(path=str(out/f'site-{width}-night.png'))
        page.locator('#btn-reader-special').click();assert_source(page)
        page.select_option('#font-family-select','noto');assert page.evaluate("AjewReader.getState().fontFamily")=='noto'
        alternate(page);assert page.locator('.marked-hebrew').count()==0;all_alt(page)
        original(page);assert_source(page);assert 'Noto Serif Hebrew' in page.locator('.segment-he p').first.evaluate('(e)=>getComputedStyle(e).fontFamily')
        page.reload();wait_status(page,'Original Hebrew');assert_source(page);assert page.evaluate("AjewReader.getState().fontFamily")=='noto'
        # Long chapter includes all alternative verse identities + last-source search/share.
        goto(page,'tehillim',119);alternate(page);expected=all_alt(page);assert len(expected)==176
        page.locator('#btn-search').click();page.locator('.reader-search-bar input').fill('תעיתי כשה אבד');page.wait_for_function("document.querySelector('#seg-176 .search-highlight')")
        page.locator('#seg-176 .ajew-segment-actions button').filter(has_text='Copy teaching').click();assert page.evaluate('qaCopies.at(-1)').startswith(expected[-1]+'\n\n— ')
        page.locator('.search-close').click();original(page);assert_source(page)
        # Actual qere/tail path, including bare copy and independent underline.
        goto(page,'bereishit',24);alternate(page);qere_rows=all_alt(page)
        qere=page.locator('#seg-33 .marked-qere').first
        assert qere.text_content()=='וַיּוֻשַׂ֤ם';assert qere.evaluate('(e)=>getComputedStyle(e).textDecorationLine')=='underline'
        assert qere_rows[32].endswith('וַיֹּ֖אמֶר דַּבֵּֽר׃')
        page.locator('#btn-nikud').click()
        bare_qere=page.evaluate('(s)=>AjewReaderSourceExact.bare(s)',qere_rows[32])
        assert page.locator('#seg-33 .segment-he p').text_content()==bare_qere
        page.locator('#seg-33 .ajew-segment-actions button').filter(has_text='Copy teaching').click()
        assert page.evaluate('qaCopies.at(-1)').startswith(bare_qere+'\n\n— ')
        page.locator('#btn-nikud').click();original(page);assert_source(page)
        # Browser back returns correct source/edition on the original route.
        goto(page,'tehillim',67);page.go_back();page.locator('#btn-reader-special').wait_for();assert_source(page)
        assert not errors,errors
        reports.append({'viewport':width,'pass':True,'cases':['fresh Original/no metadata','44px controls','exact source on/off','editorial internal maqaf alternative','all-source search','bare roundtrip','edition-labelled exact share','eligible original marks','night font loaded','font/language persisted','176 verses/last search/share','qere/tail and bare share','browser back'],'browser':browser.version})
        context.close()
    # Legacy migration, explicit off sticks after reload; never silently select UXLC.
    context=browser.new_context();context.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('ajew-special-nikud','1');localStorage.setItem('seeded','1');}")
    page=context.new_page();goto(page);wait_status(page,'0/8 source-matched');assert page.locator('[data-edition=original]').get_attribute('aria-pressed')=='true';assert_source(page,False)
    page.locator('#btn-reader-special').click();page.reload();wait_status(page,'Special nikud is optional');assert page.locator('#btn-reader-special').get_attribute('aria-pressed')=='false';context.close()
    # Delayed completion + rejected requests must retain CURRENT selection, no fallback lie.
    context=browser.new_context(service_workers='block');page=context.new_page();goto(page)
    page.evaluate("""()=>{const f=window.fetch;window.releaseMetadata=null;window.fetch=(url,...args)=>String(url).includes('/medooyuk/')?new Promise(resolve=>{window.releaseMetadata=()=>resolve(f(url,...args))}):f(url,...args)}""")
    page.locator('[data-edition=uxlc]').click();wait_status(page,'Loading UXLC');assert page.locator('.reader-content .segment-he p').count()==0
    original(page);page.locator('#btn-reader-special').click()
    page.wait_for_function("typeof window.releaseMetadata==='function'");page.evaluate('releaseMetadata()');wait_status(page,'0/8 source-matched')
    assert page.locator('[data-edition=original]').get_attribute('aria-pressed')=='true';assert_source(page,False)
    page.locator('#btn-reader-special').click()
    page.reload();page.locator('#btn-reader-special').wait_for();page.route('**/reader/medooyuk/**',lambda r:r.abort())
    page.locator('[data-edition=uxlc]').click();wait_status(page,'alternative unavailable');assert page.locator('.reader-content .segment-he p').count()==0
    page.screenshot(path=str(out/'site-unavailable.png'));original(page);assert_source(page,False)
    page.locator('#btn-reader-special').click();wait_status(page,'metadata unavailable');assert_source(page,False)
    page.unroute('**/reader/medooyuk/**');page.locator('#reader-edition-retry').click();wait_status(page,'0/8 source-matched');assert_source(page,False)
    context.close();browser.close()
reports.append({'pass':True,'cases':['legacy 1 migrates emphasis only','explicit off persistence','late fetch cannot restore stale edition','unavailable alternative has no original fallback','original retained on metadata failure','retry succeeds']})
(out/'site-browser.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(json.dumps(reports,ensure_ascii=False,indent=2))
