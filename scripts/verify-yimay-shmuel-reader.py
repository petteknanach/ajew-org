#!/usr/bin/env python3
"""Verify the Yimay Shmuel Reader corpus, source coverage, and search artifacts."""
import argparse, gzip, hashlib, json, re
from pathlib import Path


ROOT=Path(__file__).resolve().parents[1]
BOOK=ROOT/'public/reader/yimay-shmuel'
EXPECTED_CORPUS_SHA256={
 'he':'74b9b5e003ec3938305b17ae2e641f89fd3b6df1bf5add48f517ff8760009c3a',
 'en':'07821edafbf49d1484dcd3a48ce3041775dfc838cb2e9a1c3f418f5873cb1b8c',
}

def docx_chapters(path, heading):
 from docx import Document
 out=[]; cur=None
 for p in Document(path).paragraphs:
  t=p.text.strip()
  if re.fullmatch(heading,t):
   if cur is not None: out.append(cur)
   cur=[]
  elif cur is not None and t: cur.append(t)
 if cur is not None: out.append(cur)
 return out

def compact(texts): return ' '.join(' '.join(texts).split())

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--hebrew-docx',type=Path)
 ap.add_argument('--english-docx',type=Path)
 ap.add_argument('--require-search',action='store_true')
 args=ap.parse_args()
 index=json.loads((BOOK/'index.json').read_text(encoding='utf-8'))
 assert index['title']=='Yimay Shmuel' and index['hebrewTitle']=='ימי שמואל'
 assert index['totalTorahs']==140 and index['totalParagraphs']==1795 and len(index['torahs'])==140
 chapters=[]; total=0
 corpus_hashes={key:hashlib.sha256() for key in ('he','en')}
 for n in range(1,141):
  p=BOOK/f'section-{n}.json'; assert p.exists(),p
  d=json.loads(p.read_text(encoding='utf-8')); segs=d['segments']
  assert d['book']=='yimay-shmuel' and d['volume']==3 and d['torah']==n
  assert d['title']==f'Chapter {n}' and d['hebrewTitle'].startswith('פרק ')
  assert [s['index'] for s in segs]==list(range(1,len(segs)+1))
  assert all(s.get('he','').strip() and s.get('en','').strip() for s in segs)
  assert d['aligned_segments']==segs and d['totalParagraphs']==len(segs)
  for s in segs:
   for key in ('he','en'):
    corpus_hashes[key].update(f'{n}\0{s["index"]}\0{s[key]}\n'.encode())
  chapters.append(segs); total+=len(segs)
 assert total==1795
 assert {key:h.hexdigest() for key,h in corpus_hashes.items()}==EXPECTED_CORPUS_SHA256
 if args.hebrew_docx:
  src=docx_chapters(args.hebrew_docx,r'פרק .+'); assert len(src)==140
  for n,(raw,segs) in enumerate(zip(src,chapters),1):
   assert compact(raw)==compact([s['he'] for s in segs]),f'Hebrew source coverage mismatch chapter {n}'
 if args.english_docx:
  src=docx_chapters(args.english_docx,r'Chapter \d+'); assert len(src)==140
  for n,(raw,segs) in enumerate(zip(src,chapters),1):
   assert raw==[s['en'] for s in segs],f'English source coverage mismatch chapter {n}'
 catalog=json.loads((ROOT/'public/reader/catalog.json').read_text(encoding='utf-8'))
 books=[b for b in catalog['books'] if b.get('id')=='yimay-shmuel']; assert len(books)==1
 assert books[0]['title']=='Yimay Shmuel' and books[0]['parts'][0]['totalTorahs']==140
 if args.require_search:
  for lang in ('he','en'):
   with gzip.open(ROOT/f'public/data/light-search-index-{lang}.json.gz','rt',encoding='utf-8') as f: docs=json.load(f)
   ys=[d for d in docs if d.get('b')=='yimay-shmuel']; assert len(ys)==140,(lang,len(ys))
   assert all(d.get('l','').startswith('/reader/yimay-shmuel/1/') and d.get('x','').strip() for d in ys)
  meta=json.loads((ROOT/'public/reader-search/meta.json').read_text(encoding='utf-8'))
  ys=[d for d in meta['items'] if d.get('c')=='yimay-shmuel']; assert len(ys)==140,len(ys)
 print(json.dumps({'chapters':140,'aligned_segments':total,'empty_hebrew':0,'empty_english':0,'source_coverage':bool(args.hebrew_docx and args.english_docx),'search_verified':args.require_search}))
if __name__=='__main__': main()
