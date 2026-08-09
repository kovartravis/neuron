# Ticket 19 — findings: does neuron save tokens?

**Headline: yes, on this instrument — a 57.7% pooled token reduction, 16/16
sessions correct in both arms — but the number is a best-case upper bound, and
one of the two tasks does not reach significance on its own.**

Run: `run-swebench-ab.mjs --k=4 --effort=low --cap=2.0 --arms=injection,control`
Model: `claude-sonnet-5`, effort `low`. 16 sessions, $0.6854.
Raw data: `full-injection-low/results.json`.

## What was compared

| arm | what it models | fixture |
| --- | --- | --- |
| `control` | no neuron | no `.neuron/`, no system note |
| `injection` | **neuron as installed** | `.neuron/learning.md` on disk, protocol pointer, **and** the entries rendered into the system prompt unconditionally — mirroring `src/harnesses/payload.ts` (`formatMemoryEntry` line shape, `buildPayload` whole-entry packing, `SESSION_START_CHAR_BUDGET` = 6000). Payload was 1,903 chars. |
| `memory` | neuron as files | store on disk + pointer only; agent must choose to read it. Measured separately, partial run — see `partial-discovery-arm-low/`. |

The `memory`/`injection` split is the point. `memory` measures whether an agent
*told* a store exists decides to open it — a fact about `MEMORY_NOTE`'s wording.
Only `injection` tests the bargain the shipped product makes: pay tokens up
front on every session, save more by shortcutting exploration.

## Results

| task | arm | n | tokens (mean ± sd) | turns |
| --- | --- | --- | --- | --- |
| `matplotlib-24265` | injection | 4 | **6,933 ± 386** | 2,2,2,2 |
| `matplotlib-24265` | control | 4 | 26,076 ± 4,361 | 4,4,5,4 |
| `django-11019` | injection | 4 | **9,354 ± 4,202** | 4,2,2,2 |
| `django-11019` | control | 4 | 12,458 ± 1,504 | 4,4,3,4 |

- **`matplotlib-24265`: 73.4% reduction.** Welch t = 8.74, and the two arms are
  *completely separated* (Mann-Whitney U = 0, the minimum possible; exact
  two-sided p = 0.029 at n=4,4). Every injection session finished in exactly 2
  turns with sd 386 (CV 5.6%) — the arm is not just cheaper, it is far more
  predictable.
- **`django-11019`: 24.9% reduction, not significant** (Welch t = 1.39, U = 4).
  The injection arm's variance is driven entirely by r0 (4 turns, 15,651 tokens)
  against three 2-turn runs at ~7.2k. Control was already cheap here (12,458),
  so there was less exploration available to eliminate.
- **Pooled: 19,267 → 8,144 tokens, 57.7% reduction.** Cost: $0.4623 → $0.2232.
- **No quality cost: 16/16 sessions passed in both arms.** The token saving is
  not bought by giving worse answers, which is the failure mode that would
  invalidate the whole comparison.

Three-way on `matplotlib-24265` at low effort, including the partial discovery
run: **control 26,076 → discovery 12,552 → injection 6,933.** Discovery
captures much of the benefit but with far higher variance — its r0 spent 5 turns
and 25,160 tokens, essentially a control run, because the agent didn't consult
the store early. Unconditional injection removes that failure mode.

## The harness's own verdict line is wrong here

The scorecard printed `no-measured-difference: true`. That verdict comes from
`report.mjs`'s `summarize`, which compares the pooled token diff against a
pooled spread across tasks with different baselines — so a real, completely-
separated effect on one task gets washed out by another task's variance. The
per-task analysis above is the correct read. **This is a reporting bug in
`summarize`, inherited from ticket 10, and it is load-bearing:** ticket 10's
own headline finding was "no measured token difference," produced by this same
statistic. That finding should be re-examined against its raw `results.json`
before it is cited again.

## Caveats — what this number is NOT

1. **Best-case retrieval.** The fixture injects the exactly-right entry among
   three. Real neuron must retrieve it from a store of ~1,000 entries through a
   relevance gate. This measures the value of a *correct* recall, not the
   average value of neuron's recall. Retrieval precision is a separate,
   unmeasured multiplier on everything above.
2. **The cost side is understated.** This harness injects once, 1,903 chars
   (~475 tokens, ~2.5% of a control session). The real hook injects up to 6,000
   chars at session start *plus* 1,500 chars pre-prompt on every user turn, and
   `clearLedger` makes the whole store re-eligible after every compaction — so a
   long session's injection cost is far higher than modelled here. These tasks
   are single-user-prompt sessions, the most favourable possible shape.
3. **Underpowered against a small effect.** At n=4 and the measured CV, this
   design detects a ~50%+ effect. `django-11019`'s 24.9% is consistent with a
   real saving *and* with noise; it is not evidence of either. Detecting a 30%
   effect needs ~23 sessions per arm per task; 20% needs ~51.
4. **Two tasks, one repo pair, one effort level.** No claim about generality.

## What would sharpen it

- Re-run `django-11019` at higher k to resolve its 24.9%.
- Add an **irrelevant-memory arm**: inject entries that do *not* answer the
  task, to measure what the injection costs when it doesn't help. That is the
  other half of the bargain and is currently unmeasured.
- Model the per-turn pre-prompt injection, not just session start.
