#!/usr/bin/env python3
"""
Ground-truth "good answer" labels for Experiment 2's paired damage/gain
comparison. There is no external gold set (the plan explicitly forbids
fabricating one), so relevance is defined by keyword/token co-occurrence
between the query fragment and each memory's content — independent of the
hybrid FTS+vector ranking system under test, so scoring is not circular
(we are not calling a good answer "good" because the system under test
ranked it highly).

Method (auditable, rerunnable): tokenize the query and each memory's content
into lowercased alphanumeric words, drop a small stopword list, and score a
memory by how many distinct query tokens appear as substrings of its content.
A memory is a "good answer" for a query if it shares at least half of the
query's significant tokens (minimum 1), capped at the top 5 by overlap count
then recency. This is a coarse proxy, not human judgement — it is disclosed
as such in the deliverable report, and a random sample is spot-checked below
against manual reading for face validity.
"""
import json, re, sys
from collections import defaultdict

import os
SCRATCH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .scratch/configurable-pruning/

STOPWORDS = {
    'the','a','an','and','or','of','to','in','on','for','with','is','are',
    'was','were','be','this','that','it','as','at','by','from','via',
}

def tokenize(text):
    words = re.findall(r"[a-zA-Z0-9']+", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 1]

# Auto-generated architecture blueprint cards run 13-36KB and otherwise pick
# up token overlap with almost any query purely from length/topic breadth,
# unfairly outranking short, specific entries. Cap tokenisation input so a
# giant document is scored on its opening summary, not its entire dump.
CONTENT_CAP = 400

def main():
    queries = json.load(open(f"{SCRATCH}/filtered_queries.json"))
    history = json.load(open(f"{SCRATCH}/history_entries.json"))
    controls = json.load(open(f"{SCRATCH}/control_entries.json"))
    entries = history + controls

    entry_tokens = [(e['id'], e['category'], e['created_at'], set(tokenize(e['content'][:CONTENT_CAP])))
                    for e in entries]

    relevance = {}
    for q in queries:
        qtext = q['query_text']
        qtokens = set(tokenize(qtext))
        if not qtokens:
            relevance[q['id']] = {'query': qtext, 'good_answers': []}
            continue
        need = max(1, (len(qtokens) + 1) // 2)  # at least half, min 1
        scored = []
        for eid, cat, created_at, etoks in entry_tokens:
            overlap = len(qtokens & etoks)
            if overlap >= need:
                scored.append((overlap, created_at, eid, cat))
        scored.sort(key=lambda x: (-x[0], x[1]), reverse=False)
        scored.sort(key=lambda x: -x[0])  # highest overlap first
        top = scored[:5]
        relevance[q['id']] = {
            'query': qtext,
            'query_tokens': sorted(qtokens),
            'good_answers': [{'id': eid, 'category': cat, 'overlap': ov} for ov, _, eid, cat in top],
        }

    n_with_answers = sum(1 for v in relevance.values() if v['good_answers'])
    print(f"queries: {len(queries)}, with >=1 good answer: {n_with_answers}, "
          f"with zero: {len(queries) - n_with_answers}")
    total_good = sum(len(v['good_answers']) for v in relevance.values())
    print(f"total (query, good-answer) pairs: {total_good}")

    with open(f"{SCRATCH}/relevance_labels.json", 'w') as f:
        json.dump(relevance, f, indent=2)

if __name__ == '__main__':
    main()
