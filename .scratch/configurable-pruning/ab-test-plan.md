# Handoff — Ticket 23 A/B: does automatic pruning earn its place in 2.2.0?

Status: `ready-for-agent`
Owner ticket: [23 — Configurable Automatic Pruning](../neuron-2.2.0/issues/23-configurable-automatic-pruning.md)
Map: [neuron 2.2.0](../neuron-2.2.0/map.md)
Written: 2026-08-01, from the ticket `23` grilling session.

> **Read this whole document before running anything.** It is self-contained by
> design: it assumes you have no memory of the grilling session that produced
> it. Every decision below was made by the maintainer and is **not yours to
> revisit** — your job is to execute the measurement and report what it says,
> including if it says the feature should be deleted.

---

## 0. The one-paragraph version

Pruning in neuron today is a hardcoded `DELETE` against `category = 'history'`,
reachable only by typing `neuron memory prune`. Ticket `23` proposes making it
per-category, configurable and automatic. Before any of that ships, the
maintainer requires proof that pruning **improves retrieval**, because
recall-quality is the only benefit claimed for it. This document specifies two
experiments. **Experiment 1** decides *how* an entry is judged prunable
(a recoverability binary vs. a recalibrated 1–5 scale). **Experiment 2** decides
whether pruning helps at all. If Experiment 2 is null on both of its runs,
automatic pruning is **removed from 2.2.0**, not shipped disabled.

---

## 1. Verified facts (all confirmed 2026-08-01 — re-verify anything you rely on)

### The live store

Project DB path is derived in `src/index.ts:117-127` as
`envPaths('neuron').data/db/<sha256(projectRoot).slice(0,16)>.sqlite`. For
`/Users/Travis/Repos/neuron` that resolves to:

```
~/Library/Application Support/neuron/db/a8541890092e7e49.sqlite   # 2,916,352 bytes
```

`NEURON_DB_PATH` overrides it (`src/index.ts:117`) — **this is the seam that
makes the whole experiment safe.**

| Category    | imp 3 | imp 4 | imp 5 | total |
|-------------|-------|-------|-------|-------|
| `history`   | 155   | 1     | 1     | **157** |
| `learning`  | 6     | 19    | 33    | **58**  |
| `decisions` | 9     | 0     | 11    | **20**  |
| **Total**   |       |       |       | **235** |

- `history` spans **2026-07-11 → 2026-08-01** (21 days). **Nothing is currently
  prune-eligible** at the 30-day default — the earliest entries cross that line
  on **2026-08-10**.
- **98.7% of history sits at importance 3**, the default. The two exceptions are
  not meaningfully more important than the rest: the `[4]` is *"Built ticket-17:
  neuron ui dashboard — TDD'd src/ui/server.ts…"*, a routine session log.
  **Importance currently carries no signal in `history`.** This independently
  reproduces ticket `06` Pillar 10's finding, except here it is humans and
  agents failing to set the field, not the model failing to infer it.
- `learning` + `decisions` = **78 entries with genuine human-assigned spread**.
  This is the only calibration corpus in the store and nothing currently uses it.

### The hazard this ticket exists to fix

`src/index.ts:984-991`:

```sql
DELETE FROM memories
WHERE project_id = ? AND category = 'history'
  AND created_at < ? AND importance <= ?
```

Default entry importance is `3` (schema `CHECK (importance BETWEEN 1 AND 5)`,
`DEFAULT 3`). Default `maxPruneImportance` is `3`
(`src/commands/memory.ts:110-112`). The comparison is `<=`. **The defaults
collide**: every history entry written at default importance is prune-eligible.
The `CLAUDE.md` step-4 protocol command passes no `--importance`, which is why
155 of 157 entries sit at 3. A bare `neuron memory prune` after 2026-08-10
deletes essentially the entire history of this project. There is no undo.

The hardcoded `category = 'history'` is currently the **only** thing protecting
the 9 `decisions` entries sitting at importance 3 — i.e. ADRs. Making categories
configurable *removes that accidental protection*, which is why the collision
fix and the configurability must ship together or not at all.

### Relevant code

