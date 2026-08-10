#!/usr/bin/env python3
"""Rebuild Torah 1-34 Super Reader base text from the user's local sources only."""
from __future__ import annotations
import json,re
from pathlib import Path
from docx import Document

ROOT=Path(__file__).resolve().parents[1]
DOCS=Path('/mnt/c/Users/Pettek/Documents/Translations/Likutay Moharan')
HEBREW_NUMS=['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ']

def english_groups(n:int):
    path=DOCS/f'Torah {n}.docx'
    paras=[p.text.strip() for p in Document(str(path)).paragraphs if p.text.strip()]
    front=[]; groups={}; current=None
    for text in paras:
        match=re.match(r'^(\d{1,2})[.)]?\s*(.*)$',text)
        number=None
        if match:
            candidate=int(match.group(1))
            if 1<=candidate<=30:
                number=candidate
        if number is not None and (number==1 or current is not None):
            current=number; groups.setdefault(number,[])
            body=match.group(2).strip()
            if body: groups[number].append(body)
        elif current is None: front.append(text)
        else: groups[current].append(text)
    return path,front,groups

def hebrew_groups(n:int):
    path=ROOT/f'public/reader/likutay-moharan/part-1/torah-{n}.json'
    data=json.loads(path.read_text(encoding='utf-8'))
    front=[]; groups={}; current=None; expected=0
    for record in data['segments']:
        he=str(record.get('he') or '').strip()
        token=re.split(r'[\s.():]+',he,1)[0].replace('״','').replace('"','').replace("'",'')
        if expected<len(HEBREW_NUMS) and token==HEBREW_NUMS[expected]:
            expected+=1; current=expected; groups.setdefault(current,[]).append(record)
        elif current is None: front.append(record)
        else: groups[current].append(record)
    return data,front,groups

def join_he(records,key):
    return '\n\n'.join(str(r.get(key) or r.get('he') or '').strip() for r in records if str(r.get(key) or r.get('he') or '').strip())

def clip_words(text,count):
    plain=re.sub(r'\s+',' ',text).strip()
    words=plain.split()
    return ' '.join(words[:count]).strip(' ,;:.')

def rebuild(n:int):
    doc_path,en_front,en_groups=english_groups(n)
    classic,he_front,he_groups=hebrew_groups(n)
    safely_sectioned=bool(en_groups) and list(en_groups)==list(he_groups)
    groups=[]
    if safely_sectioned:
        if en_front or he_front:
            groups.append((0,he_front,en_front))
        for section in en_groups:
            groups.append((section,he_groups[section],en_groups[section]))
    else:
        all_he=[r for r in he_front for _ in [0]]+[r for key in he_groups for r in he_groups[key]]
        all_en=en_front+[p for key in en_groups for p in en_groups[key]]
        groups=[(0,all_he,all_en)]
    segments=[]; phrases=[]
    for index,(section,he_records,en_paras) in enumerate(groups,1):
        he=join_he(he_records,'he'); he_nikud=join_he(he_records,'he_nikud'); en='\n\n'.join(en_paras).strip()
        if not he or not en: raise RuntimeError(f'Torah {n} group {section}: missing local language')
        ref=f'Likutay Moharan {n}' + (f':{section}' if section else '')
        segments.append({'index':index,'sourceSection':section or index,'sourceRef':ref,
            'provenance':f'Project-owned sources: {doc_path} and canonical local Hebrew reader',
            'he':he,'he_nikud':he_nikud,'en':en,'rawSource':{'he':he_nikud or he,'en':en},
            'classicSegments':[r.get('index') for r in he_records]})
        phrase_he=clip_words(he,10); phrase_en=clip_words(en,14)
        phrases.append({'id':f'{index}-1','segment':index,'section':section or index,
            'he':phrase_he,'en':phrase_en,'enMatch':phrase_en,
            'info':f'Opening words of {ref}, from the project-owned Torah translation.',
            'source':ref,'sourceRef':ref})
    out={
      'id':f'super-lm-1-{n}-study','book':'likutay-moharan','part':1,'torah':n,
      'displayNumber':str(n),'title':classic.get('title') or f'Torah {n}',
      'hebrewTitle':classic.get('hebrewTitle') or '', 'keyVerse':classic.get('keyVerse') or '',
      'keyVerseTranslation':'','keyVerseRef':classic.get('keyVerseRef') or '',
      'themes':classic.get('themes') or [],'segments':segments,
      'sourcePolicy':'Project-owned local sources only',
      'sourceFiles':[str(doc_path),f'public/reader/likutay-moharan/part-1/torah-{n}.json'],
      'totalSegments':len(segments),'hasEnglish':True,
    }
    out_path=ROOT/f'public/reader/super/likutay-moharan/1/{n}/torah-study.json'
    out_path.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    phrase_path=out_path.with_name('phrase-study.json')
    phrase={'title':f'Torah {n} local-source phrase navigation','status':'Project-owned source navigation aid',
            'selectedPassages':[s['index'] for s in segments],
            'representedSections':[s['sourceSection'] for s in segments],
            'distribution':{str(s['index']):1 for s in segments},'phrases':phrases}
    phrase_path.write_text(json.dumps(phrase,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return len(segments),safely_sectioned

def main():
    for n in range(1,35):
        count,sectioned=rebuild(n)
        print(f'Torah {n}: {count} local bilingual passage(s); sectioned={sectioned}')
if __name__=='__main__': main()
