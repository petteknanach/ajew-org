#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path('/root/ajew-org')
DL=Path('/mnt/c/Users/Pettek/Downloads')
NS='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS=re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE=re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)
BAD=['Translator','מתרגם','Editorial note','הערת עריכה','AI agents','גרסאות','error_outline','Translation error']
DISPLAY_REPL={
 'Vayeilech':'Vayailech','Parashas Vayeilech':'Parashas Vayailech','Parashat Vayeilech':'Parashat Vayailech',
}

def clean(s):
    s=MARKS.sub('',s or '').strip()
    return re.sub(r'\s+', ' ', s).strip()

def docx_paras(path):
    root=ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    return [s for p in root.iter(NS+'p') if (s:=clean(''.join(t.text or '' for t in p.iter(NS+'t'))))]

def strip_notes(text):
    text=re.sub(r'^(?:Translator[’\']s Addition|Translator’s Addition|Translator\'s Addition)\s*[—-]\s*', '', text).strip()
    text=re.sub(r'^תוספת מאת המתרגם\s*[—-]\s*', '', text).strip()
    text=re.sub(r'^(?:Summary|סיכום)\s*:\s*', '', text).strip()
    text=re.sub(r'^(?:Diagram|תרשים)\s*:\s*', '', text).strip()
    text=re.sub(r'\s*[א-ת״׳"\s]+גרסאות לקריאת מכונה\s*/\s*AI agents:\s*$', '', text).strip()
    text=text.replace('error_outline Translation error Try again','').replace('error_outline Translation error','').strip()
    for a,b in DISPLAY_REPL.items(): text=text.replace(a,b)
    return text

def parse(path, skip):
    ps=docx_paras(path)
    entries=[]; summary=''; diagram=''; heading=''; current=None
    for i,s in enumerate(ps):
        if s in skip: continue
        if 'error_outline Translation error' in s: continue
        if s.startswith('Translator') or s.startswith('תוספת מאת המתרגם'):
            st=strip_notes(s)
            if '→' in st: diagram=st
            elif not summary: summary=st
            continue
        if s.startswith('Editorial note:') or s.startswith('הערת עריכה:'): continue
        m=NUM_RE.match(s)
        if m:
            current={'number':int(m.group(1)),'heading':heading,'text':strip_notes(m.group(2)),'type':'teaching'}
            entries.append(current); heading=''; continue
        nxt=ps[i+1] if i+1 < len(ps) else ''
        if NUM_RE.match(nxt):
            heading=strip_notes(s)
        elif current:
            st=strip_notes(s)
            if st: current['text']=strip_notes((current['text']+'\n\n'+st).strip())
        else:
            heading=strip_notes(s)
    return {'summary':summary,'diagram':diagram,'entries':entries}

def make_packet(slug, display, he_title, he, en_entries, nums, pdf, source_he, source_en, summary, diagram):
    entries=[]
    for n in nums:
        h=he[n]
        e=en_entries[n]
        entries.append({'number': n, 'parsha': slug, 'heHeading': h.get('heading',''), 'enHeading': e.get('heading',''), 'he': h.get('text',''), 'en': e.get('text',''), 'type':'teaching'})
    data={'id':f'{slug}-ajew-study','title':f'{display} AJew Study Packet','hebrewTitle':he_title,
          'subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works','hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו',
          'summary':summary,'map':diagram,'sourceFiles':{'hebrew':source_he,'english':source_en,'pdf':pdf},'entries':entries}
    out=ROOT/f'public/data/parsha-special/{slug}.json'; out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    segs=[]
    if summary.get('he') or summary.get('en') or diagram.get('he') or diagram.get('en'):
        segs.append({'index':'Overview','he':'\n\n'.join(x for x in [summary.get('he'),diagram.get('he')] if x),'en':'\n\n'.join(x for x in [summary.get('en'),diagram.get('en')] if x)})
    for e in entries:
        segs.append({'index':e['number'],'he':'\n\n'.join(x for x in [e['heHeading'],e['he']] if x),'en':'\n\n'.join(x for x in [e['enHeading'],e['en']] if x)})
    reader={'id':f'parsha-packet-{slug}','title':f'AJew Study Packet — Parashas {display}','hebrewTitle':f'{he_title} — ליקוטים','source':data['subtitle'],'pdf':pdf,'segments':segs}
    rp=ROOT/f'public/reader/parsha-packets/{slug}.json'; rp.parent.mkdir(parents=True,exist_ok=True)
    rp.write_text(json.dumps(reader,ensure_ascii=False,indent=2)+'\n')
    for p in [out,rp]:
        s=p.read_text()
        bad=[x for x in BAD if x in s]
        if bad: raise SystemExit(f'bad public strings in {p}: {bad}')
    print(slug, len(entries), 'reader_segments', len(segs))

