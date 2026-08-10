#!/usr/bin/env python3
"""Build 30 exact bilingual Torah 26 phrase studies across all five aligned Sefaria leaves."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/26'
SPAN = re.compile(r'<span data-inline-phrase="[^"]+">(.*?)</span>')
# Passage 4 is the exact two-word leaf "והשיב להם:" / "And [Rabbi Yehoshua] answered them:";
# keep it as one substantive exact phrase and distribute the remaining studies broadly.
DISTRIBUTION = {1: 5, 3: 6, 4: 7, 5: 1, 6: 11}


def unspan(value):
    return SPAN.sub(r'\1', value or '')


def chunks(text, count):
    words = list(re.finditer(r'\S+', text))
    if len(words) < count * 2:
        raise RuntimeError(f'not enough words for {count} phrases: {text}')
    result = []
    for i in range(count):
        start = (i * len(words)) // count
        end = ((i + 1) * len(words)) // count
        piece = text[words[start].start():words[end - 1].end()].strip(' ,;:.—–-')
        if len(re.sub(r'[^A-Za-z0-9א-ת]', '', piece)) < 5:
            raise RuntimeError(f'phrase too short: {piece}')
        result.append(piece)
    return result


def inline_all(text, phrases):
    cursor = 0
    output = []
    for pid, phrase in phrases:
        at = text.find(phrase, cursor)
        if at < 0:
            raise RuntimeError(f'anchor {pid}: {phrase}')
        output.extend((text[cursor:at], f'<span data-inline-phrase="{pid}">{phrase}</span>'))
        cursor = at + len(phrase)
    output.append(text[cursor:])
    return ''.join(output)


def clean(value):
    return re.sub(r'\s+', ' ', re.sub(r'[*_#`]', '', value or '')).strip()[:700]


def main():
    study_path = BASE / 'torah-study.json'
    study = json.loads(study_path.read_text(encoding='utf-8'))
    pettek = json.loads((ROOT / 'public/reader/pettek-nanach-commentary/torah-26.json').read_text(encoding='utf-8-sig'))
    segments = study['segments']
    if len(segments) != 6 or segments[1].get('type') != 'structuralNote':
        raise RuntimeError('display records')
    for segment in segments:
        for key in ('he', 'he_nikud', 'en'):
            if segment.get(key):
                segment[key] = unspan(segment[key])
    phrases = []
    for segment_index, count in DISTRIBUTION.items():
        segment = segments[segment_index - 1]
        he_parts = chunks(segment['he'], count)
        nikud_parts = chunks(segment['he_nikud'], count)
        en_parts = chunks(segment['en'], count)
        he_anchors, nikud_anchors, en_anchors = [], [], []
        classic = int(segment['classicSegment'])
        commentary_records = [z for z in pettek['segments'] if segment_index in z.get('alignedPassages', [])]
        record = commentary_records[0] if commentary_records else pettek['segments'][min(classic - 1, 5)]
        layers = record['layers']
        note = clean((layers.get('beginner') or {}).get('en') or (layers.get('intermediate') or {}).get('en') or (layers.get('scholarly') or {}).get('he'))
        for ordinal, (he, hn, en) in enumerate(zip(he_parts, nikud_parts, en_parts), 1):
            pid = f'{segment_index}-{ordinal}'
            he_anchors.append((pid, he)); nikud_anchors.append((pid, hn)); en_anchors.append((pid, en))
            phrases.append({'id': pid, 'segment': segment_index, 'he': he, 'en': en, 'enMatch': en, 'info': f'“{en}” — {note}'[:1000], 'source': segment['sourceRef'], 'classicSegment': classic, 'sourceRef': segment['sourceRef']})
        segment['he'] = inline_all(segment['he'], he_anchors)
        segment['he_nikud'] = inline_all(segment['he_nikud'], nikud_anchors)
        segment['en'] = inline_all(segment['en'], en_anchors)
    if len(phrases) != 30 or {z['segment'] for z in phrases} != {1, 3, 4, 5, 6}:
        raise RuntimeError('phrase distribution')
    study_path.write_text(json.dumps(study, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (BASE / 'phrase-study.json').write_text(json.dumps({'title': 'Torah 26 phrase-by-phrase study guide', 'status': 'Editorial navigation aid — sourced Hebrew and English remain textually unchanged', 'selectedPassages': [1, 3, 4, 5, 6], 'distribution': DISTRIBUTION, 'phrases': phrases}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared 30 exact, non-overlapping bilingual Torah 26 phrase entries across all 5 aligned passages.')


if __name__ == '__main__':
    main()
