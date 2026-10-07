"""Scoped additive current projection. Import has NO writes/build side effects.
Exact raw assets are authentication inputs; archive never becomes selected EN.
"""
import hashlib,html,json,copy
from pathlib import Path
RELATIVE_SOURCE='reviewed/wrapup-18-19-92-209.json'
SOURCE_SHA256='fad5efa4cdddf8962bbb6eb8d44e0b410c361546732a1f6fb5ada90bd5be92a4'
ROUTE='/reader/reviewed/wrapup-18-19-92-209'
TITLE='Qualified saved-source edition — complete Alim 2/18, 2/19; Sichos 92/209'
NOTICE='Additive AI-reviewed, editorially qualified saved-source English. Canonical editions unchanged. No authenticated original-user English, authoritative pointing, printed-source, human/source-owner, native or publication approval is asserted. Earlier English and comparison witnesses remain labelled retention, not selected translation.'
def digest(b):return hashlib.sha256(b).hexdigest()
def is_reviewed_source(path,reader_dir):return Path(path).relative_to(reader_dir).as_posix()==RELATIVE_SOURCE
def is_archival_source(path,reader_dir):return Path(path).relative_to(reader_dir).parts[:2]==('reviewed','wrapup-sources')
def pointer(d,p):
 for key in p.strip('/').split('/'):d=d[int(key)] if isinstance(d,list) else d[key]
 return d

def verify_current_bindings(wrappers):
 for key,d in wrappers.items():
  if key!='sichos':
   for b in d['current_bindings']:
    value=pointer(d,b['pointer']);r=d['rows'][int(b['pointer'].split('/')[2])]
    if b['owner']!=r['id'] or digest(value.encode())!=b['sha256']:raise ValueError('Current Alim binding owner/field drift')
   hk='reviewed_history_complete_prior_json' if key=='alim18' else 'history_complete_prior_json_utf8';hp='reviewed_history_sha256' if key=='alim18' else 'history_complete_prior_sha256'
   if digest(d[hk].encode())!=d[hp]:raise ValueError('Exact raw prior Alim history drift')
  else:
   prior=d['immediate_prior']
   if digest(prior['complete_prior_raw_utf8'].encode())!=prior['sha256']:raise ValueError('Exact raw immediate prior Sichos history drift')
   fields={(x['path'],x['pointer']):x['text'] for x in d['witness_inventory']}
   for r in d['rows']:
    for f in r['source'].values():
     if f['owner']!=r['owner'] or digest(f['text'].encode())!=f['full_field_sha256']:raise ValueError('Sichos source field binding drift')
     fields[f['path'],f['pointer']]=f['text']
   def span(s):
    value=pointer(d,s['pointer']) if s['path']=='selected-master' else fields[s['path'],s['pointer']]
    if digest(value.encode())!=s['full_field_sha256'] or value[s['start']:s['end']]!=s['text'] or digest(s['text'].encode())!=s['slice_sha256']:raise ValueError('Independent source quote/span drift')
   for i,r in enumerate(d['rows']):
    for f,clauses in r['source_clause_tracking'].items():
     if ''.join(c['span']['text'] for c in clauses)!=r['source'][f]['text']:raise ValueError('Whole independent field clause coverage')
     for c in clauses:span(c['span'])
    span(r['comparison_english_span'])
    for q in r['quote_bindings']:
     value=pointer(d,q['container'])
     if q['owner']!=r['owner'] or not q['container'].startswith('/rows/'+str(i)+'/') or digest(value.encode())!=q['full_field_sha256'] or value[q['start']:q['end']]!=q['text'] or digest(q['text'].encode())!=q['slice_sha256']:raise ValueError('Current English/qualification quote ownership drift')
     for s in q.get('independent_source_spans',{}).values():span(s)
     if q.get('basis_span'):span(q['basis_span'])
 return True

