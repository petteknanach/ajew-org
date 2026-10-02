#!/usr/bin/env python3
"""Bounded, offline import. Edition identities are explicit; no fuzzy alignment.
Usage: python3 scripts/import-klali-sources.py ../app-klali-followup [--check]
The reviewed row map is bound to the complete archived page hash. A changed
source fails closed; never shift English by a restored Hebrew row's position.
"""
import hashlib
import html
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MISSING = {16:[5],32:[],41:[10],42:[4,9],59:[6,14],77:[9],90:[7],105:[10,12,14,16,23],137:[4,7],150:[]}
COUNTS = {16:11,32:11,41:14,42:12,59:18,77:21,90:17,105:45,137:9,150:6}
# Reviewed joined transliteration/translation cells: split only the existing dot
# boundary; no English is authored, corrected, or imported from another edition.
SPLIT = {'16:4','41:9','42:3','42:8','59:5','59:13','77:8','90:6','105:9','105:11','105:13','105:15','105:22','105:45','137:3','137:6','137:9'}

def sha(data): return hashlib.sha256(data).hexdigest()
def checked(data, expected):
    if sha(data) != expected: raise ValueError('Source hash changed; reference map requires review')
    return data

def build(app, legacy=None, original=None):
    legacy = legacy if legacy is not None else (ROOT/'audit/klali/legacy-tikkun-klali.astro.txt').read_bytes()
    original = original if original is not None else (app/'assets/tikkun-klali-raw.json').read_bytes()
    checked(legacy, '94e95ddb89e33fc9dfe4c3126170ef290e4a37a7279dae7bdde031e3897faecb')
    checked(original, 'c3479e8e59659720af4087dfd0e89138cf8d7ca5959c39a718979ababf266a40')
    originals = json.loads(original)
    text = legacy.decode()
    chapters = []
    seen_splits = set()
    for block in re.findall(r'<section class="content-section psalm-section">(.*?)</section>', text, re.S):
        ch = int(re.search(r'Psalm (\d+)', block)[1])
        rows = re.findall(r'<div class="verse">(.*?)</div>', block, re.S)
        refs = [v for v in range(1, COUNTS[ch]+1) if v not in MISSING[ch]]
        assert len(refs) == len(rows) and len(originals[str(ch)]) == COUNTS[ch]
        retained = {}
        for v, row in zip(refs, rows):
            ref = f'{ch}:{v}'
            def field(name):
                m = re.search(r'<p class="verse-'+name+r'"[^>]*>(.*?)</p>', row, re.S)
                return html.unescape(re.sub('<[^>]+>', '', m[1])) if m else ''
            en, translit = field('english'), field('transliteration')
            if ref in SPLIT:
                assert not en and '.' in translit
                translit, dot, en = translit.partition('.')
                translit += dot
                assert en and en[0] != ' '
                seen_splits.add(ref)
            assert en
            retained[v] = {'legacyHebrew':field('hebrew'), 'legacyTransliteration':translit, 'en':en}
        title_match = re.search(r'<h2>(.*?)</h2>', block)
        subtitle_match = re.search(r'<p class="psalm-subtitle">(.*?)</p>', block, re.S)
        assert title_match
        chapters.append({'chapter':ch, 'title':html.unescape(title_match[1]),
                         'ritualHeading':html.unescape(re.sub('<[^>]+>', '', subtitle_match[1])) if subtitle_match else '',
                         'verses':[
            {'index':v, 'he':originals[str(ch)][v-1], **retained.get(v, {'en':'', 'legacyHebrew':'', 'legacyTransliteration':''})}
            for v in range(1, COUNTS[ch]+1)]})
    assert seen_splits == SPLIT
    assert [c['chapter'] for c in chapters] == list(COUNTS)
    annotated = {}
    corpus = json.loads((ROOT/'public/reader/medooyuk/tanach-tehillim.json').read_text())
    source_hashes = {}
    for ch in [*COUNTS,95]:
        path = app/f'assets/data/succos/psalms/{ch}.json'
        raw = path.read_bytes()
        source_hashes[str(ch)] = sha(raw)
        source = json.loads(raw)
        assert source['chapter'] == ch
        wanted = source['segments'] if ch != 95 else source['segments'][:3]
        seen = set()
        for seg in wanted:
            v = seg['index']
            assert v not in seen
            seen.add(v)
            # Exact authentic annotations from both owned delivery paths.
            assert seg['medooyuk'] == corpus['ch'][str(ch)][str(v)]
            annotated[f'{ch}:{v}'] = seg['medooyuk']
    return {'source':{'original':'Owned app Original Hebrew; copied byte-exact by chapter and verse',
                     'originalSha256':sha(original), 'legacySha256':sha(legacy),
                     'english':'Existing standalone page; retained by explicit Hebrew verse identity. Not a newly verified translation. Missing entries remain unavailable.',
                     'annotated':'Owned UXLC 2.5 Psalms and existing frozen annotations; independent Hebrew edition',
                     'annotatedChapterHashes':source_hashes,
                     'missingRestored':[f'{c}:{v}' for c, vs in MISSING.items() for v in vs],
                     'joinedEnglishSeparated':sorted(SPLIT)},
            'chapters':chapters, 'annotated':annotated}

if __name__ == '__main__':
    app = Path(sys.argv[1]).resolve()
    output = json.dumps(build(app), ensure_ascii=False, indent=2)+'\n'
    target = ROOT/'src/data/tikkun-klali.json'
    if '--check' in sys.argv:
        assert target.read_text() == output, 'Imported output differs'
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(output)
    print(json.dumps({'chapters':len(COUNTS),'originalVerses':sum(COUNTS.values()),'restored':sum(map(len,MISSING.values())), 'englishRecovered':len(SPLIT)}))
