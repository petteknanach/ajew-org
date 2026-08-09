#!/usr/bin/env python3
"""Small verified-score API for ajew.org Na Nach Trivia Fire."""
from __future__ import annotations
import base64, hashlib, hmac, json, os, re, secrets, sqlite3, threading, time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HOST=os.environ.get('TRIVIA_HOST','127.0.0.1')
PORT=int(os.environ.get('TRIVIA_PORT','8766'))
DATA=Path(os.environ.get('TRIVIA_DATA','/opt/ajew-trivia-api/questions.json'))
DB=Path(os.environ.get('TRIVIA_DB','/var/lib/ajew-trivia/leaderboard.sqlite3'))
SECRET_FILE=Path(os.environ.get('TRIVIA_SECRET','/var/lib/ajew-trivia/secret'))
ALLOWED_CATEGORIES={'teachings','avodah','history','personages','nanach','books'}
ALLOWED_LEVELS={'beginner','scholar','fire','mixed'}
POINTS={'beginner':100,'scholar':180,'fire':300}
NAME_RE=re.compile(r'^[A-Za-z0-9 _-]{2,24}$')
LOCK=threading.Lock(); RATE={}

def load_catalog():
    raw=json.loads(DATA.read_text(encoding='utf-8'))
    return raw,{q['id']:q for q in raw['questions']}
CATALOG,BY_ID=load_catalog()

def init_db():
    DB.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(DB) as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.execute('''CREATE TABLE IF NOT EXISTS scores(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL UNIQUE,
          nickname TEXT NOT NULL,
          score INTEGER NOT NULL,
          correct INTEGER NOT NULL,
          total INTEGER NOT NULL,
          level TEXT NOT NULL,
          categories TEXT NOT NULL,
          created_at TEXT NOT NULL,
          ip_hash TEXT NOT NULL
        )''')
        c.execute('CREATE INDEX IF NOT EXISTS idx_scores_rank ON scores(score DESC, created_at ASC)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at)')
        c.execute('''CREATE TABLE IF NOT EXISTS question_history(
          player_key TEXT NOT NULL,
          question_id TEXT NOT NULL,
          seen_at INTEGER NOT NULL,
          PRIMARY KEY(player_key, question_id)
        )''')
        c.execute('CREATE INDEX IF NOT EXISTS idx_question_history_player ON question_history(player_key, seen_at DESC)')
init_db()

def secret_key():
    SECRET_FILE.parent.mkdir(parents=True,exist_ok=True)
    if not SECRET_FILE.exists():
        SECRET_FILE.write_bytes(secrets.token_bytes(48));os.chmod(SECRET_FILE,0o600)
    return SECRET_FILE.read_bytes()
SECRET=secret_key()

def b64(data:bytes):return base64.urlsafe_b64encode(data).decode().rstrip('=')
def unb64(s:str):return base64.urlsafe_b64decode(s+'='*((4-len(s)%4)%4))
def sign(payload:dict):
    body=b64(json.dumps(payload,separators=(',',':'),sort_keys=True).encode())
    sig=b64(hmac.new(SECRET,body.encode(),hashlib.sha256).digest())
    return body+'.'+sig
def verify(token:str):
    body,sig=token.split('.',1)
    expected=b64(hmac.new(SECRET,body.encode(),hashlib.sha256).digest())
    if not hmac.compare_digest(sig,expected):raise ValueError('Invalid session signature')
    p=json.loads(unb64(body))
    if int(p.get('exp',0))<int(time.time()):raise ValueError('Session expired')
    return p

def rate_ok(ip,kind,limit,window):
    now=time.time();key=(hashlib.sha256((ip+'|'+kind).encode()).hexdigest(),kind)
    with LOCK:
        hits=[t for t in RATE.get(key,[]) if now-t<window]
        if len(hits)>=limit:return False
        hits.append(now);RATE[key]=hits
        if len(RATE)>2000:
            for k,v in list(RATE.items()):
                vv=[t for t in v if now-t<3600]
                if vv:RATE[k]=vv
                else:RATE.pop(k,None)
    return True

def official_score(qids,answers):
    streak=score=correct=0
    for qid,a in zip(qids,answers):
        q=BY_ID[qid];chosen=a.get('selected')
        if isinstance(chosen,bool) or not isinstance(chosen,int) or chosen<-1 or chosen>3:raise ValueError('Invalid answer')
        if chosen==int(q['answer']):
            correct+=1;streak+=1;score+=POINTS[q['level']]+min(200,(streak-1)*20)
        else:streak=0
    return score,correct

