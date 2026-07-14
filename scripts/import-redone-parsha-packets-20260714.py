#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path('/root/ajew-org')
DL=Path('/mnt/c/Users/Pettek/Downloads')
NS='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS=re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE=re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)
BAD=['Translator','מתרגם','Editorial note','הערת עריכה','AI agents','גרסאות','error_outline','Translation error','Prepared for AJew.org','מוכן לפרסום']
REPL={
 'Parashas Eikev':'Parashas Aikev','Eikev':'Aikev','EIKEV':'AIKEV',
 'Parashas Re’eh':'Parashas Ri’ay','Re’eh':'Ri’ay','RE’EH':'RI’AY',
 'Parashas Ki Seitzei':'Parashas Kee Saitzay','Ki Seitzei':'Kee Saitzay','KI SEITZEI':'KEE SAITZAY',
 'Parashas Ki Savo':'Parashas Kee Savoa','Ki Savo':'Kee Savoa','KI SAVO':'KEE SAVOA',
 'Parashas Vayeilech':'Parashas Vayailech','Vayeilech':'Vayailech','VAYEILECH':'VAYAILECH',
 'Haazinu':'Ha’azinu','Parashas Haazinu':'Parashas Ha’azinu','HAAZINU':'HA’AZINU'
}
PDFS={
 'matot':'/pdfs/parsha/%D7%91%D7%9E%D7%93%D7%91%D7%A8/%D7%9E%D7%98%D7%95%D7%AA.pdf',
 'masei':'/pdfs/parsha/%D7%91%D7%9E%D7%93%D7%91%D7%A8/%D7%9E%D7%98%D7%95%D7%AA%20%D7%9E%D7%A1%D7%A2%D7%99.pdf',
 'devarim':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%93%D7%91%D7%A8%D7%99%D7%9D.pdf',
 'vaetchanan':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%95%D7%90%D7%AA%D7%97%D7%A0%D7%9F.pdf',
 'eikev':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A2%D7%A7%D7%91.pdf',
 'reeh':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A8%D7%90%D7%94.pdf',
 'shoftim':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A9%D7%95%D7%A4%D7%98%D7%99%D7%9D.pdf',
 'ki-teitzei':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%9B%D7%99%20%D7%AA%D7%A6%D7%90.pdf',
 'ki-tavo':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%9B%D7%99%20%D7%AA%D7%91%D7%95%D7%90.pdf',
 'nitzavim':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A0%D7%A6%D7%91%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%9A.pdf',
 'vayeilech':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A0%D7%A6%D7%91%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%9A.pdf',
 'haazinu':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%94%D7%90%D7%96%D7%99%D7%A0%D7%95.pdf'
}
HE_TITLE={'matot':'מטות','masei':'מסעי','devarim':'דברים','vaetchanan':'ואתחנן','eikev':'עקב','reeh':'ראה','shoftim':'שופטים','ki-teitzei':'כי תצא','ki-tavo':'כי תבוא','nitzavim':'נצבים','vayeilech':'וילך','haazinu':'האזינו'}
DISPLAY={'matot':'Mattos','masei':'Masei','devarim':'Devarim','vaetchanan':'Vaeschanan','eikev':'Aikev','reeh':'Ri’ay','shoftim':'Shoftim','ki-teitzei':'Kee Saitzay','ki-tavo':'Kee Savoa','nitzavim':'Nitzavim','vayeilech':'Vayailech','haazinu':'Ha’azinu'}
PART5_NUM={'devarim':1,'vaetchanan':2,'eikev':3,'reeh':4,'shoftim':5,'ki-teitzei':6,'ki-tavo':7,'nitzavim':8,'haazinu':9}

def norm(s):
 s=MARKS.sub('',s or '').strip(); s=re.sub(r'\s+',' ',s)
 for a,b in REPL.items(): s=s.replace(a,b)
 return s.strip()
