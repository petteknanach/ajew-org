"""Exact additive Alim dispatch. Qualified saved text, not publication approval.

Search normalizes derived strings only. Plain exports enumerate current owned
fields/qualifications and declared archive records exactly once. Full descriptor
history is preserved in exact JSON assets, not recursively duplicated as body.
"""
import hashlib,html,json
from pathlib import Path
RELATIVE_SOURCE='alim-litrufa/reviewed/part-2-17-62-63.json'
SOURCE_SHA256='0cb13fcaea47bd382b80609aaca9d0509bb0a05d6af2c1c3b2da83bf313d1b2e'
ROUTE='/reader/alim-litrufa/reviewed/part-2-17-62-63'
TITLE='Alim LiTrufa — additive AI-reviewed / editorially qualified Part 2 letters 17, 62, 63 only'
NOTICE='Three complete letters only, not whole-book review. Additive AI-reviewed/editorially qualified saved-text candidate. Canonical edition unchanged. No human/source-owner, native-print, every-mark or publication approval. Retained historical pending flags are not silently upgraded.'
def digest(b):return hashlib.sha256(b).hexdigest()
def is_reviewed_source(path,reader_dir):return Path(path).relative_to(reader_dir).as_posix()==RELATIVE_SOURCE
def checked_projection(path,data):
 raw=Path(path).read_bytes()
 if digest(raw)!=SOURCE_SHA256 or json.loads(raw)!=data:raise ValueError('FINAL Alim exact source drift')
 if data['schema']!='alim-candidate-reader-projection-with-owned-qualifications-v1':raise ValueError('Alim schema')
 if any(v is not False for v in data['permissions'].values()):raise ValueError('False Alim permission')
 if [l['letter'] for l in data['letters']]!=[17,62,63]:raise ValueError('Alim letter order')
 wrappers={};paragraphs=spans=notes=archive=0
 for l in data['letters']:
  wp=Path(path).parent/f"letter-{l['letter']}-provenance.json";wr=wp.read_bytes()
  if digest(wr)!=l['successor_sha256']:raise ValueError('Alim wrapper drift')
  w=json.loads(wr);wrappers[l['letter']]=w;rows=w['candidate']['reader_candidate']['segments']
  if len(rows)!=len(l['segments']):raise ValueError('Alim complete paragraph scope')
  for s in l['segments']:
   paragraphs+=1;pos=s['position'];row=rows[pos]
   if s['owner_letter']!=l['letter'] or row['index']!=s['index']:raise ValueError('Alim owner')
   if row['en']!=s['selected_en'] or digest(s['selected_en'].encode())!=s['selected_en_sha256']:raise ValueError('Alim English')
   for f in s['source_fields']:
    if f['present']:
     if row[f['field']]!=f['text'] or digest(f['text'].encode())!=f['sha256']:raise ValueError('Alim independent Hebrew')
    elif row.get(f['field']) is not None or f['text'] is not None or f['sha256'] is not None:raise ValueError('Alim invented secondary')
   pairs=[p for p in w['candidate']['pairs'] if p['position']==pos];spans+=len(pairs)
   if [p['id'] for p in pairs]!=s['pair_ids'] or ''.join(p['he'] for p in pairs)!=row['he']:raise ValueError('Alim spans')
   for i,q in enumerate(s['qualification_occurrences']):
    notes+=1
    if q['owner_letter']!=l['letter'] or q['owner_position']!=pos or q['ordinal']!=i or q['qualification']!=w['original_segment_provenance'][pos]['reader_facing_provenance'][i] or digest(q['qualification']['text'].encode())!=q['text_sha256']:raise ValueError('Alim qualification descriptor')
  archive+=len(l['archival_apparatus'])+len(l['complete_archival_english_witness_nodes'])
 if (paragraphs,spans,notes,archive)!=(27,65,98,81):raise ValueError('Alim complete declared inventory')
 return wrappers

