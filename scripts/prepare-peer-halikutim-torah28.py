#!/usr/bin/env python3
"""Prepare Torah 28 Pe'er pages 21–64; convert only with --convert."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path('/mnt/c/Users/Pettek/Downloads/pi-air halikutim - likutay moharan - volume 5 - torahs 28-34 Hebrewbooks_org_66040.pdf')
OUT=ROOT/'public/reader/super/likutay-moharan/1/28/peer-halikutim'
START,END,PASSAGES=21,64,36
SHA='f831b7a589474499ea1e6b7241ee0a5ed1b910148324449210209760a48792b7'
def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''): h.update(chunk)
 return h.hexdigest()
def rows():
 count=END-START+1; result=[]
 for offset,page in enumerate(range(START,END+1)):
  a=1+(offset*PASSAGES)//count; b=min(PASSAGES,((offset+1)*PASSAGES)//count); related=list(range(a,b+1)) or [min(PASSAGES,a)]
  result.append({'sourcePage':page,'printedFolio':None,'image':f'/reader/super/likutay-moharan/1/28/peer-halikutim/page-{page}.webp','relatedSections':related,'relatedPassages':related,'extraction':{'status':'not-rendered','fragmentCounts':{}},'fragments':[]})
 return result
def main():
 parser=argparse.ArgumentParser(); parser.add_argument('--convert',action='store_true'); args=parser.parse_args()
 if not SOURCE.is_file() or digest(SOURCE)!=SHA: raise RuntimeError('frozen PDF missing/checksum changed')
 OUT.mkdir(parents=True,exist_ok=True)
 if args.convert:
  import fitz
  from PIL import Image
  source=fitz.open(SOURCE); clip=fitz.open(); clip.insert_pdf(source,from_page=START-1,to_page=END-1); clip.save(OUT/'peer-halikutim-torah-28.pdf',garbage=4,deflate=True)
  for page in range(START,END+1):
   pix=source[page-1].get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False); Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(OUT/f'page-{page}.webp','WEBP',quality=85,method=6)
  source.close(); clip.close()
 expected={f'page-{p}.webp' for p in range(START,END+1)}; present={p.name for p in OUT.glob('page-*.webp')}; complete=present==expected and (OUT/'peer-halikutim-torah-28.pdf').is_file()
 if present and present!=expected: raise RuntimeError('partial images')
 manifest={'schemaVersion':2,'title':'Pe’er HaLikutim — Torah 28','hebrewTitle':'פאר הליקוטים — תורה כח','sourceFile':SOURCE.name,'sourcePageRange':[START,END],'hebrewBooksId':66040,'sourceUrl':'https://hebrewbooks.org/66040','downloadUrl':'https://download.hebrewbooks.org/downloadhandler.ashx?req=66040','sourceSha256':SHA,'pdf':'/reader/super/likutay-moharan/1/28/peer-halikutim/peer-halikutim-torah-28.pdf','textStatus':'facsimile-only','facsimileStatus':'ready' if complete else 'pending-separately-supervised-conversion','textNotice':'Authoritative scan: Torah 28 is PDF pages 21–64 inclusive (44 pages). Page 20 is preceding front matter; page 65 begins Torah 29 and is excluded.','sectionDefinitions':[],'pages':rows()}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8'); print('Prepared Torah 28 Pe’er: pages 21–64 (44); '+('ready.' if complete else 'facsimiles pending separately supervised conversion.'))
if __name__=='__main__': main()