def clean(s):
 s=norm(s)
 s=re.sub(r'^(?:Translator[’\']s Addition|Translator’s Addition|Translator\'s Addition)\s*[—-]?\s*', '', s).strip()
 s=re.sub(r'^תוספת מאת המתרגם\s*[—-]?\s*', '', s).strip()
 s=re.sub(r'^(?:Summary|סיכום|Diagram|תרשים)\s*[:—-]?\s*', '', s).strip()
 s=re.sub(r'\s*[א-ת״׳"\s]+גרסאות לקריאת מכונה\s*/\s*AI agents:\s*$', '', s).strip()
 return s

def paras(path):
 root=ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
 return [norm(''.join(t.text or '' for t in p.iter(NS+'t'))) for p in root.iter(NS+'p') if norm(''.join(t.text or '' for t in p.iter(NS+'t')))]

def parse_docx(path, skip_titles):
 ps=paras(path); entries=[]; summary=''; diagram=''; heading=''; current=None; expect=None
 for i,s in enumerate(ps):
  if s in skip_titles or s in {'Selected Teachings from Likutay Halachos and Rabbeinu’s Works','Scholastic Formal-Equivalence Translation','טקסט עברי מתוקן ומשוחזר','ליקוטים מליקוטי הלכות ומספרי רבנו','Prepared for AJew.org','מוכן לפרסום באתר אייג׳ו'}: continue
  if s.startswith('Editorial note:') or s.startswith('הערת עריכה:') or 'error_outline Translation error' in s: continue
  if expect:
   if expect=='summary' and not summary: summary=clean(s)
   if expect=='diagram' and not diagram: diagram=clean(s)
   expect=None; continue
  if s.startswith('Translator') or s.startswith('תוספת מאת המתרגם'):
   c=clean(s)
   if c in ('','Summary','סיכום'): expect='summary'; continue
   if c in ('Diagram','תרשים'): expect='diagram'; continue
   if '→' in c and not diagram: diagram=c
   elif not summary: summary=c
   continue
  m=NUM_RE.match(s)
  if m:
   current={'number':int(m.group(1)),'heading':heading,'text':clean(m.group(2))}
   entries.append(current); heading=''; continue
  nxt=ps[i+1] if i+1<len(ps) else ''
  if NUM_RE.match(nxt): heading=clean(s)
  elif current:
   c=clean(s)
   if c: current['text']=clean((current['text']+'\n\n'+c).strip())
  else:
   # unnumbered title/section headings before any entry ignored except summary handled above
   pass
 return {'summary':summary,'diagram':diagram,'entries':entries}

def exact_pair(he,en):
 eh={e['number']:e for e in he['entries']}; ee={e['number']:e for e in en['entries']}
 if set(eh)!=set(ee): raise SystemExit(f'number mismatch {sorted(set(eh)-set(ee))[:10]} {sorted(set(ee)-set(eh))[:10]}')
 return eh,ee

def write_packet(slug, he_entries, en_entries, nums, summary, diagram, he_src, en_src, combined_file=None):
 entries=[]
 for i,n in enumerate(nums,1):
  h=he_entries[n]; e=en_entries[n]
  entries.append({'number':i,'sourceNumber':n,'parsha':slug,'heHeading':h.get('heading',''),'enHeading':e.get('heading',''),'he':h.get('text',''),'en':e.get('text',''),'type':'teaching'})
 data={'id':f'{slug}-ajew-study','title':f'{DISPLAY[slug]} AJew Study Packet','hebrewTitle':HE_TITLE[slug],
       'subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works','hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו',
       'summary':summary,'map':diagram,'sourceFiles':{'hebrew':str(he_src),'english':str(en_src),'pdf':PDFS[slug]},'entries':entries}
 # standalone page data: matot/masei share existing combined file
 outslug = combined_file or slug
 out=ROOT/f'public/data/parsha-special/{outslug}.json'
 if combined_file and out.exists():
  existing=json.loads(out.read_text())
  existing['entries']=[x for x in existing.get('entries',[]) if x.get('parsha')!=slug] + entries
  existing['entries'].sort(key=lambda x:(x.get('parsha')!='matot', x.get('number',0)))
  existing['sourceFiles'].update({f'pdf{DISPLAY[slug]}':PDFS[slug]})
  out.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+'\n')
 else:
  out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 segs=[]
 if summary.get('he') or summary.get('en') or diagram.get('he') or diagram.get('en'):
  segs.append({'index':'Overview','he':'\n\n'.join(x for x in [summary.get('he'),diagram.get('he')] if x),'en':'\n\n'.join(x for x in [summary.get('en'),diagram.get('en')] if x)})
 for e in entries:
  segs.append({'index':e['number'],'he':'\n\n'.join(x for x in [e['heHeading'],e['he']] if x),'en':'\n\n'.join(x for x in [e['enHeading'],e['en']] if x)})
 reader={'id':f'parsha-packet-{slug}','title':f'AJew Study Packet — Parashas {DISPLAY[slug]}','hebrewTitle':f'{HE_TITLE[slug]} — ליקוטים','source':data['subtitle'],'pdf':PDFS[slug],'segments':segs}
 (ROOT/f'public/reader/parsha-packets/{slug}.json').write_text(json.dumps(reader,ensure_ascii=False,indent=2)+'\n')
 return entries,segs

