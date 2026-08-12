"""One-off: dump LongMemEval-S's query set (text, user_id, gold_ids, category)
to JSON so a Node script can re-score against the already-ingested database
without paying the dataset-loading cost from JS. Not part of the shipped
harness — ticket 29 calibration only."""
import json
from memory_bench.dataset import get_dataset

ds = get_dataset("longmemeval")
queries = ds.load_queries("s", limit=None)
out = [
    {
        "user_id": q.user_id,
        "query": q.query,
        "gold_ids": q.gold_ids or [],
        "category": (q.meta or {}).get("question_type") or "?",
    }
    for q in queries
]
with open("outputs/longmemeval_queries.json", "w") as f:
    json.dump(out, f)
print(f"wrote {len(out)} queries")
