#!/usr/bin/env python3
"""Quick quality check after LH fix."""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def is_bad_pairing(he, en):
    if not he or not en: return False
    hw = he_words(he)
    if len(hw) < 5: return False
    en_lower = en.lower()
    matches = sum(1 for w in hw if len(w) >= 4 and w.lower() in en_lower)
    return matches == 0

def is_header_he(he):
    t = he.lower().strip()
    return len(t) < 8 or any(t.startswith(p) for p in [
        'hilchos','na nach','siman ','seif ','osio ','volume ',
        'likutay','a collection','the laws ','oc ','yd ','eh ','cm '])

# Sample check across ALL parts
total_bad = 0
total_content = 0
bad_examples = []

for part_dir in sorted(os.listdir(READER_DIR)):
    if not part_dir.startswith('part-'): continue
    part_path = os.path.join(READER_DIR, part_dir)

    for f in sorted(os.listdir(part_path)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(part_path, f)))

        for seg in data['segments']:
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()

            if not he or is_header_he(he) or not en:
                continue

            total_content += 1
            if is_bad_pairing(he, en):
                total_bad += 1
                if len(bad_examples) < 5:
                    bad_examples.append((f, seg.get('id','?'), he[:80], en[:80]))

print(f"Total content segments checked: {total_content}")
print(f"Bad pairings remaining: {total_bad}")
print(f"Bad rate: {total_bad/total_content*100:.1f}%" if total_content else "N/A")

if bad_examples:
    print("\nExamples of remaining bad pairings:")
    for fname, sid, he, en in bad_examples:
        print(f"  {fname} #{sid}: HE={he}... EN={en}...")
else:
    print("No bad pairings found in sample!")