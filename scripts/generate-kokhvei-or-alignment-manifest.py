#!/usr/bin/env python3
"""Generate the reviewed Kokhvei Or bilingual alignment lock manifest.

Run only after manual semantic review; normal builds verify but never regenerate it.
"""
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / 'public' / 'reader' / 'kokhvei-or'
OUT = BOOK / 'alignment-manifest.json'
sha = lambda text: hashlib.sha256(text.encode('utf-8')).hexdigest()
manifest = {
    'version': 1,
    'policy': 'Canonical Hebrew and manually reviewed English segment pairing lock; Biur HaLikutim (15) is Hebrew-only.',
    'sections': []
}
for number in range(1, 22):
    data = json.loads((BOOK / f'section-{number}.json').read_text('utf-8'))
    pairs = []
    for segment in data['segments']:
        he, en = segment.get('he', ''), segment.get('en', '')
        pairs.append({
            'index': segment['index'],
            'heSha256': sha(he),
            'enSha256': sha(en),
            'pairSha256': sha(he + '\x1f' + en)
        })
    manifest['sections'].append({
        'number': number,
        'segmentCount': len(pairs),
        'hasEnglish': bool(data.get('hasEnglish')),
        'hebrewSha256': sha('\x1e'.join(s.get('he', '') for s in data['segments'])),
        'englishSha256': sha('\x1e'.join(s.get('en', '') for s in data['segments'])),
        'pairs': pairs
    })
OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print(f'Wrote {OUT}: {sum(s["segmentCount"] for s in manifest["sections"])} locked segments')
