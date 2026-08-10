#!/usr/bin/env python3
"""Finish Sweetening of Judgments 21-51 Grok videos from checkpoint.

The Grok opening frames are bilingual teaching cards. Only the clean animated
left-side scene is used; the card is discarded, the scene is presented over a
blurred extension, and exact canonical Hebrew/English is composited afterward.
"""
from __future__ import annotations
import importlib.util
import json
import os
import shutil
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT = Path('/root/sweetening-video-21-51-api-checkpoint.json')
COLLECTION = 'sefer-hamidos-sweetening-of-judgments'
OUT = ROOT / 'public' / 'images' / COLLECTION
MANIFEST = OUT / 'manifest.json'
RAW_DIR = OUT / 'raw-grok-videos-sweetening21-51-20260810'
OVERLAY_DIR = Path('/tmp/sefer-hamidos-sweetening21-51-overlays')
HELPER = ROOT / 'scripts' / 'build-sefer-hamidos-travel11-judge9-sweetening20-grok-media.py'

spec = importlib.util.spec_from_file_location('sh_media_helper', HELPER)
if spec is None or spec.loader is None:
    raise SystemExit(f'cannot load helper {HELPER}')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def download(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size > 100_000:
        return
    tmp = path.with_suffix(path.suffix + '.part')
    if tmp.exists():
        tmp.unlink()
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=240) as src, open(tmp, 'wb') as dst:
        shutil.copyfileobj(src, dst)
    if tmp.stat().st_size <= 100_000:
        raise RuntimeError(f'short download: {url}')
    os.replace(tmp, path)


def encode(raw: Path, overlay: Path, out: Path) -> None:
    if out.exists() and out.stat().st_size > 120_000:
        return
    # The source card's clean scene occupies x=0..687. Discard its generated
    # text panel. Preserve the complete scene at natural proportions over a
    # blurred full-frame extension, then apply deterministic exact teaching.
    graph = (
        '[0:v]crop=688:720:0:0,split=2[fg][bg];'
        '[bg]scale=1280:720,gblur=sigma=24,eq=brightness=-0.10:saturation=0.82[bg2];'
        '[fg]scale=688:720,setsar=1[fg2];'
        '[bg2][fg2]overlay=(W-w)/2:0,format=yuv420p[v];'
        '[v][1:v]overlay=0:0:format=auto,format=yuv420p[out]'
    )
    subprocess.run([
        'ffmpeg', '-y', '-i', str(raw), '-i', str(overlay), '-t', '5',
        '-filter_complex', graph, '-map', '[out]', '-an', '-movflags', '+faststart',
        '-preset', 'veryfast', '-crf', '24', str(out),
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main() -> None:
    rows = {int(x['segment']): x for x in json.loads(CHECKPOINT.read_text(encoding='utf8'))}
    manifest = json.loads(MANIFEST.read_text(encoding='utf8'))
    entries = {int(x['segment']): x for x in manifest['entries']}
    targets = [21] + list(range(23, 52))
    if any(not rows[n].get('video_url') for n in targets):
        raise SystemExit('checkpoint has missing Grok URLs')
    OVERLAY_DIR.mkdir(parents=True, exist_ok=True)
    for n in targets:
        row, entry = rows[n], entries[n]
        raw = RAW_DIR / f'sh-sweetening-of-judgments-{n:03d}-raw-grok.mp4'
        download(row['video_url'], raw)
        overlay = OVERLAY_DIR / f'sh-sweetening-of-judgments-{n:03d}.png'
        helper.make_video_overlay(
            entry['he'], entry['en'],
            entry.get('topic_title', manifest['topic_title']),
            entry.get('displayLabel', n), overlay,
        )
        final = OUT / f'sh-sweetening-of-judgments-{n:03d}-grok-generated-overlay.mp4'
        encode(raw, overlay, final)
        vpath = f'/images/{COLLECTION}/{final.name}'
        for image in entry.get('images', []):
            image['video_path'] = vpath
            image['video_filename'] = final.name
            image['video_source'] = 'Grok/xAI generated video with exact teaching superimposed in post'
        entry['source_video'] = 'Grok/xAI generated raw video; no local/archive footage'
        entry['video_note'] = ('Genuine Grok/xAI-generated motion; generated card text discarded; '
                               'exact canonical teaching superimposed afterward in post.')
        entry['grok_video_source_url'] = row['video_url']
        row['local_raw'] = str(raw)
        row['local_final'] = str(final)
    manifest['generated'] = '2026-08-10'
    tmp = MANIFEST.with_suffix('.json.tmp')
    tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    json.loads(tmp.read_text(encoding='utf8'))
    os.replace(tmp, MANIFEST)
    CHECKPOINT.write_text(json.dumps(list(rows.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    finals = [OUT / f'sh-sweetening-of-judgments-{n:03d}-grok-generated-overlay.mp4' for n in targets]
    bad = [str(p) for p in finals if not p.exists() or p.stat().st_size <= 120_000]
    if bad:
        raise SystemExit(f'missing/short finals: {bad}')
    print(f'finished {len(finals)} Grok videos: 21 and 23-51')

if __name__ == '__main__':
    main()
