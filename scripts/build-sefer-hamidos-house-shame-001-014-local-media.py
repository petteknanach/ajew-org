#!/usr/bin/env python3
import importlib.util
from pathlib import Path
src=Path(__file__).resolve().parents[1]/'scripts/build-sefer-hamidos-next40-local-media.py'
spec=importlib.util.spec_from_file_location('base_next40', src)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
mod.DATE='2026-07-15'
mod.BATCH=[
    {'topic':10,'slug':'house','title':'House / בית','segments':list(range(1,27))},
    {'topic':11,'slug':'shame','title':'Shame / בושה','segments':list(range(1,15))},
]
mod.main()
