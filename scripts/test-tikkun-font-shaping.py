#!/usr/bin/env python3
"""Shape every unique annotated source word using actual HarfBuzz/OpenType.
Compare original outlines/positions and ensure every requested vowel glyph is
colored; this is font-level proof, not a substitute for Android pixel QA.
Usage: /usr/bin/python3 tests/tikun-font-shaping.py <evidence-dir>
"""
import ctypes as C
import ctypes.util
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from fontTools.ttLib import TTFont

class Feature(C.Structure): _fields_ = [('tag',C.c_uint),('value',C.c_uint),('start',C.c_uint),('end',C.c_uint)]
class Info(C.Structure): _fields_ = [('codepoint',C.c_uint),('mask',C.c_uint),('cluster',C.c_uint),('var1',C.c_uint),('var2',C.c_uint)]
class Pos(C.Structure): _fields_ = [('x_advance',C.c_int),('y_advance',C.c_int),('x_offset',C.c_int),('y_offset',C.c_int),('var',C.c_uint)]
hb = C.CDLL(ctypes.util.find_library('harfbuzz'))
def declare(name, restype, *args):
    fn=getattr(hb,name); fn.restype=restype; fn.argtypes=args; return fn
blob_create=declare('hb_blob_create',C.c_void_p,C.c_char_p,C.c_uint,C.c_int,C.c_void_p,C.c_void_p)
face_create=declare('hb_face_create',C.c_void_p,C.c_void_p,C.c_uint)
font_create=declare('hb_font_create',C.c_void_p,C.c_void_p)
set_funcs=declare('hb_ot_font_set_funcs',None,C.c_void_p)
buf_create=declare('hb_buffer_create',C.c_void_p)
buf_add=declare('hb_buffer_add_utf8',None,C.c_void_p,C.c_char_p,C.c_int,C.c_uint,C.c_int)
guess=declare('hb_buffer_guess_segment_properties',None,C.c_void_p)
shape=declare('hb_shape',None,C.c_void_p,C.c_void_p,C.POINTER(Feature),C.c_uint)
infos=declare('hb_buffer_get_glyph_infos',C.POINTER(Info),C.c_void_p,C.POINTER(C.c_uint))
positions=declare('hb_buffer_get_glyph_positions',C.POINTER(Pos),C.c_void_p,C.POINTER(C.c_uint))
buf_destroy=declare('hb_buffer_destroy',None,C.c_void_p)

class Font:
    def __init__(self,path):
        self.tt=TTFont(path); self.names=self.tt.getGlyphOrder(); self.data=Path(path).read_bytes()
        self.blob=blob_create(self.data,len(self.data),0,None,None)
        self.face=face_create(self.blob,0); self.font=font_create(self.face); set_funcs(self.font)
    def shape(self,text,features):
        data=text.encode(); buf=buf_create(); buf_add(buf,data,len(data),0,len(data)); guess(buf)
        fs=(Feature*len(features))(*[Feature(int.from_bytes(tag.encode(),'big'),1,start,end) for tag,start,end in features])
        shape(self.font,buf,fs,len(fs)); n=C.c_uint(); gi=infos(buf,C.byref(n)); gp=positions(buf,C.byref(n))
        result=[(self.names[gi[i].codepoint],gi[i].cluster,gp[i].x_advance,gp[i].y_advance,gp[i].x_offset,gp[i].y_offset) for i in range(n.value)]
        buf_destroy(buf); return result

class Markup(HTMLParser):
    def __init__(self,html):
        super().__init__(); self.text=''; self.stack=[]; self.features=[]; self.expected=Counter(); self.feed(html)
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs); start=len(self.text.encode()); tags=re.findall("'(ss0[1-4])' 1",attrs.get('style',''))
        self.stack.append((start,tags))
        cl=attrs.get('class','')
        for record in attrs.get('data-tk-marks','').split(): self.expected[{'na':'ss01','qk':'ss02','qb':'ss03','meteg':'ss04'}[record.split(':')[0]]]+=1
    def handle_endtag(self,tag):
        start,tags=self.stack.pop(); end=len(self.text.encode())
        self.features.extend((t,start,end) for t in tags)
    def handle_data(self,data): self.text+=data

root=Path(__file__).resolve().parents[1]; out=Path(sys.argv[1])
original=Font(root/'public/fonts/TaameyFrankCLM-Medium.ttf'); annotated=Font(root/'public/fonts/tikkun/TikunVowels-day.ttf')
cases=json.loads((out/'font-cases.json').read_text()); mismatches=[]; paint_errors=[]; colors=Counter()
for case in cases:
    m=Markup(case['html']); assert m.text==case['raw']
    a=original.shape(m.text,[]); b=annotated.shape(m.text,m.features)
    uncolored=[(re.sub(r'\.tikun\.ss0[1-4]$','',name),*rest) for name,*rest in b]
    if a!=uncolored: mismatches.append({'raw':m.text,'original':a,'annotated':b})
    actual=Counter(re.search(r'\.tikun\.(ss0[1-4])$',name).group(1) for name,*rest in b if '.tikun.' in name)
    colors.update(actual)
    if actual!=m.expected: paint_errors.append({'raw':m.text,'expected':m.expected,'actual':actual,'glyphs':b})
result={'uniqueAnnotatedWords':len(cases),'positionMismatches':len(mismatches),'paintMismatches':len(paint_errors),'coloredGlyphsByFeature':colors,'examples':mismatches[:3]+paint_errors[:3]}
(out/'font-shaping-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
assert not mismatches and not paint_errors