| What | Where |
|------|-------|
| Prune SQL | `src/index.ts:984-991` |
| `maintain()` — the only prune entry point | `src/index.ts:851` |
| `pruneHistory()` convenience wrapper | `src/index.ts:1115-1118` |
| `neuron memory prune` CLI | `src/commands/memory.ts:109-121` |
| `MaintenancePolicy` / `MaintenanceReport` | `src/models/maintenance.ts` |
| Importance prompt (the thing under test) | `src/components/enricher.ts:290-304` |
| `parseImportance` | `src/components/enricher.ts:306` |
| `EnrichmentModel` seam (stub here for tests) | `src/components/enricher.ts:180-183` |
| `forceFallback` — the ADR 0010 §7 A/B seam | `src/components/enricher.ts:187-188` |
| Per-category config schema | `src/config/neuronYaml.ts:19-23` (`CategoryConfigSchema`) |
| Enrichment config (`importance` defaults `off`) | `src/config/neuronYaml.ts` (`LlmEnrichmentConfigSchema`) |
| Lazy-drain precedent for the trigger | `src/index.ts:694` (`drainEnrichmentIfPending`), `:714` |
| Rejected usage-signal engine (see §7) | `src/index.ts:898-935` |
| Metric code to copy from | `benchmarks/longmemeval/retrieval_eval.py` |

### Two traps that will waste your time if you miss them

1. **`NODE_ENV=test` hard-disables the model.** `src/components/enricher.ts:232`
   returns `{ degraded: 'model_disabled' }` before any generation. Neither
   experiment can run under the unit-test harness. Run them as standalone
   scripts with `NODE_ENV` unset.
2. **`neuron exec` runs the *globally installed* binary, not your working tree.**
   This burned ticket `04` — a stale 2.1.0 install silently re-baselined a
   blueprint card. `npm link` before you trust any `neuron` invocation, or call
   the CLI through `tsx src/cli.ts`.

### The current prompt, and why it fails

`src/components/enricher.ts:290`:

```
Rate how important it is to keep a note. Reply with one digit from 1 to 5.
5 = losing it causes real damage. 3 = ordinary. 1 = losing it costs nothing.
```

with three few-shot exemplars about production database backups, variable
renames and queue consumers. Three defects: it demands an **absolute scalar on
an underspecified concept** — the hardest possible ask of a 0.5B model, which
has no anchor for "ordinary"; its exemplars are **generic**, none drawn from
neuron's own store; and it ignores the **78 real labelled entries** available
for calibration. Ticket `06` measured this as *negatively* discriminating
(mean 3.0 on data-loss entries vs 3.5 on typo fixes) and shipped it `off`.

**The finding under test here is that the model was asked badly, not that the
model cannot do it.**

---

## 2. Decisions already made — do not relitigate

1. **Purpose**: pruning is a **recall-quality** feature for history-shaped noise.
   Not disk reclamation (the DB is 2.9 MB), not ADRs.
2. **Mechanism**: hard `DELETE`. No export, no undo, no soft-delete column, no
   reuse of ticket `08`'s supersession. *Superseded* means "a newer memory
   replaced this" (lineage worth keeping); *pruned* means "routine and old".
   Same mechanism, different meanings — deliberately kept apart.
3. **Config**: per-category, **absent means never pruned**:
   ```yaml
   categories:
     history:
       defaultImportance: 2      # applied when --importance is omitted
       prune:                    # omit this block and nothing is ever deleted
         after: 30d
         maxImportance: 2
   ```
   No existing `neuron.yaml` has a `prune` block, so **no upgrade can delete
   anything**. This is the migration story: opt-in, silent, safe.
4. **Trigger**: lazily, off the back of `neuron memory query`, behind a
   `last_prune_check_at` key in `meta` with a 24h skip — one indexed lookup on
   the common path, not a count-per-read.
5. **Gate**: `age > retention AND importance <= maxImportance`.
6. **No usage gate.** Deleting by "never retrieved" was proposed and
   **explicitly rejected by the maintainer**: the rare-but-critical failure fix
   is precisely the entry that is never retrieved until the day it matters. Do
   not reintroduce this, and do not use `learning_query_matches`
   (`src/index.ts:898-935`) as a deletion signal.
7. **Ship rule**: if Experiment 2 is null on **both** runs, automatic pruning is
   **removed from 2.2.0 entirely**. The config schema and the collision fix ship
   regardless — they fix a live hazard on their own merits.

---

## 3. Experiment 1 — which judgement discriminates?

**Question.** Can a 0.5B model decide what is safe to delete, if asked a
better-posed question?

### Arms

- **A1 — recoverability binary.** Replace the scalar with a decidable yes/no:
  *could this be reconstructed from the repo, its git history, or its docs?*
  Recoverable → importance `2`. Unrecoverable → importance `4`. The criterion is
  already stated in this repo's own `CLAUDE.md` ("don't save what the repo
  already records"). Worked examples from the live store:
  - *"Implemented ticket 03-hybrid-retrieval-rrf-engine via TDD: rewrote query()
    to run FTS5 keyword search and vector search in parallel…"* → reconstructible
    from `git log`. **Recoverable → 2.**
  - *"`neuron exec` runs the global binary, so a stale 2.1.0 install silently
    re-baselined the card — `npm link` before verifying a release."* → recorded
    nowhere else. **Unrecoverable → 4.**