def write_chumash(slug, entries, segs):
 if slug not in PART5_NUM: return
 n=PART5_NUM[slug]; title=DISPLAY[slug]; heb=HE_TITLE[slug]
 sim=[]; last_head=None; idx=1
 for e in entries:
  head=e.get('heHeading') or ''
  if head and head!=last_head:
   sim.append({'number':len(sim)+1,'hebrewTitle':head[:120],'segmentStart':idx})
   last_head=head
  idx+=1
 full={'id':f'clh-5-{n}','book':'chumash-lh','part':5,'torah':n,'displayNumber':n,'title':f'{title} - Chumash with Likutey Halachos','hebrewTitle':f'חומש עם ליקוטי הלכות — פרשת {heb}','keyVerse':'','keyVerseRef':'','themes':['Likutey Halachos','Chumash',title],'keywords':[], 'navigation':{'prevUrl':f'/reader/chumash-lh/5/{n-1}' if n>1 else '', 'nextUrl':f'/reader/chumash-lh/5/{n+1}' if n<9 else '', 'indexUrl':'/reader/chumash-lh/5'}, 'simanim':sim, 'segments':[]}
 # use teaching entries only (no overview) for chumash-lh book replacement
 for e in entries:
  full['segments'].append({'index':e['number'],'he':'\n\n'.join(x for x in [e['heHeading'],e['he']] if x),'en':'\n\n'.join(x for x in [e['enHeading'],e['en']] if x)})
 (ROOT/f'public/reader/chumash-lh/part-5/torah-{n}.json').write_text(json.dumps(full,ensure_ascii=False,indent=2)+'\n')
 section={'id':f'clh-5-{n}','book':'chumash-lh','part':5,'torah':n,'displayNumber':n,'title':title,'hebrewTitle':heb,'segments':full['segments']}
 (ROOT/f'public/reader/chumash-lh/section-p5-t{n}.json').write_text(json.dumps(section,ensure_ascii=False,indent=2)+'\n')

def process_single(slug, base, title_he=None):
 he_src=DL/f'{base}_AJew_corrected_Hebrew.docx'; en_src=DL/f'{base}_AJew_formal_equivalence_English.docx'
 skip={base.replace('_',' '), base.upper().replace('_',' '), title_he or '', DISPLAY.get(slug,'')}
 he=parse_docx(he_src, skip); en=parse_docx(en_src, skip)
 eh,ee=exact_pair(he,en)
 entries,segs=write_packet(slug,eh,ee,sorted(eh),{'he':he['summary'],'en':en['summary']},{'he':he['diagram'],'en':en['diagram']},he_src,en_src)
 write_chumash(slug,entries,segs)
 print(slug,len(entries),len(segs))

