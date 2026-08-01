Type: grilling
Status: unclaimed
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

- [ ] ADR recording the latency budget, failure-mode policy, and override semantics
- [ ] A written pass/fail bar per job that tickets `06`–`08` are held to
- [ ] Decision on which E2E pillar gains coverage for each job

## Comments

- 2026-07-31: Filed while charting. This is a decision ticket, not a build
  ticket — resolve it with `/grilling` before writing code in `06`–`08`.
