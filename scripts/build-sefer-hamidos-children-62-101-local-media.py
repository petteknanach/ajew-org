#!/usr/bin/env python3
"""Build Sefer Hamidos Children 62-101 media.

Policy for this run:
- 40 contiguous teachings: Children / בנים 62-101.
- exact canonical Hebrew/English text composited by code;
- first quarter (10/40) uses local Na Nach/Pictures sources, most Saba Yisroel;
- remaining pictures will be replaced by Grok realistic base images in a second step;
- videos use real local video motion with exact bilingual teaching overlay, not textless video.
"""
import importlib.util
from pathlib import Path

src=Path(__file__).with_name('build-sefer-hamidos-next40-local-media.py')
spec=importlib.util.spec_from_file_location('base_next40', src)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

mod.DATE='2026-07-14'
mod.BATCH=[{'topic': 9, 'slug': 'children', 'title': 'Children / בנים', 'segments': list(range(62,102))}]

if __name__ == '__main__':
    mod.main()
