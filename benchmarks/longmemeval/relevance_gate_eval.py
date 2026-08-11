"""Ticket 39: relevance-gate floor validation on LongMemEval. Zero LLM calls.

ADR 0012 / ticket 27 settled the gate's *shape* — a conjunction of two legs —
without choosing either quantity. Ticket 41 ships the lexical leg
(`normRrf > 0.5`, algebraically "the top hit has an FTS match") as a
structural predicate. This script measures the leg ticket 41 does *not* own:
the raw-cosine floor, plus the one claim that can sink the whole design —
the lexical leg's false-silence rate — on a corpus that is not this
project's own prose (LongMemEval: 500 questions, ~24k documents, paraphrased
conversational content with known-present gold evidence per question).

Reuses retrieval_eval.py's instrument and isolation fix (ticket 39's own
prerequisite: `scope` was removed in ticket 38, so isolation here is by
`category`, one per question — see neuron_bridge.mjs). Adds per-query capture
of the two raw legs NeuronMemory now exposes on every result (`similarity`,
`ftsMatched`), which the fused, RRF+importance `score` field hides.

Three retrieve() calls per query:
  - top-KMAX, for the control-arm recall@1/5/10 (identical measurement to
    retrieval_eval.py, so this script's own control arm cross-checks against
    the standalone published-baseline run).
  - a very large k against the SAME partition, to read the full per-query
    candidate-pool cosine distribution for Run 3's median/p90. This costs
    nothing extra: queryVector already computes similarity for every row in
    the partition regardless of k before slicing to the limit.
  - k=1 against a different, randomly chosen partition — a negative control
    guaranteed to share no gold evidence with the query.
"""
import json, sys, time, random, statistics
from pathlib import Path
from collections import defaultdict
from memory_bench.dataset import get_dataset
from memory_bench.memory import get_memory_provider

N = None if len(sys.argv) < 2 or sys.argv[1] == "all" else int(sys.argv[1])
KS = [1, 5, 10]
KMAX = max(KS)
FULL_K = 100_000  # effectively "no limit" — partitions here run tens of docs
random.seed(39)

ds = get_dataset("longmemeval")
split = "s"
queries = ds.load_queries(split, limit=N)
qids = [q.user_id for q in queries]
qid_set = set(qids)
print(f"[setup] {len(queries)} queries, loading documents…", flush=True)
documents = ds.load_documents(split, user_ids=qid_set)
print(f"[setup] {len(documents)} documents", flush=True)

provider = get_memory_provider("neuron")
store = Path("outputs/_relevance_gate_neuron")
provider.prepare(store, unit_ids=qid_set, reset=True)

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

records = []
leaks = 0
lat = []
t0 = time.time()
for i, q in enumerate(queries, 1):
    t = time.time()
    docs, meta = provider.retrieve(q.query, k=KMAX, user_id=q.user_id)
    lat.append((time.time() - t) * 1000)
    raw = (meta or {}).get("results", [])
    leaks += sum(1 for d in docs if d.user_id != q.user_id)

    gold = set(q.gold_ids or [])
    cat = (q.meta or {}).get("question_type") or "?"
    hit = {k: bool(gold & {d.id for d in docs[:k]}) for k in KS}

    r1_cosine = raw[0]["similarity"] if raw else None
    r1_fts = bool(raw[0]["ftsMatched"]) if raw else False

    full_docs, full_meta = provider.retrieve(q.query, k=FULL_K, user_id=q.user_id)
    full_raw = (full_meta or {}).get("results", [])
    pool_cosines = [d["similarity"] for d in full_raw if d.get("similarity") is not None]

    other_uid = q.user_id
    if len(qids) > 1:
        while other_uid == q.user_id:
            other_uid = qids[random.randrange(len(qids))]
    neg_docs, neg_meta = provider.retrieve(q.query, k=1, user_id=other_uid)
    neg_raw = (neg_meta or {}).get("results", [])
    neg_r1_cosine = neg_raw[0]["similarity"] if neg_raw else None
    # Ticket 17: the gate's real accept/reject decision on the same
    # cross-partition, no-evidence-guaranteed negative control Run 3 already
    # queries — not just its cosine. True here means the shipped lexical gate
    # would have let this no-evidence query through (a false accept).
    neg_r1_fts = bool(neg_raw[0]["ftsMatched"]) if neg_raw else False

    records.append({
        "qid": q.user_id, "category": cat, "has_gold": bool(gold),
        "r1_cosine": r1_cosine, "r1_fts": r1_fts, "hit": hit,
        "pool_cosines": pool_cosines, "neg_r1_cosine": neg_r1_cosine,
        "neg_r1_fts": neg_r1_fts,
        "pool_size": len(full_raw),
    })
    if i % 50 == 0:
        print(f"[query] {i}/{len(queries)}", flush=True)
