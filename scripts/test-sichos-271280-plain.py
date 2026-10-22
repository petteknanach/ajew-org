#!/usr/bin/env python3
"""Bounded private actual-builder and original-history controls; never whole-corpus generation."""
import argparse, ast, hashlib, importlib.util, json, os, pathlib, shutil, subprocess, sys

def main():
    ap=argparse.ArgumentParser();ap.add_argument('evidence');ap.add_argument('oracle');ap.add_argument('master');args=ap.parse_args()
    root=pathlib.Path.cwd();out=pathlib.Path(args.evidence).resolve();out.mkdir(parents=True,exist_ok=True)
    oracle=json.loads(pathlib.Path(args.oracle).read_bytes());master=json.loads(pathlib.Path(args.master).read_bytes())
    original=[]
    for r,m in zip(oracle['owners'],master['paragraphs'],strict=True):
        assert r['owner']==m['owner']
        assert r['fields']==m['fields']
        assert r['historicalEnglish']==m['historical_English']
        assert r['privateOriginalOrigin']==m['origin']
        assert r['originalOrderedQualificationIDs']==[q['id'] for q in m['qualifications']]
        original.append({'owner':m['owner'],'qualifications':m['qualifications'],'origin':m['origin'],'historical_status':m['historical_status'],'source_binding':m['source_binding'],'retained_fragments':m['retained_fragments']})
    history={'owners':original,'global_qualifications':master['global_qualifications']}
    assert sum(len(r['qualifications']) for r in original)+len(history['global_qualifications'])==131
    # Full raw object reconstruction, ordered owner joins, no current prose export of private audit data.
    assert [r['qualifications'] for r in original]==[r['qualifications'] for r in master['paragraphs']]
    (out/'PRIVATE-HISTORY-RECONSTRUCTION.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
    fixture=out/'actual-builder-fixture';(fixture/'scripts').mkdir(parents=True)
    script=root/'scripts/build-reader-plain-text.py'
    deps=['build-reader-plain-text.py','reviewed_chayay_exports.py','reviewed_alim_exports.py','reviewed_wrapup_exports.py','qualified_aitzoas362_exports.py']
    for name in deps:shutil.copyfile(root/'scripts'/name,fixture/'scripts'/name)
    (fixture/'src').symlink_to(root/'src',target_is_directory=True)
    (fixture/'package.json').write_text('{"type":"module","private":true}\n')
    for path in ['public/qualified-sichos-271280-core.js','public/qualified-sichos-271280-core.mjs','public/reader/reviewed/sichos-271-280.json','public/reader/sichos-haran/sicha-271.json','public/reader/reviewed/sichos-261270-sources/sicha-261-original.json']:
        dest=fixture/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/path,dest)
    shutil.copytree(root/'public/reader/reviewed/sichos-271280-sources',fixture/'public/reader/reviewed/sichos-271280-sources')
    env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'}
    command=[sys.executable,str(fixture/'scripts/build-reader-plain-text.py')]
    result=subprocess.run(command,cwd=fixture,capture_output=True,timeout=600,env=env)
    (out/'direct.stdout').write_bytes(result.stdout);(out/'direct.stderr').write_bytes(result.stderr)
    (out/'direct-command.json').write_text(json.dumps({'argv':command,'cwd':str(fixture),'exit':result.returncode},indent=2))
    assert result.returncode==0,result.stderr.decode()
    catalog=json.loads((fixture/'public/reader-plain/index.json').read_bytes());assert catalog['total']==2
    entries=catalog['entries'];assert [e['segments'] for e in entries if e['part']=='reviewed']==[41]
    # File/import caller has no scripts/ in sys.path. Exercise the actual changed file itself.
    spec=importlib.util.spec_from_file_location('actual_plain_builder',script);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    reader=fixture/'public/reader'
    assert module.is_sichos271280_archive(reader/'reviewed/sichos-271280-sources/selected-41.json',reader)
    assert not module.is_sichos271280_archive(reader/'sichos-haran/sicha-271.json',reader)
    assert not module.is_sichos271280_archive(reader/'reviewed/sichos-271-280.json',reader)
    assert module.is_sichos261270_archive(reader/'reviewed/sichos-261270-sources/sicha-261-original.json',reader)
    assert module.first_text({'en':'A\r\nB'},('en',))=='A\nB'
    assert module.collect_segments({'segments':[{'index':7,'he':'X','en':'Y'}]})==[{'index':7,'he':'X','en':'Y'}]
    importedOut=out/'file-import-output';entry=module.write_sichos271280(fixture,importedOut);assert entry['segments']==41
    bounded=fixture/'public/reader-plain/sichos-haran/reviewed/271-280'
    for format in ['txt','md','json','html']:
        raw=(bounded/('index.'+format)).read_bytes();assert raw==(importedOut/'sichos-haran/reviewed/271-280'/('index.'+format)).read_bytes()
        if format in ['txt','md']:assert raw in (fixture/'public/reader-plain/sichos-haran'/('full.'+format)).read_bytes()
    parsed=json.loads((bounded/'index.json').read_bytes());assert parsed['sourceUnits'][0]['en'] is None
    assert len(parsed['globalQualifications'])==4 and len(parsed['sourceUnits'])==41
    assert sum(len(u['qualifications']) for u in parsed['sourceUnits'])==57
    expectedCR=sum((r['fields']['he']+r['fields']['he_nikud']+(r['fields']['en'] or '')+r['historicalEnglish']).count('\r') for r in oracle['owners'])+sum(q['text'].count('\r') for r in oracle['owners'] for q in r['activeQualifications'])+sum(q['text'].count('\r') for q in oracle['globalQualifications'])
    assert (bounded/'index.txt').read_bytes().count(b'\r')==expectedCR
    report={'status':'PASS','actualDirectScriptExit':result.returncode,'actualFileImportCaller':True,'plainExactFormats':4,'fullBookContainsBoundedBytes':['txt','md'],'literalCRCount':expectedCR,'fixtureEntries':2,'originalQualificationsReconstructed':131,'historicalEnglishJoins':41,'originalOrigins':41,'currentLocalNotes':57,'currentGlobalNotes':4,'onlyNewNamespaceExcluded':True,'accepted261270ExclusionUnchanged':True}
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if __name__=='__main__':main()
