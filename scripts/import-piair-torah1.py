#!/usr/bin/env python3
"""Prepare the licensed Pe'er HaLikutim Torah 1 facsimile for the Super Reader."""
from __future__ import annotations
import json
import re
from pathlib import Path
import fitz

SOURCE = Path('/mnt/c/Users/Pettek/Downloads/Piair halikutim - likutay moharan 1 - 1-6 - Hebrewbooks_org_54911.pdf')
OUT = Path(__file__).resolve().parents[1] / 'public' / 'reader' / 'super' / 'likutay-moharan' / '1' / '1' / 'peer-halikutim'
# PDF pages 45–64 contain Torah 1: opening text, sources, explanations, prayers, and indexes.
FIRST_PAGE = 45
LAST_PAGE = 64


def normalize_text(value: str) -> str:
    return re.sub(r'\s+', ' ', value).strip()


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f'Missing source PDF: {SOURCE}')
    OUT.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(SOURCE)
    excerpt = fitz.open()
    excerpt.insert_pdf(doc, from_page=FIRST_PAGE - 1, to_page=LAST_PAGE - 1)
    excerpt_path = OUT / 'peer-halikutim-torah-1.pdf'
    excerpt.save(excerpt_path, garbage=4, deflate=True)

    pages = []
    matrix = fitz.Matrix(1.8, 1.8)
    for source_page in range(FIRST_PAGE, LAST_PAGE + 1):
        page = doc[source_page - 1]
        pix = page.get_pixmap(matrix=matrix, colorspace=fitz.csRGB, alpha=False)
        filename = f'page-{source_page}.webp'
        pix.pil_save(OUT / filename, format='WEBP', quality=86, method=6)
        pages.append({
            'sourcePage': source_page,
            'image': f'/reader/super/likutay-moharan/1/1/peer-halikutim/{filename}',
            'text': normalize_text(page.get_text('text')),
        })

    manifest = {
        'title': "Pe’er HaLikutim — Torah 1",
        'hebrewTitle': 'פאר הליקוטים — תורה א',
        'sourceFile': SOURCE.name,
        'sourcePageRange': [FIRST_PAGE, LAST_PAGE],
        'pdf': '/reader/super/likutay-moharan/1/1/peer-halikutim/peer-halikutim-torah-1.pdf',
        'pages': pages,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Prepared {len(pages)} pages at {OUT}')


if __name__ == '__main__':
    main()
