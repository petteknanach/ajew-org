# Reconcile tape existingEnglish provenance fingerprints with the legacy
# chapter files as they are NOW (other lane emptied misaligned EN in
# b5d413038; tape fingerprints must describe current valid EN, per the
# verifier's contract). Only touches numbers that already mismatch.
import json, glob, os

os.chdir('/root/ajew-org')
fixed = []
for tp in sorted(glob.glob('public/reader/saba-tape-transcripts/tapes/tape-*.json')):
    d = json.load(open(tp))
    def walk(o):
        if isinstance(o, dict):
            ex = o.get('existingEnglish')
            if isinstance(ex, dict) and isinstance(ex.get('chapter'), int):
                chp = f'public/reader/{d["book"]}/chapter-{ex["chapter"]}.json'
                if os.path.exists(chp):
                    legacy = json.load(open(chp, encoding='utf-8-sig'))
                    en = [s.get('en', '').strip() for s in legacy.get('segments', []) if s.get('en', '').strip()]
                    segs, chars = len(en), sum(len(s) for s in en)
                    if (segs, chars) != (ex.get('segments'), ex.get('characters')):
                        fixed.append((os.path.basename(tp), ex.get('chapter'), ex.get('segments'), segs, ex.get('characters'), chars))
                        ex['segments'], ex['characters'] = segs, chars
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(d)
    if any(f[0] == os.path.basename(tp) for f in fixed):
        json.dump(d, open(tp, 'w'), ensure_ascii=False, indent=1)

for f in fixed:
    print(f'tape {f[0]} ch{f[1]}: segs {f[2]}->{f[3]}, chars {f[4]}->{f[5]}')
print('total reconciled:', len(fixed))
