"""Additive topic links for qualified exports; never changes source identities.

Read the inert, pinned literal topic table shared with the route adapter. Do not
execute JavaScript or derive numbering from a generated export. Search keeps its
six authenticated source documents and stable owner fragments: their arrivals
now expose the corresponding topic location, including cross-batch topics.
"""
import hashlib
import json
from pathlib import Path
import re

# Updated only with explicit route-projection changes; source-bank pins live in
# the inherited qualified_aitzoas362_exports adapter and remain untouched.
TOPICS_SHA256 = '3e388f03de12ddbbb25c31705672da71ab6499c5939f7e9327e675d5c03c5ee3'
BASE = '/reader/aitzoas-yeshuroas'


def navigation(rows):
    # Caller authenticates its own Edition instance before passing immutable
    # source values. This helper emits navigation only, never source payloads.
    raw = (Path(__file__).resolve().parents[1] / 'public/qualified-aitzoas-topics.js').read_bytes()
    if hashlib.sha256(raw).hexdigest() != TOPICS_SHA256:
        raise ValueError('Topic projection binding drift')
    match = re.search(rb'export const TOPIC_STARTS=freeze\((\[.*?\])\);', raw)
    if match is None:
        raise ValueError('Missing inert topic table')
    starts = json.loads(match[1].replace(b"'", b'"'))
    if len(starts) != 40:
        raise ValueError('Forty topics required')
    result = {}
    for r in rows:
        index = r['stableIndex']
        topic = next(((start, slug) for n, (start, slug) in enumerate(starts)
                      if start <= index < (starts[n+1][0] if n+1 < len(starts) else 280)), None)
        number = re.match(r'^~?([א-ת]+)\.\s', r['he'])
        values = dict(zip('אבגדהוזחטיכלמנסעפצקרשת', [1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400]))
        local = {'he': number[1], 'decimal': sum(values[c] for c in number[1])} if number else None
        if topic and index not in (62,63,193):
            start, slug = topic
            heading = rows[start-1]
            url = f'{BASE}/topics/{slug}/#seg-{index}'
            label = f"{heading['en']} — {local['he']} ({local['decimal']})" if local else f"{heading['he']} — {heading['en']}"
        else:
            part = 'front-matter' if index <= 7 else 'source-appendix' if index >= 282 else 'closing' if index >= 280 else 'page-headers'
            url = f'{BASE}/apparatus/{part}/#seg-{index}'
            label = {'front-matter':'Front matter','source-appendix':'Repeated source witness / appendix artifact','closing':'Closing','page-headers':'Inline source artifact'}[part]
        result[index] = {'owner':r['owner'], 'sourceUrl':r['canonicalUrl'], 'readingUrl':url, 'label':label, 'number':local}
    # Compatibility destinations only: exact source owners and payloads survive.
    for alias, target in ((62,81),(63,82),(193,165)):
        result[alias]['readingUrl'] = result[target]['readingUrl']
        result[alias]['label'] = result[target]['label']
    return result
