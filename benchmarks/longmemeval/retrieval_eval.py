"""Retrieval-only evaluation of neuron on LongMemEval. Makes ZERO LLM calls.

Measures whether neuron puts the gold evidence in front of the reader at all.
If recall@k is poor no judge can rescue the score, so this is the cheapest
signal available and it costs no API quota — only local CPU.
"""
import json, sys, time
from pathlib import Path
from collections import defaultdict
from memory_bench.dataset import get_dataset
from memory_bench.memory import get_memory_provider

N = None if len(sys.argv) < 2 or sys.argv[1] == "all" else int(sys.argv[1])
KS = [1, 5, 10]
KMAX = max(KS)

ds = get_dataset("longmemeval")
split = "s"
queries = ds.load_queries(split, limit=N)
qids = {q.user_id for q in queries}
print(f"[setup] {len(queries)} queries, loading documents…", flush=True)
documents = ds.load_documents(split, user_ids=qids)
print(f"[setup] {len(documents)} documents", flush=True)

provider = get_memory_provider("neuron")
store = Path("outputs/_retrieval_only_neuron")
provider.prepare(store, unit_ids=qids, reset=True)

# Ingest per question so progress is visible and each unit is isolated.
by_unit = defaultdict(list)
for d in documents:
    by_unit[d.user_id].append(d)

t0 = time.time()
done = 0
for uid, docs in by_unit.items():
    provider.ingest(docs)
    done += 1
    if done % 25 == 0 or done == len(by_unit):
        el = time.time() - t0
        rate = done / el
        eta = (len(by_unit) - done) / rate if rate else 0
        print(f"[ingest] {done}/{len(by_unit)} units  {el:.0f}s elapsed  ETA {eta:.0f}s", flush=True)
ingest_s = time.time() - t0

hits = {k: 0 for k in KS}
scored = 0
lat = []
per_cat = defaultdict(lambda: {k: 0 for k in KS} | {"n": 0})
leaks = 0

for i, q in enumerate(queries, 1):
    t = time.time()
    docs, _ = provider.retrieve(q.query, k=KMAX, user_id=q.user_id)
    lat.append((time.time() - t) * 1000)
    leaks += sum(1 for d in docs if d.user_id != q.user_id)
    gold = set(q.gold_ids or [])
    if not gold:
        continue
    scored += 1
    cat = (q.meta or {}).get("question_type") or "?"
    per_cat[cat]["n"] += 1
    for k in KS:
        if gold & {d.id for d in docs[:k]}:
            hits[k] += 1
            per_cat[cat][k] += 1
    if i % 50 == 0:
        print(f"[query] {i}/{len(queries)}", flush=True)

lat.sort()
out = {
    "dataset": "longmemeval", "split": split,
    "questions": len(queries), "scored": scored, "documents": len(documents),
    "ingest_seconds": round(ingest_s, 1),
    "ms_per_doc": round(ingest_s / max(len(documents), 1) * 1000, 1),
    "recall": {f"@{k}": round(hits[k] / max(scored, 1), 4) for k in KS},
    "retrieval_ms": {"p50": round(lat[len(lat)//2], 1), "p95": round(lat[int(len(lat)*0.95)-1], 1)},
    "cross_unit_leaks": leaks,
    "per_category": {c: {"n": v["n"], **{f"@{k}": round(v[k]/max(v['n'],1), 4) for k in KS}} for c, v in sorted(per_cat.items())},
}
Path("outputs").mkdir(exist_ok=True)
Path("outputs/neuron_retrieval_longmemeval.json").write_text(json.dumps(out, indent=2))

print("\n=== neuron retrieval on LongMemEval-S ===")
print(f"questions scored : {scored}/{len(queries)}   documents: {len(documents)}")
for k in KS:
    print(f"recall@{k:<3}        : {hits[k]}/{scored} = {hits[k]/max(scored,1):.1%}")
print(f"retrieval        : p50 {out['retrieval_ms']['p50']}ms  p95 {out['retrieval_ms']['p95']}ms")
print(f"cross-unit leaks : {leaks}")
print("\nper category:")
print(f"  {'category':30} {'n':>4}  {'@1':>7} {'@5':>7} {'@10':>7}")
for c, v in out["per_category"].items():
    print(f"  {c:30} {v['n']:>4}  {v['@1']:>6.1%} {v['@5']:>6.1%} {v['@10']:>6.1%}")
provider.cleanup()
