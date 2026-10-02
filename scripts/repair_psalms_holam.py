#!/usr/bin/env python3
"""One-time source-bound holam placement repair; no normalization or inference.
Preserves complete original files, byte-offset reversible patch ledger, and witness words.
Does not change UXLC, annotations, ketiv/qere, unpointed Hebrew, English, or other books.
"""
import csv, hashlib, html, json, re, shutil, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EVIDENCE=ROOT/'audit/psalms-text'
# Explicit adjudicated locations only. Double-vowel Jerusalem is NOT an error.
EDITS=[(15,1,'יְהוָֹה','יְהֹוָה'),(25,3,'קוֶֹיךָ','קֹוֶיךָ'),
 (37,9,'וְקוֵֹי','וְקֹוֵי'),(37,21,'לוֶֹה','לֹוֶה'),(40,5,'יְהוָֹה','יְהֹוָה'),
 (47,6,'יְהוָֹה','יְהֹוָה'),(69,7,'קוֶֹיךָ','קֹוֶיךָ'),(73,28,'יְהוִֹה','יְהֹוִה'),
 (88,16,'וְגוֵֹעַ','וְגֹוֵעַ'),(100,5,'יְהוָֹה','יְהֹוָה'),(116,5,'יְהוָֹה','יְהֹוָה'),
 (116,6,'יְהוָֹה','יְהֹוָה'),(140,8,'יְהוִֹה','יְהֹוִה')]
def sha(b):return hashlib.sha256(b).hexdigest()
def remove_accents(s):return re.sub('[\u0591-\u05AF\u05BD]', '', s.replace('/',''))
def main():
    target=EVIDENCE/'holam-repairs.json'
    if target.exists():raise SystemExit('Already prepared. Use verification; never overwrite original evidence.')
    osis=ET.parse(EVIDENCE/'OSHB-Ps.xml').getroot();ns='{http://www.bibletechnologies.net/2003/OSIS/namespace}'
    mam={row[0]:row[1] for row in csv.reader((EVIDENCE/'MAM-Psalms.csv').open())}
    records=[];patches={}
    for c,v,before,after in EDITS:
        vp=osis.find('.//'+ns+f'verse[@osisID="Ps.{c}.{v}"]')
        words=[n.text or '' for n in vp.findall(ns+'w')]
        matches=[w for w in words if remove_accents(w)==after]
        assert len(matches)==1,(c,v,after,matches)
        assert re.sub('[^א-ת]','',before)==re.sub('[^א-ת]','',after)
        # Exactly one holam moves to the preceding consonant; no vowel added/deleted.
        assert sorted(before)==sorted(after) and before.count('ֹ')==1
        rel=f'public/reader/tanach-tehillim/part-1/torah-{c}.json';p=ROOT/rel
        data=json.loads(p.read_text());s=next(s for s in data['segments'] if s['index']==v);old=s['he_nikud']
        assert old.count(before)==1;new=old.replace(before,after)
        rec={'chapter':c,'verse':v,'beforeWord':before,'afterWord':after,'before':old,'after':new,
             'reason':'Misattached U+05B9 holam on consonantal vav (also carrying another vowel); relocate only that holam to preceding consonant.',
             'OSHB_word':matches[0],'OSHB_ref':f'Ps.{c}.{v}','MAM_verse':mam[f'Psalms {c}:{v}'],
             'MAM_limit':'Corroborates holam placement; independent divine-name yod vowel variants are NOT imported.'}
        records.append(rec)
        for r in [rel,f'public/texts/tanach/psalms/{c}.json']:
            p=ROOT/r
            if not p.exists():
                p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(Path('/root/ajew-org')/r,p)
            patches.setdefault(r,[]).append((old,new))
    file_ledger=[]
    for rel,changes in patches.items():
        p=ROOT/rel;oldbytes=p.read_bytes();newbytes=oldbytes;ops=[]
        for before,after in changes:
            a=json.dumps(before,ensure_ascii=False).encode();b=json.dumps(after,ensure_ascii=False).encode()
            assert newbytes.count(a)==1,rel;offset=newbytes.index(a);ops.append({'offset':offset,'before':a.decode(),'after':b.decode()});newbytes=newbytes[:offset]+b+newbytes[offset+len(a):]
        reverted=newbytes
        for op in reversed(ops):
            a=op['before'].encode();b=op['after'].encode();i=op['offset'];assert reverted[i:i+len(b)]==b;reverted=reverted[:i]+a+reverted[i+len(b):]
        assert reverted==oldbytes
        backup=EVIDENCE/'original-files'/rel;backup.parent.mkdir(parents=True,exist_ok=True);backup.write_bytes(oldbytes)
        p.write_bytes(newbytes);file_ledger.append({'path':rel,'before_sha256':sha(oldbytes),'after_sha256':sha(newbytes),'operations':ops})
    target.write_text(json.dumps({'policy':'Only explicit per-reference U+05B9 relocations. No broad vowel rewrite.','sources':{p.name:sha(p.read_bytes()) for p in EVIDENCE.glob('*') if p.is_file() and p.suffix in ('.xml','.csv')},'repairs':records,'files':file_ledger},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'repairs':len(records),'files':len(file_ledger),'byte_inverse':True}))
if __name__=='__main__':main()