def derive_projection(wrappers,originals,groups,assets,witnesses):
 verify_current_bindings(wrappers)
 units=[];outgroups=[]
 for group in groups:
  g=copy.deepcopy(group);d=wrappers[g['selection']];orig=originals[g['original']]
  rows=d['rows'] if g['selection']!='sichos' else [r for r in d['rows'] if r['section']==g['section']]
  if len(rows)!=len(orig['segments']):raise ValueError('Complete original scope')
  g['original_metadata']={k:v for k,v in orig.items() if k!='segments'}
  g['apparatus']=copy.deepcopy(d.get('editorial_apparatus',[])) if g['selection']!='sichos' else [copy.deepcopy(a) for r in rows for a in r['apparatus']]
  g['unit_ids']=[]
  for event_position,r in enumerate(rows):
   owner=r.get('id',r.get('owner'));pos=r.get('position',r.get('array_position'));idx=r.get('index',r.get('source_index'))
   if pos!=event_position or orig['segments'][pos]['index']!=idx:raise ValueError('Index/array position drift')
   source=orig['segments'][pos]
   he=r.get('he') if g['selection']!='sichos' else r['source']['he']['text'];hn=r.get('he_nikud') if g['selection']!='sichos' else r['source']['he_nikud']['text'];en=r.get('en',r.get('selected_english'))
   if source['he']!=he or source['he_nikud']!=hn:raise ValueError('Independent Hebrew source drift')
   legacy=r.get('displaced_English',r.get('legacy_English',{})).get('text') if g['selection']!='sichos' else r['source']['en']['text']
   if source['en']!=legacy:raise ValueError('Displaced English drift')
   qs=copy.deepcopy(r['qualifications'])
   for q in qs:
    if q['owner']!=owner or q['placement'] not in ('after_pair','after-pair'):raise ValueError('Qualification ownership')
    if 'text_sha256' in q and digest(q['text'].encode())!=q['text_sha256']:raise ValueError('Qualification text binding')
   u={'owner':owner,'group':g['id'],'source_index':idx,'array_position':pos,'event_position':len(units),'anchor':'unit-'+owner.replace(':','-'),'he':he,'he_nikud':hn,'en':en,'qualifications':qs,'displacedEnglish':legacy,'original_segment':copy.deepcopy(source),'source_row':copy.deepcopy(r),'selection_key':g['selection']}
   units.append(u);g['unit_ids'].append(owner)
  outgroups.append(g)
 if len({u['owner'] for u in units})!=len(units):raise ValueError('Duplicate owner')
 if len(units)!=41 or sum(len(u['qualifications']) for u in units)!=33:raise ValueError('Current complete scope')
 return {'schema':'qualified-wrapup-projection/v1','title':TITLE,'notice':NOTICE,'route':ROUTE,'canonical_replacement':False,'publication_approved':False,'groups':outgroups,'units':units,'assets':copy.deepcopy(assets),'archival_witnesses':copy.deepcopy(witnesses)}
def checked_projection(path,data):
 raw=Path(path).read_bytes()
 if digest(raw)!=SOURCE_SHA256 or json.loads(raw)!=data:raise ValueError('Current exact projection drift')
 loaded={}
 for a in data['assets']:
  if Path(a['name']).name!=a['name']:raise ValueError('Asset traversal')
  b=(Path(path).parent/'wrapup-sources'/a['name']).read_bytes()
  if digest(b)!=a['sha256'] or len(b)!=a['bytes']:raise ValueError('Exact source/archival asset drift: '+a['name'])
  if a['name'].endswith('.json'):loaded[a['name']]=json.loads(b)
 wrappers={k:loaded[k+'-selected.json'] for k in ('alim18','alim19','sichos')};originals={k:loaded[k+'-original.json'] for k in ('alim18','alim19','sichos92','sichos209')}
 groups=[{k:g[k] for k in ('id','selection','original','title','canonical_url','part','section')} for g in data['groups']]
 if derive_projection(wrappers,originals,groups,data['assets'],data['archival_witnesses'])!=data:raise ValueError('Projection owner/full-field/history relationship drift')
 expected=[]
 for r in wrappers['sichos']['rows']:
  expected.append({'kind':'pair','owner':r['owner'],'he':r['source']['he']['text'],'he_nikud':r['source']['he_nikud']['text'],'en':r['selected_english']})
  for kind in ('qualifications','apparatus'):
   for q in r[kind]:expected.append({'kind':kind,**{k:q[k] for k in ('owner','id','placement','text')}})
 if loaded['sichos-ORDERED-EXPORT.json']!=expected:raise ValueError('Current ordered export drift')
 return data

