#!/usr/bin/env python3
import importlib.util
import json
import os
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
CHECKPOINT = Path('/root/sefer_hamidos_remaining_40_grok_checkpoint.json')
QA_RAW = Path('/root/sefer-hamidos-remaining40-qa/raw')
HELPER_PATH = ROOT / 'scripts/build-sefer-hamidos-travel11-judge9-sweetening20-grok-media.py'
DATE = '2026-08-10'
BATCH = 'truth1-6-continuation-20260810'

spec = importlib.util.spec_from_file_location('sh_overlay_helper', HELPER_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f'cannot load helper: {HELPER_PATH}')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


def copy_or_download(src: str, dst: Path, minimum: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(dst.suffix + '.part')
    if tmp.exists():
        tmp.unlink()
    if src.startswith(('http://', 'https://')):
        req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=240) as r, open(tmp, 'wb') as f:
            shutil.copyfileobj(r, f, length=1024 * 1024)
            f.flush()
            os.fsync(f.fileno())
    else:
        with open(src, 'rb') as r, open(tmp, 'wb') as f:
            shutil.copyfileobj(r, f, length=1024 * 1024)
            f.flush()
            os.fsync(f.fileno())
    if tmp.stat().st_size < minimum:
        raise RuntimeError(f'short asset: {src} -> {tmp.stat().st_size}')
    os.replace(tmp, dst)


def atomic_json(path: Path, obj) -> None:
    tmp = path.with_suffix(path.suffix + '.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    json.load(open(tmp, encoding='utf-8'))
    os.replace(tmp, path)


def main() -> None:
    rows = [r for r in json.load(open(CHECKPOINT, encoding='utf-8'))
            if r['collection'] == 'sefer-hamidos-truth' and 1 <= int(r['segment']) <= 6]
    assert [int(r['segment']) for r in rows] == list(range(1, 7))
    assert all(r.get('image_url') and r.get('video_url') and r.get('error') is None for r in rows)

    collection = 'sefer-hamidos-truth'
    slug = 'truth'
    out = PUB / 'images' / collection
    manifest_path = out / 'manifest.json'
    manifest = json.load(open(manifest_path, encoding='utf-8'))
    built = []

    for row in rows:
        seg = int(row['segment'])
        entry = next(e for e in manifest['entries'] if int(e.get('segment', -1)) == seg)
        base = out / f'grok-bases-{BATCH}' / f'sh-{slug}-{seg:03d}-grok-clean-base.jpg'
        raw = out / f'raw-grok-videos-{BATCH}' / f'sh-{slug}-{seg:03d}-raw-grok.mp4'
        overlay = Path('/tmp/sefer-hamidos-truth1-6-overlays') / f'sh-{slug}-{seg:03d}.png'
        final = out / f'sh-{slug}-{seg:03d}-grok-generated-overlay.mp4'

        copy_or_download(row['image_url'], base, 100000)
        copy_or_download(str(QA_RAW / f'truth-{seg:02d}.mp4'), raw, 500000)
        helper.make_video_overlay(entry['he'], entry['en'], entry.get('topic_title', manifest['topic_title']), str(seg), overlay)
        if final.exists():
            final.unlink()
        helper.overlay_video(raw, overlay, final)
        if final.stat().st_size < 120000:
            raise RuntimeError(f'short final {final}')

        web_video = f'/images/{collection}/{final.name}'
        for image in entry.get('images', []):
            image['video_path'] = web_video
            image['video_filename'] = final.name
            image['video_source'] = 'Grok/xAI generated video with exact bilingual teaching superimposed in post'
        entry['grok_image_source_url'] = row['image_url'] if str(row['image_url']).startswith('https://files-cdn.x.ai/') else None
        entry['grok_video_source_url'] = row['video_url']
        entry['source_video'] = 'Grok/xAI generated raw video; no local/archive footage'
        entry['video_note'] = 'Genuine Grok/xAI-generated motion from a clean text-free reconstruction of the existing teaching picture; exact bilingual teaching superimposed afterward in post.'
        entry['clean_grok_base'] = f'/images/{collection}/grok-bases-{BATCH}/{base.name}'
        built.append(str(final))

    manifest['generated'] = DATE
    atomic_json(manifest_path, manifest)
    print(json.dumps({'built': built, 'count': len(built)}, indent=2))


if __name__ == '__main__':
    main()
