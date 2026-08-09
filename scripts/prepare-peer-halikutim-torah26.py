#!/usr/bin/env python3
"""Prepare Torah 26 Pe'er pages 217–224; convert only with --convert."""
import argparse, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/mnt/c/Users/Pettek/Downloads/pi-air halikutim - likutay moharan - volume 4 - torahs 23-27 Hebrewbooks_org_66039.pdf')
OUT = ROOT / 'public/reader/super/likutay-moharan/1/26/peer-halikutim'
START, END, PASSAGES = 217, 224, 6
SHA = '7d8d2adaad23ace7197ecac35b3e2055973305b832b45581c7d27fe84c76e052'


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def rows():
    count = END - START + 1
    return [{'sourcePage': page, 'printedFolio': None, 'image': f'/reader/super/likutay-moharan/1/26/peer-halikutim/page-{page}.webp', 'relatedSections': list(range(1 + (offset * PASSAGES) // count, min(PASSAGES, ((offset + 1) * PASSAGES) // count) + 1)) or [min(PASSAGES, 1 + (offset * PASSAGES) // count)], 'relatedPassages': list(range(1 + (offset * PASSAGES) // count, min(PASSAGES, ((offset + 1) * PASSAGES) // count) + 1)) or [min(PASSAGES, 1 + (offset * PASSAGES) // count)], 'extraction': {'status': 'not-rendered', 'fragmentCounts': {}}, 'fragments': []} for offset, page in enumerate(range(START, END + 1))]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--convert', action='store_true')
    args = parser.parse_args()
    if not SOURCE.is_file() or digest(SOURCE) != SHA:
        raise RuntimeError('frozen PDF missing/checksum changed')
    OUT.mkdir(parents=True, exist_ok=True)
    if args.convert:
        import fitz
        from PIL import Image
        source = fitz.open(SOURCE)
        clip = fitz.open()
        clip.insert_pdf(source, from_page=START - 1, to_page=END - 1)
        clip.save(OUT / 'peer-halikutim-torah-26.pdf', garbage=4, deflate=True)
        for page in range(START, END + 1):
            pix = source[page - 1].get_pixmap(matrix=fitz.Matrix(1.8, 1.8), alpha=False)
            Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(OUT / f'page-{page}.webp', 'WEBP', quality=85, method=6)
        source.close(); clip.close()
    expected = {f'page-{page}.webp' for page in range(START, END + 1)}
    present = {path.name for path in OUT.glob('page-*.webp')}
    complete = present == expected and (OUT / 'peer-halikutim-torah-26.pdf').is_file()
    if present and present != expected:
        raise RuntimeError('partial images')
    manifest = {'schemaVersion': 2, 'title': 'Pe’er HaLikutim — Torah 26', 'hebrewTitle': 'פאר הליקוטים — תורה כו', 'sourceFile': SOURCE.name, 'sourcePageRange': [START, END], 'hebrewBooksId': 66039, 'sourceUrl': 'https://hebrewbooks.org/66039', 'downloadUrl': 'https://download.hebrewbooks.org/downloadhandler.ashx?req=66039', 'sourceSha256': SHA, 'pdf': '/reader/super/likutay-moharan/1/26/peer-halikutim/peer-halikutim-torah-26.pdf', 'textStatus': 'facsimile-only', 'facsimileStatus': 'ready' if complete else 'pending-separately-supervised-conversion', 'textNotice': 'Authoritative scan: Torah 26 is PDF pages 217–224 inclusive (8 pages). Page 216 remains Torah 25 and page 225 begins Torah 27; both are excluded.', 'sectionDefinitions': [], 'pages': rows()}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Prepared Torah 26 Pe’er: pages 217–224 (8); ' + ('ready.' if complete else 'facsimiles pending separately supervised conversion.'))


if __name__ == '__main__':
    main()
