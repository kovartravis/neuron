Type: task
Status: claimed
Blocked by: none
Band: priority — ahead of rc2
Priority: TOP

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

- [ ] Neuron adapter against an existing LongMemEval runner
- [ ] Per-question store isolation, verified (no cross-question leakage)
- [ ] Sanity tier (~25 q) green before the full run
- [ ] Full 500-question run, per-category results
- [ ] Recorded: judge model, reader model, retrieval `k`, embedder — the setup a
      reader needs to judge comparability
- [ ] Written summary naming the three handicaps above
- [ ] Decision recorded on whether abstention is worth building

## Comments

- 2026-08-01: Filed and claimed. Made top priority ahead of rc2 at the
  maintainer's direction, on the finding that rc2 is parity work while this
  closes an evidence gap competitors have already closed.