def by_num(parsed): return {e['number']:e for e in parsed['entries']}
# Nitzavim/Vayailech combined, English has carry-over [1]; shift [2]=>Hebrew[1].
he_nv=parse(DL/'Nitzavim_Vayeilech_AJew_corrected_Hebrew.docx', {'נצבים–וילך','ליקוטים מליקוטי הלכות ומספרי רבנו','טקסט עברי מתוקן ומשוחזר'})
en_nv=parse(DL/'Nitzavim_Vayeilech_AJew_formal_equivalence_English.docx', {'Nitzavim–Vayeilech','Nitzavim Vayeilech','Selected Teachings from Likutay Halachos and Rabbeinu’s Works','Scholastic Formal-Equivalence Translation'})
he_nv_num=by_num(he_nv)
en_nv_num={e['number']-1:e for e in en_nv['entries'] if e['number']>=2}
en_nv_num[94]={'heading':'','text':'Even after great corruption, some unique individuals will still be found who strengthen themselves to search and seek the word of Hashem and the true tzaddikim. As long as one learns from the true Torah and holds to the chain of Moshe’s transmission, the song and the testimony remain alive, and the Torah is not forgotten from Israel.'}
pdf_nv='/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A0%D7%A6%D7%91%D7%99%D7%9D-%D7%95%D7%99%D7%9C%D7%9A.pdf'
summary_nv={'he':he_nv['summary'],'en':en_nv['summary']}; diagram_nv={'he':he_nv['diagram'],'en':en_nv['diagram']}
make_packet('nitzavim','Nitzavim','נצבים',he_nv_num,en_nv_num,range(1,46),pdf_nv,'/mnt/c/Users/Pettek/Downloads/Nitzavim_Vayeilech_AJew_corrected_Hebrew.docx','/mnt/c/Users/Pettek/Downloads/Nitzavim_Vayeilech_AJew_formal_equivalence_English.docx',summary_nv,diagram_nv)
make_packet('vayeilech','Vayailech','וילך',he_nv_num,en_nv_num,range(46,95),pdf_nv,'/mnt/c/Users/Pettek/Downloads/Nitzavim_Vayeilech_AJew_corrected_Hebrew.docx','/mnt/c/Users/Pettek/Downloads/Nitzavim_Vayeilech_AJew_formal_equivalence_English.docx',summary_nv,diagram_nv)
# Haazinu exact numbering.
he_h=parse(DL/'Haazinu_AJew_corrected_Hebrew.docx', {'האזינו','ליקוטים מליקוטי הלכות ומספרי רבנו','טקסט עברי מתוקן ומשוחזר'})
en_h=parse(DL/'Haazinu_AJew_formal_equivalence_English.docx', {'Haazinu','Selected Teachings from Likutay Halachos and Rabbeinu’s Works','Scholastic Formal-Equivalence Translation'})
make_packet('haazinu',"Ha'azinu",'האזינו',by_num(he_h),by_num(en_h),range(1,31),'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%94%D7%90%D7%96%D7%99%D7%A0%D7%95.pdf','/mnt/c/Users/Pettek/Downloads/Haazinu_AJew_corrected_Hebrew.docx','/mnt/c/Users/Pettek/Downloads/Haazinu_AJew_formal_equivalence_English.docx',{'he':he_h['summary'],'en':en_h['summary']},{'he':he_h['diagram'],'en':en_h['diagram']})
