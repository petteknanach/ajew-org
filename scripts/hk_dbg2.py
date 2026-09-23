import re, json
import importlib.util
spec = importlib.util.spec_from_file_location('hk', '/root/ajew-org/scripts/build_hk_verses.py')
# just replicate the classify here
SRC = [
    (r'^ל["״]?ק$', 'LM'), (r'^ל["״]?ת$', 'LM2'),
]
def norm(s):
    s = s.replace('&quot;', '"').replace('&apos;', "'").replace('»', '״')
    s = re.sub(r'([א-ת])["״]\s+([א-ת])', r'\1"\2', s)
    return re.sub(r'\s+', ' ', s).strip()
raw = 'ל״ק מד'
s = norm(raw)
head = s.split(' ')[0].strip('()')
print('head repr:', repr(head), '| codepoints:', [hex(ord(c)) for c in head])
for pat, name in SRC:
    if re.match(pat, head):
        print('MATCH', name)
d = json.load(open('/root/.hermes/cache/scratch/hk_verses_raw.json'))
print('בראשית keys sample:', list(d.get('בראשית', {}))[:8])
print('v1:', d.get('בראשית', {}).get('1'), '| v2:', d.get('בראשית', {}).get('2'))
