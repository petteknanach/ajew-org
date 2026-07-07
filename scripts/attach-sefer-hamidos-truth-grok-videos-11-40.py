#!/usr/bin/env python3
import json, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/images/sefer-hamidos-truth'
urls=json.load(open(ROOT/'tmp_sefer_hamidos_truth_11_40_grok_video_urls.json',encoding='utf-8'))
manifest_path=OUT/'manifest.json'
manifest=json.load(open(manifest_path,encoding='utf-8'))
for k,url in sorted(urls.items(), key=lambda kv:int(kv[0])):
    idx=int(k)
    fname=f'sh-truth-{idx:02d}-grok-motion.mp4'
    path=OUT/fname
    if not path.exists() or path.stat().st_size<100000:
        print('download',idx,url)
        urllib.request.urlretrieve(url,path)
    for e in manifest['entries']:
        if int(e.get('segment'))==idx:
            e['grok_video_source_url']=url
            e['video_note']='Grok image-to-video with prompted scene motion; no old pan/zoom ffmpeg animation reused.'
            for im in e.get('images',[]):
                # attach once per language on Variant A to avoid four duplicate videos per teaching
                if im.get('variant')=='Grok A':
                    im['video_path']=f'/images/sefer-hamidos-truth/{fname}'
                    im['video_archive_filename']=fname
                else:
                    im.pop('video_path',None); im.pop('video_archive_filename',None)
            break
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print('downloaded/attached videos',len(urls))
print('mp4 files',len(list(OUT.glob('sh-truth-*-grok-motion.mp4'))))
