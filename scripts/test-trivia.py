#!/usr/bin/env python3
import json,os,re,shutil,socket,subprocess,tempfile,time,urllib.error,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CAT=ROOT/'public/data/trivia/questions.json'
data=json.loads(CAT.read_text(encoding='utf-8'))
qs=data['questions'];errors=[]
if len(qs)<1000:errors.append('catalog has fewer than 1000 questions')
ids=set()
for q in qs:
 if q['id'] in ids:errors.append('duplicate id '+q['id'])
 ids.add(q['id'])
 if q['category'] not in data['categories']:errors.append('bad category '+q['id'])
 if q['level'] not in data['levels']:errors.append('bad level '+q['id'])
 if len(q['options'])!=4 or len(set(q['options']))!=4:errors.append('bad options '+q['id'])
 if not isinstance(q['answer'],int) or not 0<=q['answer']<4:errors.append('bad answer '+q['id'])
 if not q['sourceUrl'].startswith('/'):errors.append('external/bad source '+q['id'])
 if q['category']=='personages' and re.search(r'\b(Saba Yisroel|Alter of Teplik|Avraham Chazan)\b',q['prompt'],re.I):errors.append('conflicted yahrzeit prompt '+q['id'])
 if q['category'] in {'personages','history','nanach'} and re.search(r'\b(Mrs\.?|woman|women|wife|mother|daughter|sister|girl|girls|bride)\b',q['prompt'],re.I):errors.append('female-centered prompt '+q['id'])
if errors:raise SystemExit('\n'.join(errors[:30]))

# Live API contract test against an isolated database and secret.
tmp=Path(tempfile.mkdtemp(prefix='ajew-trivia-test-'));port=18766
env=os.environ.copy();env.update(TRIVIA_PORT=str(port),TRIVIA_DATA=str(CAT),TRIVIA_DB=str(tmp/'scores.sqlite3'),TRIVIA_SECRET=str(tmp/'secret'))
p=subprocess.Popen(['python3',str(ROOT/'ops/trivia/trivia_api.py')],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
def req(path,body=None):
 url=f'http://127.0.0.1:{port}{path}';headers={'Content-Type':'application/json'}
 r=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers=headers,method='POST' if body is not None else 'GET')
 try:
  with urllib.request.urlopen(r,timeout=8) as x:return x.status,json.loads(x.read())
 except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
try:
 for _ in range(60):
  try:
   if req('/api/trivia/health')[0]==200:break
  except Exception:time.sleep(.1)
 else:raise RuntimeError('API failed to start')
 status,s=req('/api/trivia/session',{'nickname':'Test_Breslover','categories':['teachings','nanach'],'level':'mixed','length':20})
 assert status==201 and len(s['questionIds'])==20
 status,s2=req('/api/trivia/session',{'nickname':'Test_Breslover','categories':['teachings','nanach'],'level':'mixed','length':20})
 assert status==201 and set(s['questionIds']).isdisjoint(s2['questionIds'])
 mapq={q['id']:q for q in qs};answers=[{'id':qid,'selected':mapq[qid]['answer']} for qid in s['questionIds']]
 status,result=req('/api/trivia/score',{'token':s['token'],'answers':answers})
 assert status==201 and result['correct']==20 and result['score']>2000 and result['rank']==1
 assert req('/api/trivia/score',{'token':s['token'],'answers':answers})[0]==400
 status,board=req('/api/trivia/scores?limit=10')
 assert status==200 and board[0]['nickname']=='Test_Breslover' and board[0]['score']==result['score']
 bad=dict(answers[0]);bad['id']='tampered';assert req('/api/trivia/score',{'token':s['token']+'x','answers':[bad]+answers[1:]})[0]==400
 print(json.dumps({'catalog_questions':len(qs),'categories':{k:sum(q['category']==k for q in qs) for k in data['categories']},'api_session_questions':20,'perfect_score':result['score'],'leaderboard_rows':len(board),'ok':True},indent=2))
finally:
 p.terminate()
 try:p.wait(timeout=4)
 except:p.kill()
 shutil.rmtree(tmp,ignore_errors=True)
