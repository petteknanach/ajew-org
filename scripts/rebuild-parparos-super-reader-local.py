#!/usr/bin/env python3
"""Rebuild Super Reader Parparos English only from the project's Finished HTML.

No network/external repository input is permitted. Simanim 26 and 32 are absent
from Parparos itself and remain explicitly unavailable.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
FINISHED = Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh')
FILE_FOR = {
    16: '120 Parpara_os_Simanim_16_17_18.html',
    17: '120 Parpara_os_Simanim_16_17_18.html',
    18: '120 Parpara_os_Simanim_16_17_18.html',
    19: '130 Parpara_os_Simanim_19_20.html',
    20: '130 Parpara_os_Simanim_19_20.html',
    21: '140 Parpara_os_Simanim_21_22.html',
    22: '140 Parpara_os_Simanim_21_22.html',
    23: '150 Parpara_os_Simanim_23_24.html',
    24: '150 Parpara_os_Simanim_23_24.html',
    25: '160 Parpara_os_Simanim_25_27_28_29.html',
    27: '160 Parpara_os_Simanim_25_27_28_29.html',
    28: '160 Parpara_os_Simanim_25_27_28_29.html',
    29: '160 Parpara_os_Simanim_25_27_28_29.html',
    30: '170 Parpara_os_Simanim_30_31_33.html',
    31: '170 Parpara_os_Simanim_30_31_33.html',
    33: '170 Parpara_os_Simanim_30_31_33.html',
    34: '180 Parpara_os_Simanim_34_36.html',
}
ORDINAL = {
    16:'Sixteen',17:'Seventeen',18:'Eighteen',19:'Nineteen',20:'Twenty',
    21:'Twenty-One',22:'Twenty-Two',23:'Twenty-Three',24:'Twenty-Four',25:'Twenty-Five',
    27:'Twenty-Seven',28:'Twenty-Eight',29:'Twenty-Nine',30:'Thirty',31:'Thirty-One',
    33:'Thirty-Three',34:'Thirty-Four',
}
# Canonical local Parparos reader section for each Likutay Moharan Torah.
# The generated Super Reader output must never become its own input.
SOURCE_SECTION = {**{n:n+1 for n in range(16,26)},27:27,28:28,29:29,30:30,31:31,33:32,34:33}
SOURCE_INDICES = {
    27:[2,4,6], 28:[2,4,6,8],
    29:[2,3,5,7,9,11,13,15,17,19,21,23,25],
    30:[2,4,6,8,10,12,14,16,18,20,22,24,26,28,30],
    31:[2,4,6,8,10,12,14,16,18,20,22,24,26],
    33:[3,5,7], 34:[2,3,5,7,9,11,13],
}
# Multiple physical Hebrew records belonging to one letter/section are joined.
GROUPS = {
    22: [[1],[2],[3],[4],[5],[6],[7,8],*[[i] for i in range(9,28)]],
    23: [[1,2],[3,4],*[[i] for i in range(5,14)],[14,15],[16],[17]],
    29: [[1,2],*[[i] for i in range(3,14)]],
    34: [[1,2],*[[i] for i in range(3,8)]],
}

def clean_text(node: Tag) -> str:
    chunks=[]
    if node.name == 'p':
        chunks.append(node.get_text(' ', strip=True))
    elif node.name == 'div' and ('hist' in (node.get('class') or []) or 'tn' in (node.get('class') or [])):
        chunks.extend(p.get_text(' ', strip=True) for p in node.find_all('p'))
        if not chunks:
            chunks.append(node.get_text(' ', strip=True))
    return '\n\n'.join(x for x in chunks if x)

def extract_sections(n: int) -> tuple[Path, list[str]]:
    source = FINISHED / FILE_FOR[n]
    soup = BeautifulSoup(source.read_text(encoding='utf-8'), 'html.parser')
    wanted = f'Siman {ORDINAL[n]}'
    h2 = next((x for x in soup.select('h2.ch') if wanted in x.get_text(' ', strip=True)), None)
    if h2 is None:
        raise RuntimeError(f'{source.name}: missing {wanted}')
    prelude=[]
    headings=[]
    cursor=h2.next_sibling
    while cursor:
        if isinstance(cursor, Tag) and cursor.name=='h2' and 'ch' in (cursor.get('class') or []):
            break
        if isinstance(cursor, Tag) and cursor.name=='h3' and 'sub' in (cursor.get('class') or []):
            headings.append(cursor)
        elif not headings and isinstance(cursor, Tag) and 'hist' in (cursor.get('class') or []):
            t=clean_text(cursor)
            if t: prelude.append(t)
        cursor=cursor.next_sibling
    sections=[]
    for h in headings:
        parts=[]
        cursor=h.next_sibling
        while cursor:
            if isinstance(cursor, Tag) and cursor.name in ('h2','h3') and ('ch' in (cursor.get('class') or []) or 'sub' in (cursor.get('class') or [])):
                break
            if isinstance(cursor, Tag):
                t=clean_text(cursor)
                if t: parts.append(t)
            cursor=cursor.next_sibling
        sections.append('\n\n'.join(parts).strip())
    if sections and prelude:
        sections[0]='\n\n'.join(prelude+[sections[0]]).strip()
    if not sections or any(not s for s in sections):
        raise RuntimeError(f'{source.name} Torah {n}: empty extracted section')
    return source, sections

def rebuild(n: int) -> tuple[int,int]:
    out=ROOT/f'public/reader/super/likutay-moharan/1/{n}/parparos-lechochma.json'
    data=json.loads(out.read_text(encoding='utf-8'))
    section=SOURCE_SECTION[n]
    source_path=ROOT/f'public/reader/parparos-lechochma/section-{section}.json'
    source_data=json.loads(source_path.read_text(encoding='utf-8'))
    wanted=set(SOURCE_INDICES.get(n,[]))
    old=[record for record in source_data.get('segments',[])
         if str(record.get('he') or '').strip() and (not wanted or record.get('index') in wanted)]
    source, english=extract_sections(n)
    groups=GROUPS.get(n, [[i] for i in range(1,len(old)+1)])
    if len(groups)!=len(english):
        raise RuntimeError(f'Torah {n}: {len(groups)} Hebrew groups != {len(english)} Finished-English sections')
    rebuilt=[]
    for index,(positions,en) in enumerate(zip(groups,english),1):
        records=[old[i-1] for i in positions]
        base={k:v for k,v in records[0].items() if k not in ('en','translationRepair')}
        base['index']=index
        base['he']='\n\n'.join(str(r.get('he') or '').strip() for r in records if str(r.get('he') or '').strip())
        source_indices=[r.get('sourceIndex',r.get('index')) for r in records]
        base['sourceIndices']=source_indices
        base['en']=en
        rebuilt.append(base)
    data['segments']=rebuilt
    data['totalParagraphs']=len(rebuilt)
    data['totalSegments']=len(rebuilt)
    data['hasEnglish']=True
    data['sourceSection']=section
    data['sourceFile']=str(source_path.relative_to(ROOT))
    data['authoritativeEnglishSource']=str(source)
    data.pop('repairNote',None)
    data.pop('superReaderMetadataRepair',None)
    out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return len(old),len(rebuilt)

def main() -> None:
    for n in sorted(FILE_FOR):
        before,after=rebuild(n)
        print(f'Torah {n}: {before} physical Hebrew records -> {after} bilingual Parparos sections')
    for n in (26,32):
        out=ROOT/f'public/reader/super/likutay-moharan/1/{n}/parparos-lechochma.json'
        data=json.loads(out.read_text())
        if data.get('segments'):
            raise RuntimeError(f'Torah {n}: expected genuine Parparos absence')
        print(f'Torah {n}: absent in the project source, correctly unchanged')

if __name__=='__main__':
    main()
