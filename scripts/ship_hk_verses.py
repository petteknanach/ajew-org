# Ship the parsed HALECHTA KNECHMANI verse->Breslov-refs facts to the chok.
# RIGHTS: facts only (verse -> source citations); no entry prose is shipped.
import json

raw = json.load(open('/root/.hermes/cache/scratch/hk_verses_raw.json'))
out = {
    'source': 'הלכתא כנחמני דתורת ברסלב — יעקב דב הלוי בן ר׳ אברהם יצחק (אינדקס פסוקים; מוצגים מקומות הציטוט בלבד)',
    'books': {'LM': 'ליקוטי מוהר״ן', 'LM2': 'ליקוטי מוהר״ן ב׳', 'KLM': 'קיצור ליקוטי מוהר״ן',
              'KLM2': 'קיצור ליקוטי מוהר״ן ב׳', 'HaMidos': 'ספר המדות', 'LikHalachos': 'ליקוטי הלכות',
              'LikTefilos': 'ליקוטי תפלות', 'ChayeyMoharan': 'חיי מוהר״ן', 'Sichos': 'שיחות הר״ן'},
    'safeChapters': {'בראשית': 1, 'האזינו': 32, 'וזאת הברכה': 33},
    'parshiyos': raw,
}
json.dump(out, open('/root/ajew-org/public/reader/chok/hk-verses.json', 'w'), ensure_ascii=False, indent=1)
n = sum(len(v) for p in raw.values() for v in p.values())
print('hk-verses.json written:', len(raw), 'parshiyos,', n, 'verses with Breslov refs')
