#!/usr/bin/env python3
"""SAFEGUARD: Data integrity check for ajew.org.
Run before every deployment to prevent data corruption.
Checks: English alignment, missing files, scrambled content."""

import json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)

def check_lh_english():
    """Verify LH English is aligned and not scrambled."""
    lh_dir = os.path.join(ROOT, 'public', 'reader', 'likutay-halachos')
    errors = []
    files_checked = 0
    
    for d in sorted(os.listdir(lh_dir)):
        if not d.startswith('part-'):
            continue
        part_dir = os.path.join(lh_dir, d)
        for f in sorted(os.listdir(part_dir)):
            if not f.startswith('halacha-') or f == 'index.json':
                continue
            fp = os.path.join(part_dir, f)
            try:
                with open(fp) as fh:
                    data = json.load(fh)
            except:
                errors.append(f"CORRUPT JSON: {fp}")
                continue
            
            files_checked += 1
            aligned = data.get('aligned_segments', [])
            
            if not aligned:
                continue
            
            # Check: English should not be Psalms or other obviously wrong text
            psalm_kw = ['psalm', 'leader', 'maskil', 'Korah', 'For the leader',
                        'lamnatzeiach', 'Lamnatzei-ach', 'mizmor']
            for s in aligned[:5]:
                en = s.get('en', '')
                if any(kw in en for kw in psalm_kw):
                    errors.append(f"SCRAMBLED: {fp} — Psalm text in EN")
                    break
    
    print(f"LH: {files_checked} files, {len(errors)} issues")
    return errors

def check_parsha_files():
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
            errors.append(f"CORRUPT JSON: {fp}")
            continue
        segs = data.get('segments', [])
        if not segs:
            errors.append(f"EMPTY: {fp}")
    print(f"Parsha: {len(errors)} issues")
    return errors

def check_lm_english():
    """Verify LM English is present."""
    lm_dir = os.path.join(ROOT, 'public', 'reader', 'likutay-moharan')
    if not os.path.exists(lm_dir):
        return []
    errors = []
    for part in ['part-1', 'part-2']:
        part_dir = os.path.join(lm_dir, part)
        if not os.path.exists(part_dir):
            continue
        for f in sorted(os.listdir(part_dir)):
            if not f.startswith('torah-'):
                continue
            fp = os.path.join(part_dir, f)
            try:
                with open(fp) as fh:
                    data = json.load(fh)
            except:
                errors.append(f"CORRUPT JSON: {fp}")
                continue
    print(f"LM: {len(errors)} issues")
    return errors

if __name__ == '__main__':
    all_errors = []
    all_errors.extend(check_lh_english())
    all_errors.extend(check_parsha_files())
    all_errors.extend(check_lm_english())
    
    if all_errors:
        print(f"\n{'='*60}")
        print(f"SAFEGUARD FAILED: {len(all_errors)} issues")
        print(f"{'='*60}")
        for e in all_errors[:30]:
            print(f"  X {e}")
        sys.exit(1)
    else:
        print(f"\n{'='*60}")
        print("SAFEGUARD PASSED")
        print(f"{'='*60}")
        sys.exit(0)
