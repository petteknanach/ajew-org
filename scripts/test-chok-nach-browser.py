#!/usr/bin/env python3
"""No-build browser smoke: exact Chok page body/style/scripts, owned JSON.
This omits the site's shared Layout, so it is local desktop/mobile web proof,
not a compiled page, native app, or deployed release.
"""
import hashlib, json, pathlib, re, threading, sys
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, unquote, urlencode
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(sys.argv[1]).resolve()
CORPUS = pathlib.Path(sys.argv[2]).resolve()
EVIDENCE = pathlib.Path(sys.argv[3]).resolve()
EVIDENCE.mkdir(parents=True, exist_ok=True)
PUBLIC = ROOT / 'public'
consumed = {}
def read(p):
    b = p.read_bytes()
    consumed[str(p)] = hashlib.sha256(b).hexdigest()
    return b
def resolve(rel):
    candidate = PUBLIC / rel
    return candidate if candidate.is_file() else CORPUS / rel
def data(rel):
    return json.loads(read(resolve(rel)))
astro = read(ROOT / 'src/pages/reader/chok.astro').decode()
body_match = re.search(r'<Layout\b[^>]*>([\s\S]*?)</Layout>', astro)
style_match = re.search(r'<style is:global>([\s\S]*?)</style>', astro)
assert body_match and style_match
body = body_match.group(1)
styles = style_match.group(1)
scripts = ''.join(re.findall(r'<script src="[^"]+" defer></script>', astro))
html = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<style>' + styles + '</style></head><body>' + body + scripts + '</body></html>').encode()
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        rel = unquote(urlsplit(self.path).path).lstrip('/')
        if rel == 'reader/chok/': raw, mime = html, 'text/html; charset=utf-8'
        else:
            p = resolve(rel)
            if not p.is_file() or not any(p.resolve().is_relative_to(r) for r in [PUBLIC.resolve(), CORPUS.resolve()]):
                self.send_error(404); return
            raw = read(p)
            mime = 'application/json' if p.suffix == '.json' else 'application/javascript' if p.suffix == '.js' else 'font/woff2' if p.suffix == '.woff2' else 'application/octet-stream'
        self.send_response(200)
        self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Content-Security-Policy',"default-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'")
        self.end_headers(); self.wfile.write(raw)
    def log_message(self,format,*args): pass
server = ThreadingHTTPServer(('127.0.0.1',0), Handler)
thread = threading.Thread(target=server.serve_forever,daemon=True); thread.start()
base = 'http://127.0.0.1:' + str(server.server_port)
cases = [
    ('בראשית','יום שני','navi','tanach-yeshayahu',42,7,12,'full'),
    ('תולדות','יום שלישי','navi','tanach-malachi',1,13,14,'short'),
    ('שמיני','יום חמישי','navi','tanach-shmuel-b',6,25,23,'empty'),
    ('מקץ','יום חמישי','kesuvim','tanach-mishlei',9,19,18,'empty'),
    ('חוקת','יום שני','kesuvim','tanach-tehillim',43,1,5,'short'),
    ('בהעלותך','יום ראשון','kesuvim','tanach-tehillim',1,1,6,'full'),
]
schedule = data('reader/chok/schedule.json')
def num(n):
    if n == 15: return 'טו״'
    if n == 16: return 'טז״'
    out = ''
    for v,l in [(400,'ת'),(300,'ש'),(200,'ר'),(100,'ק'),(90,'צ'),(80,'פ'),(70,'ע'),(60,'ס'),(50,'נ'),(40,'מ'),(30,'ל'),(20,'כ'),(10,'י'),(9,'ט'),(8,'ח'),(7,'ז'),(6,'ו'),(5,'ה'),(4,'ד'),(3,'ג'),(2,'ב'),(1,'א')]:
        while n >= v: out += l; n -= v
    return out + '״'
rows = []
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path='/usr/bin/google-chrome',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        for width in [390,1280]:
            context = browser.new_context(viewport={'width':width,'height':900},locale='en-US',timezone_id='Asia/Jerusalem')
            page = context.new_page()
            for index,(week,day,key,slug,c,start,end,kind) in enumerate(cases):
                errors = []; network = []
                on_error = lambda e: errors.append(str(e))
                on_request = lambda r: network.append(r.url)
                page.on('pageerror',on_error); page.on('request',on_request)
                sec = schedule['weeks'][week]['days'][day][key]
                assert sec['from']['c'] == c
                expected = [f'({num(c)},{num(v)})' for v in range(start,end+1)]
                chapter = data('reader/medooyuk/' + slug + '.json')['ch'][str(c)]
                assert all(str(v) in chapter for v in range(start,end+1))
                page.goto(base + '/reader/chok/?' + urlencode({'sec':key,'week':week,'day':day}),wait_until='domcontentloaded')
                page.wait_for_selector('section[data-sec="' + key + '"]',timeout=20000)
                loc = page.locator('section[data-sec="' + key + '"]')
                actual = loc.locator('.tk-vnum').all_text_contents()
                text = loc.inner_text()
                rect = loc.bounding_box()
                boundary_ok = kind == 'full' or (loc.locator('.ck-nach-boundary').count() == 1 and ('No verses' if kind == 'empty' else 'Only ' + str(len(expected)) + ' of 6') in text)
                font_ok = not expected or loc.locator('.marked-hebrew').count() > 0
                own_only = all(u.startswith(base + '/') for u in network)
                policy_ok = 'historical tradition' in text and 'Independent six-verse study policy' in text
                screenshot = EVIDENCE / f'browser-{width}-{index}-{kind}.png'
                page.screenshot(path=str(screenshot))
                row = {'width':width,'week':week,'day':day,'section':key,'kind':kind,'pass':actual==expected and boundary_ok and font_ok and own_only and policy_ok and not errors,
                       'actual':actual,'expected':expected,'boundary':boundary_ok,'markedRenderer':font_ok,'policyDisclosure':policy_ok,'allRequestsLocal':own_only,'pageErrors':errors,'sectionRect':rect,
                       'screenshot':screenshot.name,'screenshotSHA256':hashlib.sha256(screenshot.read_bytes()).hexdigest()}
                rows.append(row)
                print(('PASS ' if row['pass'] else 'FAIL ') + json.dumps(row,ensure_ascii=False))
                page.remove_listener('pageerror',on_error); page.remove_listener('request',on_request)
            context.close()
        browser.close()
finally:
    server.shutdown(); server.server_close(); thread.join(timeout=5)
report = {'passed':all(r['pass'] for r in rows),'cases':rows,'consumed':[{'file':p,'sha256':h} for p,h in sorted(consumed.items())],
          'qualification':'Local mobile/desktop Chromium; exact candidate Chok body/styles/scripts with owned JSON, without shared Astro Layout. Not native, full build or live release.'}
(EVIDENCE / 'browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
assert len(rows)==12 and report['passed']
