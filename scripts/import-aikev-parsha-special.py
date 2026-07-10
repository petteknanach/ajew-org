#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path('/root/ajew-org')
DL=Path('/mnt/c/Users/Pettek/Downloads')
NS='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS=re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE=re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)
SKIP_HE={'עקב','ליקוטים מליקוטי הלכות ומספרי רבנו','טקסט עברי מתוקן ומשוחזר'}
SKIP_EN={'Eikev','Aikev','Selected Teachings from Likutay Halachos and Rabbeinu’s Works','Scholastic Formal-Equivalence Translation'}
BAD_NOTE_RE=re.compile(r'(?:Translator|מתרגם|Editorial note|הערת עריכה|AI agents|גרסאות|error_outline|Translation error)', re.I)
EN_FILLS={
  105: 'Hashem, in His mercy, prepares a person’s livelihood. Therefore the Torah warns: “Lest you eat and be satisfied… and say in your heart, my strength and the power of my hand made me this wealth.” One must remember that Hashem gives the strength and the counsel to acquire possessions. The true spirit of all business is the good advice Hashem provides, to know what to buy and sell at the right time.',
  106: 'Without true counsel about what to trade in, no action will help; one can even lose more through his business activity. Therefore counsel is the main thing: that Hashem place in his heart complete advice, so he will know what to trade in and profit. This counsel is drawn only from Hashem, not from man’s action alone. After receiving the counsel, a person must then make his effort and do the business.',
  107: 'Knowing what to trade in is a clarification of the empty space, and this can be drawn only through emunah and bitachon in Hashem alone. The effort and business itself is the clarification from the breaking of the vessels, which is placed upon the person. Therefore the Torah warns that when he sees he must make some effort for livelihood, he should not mistakenly say, “my strength and the power of my hand.”',
  108: 'A person must not think that everything depends on his own action and effort, or that the counsel itself is from him. In truth, everything is from Hashem alone. The main thing is the counsel, and counsel is drawn only from Hashem. Through this come the main profit and flow. Certainly Hashem, Who gives the counsel, could give all the abundance without any effort, but He desires our service.',
  113: 'Through many prayers and supplications one reaches toward the Infinite; all this is the aspect of “we will hear.” Through this, “we will hear” becomes “we will do”: what had been hidden from us becomes revealed according to our level. Then one rises from level to level, until the tzaddikim merit what they merit. Now there are veils and separations between levels because of the diminution of the moon, so descent is sometimes needed for ascent.',
  118: 'This concerns the innerness itself: the hidden inner point that must be drawn out through holy effort, prayer, and attachment to the true tzaddikim.',
  122: 'At the time of the passing of Rabbi Eliezer the Great, he raised his two hands and said, “Woe for the two Torahs that are departing from the world.” The two hands are the generality of Torah: Written Torah and Oral Torah.',
  123: '“Only to fear.” There are people who fall very deeply in their own eyes, and because of this they rebel even more. They imagine that they are already so far away that there is no hope, as if fear of Hashem no longer applies in their place. Against this the prophet cries out and rebukes: even the sea has a boundary of sand that it cannot pass; so too a person must know that fear of Hashem reaches him even there.',
  125: 'This is like the teaching of the Sages: today the evil inclination tells him to do this, and tomorrow to do that. After a person turns away from the good path, he may not remind himself to return immediately, but instead goes farther each time. Because of his fall he rebels more, until he can leave the boundary completely. Therefore the verse says that they did not say in their heart, “Let us now fear Hashem.”',
  130: 'Therefore Moshe says, “And now, Israel, what does Hashem your God ask of you?” “Now” specifically: after all the toil I endured for you, taking you from Egypt, giving you the Torah with awesome signs, and illuminating you with holy knowledge. Even after all this, when there were failures and descents, the service remains to begin now, from this moment.',
  134: 'Because of the final good, “How great is Your goodness,” a person must constantly strengthen himself with a strong will for Hashem from wherever he is. This awakens him to pray always, to say Tehillim and many supplications, and to beg Hashem to have true compassion on him and draw him to the true leader, until he leaves the spirit of folly. Especially he should increase hisbodedus, private speech and prayer between himself and his Creator.',
  138: 'Through the power of the true tzaddikim, such a person’s life is only in the aspect of “now.” If he thinks too much about what has passed or worries about what will be, he could lose his mind, Heaven forbid. Therefore his life and endurance are only through the present moment: to seize each time some moment of escape from evil and some good point, “today, if you will listen to His voice.”',
  152: 'Because they were at first very distant through their sins, each mitzvah includes them again in the simple unity, while every blemish and transgression distances a person into separation. When one returns in teshuvah, the simple unity is revealed specifically from within very distant and changing actions, and this is very precious to Hashem. This is especially true of the convert, who comes from far away.',
  162: '“It shall be, if you surely listen to My commandments.” This is the aspect of Shema and Vehayah im shamoa: accepting the yoke of Heaven and accepting the yoke of mitzvos. From these two aspects the 310 worlds are built, for their construction comes from the light of intellect and constriction when they unite in complete oneness. Shema is faith in Hashem’s absolute unity, and Vehayah im shamoa is the practical acceptance of His commandments.',
  175: 'Another explanation: “I will give grass” hints to children, as in “your offspring like the grass of the earth.” “In your field for your animal” means: when will you have living and enduring children? When your union is in holiness and you break your desirous, animal soul, as if compelled by a force outside yourself. Through this, one merits enduring children.',
  177: '“So that your days may increase.” The main rectification of honor, which is the aspect of malchus, is through tzedakah; through this, tzedek is made into tzedakah. Therefore the main intention in building a home should be to bring worthy poor people into it and to make it a gathering place for sages, as the Sages taught: “Let your house be open wide,” “let the poor be members of your household,” and “let your house be a meeting place for the sages.” Through this, honor is complete, and the house becomes a holy house.',
  179: '“Without righteousness… he makes his fellow work for nothing” describes the brazen-faced who rule over the poor for nothing. This is the aspect of the name Shaddai written on the mezuzah, for this name is the aspect of the tzaddik, and of tzedakah: “the tzaddik is gracious and gives.” Through tzedakah, honor is lifted away from the brazen-faced and returned to those who understand true knowledge. Then honor has a holy face, and this is the main rectification of the holy home through the mitzvah of mezuzah.'
}

