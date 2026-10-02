#!/usr/bin/env python3
"""Source/identity checks and rejecting controls for the bounded Klali import."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
spec = importlib.util.spec_from_file_location('klali_import', Path(__file__).with_name('import-klali-sources.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
app = Path(sys.argv[1]).resolve()
expected = m.build(app)
actual = json.loads((m.ROOT/'src/data/tikkun-klali.json').read_text())
checks = 0

def equal(a,b):
    global checks
    checks += 1
    assert a == b

def audit(data):
    equal(data, expected)
    refs = []
    for ch in data['chapters']:
        c = ch['chapter']
        equal([v['index'] for v in ch['verses']], list(range(1,m.COUNTS[c]+1)))
        for row in ch['verses']:
            ref = f"{c}:{row['index']}"
            refs.append(ref)
            equal(bool(row['en']), row['index'] not in m.MISSING[c])
            equal(row['he'], json.loads((app/'assets/tikkun-klali-raw.json').read_text())[str(c)][row['index']-1])
    equal(len(refs),164); equal(len(set(refs)),164)
    equal(set(data['annotated']), set(refs+['95:1','95:2','95:3']))

audit(actual)
rejected = []
for label, mutate in [
    ('omitted verse',lambda d:d['chapters'][0]['verses'].pop(4)),
    ('ritual heading deleted',lambda d:d['chapters'][4].update(ritualHeading='')),
    ('duplicate identity',lambda d:d['chapters'][0]['verses'][4].update(index=4)),
    ('shifted English',lambda d:d['chapters'][0]['verses'][4].update(en=d['chapters'][0]['verses'][5]['en'])),
    ('pointing substitution',lambda d:d['chapters'][0]['verses'][0].update(he=d['chapters'][0]['verses'][0]['he'].replace('ָ','ַ',1))),
    ('annotation deletion',lambda d:d['annotated'].pop('16:5')),
    ('annotation reclassification',lambda d:d['annotated']['16:1']['m'].append([0,0,'qk',0])),
    ('qere mutation',lambda d:d['annotated']['16:1']['k'].__setitem__(0,1)),
]:
    bad=copy.deepcopy(actual);mutate(bad)
    try: audit(bad)
    except AssertionError: rejected.append(label)
    else: raise AssertionError('Mutation not detected: '+label)
for label,kw in [('legacy source drift',{'legacy':b'changed'}),('Original source drift',{'original':b'changed'})]:
    try: m.build(app,**kw)
    except ValueError: rejected.append(label)
    else: raise AssertionError('Source hash not enforced')
report={'checks':checks,'chapters':len(actual['chapters']),'originalVerses':sum(len(c['verses'])for c in actual['chapters']),
        'englishVerses':sum(bool(v['en'])for c in actual['chapters']for v in c['verses']),
        'annotatedVersesIncludingPrelude':len(actual['annotated']), 'mutationsRejected':rejected,
        'restored':actual['source']['missingRestored'],'recoveredEnglish':actual['source']['joinedEnglishSeparated']}
print(json.dumps(report,ensure_ascii=False,indent=2))
