#!/usr/bin/env python3
"""Offline evidence-to-ledger gate. No source edits, network, or linguistic guessing.
Usage: python3 scripts/prepare-tikkun-qatan-expansion.py --evidence ROOT --report DIR
Re-run only against the parent's immutable research/inventory captures.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVISION = '97fbec01ba596a775f1f7bfde9a2ea48be958a28'
ATOM = re.compile('[א-ת][\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u034fא-ת]*')
def sha(p):
    with p.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
def read(p): return json.loads(p.read_text())
def lines(p): return [json.loads(s) for s in p.read_text().splitlines()]
def key(r): return (r['slug'], r['chapter'], r['verse'], r['tokenIndex'], r['letterIndex'])
def segments(t): return re.findall('[א-ת][^א-ת]*', t)
def normalized(t):
    return unicodedata.normalize('NFC', re.sub(r'[\s\u034f\u05be\u05c0\u05c3\u05c4\u05c5\u05c6\u200e\u200f]', '', t))
def signature(t):
    return re.sub('[\u0591-\u05af\u05bd]', '', normalized(t)).replace('\u05c7', '\u05b8')
def marks(t, lo, hi):
    return [''.join(c for c in s if lo <= ord(c) <= hi) for s in segments(t)]
def unique_alignment(a, b, i):
    """Require this occurrence in every maximum exact, monotonic alignment.
    A single SequenceMatcher choice is not proof against repeated-word ambiguity.
    """
    n, m = len(a), len(b)
    pre = [[0]*(m+1) for _ in range(n+1)]
    suf = [[0]*(m+1) for _ in range(n+1)]
    for x in range(n):
        for y in range(m):
            pre[x+1][y+1] = max(pre[x][y+1], pre[x+1][y], pre[x][y]+(a[x]==b[y]))
    for x in range(n-1, -1, -1):
        for y in range(m-1, -1, -1):
            suf[x][y] = max(suf[x+1][y], suf[x][y+1], suf[x+1][y+1]+(a[x]==b[y]))
    total = pre[n][m]
    possible = [j for j in range(m) if a[i]==b[j] and pre[i][j]+1+suf[i+1][j+1]==total]
    skip = any(pre[i][j]+suf[i+1][j]==total for j in range(m+1))
    return possible[0] if len(possible)==1 and not skip else None

SCAN19_PATH = 'scripts/data/tikkun-qatan-scan19-decisions-20261006.jsonl'
SCAN19_SHA = '1106a394c3f37bcc16e4d13bb76bd16da92f9b926737f2369496db9f7a21608a'
SCAN_MANIFEST_SHA = '41812ee9a65dc2b0561c0e4f3688e53a051d5cefd27b52e7f43de957bd76b749'
PREDECESSOR_PATH = 'scripts/data/tikkun-qatan-predecessor-20261006.json'
PREDECESSOR_SHA = 'aac83481d850a6221b7782857d2158126a31487a2b6a5a4f77b8779600cf5299'
PAGES_PATH = 'scripts/data/tikkun-qatan-scan19-pages-20261006.json'
PAGES_SHA = 'b91309f655e784c75338be157ecd1390f3e11ec1ec69446b7785e1e644c0d706'
def jsonhash(x):
    return hashlib.sha256(json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def scan19_decisions(e):
    # Both the original parent decisions and the repository's byte-exact copy
    # must match the fixed seal. This is not permission to approve further rows.
    assert sha(ROOT/SCAN19_PATH)==SCAN19_SHA, 'scan19 decision copy drift'
    assert sha(e/'parent-final-acceptance/parent-scan-occurrence-decisions.jsonl')==SCAN19_SHA, 'parent decisions drift'
    assert sha(ROOT/PREDECESSOR_PATH)==PREDECESSOR_SHA, 'predecessor seal drift'
    assert sha(ROOT/PAGES_PATH)==PAGES_SHA, 'original-page evidence seal drift'
    page_bindings=read(ROOT/PAGES_PATH)['bindings']
    manifest=e/'scan-completion/MANIFEST.json'
    assert sha(manifest)==SCAN_MANIFEST_SHA, 'scan manifest drift'
    for f in read(manifest)['files']:
        assert sha(Path(f['path']))==f['sha256'], ('scan artifact drift',f['path'])
    for p,pin in read(e/'scan-completion/input-hashes.json').items():
        assert sha(Path(p))==pin, ('scan input drift',p)
    rows=lines(ROOT/SCAN19_PATH)
    assert len(rows)==20 and len({key(r) for r in rows})==20
    approved=[r for r in rows if r['parentDecision']=='approve-exact-occurrence-for-next-candidate']
    held=[r for r in rows if r['parentDecision']=='retain-unit-transfer-hold']
    assert len(approved)==19 and len(held)==1 and key(held[0])==('tanach-shemos',38,20,0,1)
    assert set(page_bindings)=={'/'.join(map(str,key(r))) for r in approved}
    for r in approved:
        page=page_bindings['/'.join(map(str,key(r)))]
        assert page['pdfPage']==r['pdfPage'] and page['scanSha256']==r['scanSha256'] and page['cropSha256']==r['imageSha256'] and page['cropBounds']==r['pdfClipPoints']
        assert sha(Path(page['originalScan']))==page['scanSha256']
        assert sha(Path(page['extractedPagePdf']))==page['extractedPageSha256']
    for r in rows:
        b=r['binding']; se=r['sourceEvidence']
        assert r['scope']=='20-local-holds' and r['observedQuality']=='qatan' and r['glyphAdjudicationComplete']
        assert r['evidenceType']=='actual-image-read-not-OCR' and not r['lexicalInheritance']
        assert not r['appliesToCurrentFrozenCandidate'] and not r['sourceInkGoldAndEngineChangesAuthorized']
        assert b['originalToken']==r['sourceToken'] and b['letterIndex']==r['letterIndex'] and b['tokenIndex']==r['tokenIndex'] and b['codepointOffset']==r['codepointOffset'] and b['reference']==r['reference']
        assert hashlib.sha256(r['sourceToken'].encode()).hexdigest()==b['originalTokenSha256']
        assert sha(Path(b['originalFile']))==b['originalFileSha256']
        assert r['sourceToken'][r['codepointOffset']]=='\u05b8'
        assert sum(len(s) for s in segments(r['sourceToken'])[:r['letterIndex']])+segments(r['sourceToken'])[r['letterIndex']].index('\u05b8')==r['codepointOffset']
        assert r['targetLetter']==segments(r['sourceToken'])[r['letterIndex']][0]
        assert sha(Path(se['upstreamFile']))==se['upstreamFileSha256']
        assert sha(Path(se['daletVerseFile']))==se['daletVerseFileSha256']
        assert sha(e/'source-research/analysis/mam-torah-reading-bhs-samekh.jsonl')==se['samekhVerseFileSha256']
        assert r['scanSha256']=='17fe402444a6a358d3db04c867c1d8c264ef6d30dff1f61782c2ffc03bf17208'
        assert sha(Path(r['image']))==r['imageSha256'] and sha(Path(r['legend']['image']))==r['legend']['imageSha256']
    return approved,held,len(read(manifest)['files'])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--evidence', type=Path, required=True); ap.add_argument('--report', type=Path, required=True)
    args = ap.parse_args(); e=args.evidence; out=args.report; out.mkdir(parents=True, exist_ok=True)
    research=e/'source-research'; inventory=e/'parent-inventory'
    # Authenticate every immutable research file before using any derived row.
    manifest=read(research/'sha256-manifest.json')
    entries=manifest['artifacts']
    for r in entries:
        assert sha(research/r.get('file',r.get('path','')))==r['sha256'], ('research drift',r)
    authenticated={str(research/r.get('file',r.get('path',''))):r['sha256'] for r in entries}
    assert read(research/'provenance.json')['revision']==REVISION
    for r in read(inventory/'live-input-manifest.json'):
        p=Path(r['file']); assert sha(p)==r['sha256'], ('live capture drift',p)
        if p.name!='tikkun-qatan.js':
            local=ROOT/('public/reader/medooyuk/'+p.name if p.name.startswith('tanach-') else 'public/'+p.name)
            assert sha(local)==r['sha256'], ('committed/live mismatch',local)
    for r in read(research/'analysis/input-hashes.json'):
        assert sha(Path(r['file']))==r['sha256'], ('effective input drift',r)
    prior_helper=inventory/'live/tikkun-qatan.js'
    packet_match=re.search(r'const packet=(.*);', prior_helper.read_text())
    assert packet_match is not None
    prior_packet=json.loads(packet_match.group(1))
    # Authenticate the exact sidecar against the already served source-bound helper,
    # rather than silently pinning whichever sidecar happens to be in this worktree.
    column_json=json.dumps(read(ROOT/'public/tikkun/column-marks.json'),ensure_ascii=False,separators=(',',':'))
    assert hashlib.sha256(column_json.encode()).hexdigest()==prior_packet['column']['beforeHash'], 'captured helper/column sidecar mismatch'
    review=e/'rule-review'
    review_manifest=read(review/'REVIEW-MANIFEST.json')
    for name, pin in review_manifest['files'].items():
        assert sha(review/name)==pin['sha256'], ('independent review drift',name)
    recommendations=lines(review/'parent-occurrence-recommendations.jsonl')
    assert len({key(r) for r in recommendations})==len(recommendations)
    cands=[r for r in recommendations if r['recommendation']=='approve']
    review_holds=[{**r,'holdReasons':r['recommendationReasons']} for r in recommendations if r['recommendation']!='approve']
    assert len(cands)==1440 and len(review_holds)==108, 'Changed independently reviewed scope'
    assert len({key(r) for r in cands})==len(cands)
    gold=lines(research/'analysis/user-gold-comparison.jsonl')
    negatives=[r for r in gold if r['userGold']['quality']=='gadol']
    negkeys={key(r) for r in negatives}
    books={s:read(inventory/(s+'-effective.json')) for s in {r['slug'] for r in cands}}
    dalet={(r['slug'],r['chapter'],r['verse']):r for r in lines(research/'analysis/mam-torah-reading-bhs.jsonl')}
    samekh={(r['slug'],r['chapter'],r['verse']):r for r in lines(research/'analysis/mam-torah-reading-bhs-samekh.jsonl')}
    pointing=read(ROOT/'public/tikkun/column-pointing.json'); byref=defaultdict(list)
    for col, rows in sorted(pointing['columns'].items(),key=lambda kv:int(kv[0])):
        for loc, ts in sorted(rows.items(),key=lambda kv:tuple(map(int,kv[0].split(':')))):
            for i,t in enumerate(ts):
                if len(t)>=3: byref[pointing['refs'][t[1]]].append((f'{col}/{loc}/{i}',t))
    selected=[]; held=[]
    for r in sorted(cands,key=key):
        slug,c,v,ti,li=key(r); verse=books[slug]['ch'][str(c)][str(v)]; ref=f'{slug}/{c}/{v}'
        assert verse['t'][ti]==r['sourceToken'] and bool(verse['k'][ti])==r['qere']
        assert key(r) not in negkeys and r['mamQuality']==r['mamSamekhQuality']=='katan'
        d=dalet[(slug,c,v)]; s=samekh[(slug,c,v)]
        ma=list(ATOM.finditer(d['text']))[r['mamAtomIndex']]
        sa=list(ATOM.finditer(s['text']))[r['mamAtomIndex']]
        assert ma.group()==r['mamAtom'] and d['sourceFile']==r['mamProjectionFile']
        assert signature(r['sourceToken'])==signature(ma.group())==signature(sa.group())
        ss=segments(sa.group()); ds=segments(ma.group()); target=r['mamAtomLetterIndex']
        assert '\u05c7' in ds[target] and '\u05c7' in ss[target]
        assert ma.start()+sum(map(len,ds[:target]))+ds[target].index('\u05c7')==r['mamTextOffset']
        visual_adjudication=None
        if (slug,c,v,ti,li)==('tanach-shemos',21,11,1,1):
            proofs=r.get('scanVisualEvidence',[])
            assert len(proofs)==1
            proof=proofs[0]
            assert proof['reference']=='Exodus 21:11' and proof['pdfPage']==158 and proof['letterIndex']==1 and proof['observedQuality']=='qatan'
            assert proof['scanSha256']=='17fe402444a6a358d3db04c867c1d8c264ef6d30dff1f61782c2ffc03bf17208'
            assert proof['imageSha256']=='79395ce071281973070a63721abb5842a20f52d0f099f7ea7d08a2ea9fc03900'
            assert sha(Path(proof['scan']))==proof['scanSha256'] and sha(Path(proof['image']))==proof['imageSha256']
            assert marks(r['sourceToken'],0x591,0x5af)==['','\u05a8',''] and marks(ma.group(),0x591,0x5af)==['','','']
            visual_adjudication={k:proof[k] for k in ['reference','pdfPage','letterIndex','observedQuality','scanSha256','imageSha256']}
            visual_adjudication['scope']='parent-inspected exact occurrence only; retained auxiliary qadma; not a lexical or accent rule'
        reasons=[]
        if r['qere']: reasons.append('live-qere-not-written-authority')
        if marks(r['sourceToken'],0x5bd,0x5bd)!=marks(ma.group(),0x5bd,0x5bd): reasons.append('meteg-letter-placement-difference')
        if marks(r['sourceToken'],0x591,0x5af)!=marks(ma.group(),0x591,0x5af) and visual_adjudication is None: reasons.append('accent-letter-placement-difference')
        pts=byref[ref]; idx=unique_alignment([normalized(t) for t in verse['t']], [normalized(t[1][2]) if t[1][2] is not None else None for t in pts], ti)
        if idx is None: reasons.append('fixed-column-occurrence-not-uniquely-authenticated')
        if reasons:
            held.append({**r,'holdReasons':reasons}); continue
        assert idx is not None
        colkey,p=pts[idx]
        assert len(p)==3 and normalized(p[2])==normalized(r['sourceToken'])
        selected.append({'slug':slug,'chapter':c,'verse':v,'token':ti,'letter':li,'word':r['sourceToken'], 'columnKey':colkey,'columnWord':p[2],
                         'authority':{'edition':'Miqra according to the Masorah','revision':REVISION,'sourcePath':str(Path(d['sourceFile']).relative_to(research)), 'sourceSha256':authenticated[d['sourceFile']], 'projectionRef':r['mamProjectionRef'],'atomIndex':r['mamAtomIndex'],'atom':ma.group(),'letter':target,'textOffset':r['mamTextOffset'],'samekhAtom':sa.group(),'readingChoices':d['choices'],'localCompatibility':'all letter-indexed meteg and accents identical; non-qere; explicit U+05C7 in both traditions'}})
        if visual_adjudication is not None: selected[-1]['authority']['visualAdjudication']=visual_adjudication
    assert jsonhash(selected)==read(ROOT/PREDECESSOR_PATH)['recordsHash'], 'frozen predecessor records changed'
    old_selected=list(selected)
    approvals,unit_holds,scan_verified=scan19_decisions(e)
    old_hold_keys={key(r) for r in review_holds}
    for r in sorted(approvals,key=key):
        slug,c,v,ti,li=key(r); verse=books[slug]['ch'][str(c)][str(v)]
        assert key(r) in old_hold_keys and key(r) not in negkeys
        assert verse['t'][ti]==r['sourceToken'] and not verse['k'][ti] and not r['qere']
        assert r['binding']['originalFileSha256']==sha(inventory/(slug+'-effective.json'))
        d=dalet[(slug,c,v)]; s=samekh[(slug,c,v)]
        ma=list(ATOM.finditer(d['text']))[r['mamAtomIndex']]; sa=list(ATOM.finditer(s['text']))[r['mamAtomIndex']]
        target=r['mamAtomLetterIndex']; ds=segments(ma.group()); ss=segments(sa.group())
        assert ma.group()==r['mamAtom']==r['sourceEvidence']['daletAtom'] and sa.group()==r['sourceEvidence']['samekhAtom']
        assert d['sourceFile']==r['mamProjectionFile'] and authenticated[d['sourceFile']]==r['sourceEvidence']['upstreamFileSha256']
        assert signature(r['sourceToken'])==signature(ma.group())==signature(sa.group())
        assert target==li and '\u05c7' in ds[target] and '\u05c7' in ss[target]
        assert ma.start()+sum(map(len,ds[:target]))+ds[target].index('\u05c7')==r['mamTextOffset']
        pts=byref[f'{slug}/{c}/{v}']; idx=unique_alignment([normalized(t) for t in verse['t']],[normalized(t[1][2]) if t[1][2] is not None else None for t in pts],ti)
        assert idx is not None, ('approved but transport-ambiguous',key(r))
        colkey,p=pts[idx]; assert len(p)==3 and normalized(p[2])==normalized(r['sourceToken'])
        selected.append({'slug':slug,'chapter':c,'verse':v,'token':ti,'letter':li,'word':r['sourceToken'],'columnKey':colkey,'columnWord':p[2],
            'authority':{'edition':'Miqra according to the Masorah','revision':REVISION,'sourcePath':str(Path(d['sourceFile']).relative_to(research)),'sourceSha256':authenticated[d['sourceFile']],'projectionRef':r['mamProjectionRef'],'atomIndex':r['mamAtomIndex'],'atom':ma.group(),'letter':target,'textOffset':r['mamTextOffset'],'samekhAtom':sa.group(),'readingChoices':d['choices'],'localCompatibility':'parent-inspected per-vowel Eesh compatibility; exact occurrence only; no generic accent/meteg rule','scan19Decision':r,'pageBinding':read(ROOT/PAGES_PATH)['bindings']['/'.join(map(str,key(r)))]}})
    assert len(selected)==len(old_selected)+19
    assert len({r['columnKey']+':'+str(r['letter']) for r in selected})==len(selected)
    sourcepaths=['public/tikkun/column-marks.json','public/tikkun/column-pointing.json','public/tikkun/fixed-columns.json','public/tikkun/selection-index.json','public/tikkun-boundaries.js']+[f'public/reader/medooyuk/{s}.json' for s in sorted(books)]
    negative_controls=[]
    for r in negatives:
        slug,c,v,ti,li=key(r); verse=books[slug]['ch'][str(c)][str(v)]; pts=byref[f'{slug}/{c}/{v}']
        idx=unique_alignment([normalized(t) for t in verse['t']], [normalized(t[1][2]) if t[1][2] is not None else None for t in pts], ti)
        negative_controls.append({'slug':slug,'chapter':c,'verse':v,'token':ti,'letter':li,'word':r['sourceToken'],'fixture':r['userGold']['fixture_id'],'columnKey':pts[idx][0] if idx is not None else None})
    ledger={'schema':2,'scope':'Occurrence-scoped, source-bound compatible Torah expansion; not all-qatan linguistic completeness',
            'revision':REVISION,'license':'CC BY-SA 4.0 (MAM-derived records only)',
            'evidenceSha256':{'researchManifest':sha(research/'sha256-manifest.json'),'provisionalCandidates':sha(e/'parent-return-adjudication/provisional-compatible-qatan.jsonl'),'goldComparison':sha(research/'analysis/user-gold-comparison.jsonl'),'liveManifest':sha(inventory/'live-input-manifest.json'),'independentReviewManifest':sha(review/'REVIEW-MANIFEST.json'),'independentRecommendations':sha(review/'parent-occurrence-recommendations.jsonl')},
            'sourceAuthorityPins':{s:{'sourcePath':next(r['authority']['sourcePath'] for r in selected if r['slug']==s),'sourceSha256':next(r['authority']['sourceSha256'] for r in selected if r['slug']==s),'osisBook':next(r['authority']['projectionRef'].split('.')[0] for r in selected if r['slug']==s)} for s in sorted(books)},
            'sourcePins':{p:sha(ROOT/p) for p in sourcepaths},'effectiveBookPins':{s:sha(inventory/(s+'-effective.json')) for s in sorted(books)},
            'legacyLedgerSha256':sha(ROOT/'scripts/data/tikkun-qatan-occurrences-20261004.json'), 'legacyHelperSha256':sha(inventory/'live/tikkun-qatan.js'),
            'records':selected,'negativeControls':negative_controls}
    ledger['scan19Seal']={'decisionsSha256':SCAN19_SHA,'scanManifestSha256':SCAN_MANIFEST_SHA,'predecessorSha256':PREDECESSOR_SHA,'pageManifestSha256':PAGES_SHA,'approvedKeys':['/'.join(map(str,key(r))) for r in sorted(approvals,key=key)],'heldKeys':['/'.join(map(str,key(r))) for r in unit_holds]}
    (ROOT/'scripts/data/tikkun-qatan-expansion-20261006.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
    # Immutable historical queue remains 108. Superseding decisions and current
    # holds are separate artifacts, not a rewrite of the sealed earlier review.
    historical=review_holds+held
    approved_keys={key(r) for r in approvals}
    current=[r for r in historical if key(r) not in approved_keys]
    (out/'implementation-holds.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in historical))
    (out/'current-implementation-holds.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in current))
    (out/'next19-approved-decisions.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in sorted(approvals,key=key)))
    (out/'exact19-key-delta.json').write_text(json.dumps(ledger['scan19Seal'],indent=2)+'\n')
    summary={'researchFilesVerified':len(entries),'scanArtifactsVerified':scan_verified,'provisional':len(cands),'predecessorSelected':len(old_selected),'approvedScanDelta':len(approvals),'historicalImplementationHolds':len(historical),'currentImplementationHolds':len(current),'selected':len(selected),'held':len(held),'reasons':dict(Counter(reason for r in held for reason in r['holdReasons'])),'goldGadolControls':len(negatives),'selectedWithoutWrittenSheva':sum('\u05b0' not in r['word'] for r in selected),'matchingMetegSelected':sum('\u05bd' in segments(r['word'])[r['letter']] for r in selected),'perBook':dict(Counter(r['slug'] for r in selected))}
    (out/'preparation-summary.json').write_text(json.dumps(summary,indent=2)+'\n'); print(json.dumps(summary))
if __name__=='__main__': main()