class Handler(BaseHTTPRequestHandler):
    server_version='AJewTrivia/1.0'
    def log_message(self,format,*args):print('%s - %s' % (self.address_string(),format%args),flush=True)
    @property
    def ip(self):return self.headers.get('X-Real-IP') or self.client_address[0]
    def send_json(self,status,data):
        body=json.dumps(data,separators=(',',':'),ensure_ascii=False).encode()
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Referrer-Policy','same-origin');self.end_headers();self.wfile.write(body)
    def body(self,max_bytes=65536):
        n=int(self.headers.get('Content-Length','0'))
        if n<=0 or n>max_bytes:raise ValueError('Invalid request size')
        return json.loads(self.rfile.read(n))
    def do_GET(self):
        u=urlparse(self.path)
        if u.path.endswith('/health'):return self.send_json(200,{'ok':True,'questions':len(BY_ID)})
        if not u.path.endswith('/scores'):return self.send_json(404,{'error':'Not found'})
        qs=parse_qs(u.query);period=qs.get('period',['all'])[0];limit=max(1,min(50,int(qs.get('limit',['10'])[0])))
        where='WHERE created_at >= ?' if period=='today' else ''
        args=[datetime.now(timezone.utc).strftime('%Y-%m-%dT00:00:00Z')] if where else []
        with sqlite3.connect(DB) as c:
            c.row_factory=sqlite3.Row
            rows=c.execute(f'SELECT nickname,score,correct,total,level,created_at FROM scores {where} ORDER BY score DESC, created_at ASC LIMIT ?',args+[limit]).fetchall()
        return self.send_json(200,[dict(r) for r in rows])
    def do_POST(self):
        u=urlparse(self.path)
        try:
            if u.path.endswith('/session'):return self.new_session()
            if u.path.endswith('/score'):return self.submit_score()
            return self.send_json(404,{'error':'Not found'})
        except (ValueError,KeyError,TypeError,json.JSONDecodeError) as e:return self.send_json(400,{'error':str(e)[:160]})
        except Exception as e:
            print('internal error:',repr(e),flush=True);return self.send_json(500,{'error':'Server error'})
    def new_session(self):
        if not rate_ok(self.ip,'session',20,3600):return self.send_json(429,{'error':'Too many sessions; please try later.'})
        d=self.body(8192);name=str(d.get('nickname','')).strip();cats=d.get('categories',[]);level=str(d.get('level','mixed'));length=int(d.get('length',20))
        if not NAME_RE.fullmatch(name):raise ValueError('Invalid nickname')
        if not isinstance(cats,list) or not cats or any(c not in ALLOWED_CATEGORIES for c in cats):raise ValueError('Invalid categories')
        cats=list(dict.fromkeys(cats))
        if level not in ALLOWED_LEVELS:raise ValueError('Invalid level')
        if length not in {10,20,30}:raise ValueError('Invalid round length')
        pool=[q['id'] for q in CATALOG['questions'] if q['category'] in cats and (level=='mixed' or q['level']==level)]
        if len(pool)<length:raise ValueError('Not enough questions for that selection')
        player_key=hashlib.sha256((self.ip+'|'+name.casefold()).encode()).hexdigest()
        with sqlite3.connect(DB) as c:
            seen={r[0] for r in c.execute('SELECT question_id FROM question_history WHERE player_key=?',(player_key,))}
        fresh=[qid for qid in pool if qid not in seen]
        qids=secrets.SystemRandom().sample(fresh if len(fresh)>=length else pool,length);now=int(time.time());sid=secrets.token_urlsafe(18)
        with sqlite3.connect(DB) as c:
            c.executemany('INSERT INTO question_history(player_key,question_id,seen_at) VALUES(?,?,?) ON CONFLICT(player_key,question_id) DO UPDATE SET seen_at=excluded.seen_at',[(player_key,qid,now) for qid in qids])
        token=sign({'sid':sid,'name':name,'qids':qids,'cats':cats,'level':level,'iat':now,'exp':now+7200})
        return self.send_json(201,{'token':token,'questionIds':qids,'expiresIn':7200})
    def submit_score(self):
        if not rate_ok(self.ip,'score',40,3600):return self.send_json(429,{'error':'Too many submissions; please try later.'})
        d=self.body(16384);p=verify(str(d.get('token','')));answers=d.get('answers',[]);qids=p['qids']
        if not isinstance(answers,list) or len(answers)!=len(qids):raise ValueError('Incomplete answer set')
        if [a.get('id') for a in answers]!=qids:raise ValueError('Question order mismatch')
        score,correct=official_score(qids,answers);created=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ');ip_hash=hashlib.sha256((self.ip+'|ajew-trivia').encode()).hexdigest()
        try:
            with sqlite3.connect(DB) as c:
                c.execute('INSERT INTO scores(session_id,nickname,score,correct,total,level,categories,created_at,ip_hash) VALUES(?,?,?,?,?,?,?,?,?)',(p['sid'],p['name'],score,correct,len(qids),p['level'],','.join(p['cats']),created,ip_hash))
                rank=c.execute('SELECT COUNT(*)+1 FROM scores WHERE score>?',(score,)).fetchone()[0]
        except sqlite3.IntegrityError:raise ValueError('This session was already submitted')
        return self.send_json(201,{'score':score,'correct':correct,'total':len(qids),'rank':rank})

if __name__=='__main__':
    print(f'Na Nach Trivia API listening on {HOST}:{PORT} with {len(BY_ID)} questions',flush=True)
    ThreadingHTTPServer((HOST,PORT),Handler).serve_forever()
