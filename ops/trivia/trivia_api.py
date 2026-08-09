#!/usr/bin/env python3
"""Verified scores and server-authoritative live rooms for ajew.org Trivia Fire."""
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
ROOM_LOCK=threading.RLock(); ROOMS={}
ROOM_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
ROOM_LENGTHS={5,10,15,20}; MAX_ROOM_PLAYERS=50
QUESTION_SECONDS={'beginner':30,'scholar':40,'fire':50}
REVEAL_SECONDS=max(.05,float(os.environ.get('TRIVIA_REVEAL_SECONDS','4')))
PLAYER_STALE_SECONDS=max(5,float(os.environ.get('TRIVIA_PLAYER_STALE_SECONDS','12')))

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

def room_code():
    for _ in range(100):
        code=''.join(secrets.choice(ROOM_ALPHABET) for _ in range(6))
        if code not in ROOMS:return code
    raise ValueError('Could not create room')

def clean_rooms(now=None):
    now=now or time.time()
    for code,room in list(ROOMS.items()):
        max_age=3600 if room['phase']=='finished' else 10800
        if now-room['created']>max_age:ROOMS.pop(code,None)

def valid_room_options(d):
    name=str(d.get('nickname','')).strip();cats=d.get('categories',[]);level=str(d.get('level','mixed'));length=int(d.get('length',10))
    if not NAME_RE.fullmatch(name):raise ValueError('Invalid nickname')
    if not isinstance(cats,list) or not cats or any(c not in ALLOWED_CATEGORIES for c in cats):raise ValueError('Invalid categories')
    cats=list(dict.fromkeys(cats))
    if level not in ALLOWED_LEVELS:raise ValueError('Invalid level')
    if length not in ROOM_LENGTHS:raise ValueError('Live rounds must contain 5, 10, 15 or 20 questions')
    pool=[q['id'] for q in CATALOG['questions'] if q['category'] in cats and (level=='mixed' or q['level']==level)]
    if len(pool)<length:raise ValueError('Not enough questions for that selection')
    return name,cats,level,length,pool

def add_room_player(room,name):
    if len(room['players'])>=MAX_ROOM_PLAYERS:raise ValueError('This room is full')
    if any(p['nickname'].casefold()==name.casefold() for p in room['players'].values()):raise ValueError('That nickname is already in this room')
    token=secrets.token_urlsafe(24)
    room['players'][token]={'nickname':name,'score':0,'correct':0,'streak':0,'answered':False,'selected':None,'gained':0,'joined':time.time(),'last_seen':time.time()}
    return token

def start_room_question(room,index,now=None):
    now=now or time.time();room['index']=index
    if index>=len(room['qids']):room['phase']='finished';room['phase_ends']=0;return
    room['phase']='question';q=BY_ID[room['qids'][index]];room['phase_ends']=now+QUESTION_SECONDS[q['level']]
    for p in room['players'].values():p.update(answered=False,selected=None,gained=0)

def reveal_room(room,now=None):
    room['phase']='reveal';room['phase_ends']=(now or time.time())+REVEAL_SECONDS

def tick_room(room,now=None):
    now=now or time.time()
    if room['phase']=='question':
        timed_out=now>=room['phase_ends']
        complete=all(p['answered'] or now-p['last_seen']>=PLAYER_STALE_SECONDS for p in room['players'].values())
        if timed_out or complete:
            for p in room['players'].values():
                if not p['answered'] and (timed_out or now-p['last_seen']>=PLAYER_STALE_SECONDS):p['answered']=True;p['selected']=-1;p['streak']=0;p['gained']=0
            reveal_room(room,now)
    if room['phase']=='reveal' and now>=room['phase_ends']:
        start_room_question(room,room['index']+1,now)

def get_room(code,token=None):
    code=str(code or '').strip().upper();room=ROOMS.get(code)
    if not room:raise ValueError('Room not found or expired')
    if token is not None and token not in room['players']:raise ValueError('Invalid player token')
    return code,room

def room_payload(code,room,token):
    now=time.time();player=room['players'][token];player['last_seen']=now;tick_room(room,now)
    ranked=sorted(room['players'].items(),key=lambda kv:(-kv[1]['score'],kv[1]['joined']))
    players=[{'nickname':p['nickname'],'score':p['score'],'correct':p['correct'],'answered':bool(p['answered']),'isYou':t==token} for t,p in ranked]
    out={'code':code,'phase':room['phase'],'isHost':token==room['host'],'players':players,'questionIndex':room['index'],'totalQuestions':room['length'],'phaseEnds':room['phase_ends'],'serverTime':now,'maxPlayers':MAX_ROOM_PLAYERS}
    if room['phase'] in {'question','reveal'} and 0<=room['index']<room['length']:
        q=BY_ID[room['qids'][room['index']]];question={'id':q['id'],'prompt':q['prompt'],'options':q['options'],'category':q['category'],'level':q['level']}
        if room['phase']=='reveal':question.update(correctIndex=q['answer'],explanation=q['explanation'],sourceUrl=q['sourceUrl'],sourceLabel=q['sourceLabel'])
        out['question']=question;out['yourAnswer']=player['selected'];out['yourGain']=player['gained']
    return out

