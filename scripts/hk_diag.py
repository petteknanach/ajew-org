import re
t = open('/root/.hermes/cache/scratch/hk_ocr.txt').read()
lines = [l for l in t.split(chr(10)) if l.strip()]
band = lines[17160:18116]
refcnt = sum(1 for l in band if re.search(r'\((ל|ר|ראה|ל״|ל")', l))
numcnt = sum(1 for l in band if re.match(r'^[א-ת]{1,3}\s', l.strip()))
print('band lines:', len(band), '| lines with refs:', refcnt, '| lines starting with hebrew letters:', numcnt)
for l in band[40:60]:
    print('|', l[:110])
