#!/usr/bin/env python3
"""Prepare authoritative Pe'er HaLikutim facsimiles for Torah 11."""
from __future__ import annotations
import hashlib,json
from pathlib import Path
import fitz
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];SOURCE=Path('/mnt/c/Users/Pettek/Downloads/pi-air halikutim - likutay moharan - volume 2 - torahs - Hebrewbooks_org_54912.pdf');OUT=ROOT/'public/reader/super/likutay-moharan/1/11/peer-halikutim';START,END,PASSAGES=198,241,59
SECTIONS=[{'id':'likutay-moharan','he':'ליקוטי מוהר״ן','en':'Central Torah','purpose':"Rabbi Nachman's canonical teaching",'stage':'read'},{'id':'revelation-story','he':'סיפור התגלות המאמר','en':'How the Torah was revealed','purpose':'Background and transmission story','stage':'understand'},{'id':'nahal-novea','he':'נחל נובע','en':'Direct explanation','purpose':'Close explanation from early Breslov sources','stage':'understand'},{'id':'mekor-chokhma','he':'מקור חכמה','en':'Direct sources','purpose':'Tanakh, Chazal, Zohar and Kabbalistic sources','stage':'deepen'},{'id':'yalkut-hanahal','he':'ילקוט הנחל','en':'Further explanation','purpose':'Later Breslov explanations','stage':'deepen'},{'id':'miluei-chokhma','he':'מילואי חכמה','en':'Further sources','purpose':'Additional source material','stage':'deepen'},{'id':'concepts','he':'ערכים וכינויים','en':'Concepts and terms','purpose':'Definitions of concepts and symbolic names','stage':'deepen'},{'id':'translator','he':'המתרגם','en':'Aramaic translated','purpose':'Hebrew translations of Aramaic quotations','stage':'understand'},{'id':'advice','he':'עצה ותושיה','en':'Practical guidance','purpose':'Practical advice distilled from the Torah','stage':'apply'},{'id':'prayer','he':'ואני תפלה','en':'Prayer','purpose':'Prayer corresponding to the Torah','stage':'pray'}]
def main():
 OUT.mkdir(parents=True,exist_ok=True);source=fitz.open(SOURCE);clipped=fitz.open();clipped.insert_pdf(source,from_page=START-1,to_page=END-1);clipped.save(OUT/'peer-halikutim-torah-11.pdf',garbage=4,deflate=True);pages=[];count=END-START+1
 for off,n in enumerate(range(START,END+1)):
  page=source[n-1];pix=page.get_pixmap(matrix=fitz.Matrix(1.8,1.8),alpha=False);Image.frombytes('RGB',[pix.width,pix.height],pix.samples).save(OUT/f'page-{n}.webp','WEBP',quality=85,method=6)
  lo=1+(off*PASSAGES)//count;hi=max(lo,((off+1)*PASSAGES)//count);related=list(range(lo,min(PASSAGES,hi)+1))
  pages.append({'sourcePage':n,'printedFolio':None,'image':f'/reader/super/likutay-moharan/1/11/peer-halikutim/page-{n}.webp','relatedSections':related,'relatedPassages':related,'pageBox':[round(page.rect.width,1),round(page.rect.height,1)],'extraction':{'status':'not-rendered','fragmentCounts':{}},'fragments':[]})
 manifest={'schemaVersion':2,'title':'Pe’er HaLikutim — Torah 11','hebrewTitle':'פאר הליקוטים — תורה יא','sourceFile':SOURCE.name,'sourcePageRange':[START,END],'hebrewBooksId':54912,'sourceUrl':'https://hebrewbooks.org/54912','downloadUrl':'https://download.hebrewbooks.org/downloadhandler.ashx?req=54912','sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'pdf':'/reader/super/likutay-moharan/1/11/peer-halikutim/peer-halikutim-torah-11.pdf','textStatus':'facsimile-only','textNotice':'The scan is authoritative. Page relationships are navigational and should be verified against the facsimile.','sectionDefinitions':SECTIONS,'pages':pages}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');source.close();clipped.close();print('Prepared 44 Torah 11 Pe’er pages (198–241).')
if __name__=='__main__':main()
