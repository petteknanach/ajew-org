#!/usr/bin/env python3
"""Verify the Yimay Shmuel Reader corpus, source coverage, and search artifacts."""
import argparse, gzip, hashlib, json, re
from pathlib import Path


ROOT=Path(__file__).resolve().parents[1]
BOOK=ROOT/'public/reader/yimay-shmuel'
EXPECTED_CORPUS_SHA256={
 'he':'74b9b5e003ec3938305b17ae2e641f89fd3b6df1bf5add48f517ff8760009c3a',
 'en':'556be6a3b737ccc97fcee113438d18ac1a5dcf357bc13d2ec6978d855170b6e5',
}
TRANSLATION_CORRECTIONS={
 (19,6):[("For it is stated in the holy Zohar that Rachel our Mother accomplishes more good at her burial than the holy Patriarchs accomplish at their burial in the Cave of Machpelah. Through their merit the entire world endures","For the holy Zohar describes the great good accomplished by the holy Patriarchs at their burial place in the Cave of Machpelah: through their merit the entire world endures")],
 (79,10):[("If, God forbid, his condition worsened, they would say that we were responsible and would refuse even to receive us.","If, God forbid, his condition worsened, they would say that we were responsible for it and would not even want to answer us.")],
 (82,6):[("and this would not help preserve his life.","and it would not avail us—[the Hebrew here is textually uncertain: חייו, literally ‘his life,’ possibly a corrupt reading of ח״ו, ‘God forbid’].")],
 (137,8):[("composed by Ezra the Scribe","instituted by Ezra the Scribe")],
 (140,5):[("; the light would remain inside the house and would also illuminate the sukkah, without being visible above. In retrospect I was pleased with this arrangement, for the sukkah in the broad courtyard had always faced a troublesome area, whereas the place beside the house was clean.","; the light would remain inside the house and would also illuminate the sukkah. In retrospect I was pleased, because the sukkah in the broad courtyard always faced the idolatrous object [the cross mentioned above], whereas beside the house it was clean.")],
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
  assert sum(len(v) for v in TRANSLATION_CORRECTIONS.values())==5
  for (chapter,segment),replacements in TRANSLATION_CORRECTIONS.items():
   text=src[chapter-1][segment-1]
   for old,new in replacements:
    assert old in text,(chapter,segment,old)
    text=text.replace(old,new)
   src[chapter-1][segment-1]=text
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
