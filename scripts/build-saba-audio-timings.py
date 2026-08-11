#!/usr/bin/env python3
"""Checkpointed batch ASR + transcript alignment for Saba tape sides.

Usage: python3 scripts/build-saba-audio-timings.py WORKER_INDEX WORKER_COUNT
Run two workers (0/2 and 1/2) to share the corpus without overlap.
"""
from faster_whisper import WhisperModel, BatchedInferencePipeline
from pathlib import Path
import json, subprocess, sys, time

worker = int(sys.argv[1])
workers = int(sys.argv[2])
if worker < 0 or worker >= workers:
    raise SystemExit("worker index must be in [0, worker_count)")

repo = Path(__file__).resolve().parents[1]
audio_dir = Path('/root/saba-tapes-audio')
reader = repo / 'public/reader/saba-tape-transcripts'
asr_dir = audio_dir / 'asr-words'
timing_dir = reader / 'timings'
asr_dir.mkdir(exist_ok=True)
timing_dir.mkdir(exist_ok=True)
manifest = json.loads((audio_dir / 'manifest.json').read_text())
recordings = sorted(manifest['recordings'], key=lambda r: (r['tape'], r['side']))
jobs = [r for i, r in enumerate(recordings) if i % workers == worker]

print(f"worker {worker}/{workers}: {len(jobs)} sides", flush=True)
model_id = 'ivrit-ai/whisper-large-v3-turbo-ct2'
base_model = WhisperModel(model_id, device='cpu', compute_type='int8', cpu_threads=max(2, 8 // workers))
model = BatchedInferencePipeline(model=base_model)

for pos, rec in enumerate(jobs, 1):
    stem = f"{rec['tape']:03}_{rec['side']}"
    audio = audio_dir / rec['filename']
    tape = reader / 'tapes' / f"tape-{rec['tape']:03}-{rec['side']}.json"
    asr_path = asr_dir / f'{stem}.json'
    timing = timing_dir / f'{stem}.json'
    if timing.exists():
        try:
            old = json.loads(timing.read_text())
            if old.get('schemaVersion') == 2:
                print(f"[{pos}/{len(jobs)}] {stem} timing exists; skip", flush=True)
                continue
        except Exception:
            pass
    started = time.time()
    if not asr_path.exists():
        print(f"[{pos}/{len(jobs)}] {stem} transcribing", flush=True)
        segments, info = model.transcribe(str(audio), language='he', beam_size=1, best_of=1, temperature=0, vad_filter=True, word_timestamps=True, batch_size=8)
        rows, words = [], []
        for i, seg in enumerate(segments):
            row = {'start': seg.start, 'end': seg.end, 'text': seg.text, 'words': []}
            for w in seg.words or []:
                item = {'start': round(w.start, 3), 'end': round(w.end, 3), 'word': w.word, 'probability': round(w.probability, 4)}
                row['words'].append(item); words.append(item)
            rows.append(row)
            if i and i % 100 == 0:
                print(f"  {stem}: {i} ASR segments, audio {seg.start/60:.1f} min", flush=True)
        temp = asr_path.with_suffix('.json.tmp')
        temp.write_text(json.dumps({'source': str(audio), 'model': model_id, 'batched': True, 'language': info.language, 'duration': info.duration, 'segments': rows, 'words': words}, ensure_ascii=False))
        temp.replace(asr_path)
    subprocess.run([sys.executable, str(repo / 'scripts/align-saba-transcript-words.py'), str(tape), str(asr_path), str(timing)], check=True)
    result = json.loads(timing.read_text())
    print(f"[{pos}/{len(jobs)}] {stem} done in {(time.time()-started)/60:.1f}m exact={result['exactAnchorPercent']}% segments={result['anchoredSegmentPercent']}% publish={result['publishable']}", flush=True)