provider.cleanup()
query_s = time.time() - t0
lat.sort()

scored = [r for r in records if r["has_gold"]]
n_scored = len(scored)

# --- Control arm: unconditioned baseline, must reproduce the published run ---
baseline_recall = {k: round(sum(1 for r in scored if r["hit"][k]) / max(n_scored, 1), 4) for k in KS}

# --- Run 2: lexical leg false-silence rate ------------------------------------
# Every question has gold evidence guaranteed present in the store, so any
# query whose r1 has zero FTS match is the lexical leg manufacturing silence
# over a known-present answer.
lex_fail = [r for r in records if not r["r1_fts"]]
lex_false_silence_rate = round(len(lex_fail) / max(len(records), 1), 4)

per_cat_lex = defaultdict(lambda: {"n": 0, "lex_fail": 0})
for r in records:
    per_cat_lex[r["category"]]["n"] += 1
    if not r["r1_fts"]:
        per_cat_lex[r["category"]]["lex_fail"] += 1
run2 = {
    "overall_false_silence_rate": lex_false_silence_rate,
    "lexical_fail_count": len(lex_fail),
    "total_queries": len(records),
    "per_category": {
        c: {"n": v["n"], "lex_fail": v["lex_fail"], "rate": round(v["lex_fail"] / max(v["n"], 1), 4)}
        for c, v in sorted(per_cat_lex.items())
    },
}

# --- Run 1: cosine floor, conditioned on the lexical leg ----------------------
# Population already passing the lexical leg (r1_fts == True). Sweep the
# absolute floor; report the frontier, not just a winner.
lex_pass_scored = [r for r in scored if r["r1_fts"]]
floor_values = [round(0.50 + 0.02 * i, 2) for i in range(11)]  # 0.50 -> 0.70

def eval_floor(F):
    """Cosine-conditioned-on-lexical population: reject r1_cosine < F."""
    pop = lex_pass_scored
    n = len(pop)
    rejected, kept = [], []
    for r in pop:
        (rejected if (r["r1_cosine"] is None or r["r1_cosine"] < F) else kept).append(r)
    volume_reduction = round(len(rejected) / max(n, 1), 4)
    cond_recall = {k: round(sum(1 for r in kept if r["hit"][k]) / max(n, 1), 4) for k in KS}
    cond_baseline = {k: round(sum(1 for r in pop if r["hit"][k]) / max(n, 1), 4) for k in KS}
    false_silence = sum(1 for r in rejected if r["hit"][10])
    return {
        "floor": F, "population": n, "rejected": len(rejected),
        "volume_reduction": volume_reduction,
        "recall_conditioned": cond_recall, "recall_conditioned_baseline": cond_baseline,
        "false_silence_count": false_silence,
        "false_silence_rate": round(false_silence / max(n, 1), 4),
    }

def eval_full_gate(F):
    """The shipped two-leg gate applied to ALL scored queries: reject if the
    lexical leg fails OR the cosine leg fails. This is the number that
    actually matters for a shipped default — Run 1's conditioned frontier
    isolates the cosine leg's own contribution, but this is what a user sees.
    """
    pop = scored
    n = len(pop)
    def reject(r):
        return (not r["r1_fts"]) or (r["r1_cosine"] is None) or (r["r1_cosine"] < F)
    rejected = [r for r in pop if reject(r)]
    gated_recall = {k: round(sum(1 for r in pop if not reject(r) and r["hit"][k]) / max(n, 1), 4) for k in KS}
    false_silence = {k: sum(1 for r in rejected if r["hit"][k]) for k in KS}
    return {
        "floor": F, "population": n, "rejected": len(rejected),
        "volume_reduction": round(len(rejected) / max(n, 1), 4),
        "gated_recall": gated_recall,
        "recall_regression": {k: round(baseline_recall[k] - gated_recall[k], 4) for k in KS},
        "false_silence_count": false_silence,
        "false_silence_rate_of_scored": {k: round(false_silence[k] / max(n, 1), 4) for k in KS},
    }

