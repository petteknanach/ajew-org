import re
t = open('/root/.hermes/cache/scratch/hk_ocr.txt').read()
lines = [l for l in t.split(chr(10)) if l.strip()]
for i in range(17160, 17175):
    l = lines[i]
    if '(ל' in l:
        print(i, repr(l[:150]))
        refs = re.findall(r'\(([^()]{2,60})\)', l)
        print('   refs found:', refs)
        for raw in refs:
            s = raw.replace('&quot;', '"').replace('&apos;', "'").replace('»', '״')
            s = re.sub(r'([א-ת])["״]\s+([א-ת])', r'\1"\2', s)
            print('   norm:', repr(s), '-> head:', repr(re.sub(r'\s+', ' ', s).strip().split(' ')[0].strip('()')))