def search_document(path,data):
 checked_projection(path,data);segments=[]
 norm=lambda x:' '.join(x.split())
 for l in data['letters']:
  for s in l['segments']:
   primary=next(f['text'] for f in s['source_fields'] if f['field']=='he')
   secondary=next(f for f in s['source_fields'] if f['field']=='he_nikud')
   # Derived primary slot explicitly follows accepted primary. Distinct supplied
   # secondary participates as an additional lookup, never a harmonized witness.
   segments.append({'index':f"{l['letter']}-p{s['position']}",'siman':l['letter'],
    'he':norm(primary),'he_nikud':norm(primary),
    'commentary_he':norm(secondary['text']) if secondary['present'] and secondary['text']!=primary else '',
    'en':norm(s['selected_en']),
    'commentary_en':norm(' '.join(q['qualification']['text'] for q in s['qualification_occurrences']))})
 return {'title':TITLE,'hebrewTitle':'עלים לתרופה','segments':segments,'qualifiedReviewedProjection':True}

def write_plain(path,data,out_dir):
 wrappers=checked_projection(path,data);out=Path(out_dir)/'alim-litrufa/reviewed/part-2-17-62-63';out.mkdir(parents=True,exist_ok=True)
 text=[TITLE,NOTICE,'Source: https://ajew.org'+ROUTE];md=['# '+TITLE,NOTICE];markup=['<!doctype html><meta charset="utf-8"><title>'+html.escape(TITLE)+'</title>','<h1>'+html.escape(TITLE)+'</h1><p>'+html.escape(NOTICE)+'</p>','<a href="'+ROUTE+'">Reader</a> · <a href="index.json">Exact raw projection</a>']
 def emit(label,value,direction='ltr'):
  escaped=html.escape(value).replace('\r','&#13;')
  text.extend([label,value]);md.extend(['## '+label,'<pre dir="'+direction+'">'+escaped+'</pre>']);markup.extend(['<h3>'+html.escape(label)+'</h3>','<pre dir="'+direction+'" style="white-space:pre-wrap">'+escaped+'</pre>'])
 for l in data['letters']:
  emit('Part 2 / Letter '+str(l['letter']),'')
  for s in l['segments']:
   owner=f"al-2-{l['letter']}-p{s['position']}";markup.append('<section id="'+f"letter-{l['letter']}-segment-{s['position']}"+'">')
   emit('Owned original paragraph '+owner,'')
   for f in s['source_fields']:emit(f['field']+' — '+('supplied independent witness' if f['present'] else 'ABSENT (not generated)'),f['text'] if f['present'] else '', 'rtl')
   emit('SELECTED ENGLISH',s['selected_en'])
   for q in s['qualification_occurrences']:emit('REQUIRED QUALIFICATION — '+owner+' — ordinal '+str(q['ordinal']),q['qualification']['text'])
   markup.append('</section>')
  emit('ARCHIVAL ENGLISH — history-only witnesses, no paragraph alignment','')
  for n in l['complete_archival_english_witness_nodes']:
   emit('History-only witness node '+str(n['ordinal']),n['text'])
   emit('Exact nonbody witness descriptor',json.dumps({k:v for k,v in n.items() if k!='text'},ensure_ascii=False,indent=2))
  emit('ARCHIVAL APPARATUS — actual declared owners; not selected translations','')
  for a in l['archival_apparatus']:
   emit('History-only apparatus — actual owner '+str(a['owner']),a['text'])
   emit('Exact nonbody apparatus descriptor',json.dumps({k:v for k,v in a.items() if k not in ('text','complete_prior_descriptor_json')},ensure_ascii=False,indent=2))
   if a.get('complete_prior_descriptor_json'):emit('Complete prior apparatus descriptor — history only',a['complete_prior_descriptor_json'])
  # Exact wrapper is a separate authoritative asset, not repeated current body.
  name=f"letter-{l['letter']}-provenance.json";(out/name).write_bytes((Path(path).parent/name).read_bytes());markup.append('<a href="'+name+'">Full exact provenance/history wrapper for letter '+str(l['letter'])+'</a>')
 for name,value in [('index.txt','\n\n'.join(text)+'\n'),('index.md','\n\n'.join(md)+'\n'),('index.html','\n'.join(markup)+'\n')]: (out/name).write_bytes(value.encode())
 (out/'index.json').write_bytes(Path(path).read_bytes())
 return {'bookId':'alim-litrufa','part':'reviewed','torah':'part-2-17-62-63','title':TITLE,'hebrewTitle':'עלים לתרופה','sourceUrl':ROUTE,'url':'/reader-plain/alim-litrufa/reviewed/part-2-17-62-63/','segments':27}
