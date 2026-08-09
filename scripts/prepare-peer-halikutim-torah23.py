#!/usr/bin/env python3
"""Prepare Torah 23 Pe'er pages 21–112; convert only with --convert."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SOURCE=Path('/mnt/c/Users/Pettek/Downloads/pi-air halikutim - likutay moharan - volume 4 - torahs 23-27 Hebrewbooks_org_66039.pdf');OUT=ROOT/'public/reader/super/likutay-moharan/1/23/peer-halikutim';START,END,PASSAGES=21,112,104;SHA='7d8d2adaad23ace7197ecac35b3e2055973305b832b45581c7d27fe84c76e052'
def digest(p):
 h=hashlib.sha256();
 with p.open('rb') as f:
  for c in iter(lambda:f.read(1048576),b''):h.update(c)
 return h.hexdigest()
def rows():
 n=END-START+1;return [{'sourcePage':p,'printedFolio':None,'image':f'/reader/super/likutay-moharan/1/23/peer-halikutim/page-{p}.webp','relatedSections':list(range(1+(o*PASSAGES)//n,min(PASSAGES,((o+1)*PASSAGES)//n)+1)),'relatedPassages':list(range(1+(o*PASSAGES)//n,min(PASSAGES,((o+1)*PASSAGES)//n)+1)),'extraction':{'status':'not-rendered','fragmentCounts':{}},'fragments':[]} for o,p in enumerate(range(START,END+1))]
def main():
 a=argparse.ArgumentParser();a.add_argument('--convert',action='store_true');x=a.parse_args()
 if not SOURCE.is_file() or digest(SOURCE)!=SHA:raise RuntimeError('frozen PDF missing/checksum changed')
 OUT.mkdir(parents=True,exist_ok=True)
 if x.convert:
  import fitz
  from PIL import Image
  src=fitz.open(SOURCE);clip=fitz.open();clip.insert_pdf(src,from_page=START-1,to_page=END-1);clip.save(OUT/'peer-halikutim-torah-23.pdf',garbage=4,deflate=True)
  for p in range(START,END+1):
   pix=src[p-1].get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False);Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(OUT/f'page-{p}.webp','WEBP',quality=85,method=6)
  src.close();clip.close()
 expected={f'page-{p}.webp' for p in range(START,END+1)};present={p.name for p in OUT.glob('page-*.webp')};complete=present==expected and (OUT/'peer-halikutim-torah-23.pdf').is_file()
 if present and present!=expected:raise RuntimeError('partial images')
 d={'schemaVersion':2,'title':'Pe’er HaLikutim — Torah 23','hebrewTitle':'פאר הליקוטים — תורה כג','sourceFile':SOURCE.name,'sourcePageRange':[START,END],'hebrewBooksId':66039,'sourceUrl':'https://hebrewbooks.org/66039','downloadUrl':'https://download.hebrewbooks.org/downloadhandler.ashx?req=66039','sourceSha256':SHA,'pdf':'/reader/super/likutay-moharan/1/23/peer-halikutim/peer-halikutim-torah-23.pdf','textStatus':'facsimile-only','facsimileStatus':'ready' if complete else 'pending-separately-supervised-conversion','textNotice':'Authoritative scan: Torah 23 is PDF pages 21–112 inclusive (92 pages). Page 20 is the title/facsimile page and page 113 begins Torah 24; both are excluded.','sectionDefinitions':[],'pages':rows()};(OUT/'manifest.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print(f'Prepared Torah 23 Pe’er: pages 21–112 (92); '+('ready.' if complete else 'facsimiles pending separately supervised conversion.'))
if __name__=='__main__':main()