# --- Run 4: lexical leg false-accept rate (ticket 17) -------------------------
# Mirror of Run 2. Every negative-control query is guaranteed to share no gold
# evidence with the partition it's run against (a different, randomly chosen
# user), so any query whose neg-r1 has an FTS match is the lexical leg letting
# a no-evidence query through — the exact failure ADR 0012 opened with.
neg_accept = [r for r in records if r["neg_r1_fts"]]
gate_false_accept_rate = round(len(neg_accept) / max(len(records), 1), 4)

per_cat_accept = defaultdict(lambda: {"n": 0, "false_accept": 0})
for r in records:
    per_cat_accept[r["category"]]["n"] += 1
    if r["neg_r1_fts"]:
        per_cat_accept[r["category"]]["false_accept"] += 1
run4 = {
    "overall_false_accept_rate": gate_false_accept_rate,
    "false_accept_count": len(neg_accept),
    "total_queries": len(records),
    "per_category": {
        c: {"n": v["n"], "false_accept": v["false_accept"], "rate": round(v["false_accept"] / max(v["n"], 1), 4)}
        for c, v in sorted(per_cat_accept.items())
    },
}

run1_conditioned_frontier = [eval_floor(F) for F in floor_values]
run1_full_gate_frontier = [eval_full_gate(F) for F in floor_values]

bar_pass = [
    f for f in run1_full_gate_frontier
    if f["recall_regression"][1] == 0 and f["recall_regression"][5] == 0 and f["recall_regression"][10] == 0
    and f["volume_reduction"] > 0
    and f["false_silence_count"][10] == 0
]

# --- Run 3: cosine distribution shape -----------------------------------------
on_topic_r1 = [r["r1_cosine"] for r in records if r["r1_cosine"] is not None]
neg_r1 = [r["neg_r1_cosine"] for r in records if r["neg_r1_cosine"] is not None]
all_pool = [c for r in records for c in r["pool_cosines"]]

def pctl(data, p):
    if not data:
        return None
    s = sorted(data)
    idx = min(int(len(s) * p), len(s) - 1)
    return round(s[idx], 4)

run3 = {
    "on_topic_r1": {
        "n": len(on_topic_r1), "mean": round(statistics.mean(on_topic_r1), 4) if on_topic_r1 else None,
        "median": pctl(on_topic_r1, 0.5), "p10": pctl(on_topic_r1, 0.10), "p90": pctl(on_topic_r1, 0.90),
        "min": round(min(on_topic_r1), 4) if on_topic_r1 else None, "max": round(max(on_topic_r1), 4) if on_topic_r1 else None,
    },
    "negative_control_r1": {
        "n": len(neg_r1), "mean": round(statistics.mean(neg_r1), 4) if neg_r1 else None,
        "median": pctl(neg_r1, 0.5), "p10": pctl(neg_r1, 0.10), "p90": pctl(neg_r1, 0.90),
        "min": round(min(neg_r1), 4) if neg_r1 else None, "max": round(max(neg_r1), 4) if neg_r1 else None,
    },
    "store_pool": {
        "n": len(all_pool), "median": pctl(all_pool, 0.5), "p90": pctl(all_pool, 0.90),
    },
}

