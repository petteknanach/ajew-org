#!/usr/bin/env python3
"""One-time OFFLINE presentation import. Never part of site build.

Does not write reader/medooyuk or alter its gold marks. Pass a local checkout of
akivajgordon/tikkun.io @57ba104e8de055cf92d3cf6aa91245bd92b34d60 and the UXLC XML
cache. Sources, edition limitations and licensing: public/tikkun/PROVENANCE.md.
"""
import argparse, hashlib, json, re, pathlib, xml.etree.ElementTree as ET

ROOT=pathlib.Path(__file__).resolve().parents[1]
SLUGS=['tanach-bereishit','tanach-shemos','tanach-vayikra','tanach-bamidbar','tanach-devarim']
SHA='57ba104e8de055cf92d3cf6aa91245bd92b34d60'

def text_of(el):
    return (el.text or '') + ''.join((text_of(c) if c.tag=='s' else '')+(c.tail or '') for c in el)

def bare(text):
    # Maqaf separates WORDS. Punctuation (including sof pasuq) is not ink in a
    # scroll. Extraordinary dots and inverted nuns are scribal, not pointing.
    return re.sub(r'[^א-ת\u05c4\u05c5\u05c6\s]', '', text.replace('\u05be',' '))

def written_fragment(s):
    s=s.replace('#(פ)','').replace('(׆)#','׆ ').replace('#(׆)',' ׆')
    s=re.sub(r'#\[[^\]]*\]','',s)  # written spelling BEFORE #[reading]
    assert '#' not in s and '[' not in s, s
    return re.sub(r'\s+',' ',bare(s)).strip()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--upstream',type=pathlib.Path,required=True);ap.add_argument('--xml-dir',type=pathlib.Path,required=True);args=ap.parse_args()
    out=ROOT/'public/tikkun';out.mkdir(exist_ok=True)
    pages={int(p.stem):json.loads(p.read_text()) for p in (args.upstream/'src/data/pages/torah').glob('*.json')}
    assert sorted(pages)==list(range(1,246))
    fixed={'version':1,'sourceCommit':SHA,'chapters':{},'pages':{}}
    for n,lines in sorted(pages.items()):
        fixed['pages'][n]=[]
        for source_line, line in enumerate(lines, 1):
            groups=[[written_fragment(s) for s in g] for g in line['text']]
            fixed['pages'][n].append({'g':groups,'p':bool(line['isPetucha']),'v':line['verses'],'sourceLine':source_line})
            for ref in line['verses']:
                key=SLUGS[ref['book']-1]+':'+str(ref['chapter'])
                ns=fixed['chapters'].setdefault(key,[])
                if n not in ns:ns.append(n)
    # Explicit, reviewable corrections to upstream WHITESPACE only. Its four
    # book transitions contain five blank rows rather than four; its Sea-song
    # column lacks the two blank rows visible in the printed reference.
    edits=json.loads((out/'layout-edits.json').read_text())
    for key, change in edits['blankRows'].items():
        n=int(key); corrected=[]
        for line in fixed['pages'][n]:
            if line['sourceLine'] in change.get('insertBeforeSourceRows',[]):
                corrected.append({'g':[['']],'p':False,'v':[],'sourceLine':None})
            if line['sourceLine'] in change.get('removeSourceRows',[]):
                assert line['g']==[['']], (n,line)
            else: corrected.append(line)
        fixed['pages'][n]=corrected
    assert all(len(lines)==42 for lines in fixed['pages'].values())
    for feature in edits['letters']:
        line=next(l for l in fixed['pages'][feature['column']] if l['sourceLine']==feature['sourceRow'])
        gi,si=feature['group'],feature['fragment'];s=line['g'][gi][si]
        words=s.split(); assert words.count(feature['word'])==1,feature
        wi=words.index(feature['word']);li=len(re.findall('[א-ת]',' '.join(words[:wi])))+feature['letter']
        assert feature['letter']<len(re.findall('[א-ת]',feature['word']))
        line.setdefault('L',{}).setdefault(str(gi)+':'+str(si),[]).append([li,feature['kind']])
    fixed['layoutEditsSha256']=hashlib.sha256((out/'layout-edits.json').read_bytes()).hexdigest()
    # Sparse written-only overrides: preserve ketiv and its independent indexes.
    # Every qere verse is copied as written tokens rather than using 1:1 qere
    # substitution (some pairs have different numbers of words).
    written={'version':1,'books':{}}
    for source in sorted((ROOT/'public/reader/medooyuk').glob('tanach-*.json')):
        data=json.loads(source.read_text());xml=args.xml_dir/(data['book']+'.xml')
        if not xml.exists():raise ValueError('Missing XML '+str(xml))
        book={'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'verses':{}}
        for c in ET.parse(xml).getroot().iter('c'):
            for v in c.findall('v'):
                cn,vn=c.get('n'),v.get('n');existing=data['ch'][cn][vn]
                # Mirror the existing builder including its qere-tail truncation.
                legacy=[text_of(x) if x.tag=='w' else x.text for x in v if x.tag in ['w','q'] and (x.tag=='w' or x.text)]
                rt=[text_of(x) for x in v if x.tag in ['w','q'] and (x.tag=='w' or x.text)]
                assert existing['t'] in (legacy,rt), (source,cn,vn,'reading changed')
                if rt!=existing['t']:book.setdefault('readingRepairs',{})[cn+':'+vn]=rt
                if not any(x.tag in ['k','q'] for x in v):continue
                tokens,letters,breaks=[],[],[]
                for x in v:
                    if x.tag in ['w','k']:
                        txt=x.text or '';li=len(re.findall('[א-ת]',txt))
                        for child in x:
                            if child.tag=='s':
                                kind={'large':'lg','small':'sm','suspended':'sus'}.get(child.get('t'))
                                if kind:letters.append([len(tokens),li,kind])
                                txt+=text_of(child)
                            txt+=child.tail or '';li=len(re.findall('[א-ת]',txt))
                        tokens.append(txt)
                    elif x.tag in ['pe','samekh','reversednun']:
                        breaks.append([len(tokens),{'pe':'p','samekh':'s','reversednun':'n8'}[x.tag]])
                book['verses'][cn+':'+vn]={'t':tokens,'L':letters,'b':breaks}
        written['books'][data['slug']]=book
    (out/'fixed-columns.json').write_text(json.dumps(fixed,ensure_ascii=False,separators=(',',':')))
    (out/'written-overrides.json').write_text(json.dumps(written,ensure_ascii=False,separators=(',',':')))
    (out/'LICENSE-tikkun-io.txt').write_bytes((args.upstream/'LICENSE').read_bytes())
    print(json.dumps({'fixedColumns':len(fixed['pages']),'sourceRows':sum(len(x) for x in fixed['pages'].values()),'writtenOverrides':sum(len(x['verses']) for x in written['books'].values()),'fixedLetters':len(re.findall('[א-ת]',''.join(s for pg in fixed['pages'].values() for l in pg for g in l['g'] for s in g)))},indent=2))
if __name__=='__main__': main()
