#!/usr/bin/env python3
"""Focused HE/EN reader pairing audit.

This intentionally does NOT count Hebrew-only or English-only books as "misaligned".
It only flags files that already contain bilingual segments and show markers that
usually mean bad pairing/rendering: wrong language in field, placeholder text,
number-only translations, extreme one-sided segment length, or aligned_segments
that disagree with paragraph segments at the opening.
"""
from __future__ import annotations

import json, re
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / 'public' / 'reader'
REPORT = ROOT / 'reports' / 'reader_pairing_audit_focused.md'

HE_RE = re.compile(r'[\u0590-\u05FF]')
LAT_RE = re.compile(r'[A-Za-z]')
PLACEHOLDER_RE = re.compile(r'translation not yet available|not yet translated|TODO|^\s*N/?A\s*$', re.I)
NUMERIC_RE = re.compile(r'^\s*[\d\s.,:;()\[\]\-–—]+\s*$')


def has_he(s: str) -> bool: return bool(HE_RE.search(s or ''))
def has_lat(s: str) -> bool: return bool(LAT_RE.search(s or ''))
def clean(s: str) -> str: return re.sub(r'\s+', ' ', (s or '')).strip()
def tokens(s: str) -> int: return len(clean(s).split())

def iter_segment_texts(seg):
    """Yield (label, he, en) pairs from all supported segment formats."""
    if not isinstance(seg, dict):
        return
    if 'he' in seg or 'en' in seg:
        yield ('segment', clean(str(seg.get('he') or '')), clean(str(seg.get('en') or '')))
    # PNC / layered objects and flat strings
    b = seg.get('beginner'); inter = seg.get('intermediate'); schol = seg.get('scholarly')
    if isinstance(b, str) or isinstance(inter, str) or isinstance(schol, str):
        yield ('layered-flat', clean(str(inter or '')), clean(str(b or '')))
    for key in ('beginner','intermediate','scholarly'):
        v = seg.get(key)
        if isinstance(v, dict):
            yield (key, clean(str(v.get('he') or '')), clean(str(v.get('en') or '')))


def audit_file(p: Path):
    try:
        data = json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        return {'parse_error': str(e), 'flags': [('parse_error', str(e), '', '')], 'total': 0, 'bilingual': 0}
    flags=[]; total=0; bilingual=0
    for section in ('segments','aligned_segments'):
        arr = data.get(section)
        if not isinstance(arr, list): continue
        for i, seg in enumerate(arr, 1):
            for label, he, en in iter_segment_texts(seg):
                total += 1
                if he and en: bilingual += 1
                loc = f'{section}[{i}]/{label}'
                # Wrong language or mixed field markers
                if en and has_he(en) and not has_lat(en):
                    flags.append(('hebrew_in_english_field', loc, he[:180], en[:180]))
                if he and has_lat(he) and not has_he(he):
                    flags.append(('english_in_hebrew_field', loc, he[:180], en[:180]))
                if en and PLACEHOLDER_RE.search(en):
                    flags.append(('placeholder_english', loc, he[:180], en[:180]))
                if he and PLACEHOLDER_RE.search(he):
                    flags.append(('placeholder_hebrew', loc, he[:180], en[:180]))
                if he and en and NUMERIC_RE.match(en) and len(en.strip()) <= 20:
                    flags.append(('numeric_only_english', loc, he[:180], en[:180]))
                if he and en:
                    ht, et = tokens(he), tokens(en)
                    if ht >= 30 and et <= 3:
                        flags.append(('long_he_tiny_en', loc, he[:180], en[:180]))
                    elif et >= 45 and ht <= 3:
                        flags.append(('tiny_he_long_en', loc, he[:180], en[:180]))
    # Opening mismatch between paragraph and aligned view can confuse users.
    segs = data.get('segments') if isinstance(data.get('segments'), list) else []
    als = data.get('aligned_segments') if isinstance(data.get('aligned_segments'), list) else []
    if segs and als:
        s0 = segs[0] if isinstance(segs[0], dict) else {}
        a0 = als[0] if isinstance(als[0], dict) else {}
        she, sen = clean(str(s0.get('he') or '')), clean(str(s0.get('en') or ''))
        ahe, aen = clean(str(a0.get('he') or '')), clean(str(a0.get('en') or ''))
        if she and ahe and she[:20] != ahe[:20]:
            flags.append(('aligned_opening_differs_from_segments', 'aligned_segments[1]', she[:180], ahe[:180]))
        if sen and aen and sen[:24] != aen[:24]:
            flags.append(('aligned_english_opening_differs_from_segments', 'aligned_segments[1]', sen[:180], aen[:180]))
    return {'flags': flags, 'total': total, 'bilingual': bilingual}


def severity(flags, total, bilingual):
    if any(f[0] == 'parse_error' for f in flags): return 'critical'
    hard = sum(1 for f in flags if f[0] in {'hebrew_in_english_field','english_in_hebrew_field','placeholder_english','placeholder_hebrew'})
    open_mismatch = any('opening_differs' in f[0] for f in flags)
    ratio = len(flags)/max(1,bilingual)
    if hard >= 10 or (bilingual and ratio > .25): return 'severe'
    if hard or open_mismatch or len(flags) >= 10: return 'review'
    if flags: return 'minor'
    return 'ok'

results=[]; by_book=defaultdict(Counter)
for p in sorted(READER.rglob('*.json')):
    if p.name in {'catalog.json'}: continue
    r = audit_file(p)
    flags=r['flags']; total=r['total']; bilingual=r['bilingual']
    sev=severity(flags,total,bilingual)
    if sev!='ok':
        book=p.relative_to(READER).parts[0]
        by_book[book][sev]+=1; by_book[book]['flags']+=len(flags); by_book[book]['files']+=1
        results.append((sev, len(flags), bilingual, total, p, flags))

sev_rank={'critical':0,'severe':1,'review':2,'minor':3}
results.sort(key=lambda x:(sev_rank[x[0]], -x[1], str(x[4])))

lines=[]
lines.append('# Focused Reader HE/EN Pairing Audit')
lines.append('')
lines.append(f'JSON files scanned: {sum(1 for _ in READER.rglob("*.json"))}')
lines.append(f'Files needing review (excluding normal untranslated books): {len(results)}')
lines.append('')
lines.append('## Severity by book')
for book,c in sorted(by_book.items(), key=lambda kv:(-(kv[1]['severe']+kv[1]['critical']), -kv[1]['review'], -kv[1]['flags'], kv[0])):
    lines.append(f'- {book}: critical={c["critical"]}, severe={c["severe"]}, review={c["review"]}, minor={c["minor"]}, flags={c["flags"]}')
lines.append('')
lines.append('## Top review files')
for sev,n,bil,total,p,flags in results[:200]:
    lines.append(f'### {sev.upper()} {p.relative_to(ROOT)} flags={n} bilingual_segments={bil}/{total}')
    for kind,loc,he,en in flags[:8]:
        lines.append(f'- {kind} at {loc}')
        if he: lines.append(f'  HE: {he}')
        if en: lines.append(f'  EN: {en}')
    lines.append('')
REPORT.parent.mkdir(parents=True, exist_ok=True)
REPORT.write_text('\n'.join(lines)+'\n', encoding='utf-8')
print(f'wrote {REPORT}')
print('\n'.join(lines[:80]))
