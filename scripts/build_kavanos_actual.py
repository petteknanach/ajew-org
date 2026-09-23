# One-time import: actual learning-kavanos for the chok sections.
# Source: OUR ingested Pri Etz Chaim, Shaar HaNehagas HaLimud (gate 18) -
# ancient PD Arizal text via R' Chaim Vital (project-owned JSON, commit b5f3c2d9d).
# Section mapping cross-checked against the YMM siddur (c) Machon Yam HaChachma
# - used as STRUCTURE reference only; no YMM text is lifted (rights law).
import json

SRC = '/root/ajew-org/public/reader/kavanos/pec-gate-18.json'
OUT = '/root/ajew-org/public/reader/chok/kavanos-actual.json'

g = json.load(open(SRC))
items = g['ch']['1']  # 0-indexed list; printed numbers are 1-based

def it(*nums):
    return [items[n - 1].strip() for n in nums]

data = {
    "_source_comment": "Arizal kavanos for learning, verbatim from project-owned "
        "public/reader/kavanos/pec-gate-18.json (Pri Etz Chaim, Shaar HaNehagas "
        "HaLimud; ancient PD). Per-section grouping follows the traditional chok "
        "kavana order (mikra/mishna/talmud/kabbala per aviy'a) as cross-checked "
        "against the Yam HaChachma 'Seder Kavanos Chok LiYisroel' structure - "
        "no text from that copyrighted edition.",
    "kavanos": {
        "torah":    it(1, 21, 24, 29, 31, 33),
        "navi":     it(36),
        "kesuvim":  it(37),
        "mishna":   it(46, 39, 40, 41, 42, 43, 44),
        "talmud":   it(45, 48, 49),
        "halacha":  it(5, 6, 7),
        "kabbala":  it(38, 15),
    },
}

json.dump(data, open(OUT, 'w'), ensure_ascii=False, indent=1)
n = sum(len(v) for v in data['kavanos'].values())
print('wrote', OUT, '| sections:', len(data['kavanos']), '| items:', n)
for k, v in data['kavanos'].items():
    print(k, [len(x) for x in v])
