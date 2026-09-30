#!/usr/bin/env python3
"""Package exact corresponding source/notices for the served vowel font v2.
Deterministic archive; no network. Reproduction uses fontTools==4.60.1.
"""
import gzip, hashlib, io, json, tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILES=['scripts/build-tikkun-vowel-font.py','public/fonts/TaameyFrankCLM-Medium.ttf','public/fonts/source/TaameyFrankCLM-Medium.sfd','public/fonts/tikkun/LICENSE.TXT','public/fonts/tikkun/GNU-GPL.TXT']
contents={p:(ROOT/p).read_bytes() for p in FILES}
manifest=[{'path':p,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for p,b in sorted(contents.items())]
outputs=[{'path':f'public/fonts/tikkun/TikunVowels-{theme}.ttf','sha256':hashlib.sha256((ROOT/f'public/fonts/tikkun/TikunVowels-{theme}.ttf').read_bytes()).hexdigest()} for theme in ['day','sepia','night']]
contents['SOURCE-MANIFEST.json']=(json.dumps({'source':manifest,'expectedOutputs':outputs},indent=2)+'\n').encode()
contents['README.txt']=b'''Tikun Vowels v2 corresponding source

GPL-2 with the original document-embedding exception expressly extended to
these modified versions. Full unmodified upstream notices are included.
The original TTF and editable FontForge SFD are distributed unchanged.

To reproduce from this extracted root, offline after installing dependencies:
  python -m pip install fonttools==4.60.1
  python scripts/build-tikkun-vowel-font.py
The output directory public/fonts/tikkun is already in this archive.
Compare the three outputs to expectedOutputs in SOURCE-MANIFEST.json.

Only COLR paint layers enlarge audible sheva (two separate dots: 1.8x width,
1.4x height) and positive qamats katan (1.5x). Original contours, character
mappings, shaping advances and GPOS anchors remain intact. Non-shaping paint
layer bearings follow their outline bounds to preserve the source origin.
Uncertain qb and meteg do not acquire katan enlargement. No linguistic
classification is inferred or changed by this recipe.
'''
buf=io.BytesIO()
with gzip.GzipFile(fileobj=buf,mode='wb',filename='',mtime=0) as gz:
    with tarfile.open(fileobj=gz,mode='w') as archive:
        for p,b in sorted(contents.items()):
            entry=tarfile.TarInfo(p);entry.size=len(b);entry.mode=0o644;entry.mtime=0;archive.addfile(entry,io.BytesIO(b))
path=ROOT/'public/fonts/tikkun/TikunVowels-source-v2.tar.gz';path.write_bytes(buf.getvalue())
print(json.dumps({'archive':str(path),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceFiles':len(FILES),'outputs':outputs},indent=2))
