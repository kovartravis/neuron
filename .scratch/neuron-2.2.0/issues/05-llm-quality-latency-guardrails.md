Type: grilling
Status: resolved
Blocked by: 04
Band: 2.2.0-rc2

# 05 — LLM Job Quality & Latency Guardrails

## Question

What is a 0.5B model allowed to be wrong about, and how wrong, before each of its
three new jobs does more harm than good?

## Why this comes first in the band

Tickets `06`, `07` and `08` each hand a new job to `Xenova/Qwen1.5-0.5B-Chat`.
Today the model has exactly one job — code summarization during `neuron scan` —
on a batch path, with `max_new_tokens: 60` and aggressive content-hash caching to
`scan_summaries.json`. Latency of ~1.57s/file is tolerable there because a scan
is a deliberate, occasional command.

The three new jobs do not share that shape:

- **Write-side enrichment** (`06`) runs on every `neuron memory add`.
- **Query expansion** (`07`) runs on the **interactive** path, in front of every
  recall — and after rc3 that means every turn.
- **Consolidation dedupe** (`08`) is batch, but it *destroys data* by merging.

Each fails differently, and shipping three jobs without deciding their failure
budgets first means discovering the budgets in production.

## Decisions this ticket must resolve

1. **Latency budget for the interactive path.** ~1.5s in front of every recall is
   a real tax. What is the ceiling, and what happens when it is exceeded —
   timeout and fall through to the raw query, or block?
2. **Failure mode per job.** When the model is unavailable, slow, or returns
   garbage, does each job degrade to today's behaviour or fail loudly? The
   summarizer already has a heuristic fallback (`generateFallbackSummary`) — is
   that the pattern for all three?
3. **Enrichment override semantics.** If the agent passes `--tags` explicitly,
   does the model add to them, or stay out of the way entirely?
4. **How wrong is a wrong tag?** Tags feed the FTS index. A bad tag degrades
   keyword recall for every future query. Is there a confidence floor, a
   controlled vocabulary drawn from existing tags, or free generation?
5. **Consolidation destructiveness.** Merging is irreversible against the store.
   Does it require confirmation, write an audit trail, or stay reversible?
6. **Measurement.** Which of the 6 E2E pillars covers these, and what regression
   would we actually notice? Pillar 2 (Adversarial Semantic Recall) is the
   natural home for `07`.

## Constraint worth weighing

Your PersonaMem sanity run recorded retrieval as **100% successful with 28k tokens
retrieved**, with failures caused by the *large* model over-reasoning on that
context. That is evidence retrieval is not the weak link — which argues for
holding these jobs to a strict "must not make recall worse" bar rather than a
"might make it better" one.

## Deliverables

- [x] ADR recording the latency budget, failure-mode policy, and override semantics
- [x] A written pass/fail bar per job that tickets `06`–`08` are held to
- [x] Decision on which E2E pillar gains coverage for each job

## Answer

Recorded as [ADR 0010](../../../docs/adr/0010-llm-job-guardrails.md). Seven
decisions, taken in a grilling session.

1. **Expansion is salvage, not preprocessing.** It does not run in front of every
   recall; it fires only when retrieval returns nothing or nothing close enough.
   Zero cost on the happy path.
2. **"Weak" is raw cosine, not `score`.** `score` is rank-based — a doc ranked #1
   in both lists gets `normRrf = 1.0` regardless of distance, so the top hit of a
   nonsense query still scores ≥ 0.75. It provably cannot separate a good match
   from the best of a bad set, which also makes the existing `minScore: 0.35`
   default far weaker than it looks. The trigger uses the raw `similarity`
   already computed in `src/index.ts` and currently thrown away. **The floor is
   calibrated against Pillar 2's corpus, not guessed.**
3. **Silent degrade + a timeout + counters in `neuron status`.** No timeout
   primitive exists anywhere in the codebase today — a hung `generate()` hangs
   its caller forever.
4. **Auto-tagging is closed-vocabulary; the model cannot mint a tag.** This
   repo's own store is 224 entries / 191 distinct tags / **98 singletons** —
   free generation would accelerate that. Also gives `categories.*.tags`, declared
   in config and read by nothing, an actual job.
5. **Explicit input wins per-field**; the model fills only unset fields.
6. **Dedupe detects and selects, never writes.** No generated content enters the
   store, so the worst case is a wrong survivor, not an invented memory.
   Non-selected duplicates are marked superseded, not deleted.
7. **Strict non-regression, A/B against job-disabled.** Neutral passes, worse
   blocks. `06` → Pillar 7, `07` → Pillar 2, `08` → Pillar 7's existing
   `supersededViolations`.

### Correction to the ticket's premise

The ticket states consolidation "destroys data by merging". It does not —
`maintain({ consolidate: true })` is **read-only today**: it reads history rows
past a watermark, advances the watermark, and returns them. `prune` is the
destructive command. Ticket `08` would *introduce* destructiveness, which is why
decision 6 bounds it to a reversible flag.

### Strategic note recorded during the session

These three jobs are **parity features, not differentiators**. Automatic memory
extraction is Mem0's headline feature; temporal supersession is Zep/Graphiti's.
Both do it with frontier models against a 0.5B local one. The chosen
non-regression bar reflects that honestly.

The differentiator is deterministic hook-based recall (rc3/rc4) — every
competitor surveyed is agent-invoked, which the map's charting already identified
as the core reliability failure. **A separate evidence gap was identified and is
now top priority: no standard benchmark number exists for neuron.** Filed as
ticket `22`.

## Comments

- 2026-07-31: Filed while charting. This is a decision ticket, not a build
  ticket — resolve it with `/grilling` before writing code in `06`–`08`.
