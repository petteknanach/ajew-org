#!/usr/bin/env python3
"""Repair clear reader HE/EN hard pairing mistakes.

Conservative rules only:
- English fields containing only Hebrew text are not English translations. If the Hebrew
  field is empty, move that text to Hebrew; otherwise clear the English field.
- Placeholder English is cleared.
- aligned_segments with numeric-only English (a common LM sentence-align shift) are
  replaced by the paragraph-level segments for that file, because paragraph segments
  already contain the correct bilingual pairing.
- English-only text in Hebrew fields is reported but not auto-deleted unless the English
  side is empty (then move it to English).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from copy import deepcopy

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / 'public' / 'reader'
REPORT = ROOT / 'reports' / 'reader_pairing_hard_repair.md'

HE_RE = re.compile(r'[\u0590-\u05FF]')
LAT_RE = re.compile(r'[A-Za-z]')
PLACEHOLDER_RE = re.compile(r'translation not yet available|not yet translated|TODO|^\s*N/?A\s*$', re.I)
NUMERIC_RE = re.compile(r'^\s*[\d\s.,:;()\[\]\-–—]+\s*$')


def clean_text(value):
    if value is None:
        return ''
    return str(value).strip()


def has_he(s: str) -> bool:
    return bool(HE_RE.search(s or ''))


def has_lat(s: str) -> bool:
    return bool(LAT_RE.search(s or ''))


def repair_pair(obj: dict, path_label: str, changes: list[str], reviews: list[str]) -> None:
    he = clean_text(obj.get('he'))
    en = clean_text(obj.get('en'))

    if en and PLACEHOLDER_RE.search(en):
        obj['en'] = ''
        changes.append(f'{path_label}: cleared placeholder English')
        en = ''

    if en and has_he(en) and not has_lat(en):
        if not he:
            obj['he'] = en
            if not obj.get('he_nikud'):
                obj['he_nikud'] = en
            obj['en'] = ''
            changes.append(f'{path_label}: moved Hebrew-only English field into Hebrew')
        else:
            obj['en'] = ''
            changes.append(f'{path_label}: cleared Hebrew-only English field')
        return

    if he and has_lat(he) and not has_he(he):
        if not en:
            obj['en'] = he
            obj['he'] = ''
            if obj.get('he_nikud') == he:
                obj['he_nikud'] = ''
            changes.append(f'{path_label}: moved English-only Hebrew field into English')
        else:
            reviews.append(f'{path_label}: English-only Hebrew field left for manual review | HE={he[:90]!r} EN={en[:90]!r}')


def iter_nested_segment_dicts(seg: dict):
    if 'he' in seg or 'en' in seg:
        yield ('segment', seg)
    for key in ('beginner', 'intermediate', 'scholarly'):
        v = seg.get(key)
        if isinstance(v, dict) and ('he' in v or 'en' in v):
            yield (key, v)


def aligned_has_numeric_only_en(aligned: list) -> bool:
    for seg in aligned:
        if not isinstance(seg, dict):
            continue
        en = clean_text(seg.get('en'))
        he = clean_text(seg.get('he'))
        if he and en and NUMERIC_RE.match(en) and len(en) <= 20:
            return True
    return False


def normalize_segments_for_aligned(segments: list) -> list:
    out = []
    for i, seg in enumerate(segments, 1):
        if not isinstance(seg, dict):
            continue
        out.append({
            'index': seg.get('index', i),
            'he': seg.get('he', ''),
            'en': seg.get('en', ''),
            **({'he_nikud': seg.get('he_nikud')} if seg.get('he_nikud') else {})
        })
    return out


def main():
    all_changes = []
    all_reviews = []
    files_changed = 0

    for p in sorted(READER.rglob('*.json')):
        if p.name == 'catalog.json':
            continue
        try:
            data = json.loads(p.read_text(encoding='utf-8'))
        except Exception as e:
            all_reviews.append(f'{p.relative_to(ROOT)}: parse error {e}')
            continue

        before = json.dumps(data, ensure_ascii=False, sort_keys=True)
        changes: list[str] = []
        reviews: list[str] = []

        # If sentence-level aligned view is obviously shifted by numeric-only labels,
        # use the paragraph-level pairing instead.
        if isinstance(data.get('segments'), list) and isinstance(data.get('aligned_segments'), list):
            if aligned_has_numeric_only_en(data['aligned_segments']):
                data['aligned_segments'] = normalize_segments_for_aligned(data['segments'])
                changes.append('aligned_segments: replaced numeric-shifted aligned view with paragraph-level pairing')

        for section in ('segments', 'aligned_segments'):
            arr = data.get(section)
            if not isinstance(arr, list):
                continue
            for i, seg in enumerate(arr, 1):
                if not isinstance(seg, dict):
                    continue
                for label, obj in iter_nested_segment_dicts(seg):
                    repair_pair(obj, f'{section}[{i}]/{label}', changes, reviews)

        after = json.dumps(data, ensure_ascii=False, sort_keys=True)
        if after != before:
            p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            files_changed += 1
            rel = p.relative_to(ROOT)
            all_changes.append(f'## {rel}')
            all_changes.extend(f'- {c}' for c in changes[:80])
            if len(changes) > 80:
                all_changes.append(f'- ... {len(changes)-80} more changes')
        for r in reviews:
            all_reviews.append(f'{p.relative_to(ROOT)}: {r}')

    lines = [
        '# Reader hard pairing repair',
        '',
        f'Files changed: {files_changed}',
        '',
        '## Changes',
        *all_changes,
        '',
        '## Manual review left unchanged',
        *('- ' + r for r in all_reviews[:500]),
    ]
    if len(all_reviews) > 500:
        lines.append(f'- ... {len(all_reviews)-500} more review notes')
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'changed_files={files_changed}')
    print(f'report={REPORT}')
    print(f'reviews={len(all_reviews)}')


if __name__ == '__main__':
    main()
