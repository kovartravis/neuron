Type: task
Status: parked — retrieval tier delivered; end-to-end tier awaits billing
Blocked by: maintainer decision to fund a Gemini judge run (~$4)
Band: priority — ahead of rc2
Priority: normal (was TOP; the free half is done)

# 22 — LongMemEval Harness: a Comparable Public Number

## Question

What does neuron score on LongMemEval, reported per-category, on a setup a
sceptical reader will accept as comparable?

## Why this jumped the queue

Surfaced while grilling ticket `05`. Competing memory systems publish
LongMemEval numbers — Zep reportedly 63.8%, Mem0 49.0% (GPT-4o judge). Neuron has
a PersonaMem sanity run (80%, 16/20, 78.3 ms retrieval) and nothing on a standard
benchmark. Someone has now asked directly.

**No amount of rc2 work closes this gap**, because the gap is evidence, not
features. It is also the cheapest credibility available: the run costs cents.

## The cost is not the obstacle

A memory system's whole job is to collapse LongMemEval-S's ~115K tokens per
question into a few thousand retrieved. That makes the eval cheap — the expensive
full-context baseline is exactly what neuron does not do, and it is already
published by others.

| Component | Volume (500 q) | Est. cost (GPT-4o-mini) |
|---|---|---|
| Reader | ~1.5M tokens in | ~$0.25 |
| Judge | ~0.3M tokens in | ~$0.05 |
| **Total** | | **~$0.30** |

**The real cost is wall-clock, not money.** Ingesting 500 independent haystacks
through a local q8 `bge-small` embedder is CPU-bound. Prior art: 9.3 s to ingest
195 docs. Budget an overnight run and size a sanity tier first.

## Scope

1. **Do not build a harness from scratch.** `mem0ai/memory-benchmarks` is open and
   already implements LongMemEval ingest/query/judge; Backboard and Supermemory
   have published result repos. Fork or port the runner and implement a neuron
   adapter behind it.
2. **Find the PersonaMem harness first.** It produced the 80% / 16-of-20 numbers
   and already solves ingest, retrieval and judging — but **it is not in this
   repository** (nothing matches `personamem` anywhere in the tree). Locate it
   before rebuilding that plumbing.
3. Adapter surface: `ingest(sessions) -> void`, `retrieve(question, k) -> context`,
   backed by `NeuronMemory` directly rather than the CLI.
4. **One store per question.** LongMemEval-S is 500 *independent* haystacks; a
   shared store would leak answers between questions and silently inflate the
   score. Fresh `dbPath` per question, torn down after.
5. Reader may run on a free tier. **The judge must be GPT-4o / GPT-4o-mini** —
   published tables use it, and a non-standard judge makes the number
   incomparable, which is the entire point of running this.
6. Report **per-category**, not just the blended average: information extraction,
   multi-session reasoning, temporal reasoning, knowledge updates, abstention.
7. Sanity tier (~25 questions) before the full 500, mirroring the E2E suite's
   sanity/full split.

## Known handicaps — state them before publishing, not after

- **`bge-small-en-v1.5` at q8** (`embedder.ts:49`) is small *and* quantized.
  Competitors retrieve with larger models. This is a real disadvantage on a pure
  retrieval benchmark.
- **Abstention is a scored category and neuron has no abstention path.** It
  returns best-effort matches. Expect near-zero there, dragging the average. This
  is the strongest argument for per-category reporting — and the result should
  feed a decision on whether abstention is worth building.
- **LongMemEval is a conversational benchmark; neuron is a code/project memory
  tool.** The number measures it at something adjacent to its design.

Publishing these first is worth more than a slightly higher number.

## Deliverables

- [x] Neuron adapter against an existing LongMemEval runner
- [x] Per-question store isolation, verified (no cross-question leakage)
- [x] Sanity tier green before the full run
- [x] Full 500-question run, **retrieval tier** — per-category results
- [x] Recorded: retrieval `k`, embedder, isolation mechanism
- [x] Written summary naming the handicaps
- [ ] Full 500-question run, **end-to-end tier** — reader + judge *(parked: cost)*
- [ ] Recorded: judge model, reader model
- [ ] Decision recorded on whether abstention is worth building *(needs the
      end-to-end run — abstention is only observable when an answer is graded)*

## Progress — retrieval tier complete (2026-08-01)

The free, zero-LLM half is done and published:

| | |
|---|---|
| Report | [`docs/benchmarks/longmemeval-retrieval.md`](../../../docs/benchmarks/longmemeval-retrieval.md) |
| Harness | [`benchmarks/longmemeval/`](../../../benchmarks/longmemeval/) |
| Result | recall@1 **83.3%**, @5 **96.2%**, @10 **98.3%** (479/500 scored, 23,867 docs) |
| Leakage | **0** cross-unit documents across 500 queries |

Findings that change the map, not just this ticket:

- **Retrieval is not the bottleneck**, corroborating the PersonaMem finding
  already recorded in ticket `05`. This strengthens `05`'s ruling that `06`–`08`
  are held to strict non-regression rather than sold as improvements.
- **`temporal-reasoning` is the weakest category at scale** (78.8%@1, 96.2%@10,
  26% of the suite) — the one category still missing evidence at k=10. That is
  precisely the ground Zep/Graphiti claim.
- **`single-session-preference` is weakest overall** (66.7%@1, n=30) — the
  "remember what the user likes" case memory products are sold on.

### Corrections to this ticket's original premises

- **Harness**: used `vectorize-io/agent-memory-benchmark`, not
  `mem0ai/memory-benchmarks`. AMB has a provider interface, a declared
  `isolation_unit`, and published baselines on the same dataset.
- **Cost was understated ~12×.** The table above assumed ~3K context tokens per
  question; AMB measures `avg_context_tokens` at ~23K. A full end-to-end run is
  **~$4, not ~$0.30**.
- **Isolation is by `scope`, not one store per question.** Scope 4 asked for a
  fresh `dbPath` per question. AMB sets `user_id = question_id`, which maps to
  neuron's `scope` filter; one store with a scope predicate is far faster and was
  verified leak-free empirically rather than by construction.
- **Judge is Gemini, not GPT-4o.** AMB's judge is Gemini. Scope 5 required GPT-4o
  for comparability with published tables — but comparability now comes from
  running *the same harness* as AMB's own baselines, which is stronger than
  matching a judge model across different harnesses.

## Why the end-to-end tier is parked

The maintainer has declined to fund the Gemini run for now (2026-08-01). Nothing
is blocked on it technically — the adapter, isolation and runner all work; only
the paid judge pass is outstanding.

**Unpark condition:** enable billing on the Gemini key, then
`cd benchmarks/agent-memory-benchmark && uv run omb run --provider neuron --dataset longmemeval`.
Budget ~$4 and ~50 minutes.

Until then, published claims must stay retrieval-only. The report says so
explicitly, and the numbers above are **not** comparable to AMB's `hindsight`
94.6% or `hybrid-search` 74.0%, which are end-to-end.

## Comments

- 2026-08-01: Filed and claimed. Made top priority ahead of rc2 at the
  maintainer's direction, on the finding that rc2 is parity work while this
  closes an evidence gap competitors have already closed.
- 2026-08-01: Retrieval tier delivered and published; end-to-end tier parked on
  cost at the maintainer's direction. Priority returns to normal — the evidence
  gap that justified jumping the queue is now substantially closed, for $0.
