#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 12 phrase studies without changing sourced words."""
from __future__ import annotations
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/12'
SELECTED = list(range(1, 60, 2))  # 30 bilingual passages; excludes Hebrew-only passage 40.
SPAN = re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')

def unspan(value): return SPAN.sub(r'\1', value or '')
def words(value, count):
    match = re.search(r'\S+(?:\s+\S+){0,%d}' % (count - 1), str(value))
    return match.group(0).strip(' ,;:.—–-') if match else ''
def clean(value):
    value = re.sub(r'[*_#`]', '', value or '')
    return re.sub(r'\s+', ' ', value).strip()[:650].rstrip()
def inline(value, phrase, phrase_id):
    if phrase not in value: raise RuntimeError(f'Cannot exactly anchor {phrase_id}: {phrase!r}')
    return value.replace(phrase, f'<span data-inline-phrase="{phrase_id}">{phrase}</span>', 1)

def main():
    study = json.loads((BASE / 'torah-study.json').read_text(encoding='utf-8'))
    pettek = json.loads((ROOT / 'public/reader/pettek-nanach-commentary/torah-12.json').read_text(encoding='utf-8'))
    commentary = {int(item['relatedSegment']): item for item in pettek['segments']}
    by_index = {int(item['index']): item for item in study['segments']}
    phrases = []
    for segment in study['segments']:
        for key in ('he', 'he_nikud', 'en'): segment[key] = unspan(segment.get(key, ''))
    for index in SELECTED:
        segment = by_index[index]
        if segment.get('hebrewOnly') or not segment.get('en'):
            raise RuntimeError(f'Phrase selection {index} is not bilingual')
        classic = int(segment['classicSegment'])
        layers = commentary[classic]['layers']
        note = clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en'))
        he = words(segment['he'], 9); he_nikud = words(segment['he_nikud'], 9)
        en_match = words(segment['en'], 14); direct = words(segment['en'], 11)
        phrase_id = f'{index}-1'
        if not all((he, he_nikud, en_match, direct, note)):
            raise RuntimeError(f'Phrase {phrase_id} is not substantive')
        segment['he'] = inline(segment['he'], he, phrase_id)
        segment['he_nikud'] = inline(segment['he_nikud'], he_nikud, phrase_id)
        segment['en'] = inline(segment['en'], en_match, phrase_id)
        phrases.append({'id': phrase_id, 'segment': index, 'he': he, 'en': direct,
          'enMatch': en_match, 'info': f'“{direct}” — {note}'[:900].rstrip(),
          'source': segment['sourceRef'], 'classicSegment': classic, 'sourceRef': segment['sourceRef']})
    (BASE / 'torah-study.json').write_text(json.dumps(study, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (BASE / 'phrase-study.json').write_text(json.dumps({
      'title': 'Torah 12 phrase-by-phrase study guide',
      'status': 'Editorial navigation aid — sourced Hebrew and English remain textually unchanged',
      'phrases': phrases}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared 30 exact bilingual Torah 12 phrase-study entries.')

if __name__ == '__main__': main()
