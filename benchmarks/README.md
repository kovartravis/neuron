# Neuron benchmarks

Three tiers, three different questions. Each protects the one below it from
wasting time.

| Command | Question | Runtime |
|---|---|---|
| `npm test` | Does the code do what it claims? | ~5s |
| `npm run test:e2e` | Does the real pipeline still work end to end? | minutes (sanity tier) |
| `npm run bench` | Where does neuron actually break? | long (full tier) |

Supporting commands:

```bash
npm run bench:report   # re-render the scorecard + dashboard from existing artifacts
npm run bench:view     # regenerate the dashboard and open it in a browser
```

## Real pipeline, not a stub

Both benchmark tiers override `NODE_ENV` and clear `NEURON_MOCK_EMBEDDER`.

This matters more than it looks. Vitest sets `NODE_ENV=test`, and
`summarizer.preloadModel()` / `summarizer.summarizeFile()` both short-circuit on
that value. A suite left under the default benchmarks a string-heuristic
fallback rather than the product — the original revision cleared its SLA targets
by roughly 40x and finished in ~7 seconds because no ONNX model ever loaded.
**Pillar 6 exists solely to keep that from coming back**: it asserts the embedder
returns non-zero vectors and that the summarizer's LLM path actually executes.

Consequence: these suites need the ONNX models present, and runtime is dominated
by uncached LLM summarization (~1.57s/file on the reference machine). A cold
summarizer cache makes the first run much slower than later ones.

## Tiers

Workload is scaled by `NEURON_BENCH_TIER` (see `test/e2e/tier.ts`), which is the
single place iteration counts, corpus sizes, and worker counts are defined.

- **sanity** — every pillar runs end to end at the smallest workload that can
  still fail meaningfully. This is the pre-merge gate.
- **full** — large corpora, deep scale sweeps, more processes, more repeats.
  This is the run you read numbers off.

## Pillars

| # | Pillar | What it would catch |
|---|---|---|
| 1 | Polyglot AST Traversal at Scale | a language silently dropped from traversal |
| 2 | Semantic Recall & Distractor Resistance | gross retrieval regression (saturated — see below) |
| 3 | High-Concurrency Multi-Agent Stress | in-process async races |
| 4 | Architectural Drift Detection & Latency SLA | phantom drift, missed drift buckets |
| 5 | Storage Corruption & Self-Healing | crashes on malformed markdown |
| 6 | Real Pipeline Integrity | the pipeline being stubbed out |
| 7 | Adversarial Retrieval Quality | genuine retrieval weaknesses |
| 8 | Multi-Process Contention & Crash Recovery | lost writes, lock handling, WAL recovery |
| 9 | Retrieval Scale Curve | latency degrading superlinearly with corpus size |

**Pillar 2 is deliberately saturated** (recall@1 = 1.0). Its distractors are only
lexically noisy, which hybrid search separates trivially. It is a regression
tripwire, not a quality measure — Pillar 7 is the metric with headroom.

## Pillar 7 — adversarial retrieval

Four adversary families, in `test/e2e/adversarial-corpus.ts`:

- **lexical-decoy** — the wrong answer shares *more* query keywords than the right one
- **paraphrase** — topically identical neighbours that answer a different question
- **contradiction** — an outdated memory superseded by a newer one; the newer must win
- **multi-hop** — the query names none of the gold's salient terms

Scores are tracked per family, so a regression points at *which* retrieval
behaviour broke. Thresholds are loose on purpose: this pillar earns its keep as
a tracked number, not a pass/fail gate.

## Pillar 8 — multi-process contention

Spawns real OS processes (`test/e2e/workers/contention-worker.mjs`) against one
SQLite file. The earlier in-process `Promise.all` version shared a single
connection and one WAL writer, so it could never produce cross-process
contention — its "0 failures" said nothing about multi-agent safety.

Assertions are ordered by severity:

1. **silent data loss** — a write `transact()` confirmed must be readable later
2. **init crashes** — opening the shared DB concurrently must not throw
3. **non-lock errors**
4. **dropped writes** — surfaced `SQLITE_BUSY` is tracked as a quality metric

Note the worker reports the exact ids it committed. Counting alone is wrong:
lock failures leave gaps, so committed ids are sparse and cannot be
reconstructed from a total.

## Known findings

Two real defects this suite surfaced, both currently unfixed:

1. **Writes rejected under contention.** Every `db.transaction()` in
   `src/index.ts` is deferred. Under WAL, a deferred transaction that upgrades to
   write after another process has written returns `SQLITE_BUSY_SNAPSHOT`
   *immediately* — `busy_timeout` does not apply to that case. Measured ~8% of
   writes rejected with 3 processes. Fix direction: `.immediate()` transactions
   plus a bounded retry.

2. **Schema migration race on concurrent first-open.** `initialize()` reads
   `user_version` at `src/index.ts:140`, outside any transaction, then runs
   migrations based on that read. Two processes opening a fresh database can both
   enter the same migration; the v4 step then does `SELECT ... FROM learnings`
   after the other process already dropped it, producing
   `SqliteError: no such table: learnings`. Intermittent — it did not reproduce
   in 24 isolated launches but does appear in full runs.

No silent data loss was observed, and SIGKILL mid-write recovery passes: the
store stays readable and writable, and committed data survives.

## Artifacts

Written to `benchmarks/reports/`:

- `index.html` — the dashboard (`npm run bench:view`)
- `e2e-benchmark-scorecard.json` — per-pillar status + metrics
- `history.json` — one compact row per run, for movement over time
- `*-metrics.json` — raw per-suite measurements

Pillar status comes from vitest's JSON reporter merged with the metrics files the
suites write. It is never inferred from stdout — the original runner used
`!output.includes(name) || overallPassed`, which reported a pillar as PASSED
exactly when it had *not* run.