# Mattos/Masei combined
he_src=DL/'Mattos_Masei_AJew_corrected_Hebrew.docx'; en_src=DL/'Mattos_Masei_AJew_formal_equivalence_English.docx'
he=parse_docx(he_src, {'מטות — מסעי','פרשת מטות','פרשת מסעי'}); en=parse_docx(en_src, {'Mattos—Masei','Parashas Mattos','Parashas Masei'})
eh,ee=exact_pair(he,en)
# reset combined file with shared metadata
combined=ROOT/'public/data/parsha-special/mattos-masei.json'
combined.write_text(json.dumps({'id':'mattos-masei-ajew-study','title':'Mattos Masei AJew Study Packet','hebrewTitle':'מטות — מסעי','subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works','hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו','summary':{'he':he['summary'],'en':en['summary']},'map':{'he':he['diagram'],'en':en['diagram']},'sourceFiles':{'hebrew':str(he_src),'english':str(en_src),'pdfMatot':PDFS['matot'],'pdfMasei':PDFS['masei']},'entries':[]},ensure_ascii=False,indent=2)+'\n')
for slug, nums in [('matot', range(1,50)),('masei', range(50,80))]:
 entries,segs=write_packet(slug,eh,ee,nums,{'he':he['summary'],'en':en['summary']},{'he':he['diagram'],'en':en['diagram']},he_src,en_src,'mattos-masei')
 print(slug,len(entries),len(segs))

for slug,base,title_he in [
 ('devarim','Devarim','דברים'),('vaetchanan','Vaeschanan','ואתחנן'),('eikev','Eikev','עקב'),('reeh','Reeh','ראה'),('shoftim','Shoftim','שופטים'),('ki-teitzei','Ki_Seitzei','כי תצא'),('ki-tavo','Ki_Savo','כי תבוא'),('haazinu','Haazinu','האזינו')]:
 process_single(slug,base,title_he)
# Nitzavim/Vayailech combined
he_src=DL/'Nitzavim_Vayeilech_AJew_corrected_Hebrew.docx'; en_src=DL/'Nitzavim_Vayeilech_AJew_formal_equivalence_English.docx'
he=parse_docx(he_src, {'נצבים–וילך'}); en=parse_docx(en_src, {'NITZAVIM–VAYAILECH','NITZAVIM–VAYEILECH','Nitzavim–Vayailech'})
eh,ee=exact_pair(he,en)
for slug,nums in [('nitzavim', range(1,46)),('vayeilech', range(46,102))]:
 entries,segs=write_packet(slug,eh,ee,nums,{'he':he['summary'],'en':en['summary']},{'he':he['diagram'],'en':en['diagram']},he_src,en_src)
 write_chumash(slug,entries,segs)
 print(slug,len(entries),len(segs))
# update part-5 index
idx=json.loads((ROOT/'public/reader/chumash-lh/part-5/index.json').read_text())
for item in idx['torahs']:
 slug=item['slug']
 if slug in PART5_NUM or slug=='vaetchanan':
  path=ROOT/f"public/reader/chumash-lh/part-5/torah-{item['number']}.json"
  if path.exists():
   d=json.loads(path.read_text()); item['title']=DISPLAY.get(slug,item['title']); item['segments']=len(d['segments']); item['sections']=len(d.get('simanim',[])); item['hasEnglish']=True; item['englishCoverage']=100
# Vayailech is folded under nitzavim item in current index; keep title combined but counts combined file not available here.
(ROOT/'public/reader/chumash-lh/part-5/index.json').write_text(json.dumps(idx,ensure_ascii=False,indent=2)+'\n')
# final bad scan
paths=list((ROOT/'public/data/parsha-special').glob('*.json'))+list((ROOT/'public/reader/parsha-packets').glob('*.json'))+[ROOT/'public/reader/chumash-lh/part-5/index.json']+list((ROOT/'public/reader/chumash-lh/part-5').glob('torah-*.json'))+list((ROOT/'public/reader/chumash-lh').glob('section-p5-t*.json'))
for p in paths:
 s=p.read_text(errors='ignore')
 bad=[b for b in BAD if b in s]
 if bad and p.name in {'mattos-masei.json','devarim.json','vaetchanan.json','aikev.json','riay.json','shoftim.json','kee-saitzay.json','kee-savoa.json','nitzavim.json','vayeilech.json','haazinu.json'}:
  raise SystemExit(f'bad public strings in {p}: {bad}')
print('DONE redone packets')
