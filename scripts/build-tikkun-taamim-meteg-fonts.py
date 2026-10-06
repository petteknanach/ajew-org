#!/usr/bin/env python3
"""Generate ONLY three meteg-only Taamim derivatives; no approved face is rebuilt.
Retain every source notice, hidden-nikud outline and original shaping record.
Offline: fontTools==4.60.1. Supply --output-root explicitly (never a frozen root).
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
SOURCE_PATH = 'public/fonts/tikkun/study-stam/AjewStudyStam-taamim.ttf'
SOURCE_SHA = '7461de35bf7a8fbefd67b1c63a450d0a0878c2c3ff43d6bab970f1baff6b6efa'

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-root', type=Path, default=Path(__file__).resolve().parents[1])
    p.add_argument('--output-root', type=Path, required=True)
    args = p.parse_args()
    source = args.source_root / SOURCE_PATH
    assert hashlib.sha256(source.read_bytes()).hexdigest() == SOURCE_SHA, 'Taamim source pin mismatch'
    spec = importlib.util.spec_from_file_location('vowels', Path(__file__).with_name('build-tikkun-vowel-font.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    rows = []
    for theme in m.PALETTES:
        data = m.make_font(theme, study_source=source, active_features=('ss04',))
        repeat = m.make_font(theme, study_source=source, active_features=('ss04',))
        assert data == repeat, 'font generation is not deterministic'
        relative = f'public/fonts/tikkun/study-stam/AjewStudyMarked-taamim-{theme}.ttf'
        target = args.output_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        rows.append({'path':relative, 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest(), 'twoRunsByteEqual':True})
    print(json.dumps({'source':SOURCE_PATH, 'sourceSha256':SOURCE_SHA, 'outputs':rows}, indent=2))

if __name__ == '__main__':
    main()
