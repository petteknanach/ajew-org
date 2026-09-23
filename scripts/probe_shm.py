import urllib.request, urllib.parse, json, os, re

BASE = 'https://www.sefaria.org.il/api'
HDR = {'User-Agent': 'Mozilla/5.0'}

import time, subprocess
def get(url):
    last = None
    for i in range(4):
        p = subprocess.run(['curl', '-s', '-A', 'Mozilla/5.0', '--max-time', '60', url],
                           capture_output=True)
        if p.returncode == 0 and p.stdout:
            return p.stdout.decode('utf-8', 'replace')
        last = RuntimeError('curl failed ' + str(p.returncode))
        time.sleep(2 + 2 * i)
    raise last

idx = json.loads(get(BASE + '/api/index/' + urllib.parse.quote("Sha'ar HaMitzvot")))
nodes = []
def walk(n):
    if n.get('nodeType') == 'JaggedArrayNode' and n.get('key') not in ('Introduction',):
        nodes.append(n)
    for c in n.get('nodes', []) or []:
        walk(c)
for n in idx['schema']['nodes']:
    walk(n)
print(len(nodes), 'parshiyos')
cache = '/root/.hermes/cache/scratch/shm'
os.makedirs(cache, exist_ok=True)
hits = {}
for n in nodes:
    key = n['key']
    f = cache + '/' + key + '.json'
    if not os.path.exists(f):
        try:
            u = BASE + '/api/v3/texts/' + urllib.parse.quote("Sha'ar HaMitzvot, " + key) + '?version=he'
            d = json.loads(get(u))
            json.dump(d, open(f, 'w'))
        except Exception as e:
            print(key, 'ERR', e)
            continue
    try:
        d = json.load(open(f))
        txt = json.dumps(d.get('versions', d), ensure_ascii=False)
        flat = re.sub(r'"[^"]*?[""]', '', txt)
        flat = json.dumps(d, ensure_ascii=False)
    except Exception as e:
        print(key, 'read err', e)
        continue
    score = flat.count('לימוד התורה') + flat.count('כוונת תורה') + flat.count('תורה לשמה') + flat.count('לשמה')
    if score:
        hits[key] = score
print('HITS:', sorted(hits.items(), key=lambda kv: -kv[1])[:12])