class Handler(BaseHTTPRequestHandler):
    server_version='AJewTrivia/1.1'
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
        u=urlparse(self.path);qs=parse_qs(u.query)
        try:
            if u.path.endswith('/health'):
                with ROOM_LOCK:clean_rooms();rooms=len(ROOMS)
                return self.send_json(200,{'ok':True,'questions':len(BY_ID),'liveRooms':rooms})
            if not u.path.endswith('/scores'):return self.send_json(404,{'error':'Not found'})
            period=qs.get('period',['all'])[0];limit=max(1,min(50,int(qs.get('limit',['10'])[0])))
            where='WHERE created_at >= ?' if period=='today' else ''
            args=[datetime.now(timezone.utc).strftime('%Y-%m-%dT00:00:00Z')] if where else []
            with sqlite3.connect(DB) as c:
                c.row_factory=sqlite3.Row
                rows=c.execute(f'SELECT nickname,score,correct,total,level,created_at FROM scores {where} ORDER BY score DESC, created_at ASC LIMIT ?',args+[limit]).fetchall()
            return self.send_json(200,[dict(r) for r in rows])
        except (ValueError,KeyError,TypeError) as e:return self.send_json(400,{'error':str(e)[:160]})
    def do_POST(self):
        u=urlparse(self.path)
        try:
            if u.path.endswith('/session'):return self.new_session()
            if u.path.endswith('/score'):return self.submit_score()
            if u.path.endswith('/room/create'):return self.create_room()
            if u.path.endswith('/room/join'):return self.join_room()
            if u.path.endswith('/room/state'):return self.state_room()
            if u.path.endswith('/room/start'):return self.start_room()
            if u.path.endswith('/room/answer'):return self.answer_room()
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
        if length!=20:raise ValueError('Competitive rounds must contain 20 questions')
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
    def create_room(self):
        if not rate_ok(self.ip,'room-create',12,3600):return self.send_json(429,{'error':'Too many rooms; please try later.'})
        d=self.body(8192);name,cats,level,length,pool=valid_room_options(d)
        with ROOM_LOCK:
            clean_rooms();code=room_code();now=time.time();qids=secrets.SystemRandom().sample(pool,length)
            room={'created':now,'phase':'lobby','phase_ends':0,'categories':cats,'level':level,'length':length,'qids':qids,'index':-1,'players':{},'host':None}
            token=add_room_player(room,name);room['host']=token;ROOMS[code]=room
        return self.send_json(201,{'code':code,'playerToken':token,'isHost':True,'maxPlayers':MAX_ROOM_PLAYERS})
    def join_room(self):
        if not rate_ok(self.ip,'room-join',60,3600):return self.send_json(429,{'error':'Too many joins; please try later.'})
        d=self.body(4096);name=str(d.get('nickname','')).strip()
        if not NAME_RE.fullmatch(name):raise ValueError('Invalid nickname')
        with ROOM_LOCK:
            clean_rooms();code,room=get_room(d.get('code'))
            if room['phase']!='lobby':raise ValueError('This match has already started')
            token=add_room_player(room,name)
        return self.send_json(201,{'code':code,'playerToken':token,'isHost':False,'maxPlayers':MAX_ROOM_PLAYERS})
    def state_room(self):
        d=self.body(4096);token=str(d.get('playerToken',''))
        with ROOM_LOCK:
            clean_rooms();code,room=get_room(d.get('code'),token);payload=room_payload(code,room,token)
        return self.send_json(200,payload)
    def start_room(self):
        d=self.body(4096);token=str(d.get('playerToken',''))
        with ROOM_LOCK:
            code,room=get_room(d.get('code'),token)
            if token!=room['host']:raise ValueError('Only the host can start this match')
            if room['phase']!='lobby':raise ValueError('This match has already started')
            if len(room['players'])<2:raise ValueError('At least two players are required')
            start_room_question(room,0)
            payload=room_payload(code,room,token)
        return self.send_json(200,payload)
    def answer_room(self):
        d=self.body(4096);token=str(d.get('playerToken',''));selected=d.get('selected')
        if isinstance(selected,bool) or not isinstance(selected,int) or selected<0 or selected>3:raise ValueError('Invalid answer')
        with ROOM_LOCK:
            code,room=get_room(d.get('code'),token);p=room['players'][token];p['last_seen']=time.time();tick_room(room)
            if room['phase']!='question':raise ValueError('Answers are closed')
            if p['answered']:raise ValueError('Answer already submitted')
            q=BY_ID[room['qids'][room['index']]];right=selected==q['answer'];p['answered']=True;p['selected']=selected;p['last_seen']=time.time()
            if right:
                p['correct']+=1;p['streak']+=1;speed=max(0,min(100,int((room['phase_ends']-time.time())/QUESTION_SECONDS[q['level']]*100)))
                p['gained']=POINTS[q['level']]+min(200,(p['streak']-1)*20)+speed;p['score']+=p['gained']
            else:p['streak']=0;p['gained']=0
            tick_room(room)
            payload=room_payload(code,room,token)
        return self.send_json(200,payload)

class TriviaHTTPServer(ThreadingHTTPServer):
    # A full room can legitimately create a burst of 50 polls or answers.
    request_queue_size=128
    daemon_threads=True
    allow_reuse_address=True

if __name__=='__main__':
    print(f'Na Nach Trivia API listening on {HOST}:{PORT} with {len(BY_ID)} questions',flush=True)
    TriviaHTTPServer((HOST,PORT),Handler).serve_forever()
