#!/usr/bin/env python3
"""Fail-closed transition gate; does not imply semantic acceptance of new units."""
import argparse,copy,json
from pathlib import Path

def check(previous,candidate,amendments):
 old=previous['units'];new=candidate['units']
 assert previous['wholeBook'] is False and candidate['wholeBook'] is False,'whole-book claim'
 oldids=[u['id'] for u in old];newids=[u['id'] for u in new]
 assert len(oldids)==len(set(oldids)) and len(newids)==len(set(newids)),'duplicate IDs'
 assert set(oldids)<=set(newids),'lost published unit'
 assert [id for id in newids if id in oldids]==oldids,'reordered published units'
 byid={u['id']:u for u in new};patches={}
 for a in amendments:
  assert a['id'] not in patches,'duplicate correction'
  assert a['id'] in oldids,'correction to unknown unit'
  assert a['reason'].strip() and a['reviewEvidence'].strip(),'missing correction review'
  patches[a['id']]=a
 changed=[]
 for u in old:
  v=byid[u['id']]
  if u==v:
   assert u['id'] not in patches,'unused correction'
   continue
  a=patches.get(u['id']);assert a is not None,'unlogged published change'
  assert a['before']==u and a['after']==v,'stale correction witness'
  # Whole-node before/after log proves exact JSON semantic reversal, not byte-format reversal.
  restored=copy.deepcopy(v);restored.clear();restored.update(copy.deepcopy(a['before']));assert restored==u
  changed.append(u['id'])
 assert set(changed)==set(patches),'unconsumed correction'
 return {'preserved':len(old)-len(changed),'corrected':len(changed),'added':len(new)-len(old),'removed':0,'semanticApproval':False}

def selftest():
 base={'wholeBook':False,'units':[{'id':'a','he':'exact reviewed text'},{'id':'b','he':'second unit'}]}
 assert check(base,copy.deepcopy(base),[])['preserved']==2
 appended=copy.deepcopy(base);appended['units'].append({'id':'c','he':'new candidate'});assert check(base,appended,[])['added']==1
 fixed=copy.deepcopy(base);fixed['units'][0]['he']='exact corrected text';patch={'id':'a','before':base['units'][0],'after':fixed['units'][0],'reason':'source image correction','reviewEvidence':'locked scan/crop'};assert check(base,fixed,[patch])['corrected']==1
 bad=[]
 deleted=copy.deepcopy(base);deleted['units'].pop();bad.append(('deletion',deleted,[]))
 duplicate=copy.deepcopy(base);duplicate['units'].append(copy.deepcopy(duplicate['units'][0]));bad.append(('duplicate',duplicate,[]))
 reorder=copy.deepcopy(base);reorder['units'].reverse();bad.append(('reorder',reorder,[]))
 bad.append(('unlogged change',fixed,[]));stale=copy.deepcopy(patch);stale['before']['he']='wrong witness';bad.append(('stale correction',fixed,[stale]));bad.append(('unused correction',base,[patch]));bad.append(('duplicate correction',fixed,[patch,patch]));whole=copy.deepcopy(base);whole['wholeBook']=True;bad.append(('false whole book',whole,[]))
 rejected=[]
 for name,candidate,log in bad:
  try:check(base,candidate,log)
  except AssertionError:rejected.append(name)
  else:raise AssertionError('Accepted mutation: '+name)
 return {'result':'PASS','positiveTransitions':3,'mutationRejections':rejected}

def main():
 p=argparse.ArgumentParser();p.add_argument('--previous');p.add_argument('--candidate');p.add_argument('--amendments');p.add_argument('--self-test',action='store_true');args=p.parse_args()
 if args.self_test:print(json.dumps(selftest(),indent=2));return
 assert args.previous and args.candidate,'previous and candidate required'
 prev=json.loads(Path(args.previous).read_text());candidate=json.loads(Path(args.candidate).read_text());amendments=json.loads(Path(args.amendments).read_text()) if args.amendments else []
 print(json.dumps(check(prev,candidate,amendments),indent=2))
if __name__=='__main__':main()
