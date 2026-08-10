#!/usr/bin/env python3
"""Prepare Torah 33 Pe'er pages 363–440; convert only with --convert."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; SOURCE=Path('/mnt/c/Users/Pettek/Downloads/pi-air halikutim - likutay moharan - volume 5 - torahs 28-34 Hebrewbooks_org_66040.pdf'); OUT=ROOT/'public/reader/super/likutay-moharan/1/33/peer-halikutim'; START,END,PASSAGES=363,440,53; SHA='f831b7a589474499ea1e6b7241ee0a5ed1b910148324449210209760a48792b7'
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1048576),b''): h.update(c)
 return h.hexdigest()
def rows():
 count=END-START+1; out=[]
 for o,page in enumerate(range(START,END+1)):
  a=1+o*PASSAGES//count; b=min(PASSAGES,(o+1)*PASSAGES//count); related=list(range(a,b+1)) or [min(PASSAGES,a)]
  out.append({'sourcePage':page,'printedFolio':None,'image':f'/reader/super/likutay-moharan/1/33/peer-halikutim/page-{page}.webp','relatedSections':related,'relatedPassages':related,'extraction':{'status':'not-rendered','fragmentCounts':{}},'fragments':[]})
 return out
def main():
 ap=argparse.ArgumentParser(); ap.add_argument('--convert',action='store_true'); args=ap.parse_args()
 if not SOURCE.is_file() or digest(SOURCE)!=SHA: raise RuntimeError('frozen PDF missing/checksum changed')
 OUT.mkdir(parents=True,exist_ok=True)
 if args.convert:
  import fitz
  from PIL import Image
  src=fitz.open(SOURCE); clip=fitz.open(); clip.insert_pdf(src,from_page=START-1,to_page=END-1); clip.save(OUT/'peer-halikutim-torah-33.pdf',garbage=4,deflate=True)
  for page in range(START,END+1):
   pix=src[page-1].get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False); Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(OUT/f'page-{page}.webp','WEBP',quality=85,method=6)
  src.close(); clip.close()
 expected={f'page-{p}.webp' for p in range(START,END+1)}; present={p.name for p in OUT.glob('page-*.webp')}; complete=present==expected and (OUT/'peer-halikutim-torah-33.pdf').is_file()
 if present and present!=expected: raise RuntimeError('partial images')
 manifest={'schemaVersion':2,'title':'Pe’er HaLikutim — Torah 33','hebrewTitle':'פאר הליקוטים — תורה לג','sourceFile':SOURCE.name,'sourcePageRange':[START,END],'hebrewBooksId':66040,'sourceUrl':'https://hebrewbooks.org/66040','downloadUrl':'https://download.hebrewbooks.org/downloadhandler.ashx?req=66040','sourceSha256':SHA,'pdf':'/reader/super/likutay-moharan/1/33/peer-halikutim/peer-halikutim-torah-33.pdf','textStatus':'facsimile-only','facsimileStatus':'ready' if complete else 'pending-separately-supervised-conversion','textNotice':'Authoritative scan: Torah 33 is PDF pages 363–440 inclusive (78 pages). Page 362 belongs to Torah 32; page 441 begins Torah 34 and is excluded.','sectionDefinitions':[],'pages':rows()}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n'); print('Prepared Torah 33 Pe’er: pages 363–440 (78); '+('ready.' if complete else 'facsimiles pending separately supervised conversion.'))
if __name__=='__main__': main()