def search_document(path,data):
 checked_projection(path,data);norm=lambda s:' '.join(s.split())
 # Unique actual owner strings are DOM indexes. event positions never masquerade
 # as regular source indexes. No archive or history enters the search body.
 return {'title':TITLE,'hebrewTitle':'עלים לתרופה / שיחות הר״ן','qualifiedReviewedProjection':True,'segments':[{'index':u['owner'],'siman':next(g['section'] for g in data['groups'] if g['id']==u['group']),'he':norm(u['he']),'he_nikud':norm(u['he_nikud']),'commentary_he':norm(u['he']) if u['he']!=u['he_nikud'] else '', 'en':norm(u['en']),'commentary_en':'','requiredQualifications':copy.deepcopy(u['qualifications'])} for u in data['units']]}

def write_plain(path,data,out_dir):
 checked_projection(path,data);out=Path(out_dir)/'reviewed/wrapup-18-19-92-209';out.mkdir(parents=True,exist_ok=True)
 txt=[TITLE,NOTICE,'Source: https://ajew.org'+ROUTE];md=['# '+TITLE,NOTICE];markup=['<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(TITLE)+'</title>','<h1>'+html.escape(TITLE)+'</h1><p>'+html.escape(NOTICE)+'</p>','<a href="'+ROUTE+'">Qualified Reader</a> · <a href="index.json">Exact projection</a>']
 def emit(label,value,dir='ltr'):
  escaped=html.escape(value).replace('\r','&#13;');txt.extend([label,value]);md.extend(['## '+label,'<pre dir="'+dir+'">'+escaped+'</pre>']);markup.extend(['<h3>'+html.escape(label)+'</h3>','<pre dir="'+dir+'" style="white-space:pre-wrap;overflow-wrap:anywhere">'+escaped+'</pre>'])
 for g in data['groups']:
  emit(g['title']+' — canonical edition remains separate',g['canonical_url']);emit('Original complete metadata',json.dumps(g['original_metadata'],ensure_ascii=False,indent=2))
  for u in [u for u in data['units'] if u['group']==g['id']]:
   markup.append('<section id="'+u['anchor']+'">');emit('Original owner '+u['owner']+' / source index '+str(u['source_index'])+' / array position '+str(u['array_position']),'')
   for f in ('he','he_nikud','en'):emit(f+' — '+('independently supplied source' if f!='en' else 'selected qualified English'),u[f],'rtl' if f!='en' else 'ltr')
   for q in u['qualifications']:emit('REQUIRED QUALIFICATION '+q['id']+' — owner '+q['owner'],q['text'])
   emit('Earlier English — archival retention, NOT asserted to align',u['displacedEnglish'])
   extra={k:v for k,v in u['original_segment'].items() if k not in ('he','he_nikud','en')};emit('Other original fields — preserved, not new approval',json.dumps(extra,ensure_ascii=False,indent=2));markup.append('</section>')
  for i,a in enumerate(g['apparatus']):emit('ARCHIVAL APPARATUS '+g['id']+' occurrence '+str(i)+' — actual owner '+str(a.get('owner'))+' — NOT selected translation',a.get('text',a.get('literal','')))
 for i,w in enumerate(data['archival_witnesses']):emit('ARCHIVAL WITNESS '+str(i)+' — actual witness owner '+w['owner']+' — '+w['role'],w['text'])
 for name,value in [('index.txt','\n\n'.join(txt)+'\n'),('index.md','\n\n'.join(md)+'\n'),('index.html','\n'.join(markup)+'\n')]: (out/name).write_bytes(value.encode())
 (out/'index.json').write_bytes(Path(path).read_bytes())
 # Exact full wrappers/history live in separate pinned assets, not recursively
 # emitted as duplicate body qualifications. Binary witnesses remain raw assets.
 sources=out/'wrapup-sources';sources.mkdir(exist_ok=True)
 for a in data['assets']:(sources/a['name']).write_bytes((Path(path).parent/'wrapup-sources'/a['name']).read_bytes())
 return {'bookId':'reviewed','part':'reviewed','torah':'wrapup-18-19-92-209','title':TITLE,'hebrewTitle':'עלים לתרופה / שיחות הר״ן','sourceUrl':ROUTE,'url':'/reader-plain/reviewed/wrapup-18-19-92-209/','segments':41}
