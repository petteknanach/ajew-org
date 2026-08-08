#!/usr/bin/env python3
"""Prepare Torah 20 Pe'er manifest; convert only with explicit --convert."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/mnt/c/Users/Pettek/Downloads/pi-air halikutim - likutay moharan - volume 3 - torahs - 16-22 Hebrewbooks_org_66038.pdf')
OUT=ROOT/'public/reader/super/likutay-moharan/1/20/peer-halikutim'; START,END,PASSAGES=232,300,78
EXPECTED_SHA='796b49291678cc50b05f90ca0e7e2955eae62b0f2455d798ca55aa2ddb9673d3'
SECTIONS=[{'id':'likutay-moharan','he':'ליקוטי מוהר״ן','en':'Central Torah','stage':'read'},{'id':'revelation-story','he':'סיפור התגלות המאמר','en':'How the Torah was revealed','stage':'understand'},{'id':'nahal-novea','he':'נחל נובע','en':'Direct explanation','stage':'understand'},{'id':'mekor-chokhma','he':'מקור חכמה','en':'Direct sources','stage':'deepen'},{'id':'yalkut-hanahal','he':'ילקוט הנחל','en':'Further explanation','stage':'deepen'},{'id':'miluei-chokhma','he':'מילואי חכמה','en':'Further sources','stage':'deepen'},{'id':'concepts','he':'ערכים וכינויים','en':'Concepts and terms','stage':'deepen'},{'id':'translator','he':'המתרגם','en':'Aramaic translated','stage':'understand'},{'id':'advice','he':'עצה ותושיה','en':'Practical guidance','stage':'apply'},{'id':'prayer','he':'ואני תפלה','en':'Prayer','stage':'pray'}]
def sha256(path):
 d=hashlib.sha256()
 with path.open('rb') as h:
  for chunk in iter(lambda:h.read(1024*1024),b''): d.update(chunk)
 return d.hexdigest()
def page_rows():
 count=END-START+1; rows=[]
 for off,page in enumerate(range(START,END+1)):
  lo=1+(off*PASSAGES)//count; hi=max(lo,((off+1)*PASSAGES)//count); related=list(range(lo,min(PASSAGES,hi)+1))
  rows.append({'sourcePage':page,'printedFolio':None,'image':f'/reader/super/likutay-moharan/1/19/peer-halikutim/page-{page}.webp','relatedSections':related,'relatedPassages':related,'extraction':{'status':'not-rendered','fragmentCounts':{}},'fragments':[]})
 return rows
def convert():
 import fitz
 from PIL import Image
 source=fitz.open(SOURCE); clipped=fitz.open(); clipped.insert_pdf(source,from_page=START-1,to_page=END-1); clipped.save(OUT/'peer-halikutim-torah-20.pdf',garbage=4,deflate=True)
 for number in range(START,END+1):
  pix=source[number-1].get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False); Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(OUT/f'page-{number}.webp','WEBP',quality=85,method=6)
 source.close(); clipped.close()
def main():
 parser=argparse.ArgumentParser(); parser.add_argument('--convert',action='store_true'); args=parser.parse_args()
 if not SOURCE.is_file(): raise RuntimeError(f'Missing frozen PDF: {SOURCE}')
 digest=sha256(SOURCE)
 if digest!=EXPECTED_SHA: raise RuntimeError(f'Frozen Pe’er SHA mismatch: {digest}')
 OUT.mkdir(parents=True,exist_ok=True)
 if args.convert: convert()
 expected={f'page-{n}.webp' for n in range(START,END+1)}; present={p.name for p in OUT.glob('page-*.webp')}; complete=present==expected and (OUT/'peer-halikutim-torah-20.pdf').is_file()
 if present and present!=expected: raise RuntimeError('Partial Torah 20 Pe’er image set exists')
 manifest={'schemaVersion':2,'title':'Pe’er HaLikutim — Torah 20','hebrewTitle':'פאר הליקוטים — תורה כ','sourceFile':SOURCE.name,'sourcePageRange':[START,END],'hebrewBooksId':66038,'sourceUrl':'https://hebrewbooks.org/66038','downloadUrl':'https://download.hebrewbooks.org/downloadhandler.ashx?req=66038','sourceSha256':digest,'pdf':'/reader/super/likutay-moharan/1/19/peer-halikutim/peer-halikutim-torah-20.pdf','textStatus':'facsimile-only','facsimileStatus':'ready' if complete else 'pending-separately-supervised-conversion','textNotice':'The scan is authoritative. Torah 20 is PDF pages 151–231 inclusive (81 pages); page 232 begins Torah 20 and is excluded. Page relationships are navigational.','sectionDefinitions':SECTIONS,'pages':page_rows()}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 status='complete existing assets reused' if complete and not args.convert else 'converted' if complete else 'manifest only; facsimiles pending separately supervised conversion'
 print(f'Prepared Torah 20 Pe’er manifest: 69 pages (232–300), HebrewBooks 66038; {status}.')
if __name__=='__main__': main()
