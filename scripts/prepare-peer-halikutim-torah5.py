#!/usr/bin/env python3
"""Prepare authoritative Pe'er HaLikutim facsimiles for Torah 5."""
from __future__ import annotations

import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/mnt/c/Users/Pettek/Downloads/Piair halikutim - likutay moharan 1 - 1-6 - Hebrewbooks_org_54911.pdf')
OUT = ROOT / 'public/reader/super/likutay-moharan/1/5/peer-halikutim'
START, END = 153, 188
PASSAGES = 71
SECTIONS = [
    {'id':'likutay-moharan','he':'ליקוטי מוהר״ן','en':'Central Torah','purpose':"Rabbi Nachman's canonical teaching",'stage':'read'},
    {'id':'revelation-story','he':'סיפור התגלות המאמר','en':'How the Torah was revealed','purpose':'Background and transmission story','stage':'understand'},
    {'id':'nahal-novea','he':'נחל נובע','en':'Direct explanation','purpose':'Close explanation from early Breslov sources','stage':'understand'},
    {'id':'mekor-chokhma','he':'מקור חכמה','en':'Direct sources','purpose':'Tanakh, Chazal, Zohar and Kabbalistic sources','stage':'deepen'},
    {'id':'yalkut-hanahal','he':'ילקוט הנחל','en':'Further explanation','purpose':'Later Breslov explanations','stage':'deepen'},
    {'id':'miluei-chokhma','he':'מילואי חכמה','en':'Further sources','purpose':'Additional source material','stage':'deepen'},
    {'id':'concepts','he':'ערכים וכינויים','en':'Concepts and terms','purpose':'Definitions of concepts and symbolic names','stage':'deepen'},
    {'id':'translator','he':'המתרגם','en':'Aramaic translated','purpose':'Hebrew translations of Aramaic quotations','stage':'understand'},
    {'id':'advice','he':'עצה ותושיה','en':'Practical guidance','purpose':'Practical advice distilled from the Torah','stage':'apply'},
    {'id':'prayer','he':'ואני תפלה','en':'Prayer','purpose':'Prayer corresponding to the Torah','stage':'pray'},
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = fitz.open(SOURCE)
    clipped = fitz.open()
    clipped.insert_pdf(source, from_page=START - 1, to_page=END - 1)
    clipped.save(OUT / 'peer-halikutim-torah-5.pdf', garbage=4, deflate=True)
    page_count = END - START + 1
    pages = []
    for offset, source_page in enumerate(range(START, END + 1)):
        page = source[source_page - 1]
        pix = page.get_pixmap(matrix=fitz.Matrix(1.8, 1.8), alpha=False)
        image_path = OUT / f'page-{source_page}.webp'
        Image.frombytes('RGB', [pix.width, pix.height], pix.samples).save(image_path, 'WEBP', quality=85, method=6)
        low = 1 + (offset * PASSAGES) // page_count
        high = max(low, ((offset + 1) * PASSAGES) // page_count)
        pages.append({
            'sourcePage': source_page, 'printedFolio': None,
            'image': f'/reader/super/likutay-moharan/1/5/peer-halikutim/page-{source_page}.webp',
            'relatedSections': list(range(low, min(PASSAGES, high) + 1)),
            'relatedPassages': list(range(low, min(PASSAGES, high) + 1)),
            'pageBox': [round(page.rect.width, 1), round(page.rect.height, 1)],
            'extraction': {'status': 'not-rendered', 'fragmentCounts': {}}, 'fragments': [],
        })
    manifest = {
        'schemaVersion': 2, 'title': "Pe’er HaLikutim — Torah 5", 'hebrewTitle': 'פאר הליקוטים — תורה ה',
        'sourceFile': SOURCE.name, 'sourcePageRange': [START, END],
        'pdf': '/reader/super/likutay-moharan/1/5/peer-halikutim/peer-halikutim-torah-5.pdf',
        'textStatus': 'facsimile-only',
        'textNotice': 'The scan is authoritative. Page relationships are navigational and should be verified against the facsimile.',
        'sectionDefinitions': SECTIONS, 'pages': pages,
    }
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    source.close(); clipped.close()
    print(f'Prepared {len(pages)} Torah 5 Pe’er pages ({START}-{END}).')


if __name__ == '__main__':
    main()
