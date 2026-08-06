#!/usr/bin/env python3
"""Prepare Torah 14 Pe'er manifest; convert facsimiles only with explicit --convert."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/mnt/c/Users/Pettek/Downloads/pi-air halikutim - likutay moharan - volume 2 - torahs - Hebrewbooks_org_54912.pdf')
OUT=ROOT/'public/reader/super/likutay-moharan/1/14/peer-halikutim'; START,END,PASSAGES=329,376,78
SECTIONS=[
 {'id':'likutay-moharan','he':'ליקוטי מוהר״ן','en':'Central Torah','purpose':"Rabbi Nachman's canonical teaching",'stage':'read'},
 {'id':'revelation-story','he':'סיפור התגלות המאמר','en':'How the Torah was revealed','purpose':'Background and transmission story','stage':'understand'},
 {'id':'nahal-novea','he':'נחל נובע','en':'Direct explanation','purpose':'Close explanation from early Breslov sources','stage':'understand'},
 {'id':'mekor-chokhma','he':'מקור חכמה','en':'Direct sources','purpose':'Tanakh, Chazal, Zohar and Kabbalistic sources','stage':'deepen'},
 {'id':'yalkut-hanahal','he':'ילקוט הנחל','en':'Further explanation','purpose':'Later Breslov explanations','stage':'deepen'},
 {'id':'miluei-chokhma','he':'מילואי חכמה','en':'Further sources','purpose':'Additional source material','stage':'deepen'},
 {'id':'concepts','he':'ערכים וכינויים','en':'Concepts and terms','purpose':'Definitions of concepts and symbolic names','stage':'deepen'},
 {'id':'translator','he':'המתרגם','en':'Aramaic translated','purpose':'Hebrew translations of Aramaic quotations','stage':'understand'},
 {'id':'advice','he':'עצה ותושיה','en':'Practical guidance','purpose':'Practical advice distilled from the Torah','stage':'apply'},
 {'id':'prayer','he':'ואני תפלה','en':'Prayer','purpose':'Prayer corresponding to the Torah','stage':'pray'}]
def sha256(path):
 d=hashlib.sha256()
 with path.open('rb') as h:
  for chunk in iter(lambda:h.read(1024*1024),b''): d.update(chunk)
 return d.hexdigest()
def page_rows():
 count=END-START+1; rows=[]
 for off,page in enumerate(range(START,END+1)):
  lo=1+(off*PASSAGES)//count; hi=max(lo,((off+1)*PASSAGES)//count); related=list(range(lo,min(PASSAGES,hi)+1))
  rows.append({'sourcePage':page,'printedFolio':None,'image':f'/reader/super/likutay-moharan/1/14/peer-halikutim/page-{page}.webp','relatedSections':related,'relatedPassages':related,'extraction':{'status':'not-rendered','fragmentCounts':{}},'fragments':[]})
 return rows
def convert():
 import fitz
 from PIL import Image
 source=fitz.open(SOURCE); clipped=fitz.open(); clipped.insert_pdf(source,from_page=START-1,to_page=END-1); clipped.save(OUT/'peer-halikutim-torah-14.pdf',garbage=4,deflate=True)
 for number in range(START,END+1):
  pix=source[number-1].get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False); Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(OUT/f'page-{number}.webp','WEBP',quality=85,method=6)
 source.close(); clipped.close()
def main():
 parser=argparse.ArgumentParser(); parser.add_argument('--convert',action='store_true',help='Perform the separately supervised PDF/WebP conversion'); args=parser.parse_args()
 if not SOURCE.is_file(): raise RuntimeError(f'Missing already-downloaded HebrewBooks PDF: {SOURCE}')
 OUT.mkdir(parents=True,exist_ok=True)
 if args.convert: convert()
 expected={f'page-{n}.webp' for n in range(START,END+1)}; present={p.name for p in OUT.glob('page-*.webp')}; complete=expected==present and (OUT/'peer-halikutim-torah-14.pdf').is_file()
 if present and present!=expected: raise RuntimeError('Partial Torah 14 Pe’er image set exists; refusing to describe it as complete')
 manifest={'schemaVersion':2,'title':'Pe’er HaLikutim — Torah 14','hebrewTitle':'פאר הליקוטים — תורה יד','sourceFile':SOURCE.name,'sourcePageRange':[START,END],'hebrewBooksId':54912,'sourceUrl':'https://hebrewbooks.org/54912','downloadUrl':'https://download.hebrewbooks.org/downloadhandler.ashx?req=54912','sourceSha256':sha256(SOURCE),'pdf':'/reader/super/likutay-moharan/1/14/peer-halikutim/peer-halikutim-torah-14.pdf','textStatus':'facsimile-only','facsimileStatus':'ready' if complete else 'pending-separately-supervised-conversion','textNotice':'The scan is authoritative. Page relationships are navigational and should be verified against the facsimile.','sectionDefinitions':SECTIONS,'pages':page_rows()}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 status='reused complete existing assets' if complete and not args.convert else 'converted assets' if complete else 'manifest only; facsimiles pending supervised conversion'
 print(f'Prepared Torah 14 Pe’er manifest: 48 pages (329–376); {status}.')
if __name__=='__main__': main()