- **A2 — recalibrated scale.** Keep 1–5 and keep `parseImportance`, but re-shot
  the prompt with **real exemplars drawn from the 78 labelled
  `learning`/`decisions` entries**, spanning the observed grades, instead of the
  invented generic ones.

Both are prompt-and-parse changes behind the existing `EnrichmentModel`
interface (`src/components/enricher.ts:180-183`). Do not change the interface.

### Ground truth

**You label it yourself** — the maintainer delegated this explicitly and there
is no adjudication gate. In one pass over all **157 `history` entries**, record
for each: the recoverability verdict (yes/no), a 1–5 grade, and a one-line
rationale. Add **~20 `learning`/`decisions` entries as negative controls** — a
classifier that marks an ADR or a failure-fix prunable has failed, and these are
free traps.

Where an entry describes work, `git log` either contains that work or it does
not, so **a meaningful share of the recoverability labels are a lookup rather
than a judgement**. Use that: it is the most defensible part of the label set.
Be explicit in the report about which labels were verified against git and which
were judged.

Write labels to `labels.json` in this directory, and keep the rationales — they
are the audit trail for a label set with no second opinion behind it.

### Metrics and the bar

- Accuracy, precision and recall of each arm against your labels.
- **False-delete rate on the unrecoverable set** — the disqualifying metric.
- Parse-failure rate (ticket `06` saw **12 of 12** unparseable on
  instruction-only prompting; confirm few-shot holds).
- Latency per inference (ticket `06` measured ~183 ms on a resident model).

**Bar: any false-delete on an unrecoverable entry disqualifies that arm.** A
method that is 90% accurate but occasionally eats an unrecoverable failure fix
is not "worse", it is **out**. If both arms disqualify, say so plainly — that is
a legitimate result and it collapses Experiment 2, because there is no safe
judgement to prune with.

---

## 4. Experiment 2 — does pruning improve retrieval at all?

**Question.** Does deleting old routine history measurably improve what comes
back from a query?

### Two things I got wrong in the grilling — corrected here

1. **`retrieval_eval.py` is not a reusable instrument.** It imports
   `memory_bench.dataset` / `memory_bench.memory`, hardwires the `longmemeval`
   `s` split, and ingests into its own store. **Copy its metric code
   (recall@k, MRR, per-category breakdown, leak counting); do not try to point
   it at the live store.** You are writing a new runner.
2. **`query_logs` is mostly not queries.** Of 795 rows: **542 are command
   strings** captured by `neuron exec` (`git push`, `vitest run …`,
   `tsx src/cli.ts history add …`, `gh repo edit --add-topic …`), and of the 253
   remainder, 105 are ≤2 words. The genuinely semantic residue is roughly
   **100–150 terse fragments** ("bge hybrid search", "readme documentation npm").
   **None carry ground truth.** Filter with more care than a command-prefix
   regex, and report the surviving count.

### Design — paired comparison, no absolute gold needed

Because there is no gold answer set, do **not** fabricate one. Exp 2 is a
*paired* comparison of the same queries against two stores, which asks a
well-posed question without absolute ground truth:

- **Damage** — for each query, take the pre-prune top-k and mark which results
  were good answers (you label this; it is bounded by k × |queries|). Then: did
  pruning **delete** any of them? Any damage on an entry you labelled
  unrecoverable is a **hard failure**, not a metric.
- **Gain** — for the good answers that survived, did their **rank improve**?
  This is the entire claimed benefit: less noise, better position. Report
  recall@1, recall@5, MRR, and mean rank change of surviving good answers.

### Run 1 — real store, zero fabrication

1. `cp` the live DB to a scratch path. **Never open the live DB for writing.**
   Point everything at it via `NEURON_DB_PATH`.
2. Arm **B** (control): the copy, untouched.
3. Arm **A**: a second copy, importance rewritten by the Experiment 1 winner,
   then pruned at **`after: 7d`** (7 days, not 30 — the store is only 21 days
   old and nothing is 30-day eligible), `maxImportance` set to the winner's
   prunable value.
4. Run the filtered query set against both. Report the metrics above.

### Run 2 — scale probe (run regardless; the maintainer asked for both)

The store is small: 235 entries, 157 of them history. The crowding-out effect
pruning is meant to fix **may be undetectable at that size**, and under the
"parity ⇒ delete the feature" rule a false null is expensive. So:

