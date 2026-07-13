#!/usr/bin/env python3
"""Build Sefer Hamidos Children 22-61 media.

Policy for this run:
- 40 contiguous teachings: Children / בנים 22-61.
- exact canonical Hebrew/English text composited by code;
- no cartoon/childish/generated text;
- first quarter (10/40) uses local Na Nach/Pictures sources, 8/10 Saba Yisroel;
- videos use real local video motion with exact bilingual overlay, not ffmpeg pan/zoom.

This is adapted from build-sefer-hamidos-next40-local-media.py for the next contiguous Children batch.
"""
import importlib.util
from pathlib import Path

src=Path(__file__).with_name('build-sefer-hamidos-next40-local-media.py')
spec=importlib.util.spec_from_file_location('base_next40', src)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)

mod.DATE='2026-07-13'
mod.BATCH=[{'topic': 9, 'slug': 'children', 'title': 'Children / בנים', 'segments': list(range(22,62))}]

if __name__ == '__main__':
    mod.main()