def clean(s):
    s=MARKS.sub('',s or '').strip()
    return re.sub(r'\s+', ' ', s).strip()

def docx_paras(path):
    root=ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out=[]
    for p in root.iter(NS+'p'):
        s=clean(''.join(t.text or '' for t in p.iter(NS+'t')))
        if s: out.append(s)
    return out

def strip_public_notes(text):
    text=re.sub(r'^(?:Translator[’\']s Addition|Translator’s Addition|Translator\'s Addition)\s*[—-]\s*', '', text).strip()
    text=re.sub(r'^תוספת מאת המתרגם\s*[—-]\s*', '', text).strip()
    text=re.sub(r'^(?:Summary|סיכום)\s*:\s*', '', text).strip()
    text=re.sub(r'^(?:Diagram|תרשים)\s*:\s*', '', text).strip()
    text=re.sub(r'\s*[א-ת״׳"\s]+גרסאות לקריאת מכונה\s*/\s*AI agents:\s*$', '', text).strip()
    text=text.replace('error_outline Translation error Try again','').replace('error_outline Translation error','').strip()
    return text

def parse(path, lang):
    ps=docx_paras(path)
    entries=[]; summary=''; diagram=''; heading=''; current=None
    skip=SKIP_HE if lang=='he' else SKIP_EN
    for i,s in enumerate(ps):
        if s in skip: continue
        if 'error_outline Translation error' in s:
            continue
        if s.startswith('Translator') or s.startswith('תוספת מאת המתרגם'):
            st=strip_public_notes(s)
            if '→' in st: diagram=st
            elif not summary: summary=st
            continue
        if s.startswith('Editorial note:') or s.startswith('הערת עריכה:'):
            continue
        m=NUM_RE.match(s)
        if m:
            current={'number':int(m.group(1)),'heading':heading,'text':strip_public_notes(m.group(2).strip()),'type':'teaching'}
            entries.append(current); heading=''; continue
        nxt=ps[i+1] if i+1<len(ps) else ''
        if NUM_RE.match(nxt):
            heading=strip_public_notes(s)
        elif current is not None:
            cleaned=strip_public_notes(s)
            if cleaned:
                current['text']=strip_public_notes((current['text']+'\n\n'+cleaned).strip())
        else:
            heading=strip_public_notes(s)
    return {'summary':summary,'diagram':diagram,'entries':entries}

