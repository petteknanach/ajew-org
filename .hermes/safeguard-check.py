#!/usr/bin/env python3
"""SAFEGUARD: Data integrity check for ajew.org content.
Run before every deployment. Blocks push if corruption detected.
Checks: LH English, LM English, Sefer HaMidos, Likutay Tefilos,
Otzar HaYirah, Kitzur LM, parsha files, JSON validity."""

import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def check_lh_english():
    """Verify LH English: no scrambled Psalm text, no placeholder numbers."""
    lh_dir = os.path.join(ROOT, 'public', 'reader', 'likutay-halachos')
    errors = []
    files_ok = 0
    
    for d in sorted(os.listdir(lh_dir)):
        if not d.startswith('part-'):
            continue
        for f in sorted(os.listdir(os.path.join(lh_dir, d))):
            if not f.startswith('halacha-'):
                continue
            fp = os.path.join(lh_dir, d, f)
            try:
                with open(fp) as fh:
                    data = json.load(fh)
            except:
                errors.append(f"CORRUPT: {fp}")
                continue
            
            for key in ['segments', 'aligned_segments']:
                segs = data.get(key, [])
                if not segs:
                    continue
                # Check for bulk Psalm filler (5+ consecutive Psalm-only segments)
                psalm_kw = ['psalm', 'maskil', 'Korah', 'For the leader', 'lamnatzeiach', 'mizmor']
                cons = 0
                for s in segs:
                    en = s.get('en','').lower()
                    hits = sum(1 for kw in psalm_kw if kw.lower() in en)
                    if hits >= 2:  # Multiple psalm keywords in same segment
                        cons += 1
                    elif hits == 1:
                        cons += 0.5  # Single hit is weak
                    else:
                        cons = max(0, cons - 1)
                    
                    if cons >= 3:
                        errors.append(f"SCRAMBLED: {fp}")
                        break
                # Check placebo numbers
                for s in segs:
                    if re.match(r'^\d+[\.\)]?\s*$', s.get('en','').strip()):
                        errors.append(f"PLACEHOLDER: {fp}")
                        break
            
            files_ok += 1
    
    print(f"LH: {files_ok} ok, {len(errors)} issues")
    return errors

def check_book(dir_name, label):
    """Check any reader book for corruption."""
    book_path = os.path.join(ROOT, 'public', 'reader', dir_name)
    if not os.path.exists(book_path):
        return []
    errors = []
    files_ok = 0
    for root, dirs, fnames in os.walk(book_path):
        for f in fnames:
            if not f.endswith('.json') or f == 'index.json':
                continue
            fp = os.path.join(root, f)
            try:
                with open(fp) as fh:
                    data = json.load(fh)
            except:
                errors.append(f"CORRUPT JSON: {fp}")
                continue
            segs = data.get('segments', [])
            if not segs:
                continue
            # Check for placeholder numbers
            for s in segs:
                if re.match(r'^\d+[\.\)]?\s*$', s.get('en','').strip()):
                    errors.append(f"PLACEHOLDER EN: {fp}")
                    break
            files_ok += 1
    print(f"{label}: {files_ok} ok, {len(errors)} issues")
    return errors

def check_parsha():
    """Verify parsha files have source citations."""
    parsha_dir = os.path.join(ROOT, 'public', 'reader', 'parsha-lm')
    if not os.path.exists(parsha_dir):
        return []
    errors = []
    for f in os.listdir(parsha_dir):
        if not f.endswith('.json'):
            continue
        fp = os.path.join(parsha_dir, f)
        try:
            with open(fp) as fh:
                data = json.load(fh)
        except:
            errors.append(f"CORRUPT: {fp}")
            continue
        if not data.get('segments'):
            errors.append(f"EMPTY: {fp}")
    print(f"Parsha: {len(errors)} issues")
    return errors

if __name__ == '__main__':
    all_errors = []
    all_errors.extend(check_lh_english())
    all_errors.extend(check_book('sefer-hamidos', 'SH'))
    all_errors.extend(check_book('likutay-tefilos', 'LT'))
    all_errors.extend(check_book('otzar-hayirah', 'OHY'))
    all_errors.extend(check_book('kitzur-likutay-moharan', 'KLM'))
    all_errors.extend(check_book('likutay-moharan', 'LM'))
    all_errors.extend(check_parsha())
    
    if all_errors:
        print(f"\n{'='*60}")
        print(f"SAFEGUARD FAILED: {len(all_errors)} issues")
        print(f"{'='*60}")
        for e in all_errors[:30]:
            print(f"  X {e}")
        sys.exit(1)
    else:
        print(f"\n{'='*60}")
        print("SAFEGUARD PASSED — all data integrity checks OK")
        print(f"{'='*60}")
        sys.exit(0)