1. Synthesise the corpus up to **~1,500 entries** to simulate roughly a year of
   logging: backdate `created_at` across 12 months and generate additional
   routine history entries in the style of the real ones. **Document exactly how
   the synthetic entries were produced** — a synthesised corpus can be built,
   unintentionally, to show whatever it is asked to show, and the report must let
   a sceptical reader audit that.
2. Re-run the identical protocol.

### Verdict rule

| Run 1 | Run 2 | Outcome |
|-------|-------|---------|
| Gain | — | **Ship** pruning as specified in §2. |
| Null | Gain | **Defer**, do not delete — pruning is a feature for stores larger than this one. Report the size at which it starts paying. |
| Null | Null | **Remove automatic pruning from 2.2.0.** Ship only the config schema and the collision fix. |
| Damage on an unrecoverable entry | — | **Hard stop.** Report and do not proceed. |

Report the numbers before interpreting them, and do not negotiate with the bar
after seeing them — it was set deliberately in advance.

---

## 5. Cleanup — required, not optional

Everything runs against throwaway paths under `NEURON_DB_PATH`. Use a single
scratch directory so teardown is one `rm -rf`, and verify after teardown that:

- the live DB `~/Library/Application Support/neuron/db/a8541890092e7e49.sqlite`
  is **byte-identical** to its pre-run state (record the size and an `md5` before
  you start — it was **2,916,352 bytes** on 2026-08-01);
- no synthesised entries reached any real store;
- no scratch DBs survive under the neuron data dir.

State in the report that cleanup was verified, and how.

---

## 6. Deliverables

Into `.scratch/configurable-pruning/`:

1. `labels.json` — 157 history + ~20 control entries, both label schemes, one-line
   rationale each, and a flag for git-verified vs. judged.
2. `results-exp1.json` + a short prose summary — per-arm accuracy, false-delete
   rate, parse-failure rate, latency, and the declared winner or a double
   disqualification.
3. `results-exp2.json` + prose — Run 1 and Run 2 separately, damage and gain
   metrics, the filtered query count, and the synthetic-corpus construction
   method.
4. `verdict.md` — the §4 table resolved, with the numbers that resolved it.
5. The runner scripts themselves, so the measurement is repeatable.

---

## 7. Explicitly rejected — do not re-propose

- **Usage-based deletion** ("never retrieved ⇒ delete"). Rejected by the
  maintainer: it punishes rarity, which is exactly the failure-fix case pruning
  must never touch. The engine at `src/index.ts:898-935` exists and works; it is
  for scope promotion only.
- **Soft-delete flag.** `memories` has 21 read sites in `src/index.ts` (~10 live
  readers) plus a separate `memories_fts` rowid copy; each is a place a missed
  filter silently leaks pruned rows into recall or hides live ones. Rejected in
  favour of hard delete.
- **Pre-delete JSONL export / restore.** Offered and declined — the maintainer
  wants hard delete with no undo.
- **Reusing ticket `08`'s supersession.** Different semantics; also `08` has not
  shipped and has not made that design yet.
- **Defaults-on with an upgrade prompt.** Opt-in only.
- **Disk reclamation as a justification.** 2.9 MB.

---

## 8. Loose ends the executing session inherits

- **Ticket `23` is `Status: claimed` and not resolved.** The decisions in §2 are
  final, but the ticket is not closed and the map's Decisions-so-far has no entry
  for it yet. Resolve it once the verdict exists.
- **Proposed split, not yet approved by the maintainer**: `23` resolves as
  decision + spec; `24` carries this A/B; `25` carries the config schema, the
  collision fix and the `neuron-memory` skill rewrite — `25` unblocked
  immediately since it ships whatever the verdict. Ticket `09` (cut rc2) would
  gain both as blockers. **Confirm with the maintainer before creating tickets.**
- **This reverses a shipped default from ticket `06`.** Enrichment ships
  `importance: off` *on the evidence that the model's judgement was noise*. A1/A2
  turn it back on for prunable categories with a better-posed question. That is
  legitimate, but **ADR 0010 must record the reversal** rather than let it drift.
- **The `neuron-memory` skill becomes the one-stop setup shop** and is where
  pruning is explained and configured. This takes a bite out of the map's fog
  patch *"Restructuring the packaged `neuron-memory` skill"*, which otherwise
  hangs on ticket `14`; the remainder stays fogged.
- **Protocol.** The executing session follows the `CLAUDE.md` memory loop:
  query first, `neuron exec --` around commands, record failure-fixes as they
  happen, and log a `history` entry plus any `decisions` entry before finishing.
