#!/usr/bin/env python3
"""Build graph data for Torah Map visualization — topics ↔ books connections."""

import json, gzip, os
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]

# Load the GPS index
gps = json.load(open(ROOT / 'public/data/torah-gps-index-v2.json'))
topics = gps.get('topics', {})
topic_meta = gps.get('topicMeta', {})

# Build graph: nodes (topics + books), edges (topic ↔ book connections)
nodes = []
edges = []
node_ids = set()
book_topic_counts = defaultdict(lambda: defaultdict(int))

for tid, teachings in topics.items():
    meta = topic_meta.get(tid, {})
    
    # Topic node
    topic_node_id = f"topic:{tid}"
    if topic_node_id not in node_ids:
        nodes.append({
            "id": topic_node_id,
            "label": meta.get('en', tid),
            "labelHe": meta.get('he', tid),
            "type": "topic",
            "size": len(teachings),
            "color": "#c8a84b"  # gold
        })
        node_ids.add(topic_node_id)
    
    # Count teachings per book
    for t in teachings:
        book = t.get('book', 'unknown')
        book_topic_counts[book][tid] += 1

# Add book nodes and edges
for book, topic_counts in book_topic_counts.items():
    book_node_id = f"book:{book}"
    if book_node_id not in node_ids:
        total = sum(topic_counts.values())
        nodes.append({
            "id": book_node_id,
            "label": book.replace('-', ' ').title(),
            "labelHe": "",
            "type": "book",
            "size": min(total, 50),
            "color": "#1e3a5f"  # deep blue
        })
        node_ids.add(book_node_id)
    
    # Edges
    for tid, count in topic_counts.items():
        edges.append({
            "source": f"topic:{tid}",
            "target": book_node_id,
            "weight": count,
            "label": str(count)
        })

graph = {
    "nodes": nodes,
    "edges": edges,
    "stats": {
        "topics": sum(1 for n in nodes if n['type'] == 'topic'),
        "books": sum(1 for n in nodes if n['type'] == 'book'),
        "edges": len(edges),
        "totalTeachings": gps.get('totalTeachings', 0)
    }
}

out = ROOT / 'public/data/torah-map-graph.json'
with open(out, 'w', encoding='utf-8') as f:
    json.dump(graph, f, ensure_ascii=False)

mb = os.path.getsize(out) / 1024
print(f"Graph: {graph['stats']['topics']} topics + {graph['stats']['books']} books = {len(nodes)} nodes, {len(edges)} edges ({mb:.0f} KB)")