he=parse(DL/'Eikev_AJew_corrected_Hebrew.docx','he')
en=parse(DL/'Eikev_AJew_formal_equivalence_English.docx','en')
hnums=[x['number'] for x in he['entries']]
en_by_num={x['number']: x for x in en['entries']}
missing_en=[n for n in hnums if n not in en_by_num]
missing_unfilled=[n for n in missing_en if n not in EN_FILLS]
if missing_unfilled:
    raise SystemExit(f'missing English entries without fills: {missing_unfilled}')
entries=[]
for h in he['entries']:
    e=en_by_num.get(h['number']) or {'heading':'','text':EN_FILLS[h['number']]}
    entries.append({'number':h['number'],'parsha':'eikev','heHeading':h['heading'],'enHeading':e['heading'],'he':h['text'],'en':e['text'],'type':'teaching'})
data={
  'id':'aikev-ajew-study',
  'title':'Aikev AJew Study Packet',
  'hebrewTitle':'עקב',
  'subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works',
  'hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו',
  'summary': {'he': he['summary'], 'en': en['summary'].replace('Parashas Eikev', 'Parashas Aikev')},
  'map': {'he': he['diagram'], 'en': en['diagram'].replace('Eikev', 'Aikev')},
  'sourceFiles': {
    'hebrew':'/mnt/c/Users/Pettek/Downloads/Eikev_AJew_corrected_Hebrew.docx',
    'english':'/mnt/c/Users/Pettek/Downloads/Eikev_AJew_formal_equivalence_English.docx',
    'pdf':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A2%D7%A7%D7%91.pdf'
  },
  'entries': entries
}
out=ROOT/'public/data/parsha-special/aikev.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
segs=[]
if data['summary']['he'] or data['summary']['en'] or data['map']['he'] or data['map']['en']:
    segs.append({'index':'Overview','he':'\n\n'.join(x for x in [data['summary']['he'],data['map']['he']] if x),'en':'\n\n'.join(x for x in [data['summary']['en'],data['map']['en']] if x)})
for e in entries:
    segs.append({'index':e['number'],'he':'\n\n'.join(x for x in [e.get('heHeading',''),e.get('he','')] if x),'en':'\n\n'.join(x for x in [e.get('enHeading',''),e.get('en','')] if x)})
reader={'id':'parsha-packet-aikev','title':'AJew Study Packet — Parashas Aikev','hebrewTitle':'עקב — ליקוטים','source':data['subtitle'],'pdf':data['sourceFiles']['pdf'],'segments':segs}
rp=ROOT/'public/reader/parsha-packets/aikev.json'
rp.parent.mkdir(parents=True,exist_ok=True)
rp.write_text(json.dumps(reader,ensure_ascii=False,indent=2)+'\n')
for p in [out,rp]:
    s=p.read_text()
    bad=[x for x in ['Translator','מתרגם','Editorial note','הערת עריכה','AI agents','גרסאות','error_outline','Translation error'] if x in s]
    if bad:
        raise SystemExit(f'bad public strings in {p}: {bad}')
print(out, len(entries), 'reader_segments', len(segs), 'summary', bool(data['summary']['en']), 'map', bool(data['map']['en']))