out = {
    "dataset": "longmemeval", "split": split,
    "questions": len(queries), "scored": n_scored, "documents": len(documents),
    "ingest_seconds": round(ingest_s, 1),
    "control_arm_recall": baseline_recall,
    "retrieval_ms": {"p50": round(lat[len(lat)//2], 1), "p95": round(lat[int(len(lat)*0.95)-1], 1)} if lat else None,
    "cross_unit_leaks": leaks,
    "run2_lexical_false_silence": run2,
    "run4_lexical_false_accept": run4,
    "run1_conditioned_frontier": run1_conditioned_frontier,
    "run1_full_gate_frontier": run1_full_gate_frontier,
    "run1_bar_passing_floors": [f["floor"] for f in bar_pass],
    "run3_cosine_distribution": run3,
}
Path("outputs").mkdir(exist_ok=True)
Path("outputs/relevance_gate_longmemeval.json").write_text(json.dumps(out, indent=2))

print("\n=== ticket 39: relevance gate floor validation on LongMemEval-S ===")
print(f"questions scored : {n_scored}/{len(queries)}   documents: {len(documents)}   cross-unit leaks: {leaks}")
print(f"control-arm recall (unconditioned, matches retrieval_eval.py): "
      f"@1 {baseline_recall[1]:.1%}  @5 {baseline_recall[5]:.1%}  @10 {baseline_recall[10]:.1%}")
if lat:
    print(f"retrieval (top-k call): p50 {out['retrieval_ms']['p50']}ms  p95 {out['retrieval_ms']['p95']}ms")

print(f"\n--- Run 2: lexical leg false-silence rate ---")
print(f"overall: {run2['lexical_fail_count']}/{run2['total_queries']} = {run2['overall_false_silence_rate']:.2%}")
print(f"{'category':30} {'n':>5} {'lex_fail':>9} {'rate':>7}")
for c, v in run2["per_category"].items():
    print(f"{c:30} {v['n']:>5} {v['lex_fail']:>9} {v['rate']:>6.1%}")

print(f"\n--- Run 4: lexical leg false-accept rate (cross-partition negative control) ---")
print(f"overall: {run4['false_accept_count']}/{run4['total_queries']} = {run4['overall_false_accept_rate']:.2%}")
print(f"{'category':30} {'n':>5} {'false_accept':>13} {'rate':>7}")
for c, v in run4["per_category"].items():
    print(f"{c:30} {v['n']:>5} {v['false_accept']:>13} {v['rate']:>6.1%}")

print(f"\n--- Run 1: cosine floor sweep, conditioned on lexical leg (population={len(lex_pass_scored)}) ---")
print(f"{'floor':>6} {'rejected':>9} {'vol_reduc':>10} {'recall@1':>9} {'recall@5':>9} {'recall@10':>10} {'false_sil':>10}")
for f in run1_conditioned_frontier:
    print(f"{f['floor']:>6.2f} {f['rejected']:>9} {f['volume_reduction']:>9.1%} "
          f"{f['recall_conditioned'][1]:>8.1%} {f['recall_conditioned'][5]:>8.1%} {f['recall_conditioned'][10]:>9.1%} "
          f"{f['false_silence_count']:>10}")

print(f"\n--- Run 1: FULL two-leg gate applied to all {n_scored} scored queries (bar evaluation) ---")
print(f"{'floor':>6} {'rejected':>9} {'vol_reduc':>10} {'regress@1':>10} {'regress@5':>10} {'regress@10':>11} {'false_sil@10':>13} {'PASSES BAR':>11}")
for f in run1_full_gate_frontier:
    passes = f["floor"] in out["run1_bar_passing_floors"]
    print(f"{f['floor']:>6.2f} {f['rejected']:>9} {f['volume_reduction']:>9.1%} "
          f"{f['recall_regression'][1]:>9.1%} {f['recall_regression'][5]:>9.1%} {f['recall_regression'][10]:>10.1%} "
          f"{f['false_silence_count'][10]:>13} {'YES' if passes else 'no':>11}")

print(f"\nfloors passing all 3 bar conditions: {out['run1_bar_passing_floors'] or 'NONE — ship no floor'}")

print(f"\n--- Run 3: cosine distribution shape ---")
for label, d in [("on-topic r1", run3["on_topic_r1"]), ("negative-control r1", run3["negative_control_r1"])]:
    print(f"{label:22} n={d['n']:<5} mean={d['mean']} median={d['median']} p10={d['p10']} p90={d['p90']} min={d['min']} max={d['max']}")
print(f"{'store pool (all)':22} n={run3['store_pool']['n']:<5} median={run3['store_pool']['median']} p90={run3['store_pool']['p90']}")
