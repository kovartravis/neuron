Status: ready-for-agent
Ticket: [06 — Write-Side Enrichment](../neuron-2.2.0/issues/06-write-side-enrichment.md)
Band: 2.2.0-rc2
ADRs: [0010 — Guardrails for the 0.5B Model's New Jobs](../../docs/adr/0010-llm-job-guardrails.md)

# Write-Side Enrichment: Auto Tags, Importance, Category

## Problem Statement

Every write to the memory store obliges the agent to supply three pieces of
metadata by hand:

```
neuron memory add --category learning "..." --tags failure-fix,<topic> --importance 4
```

Three things to get right, on every write, forever. In practice they are not got
right. Tags are agent-authored free text, so near-synonyms accumulate unchecked:
this repository's own store holds 224 entries across **191 distinct tags, 98 of
them used exactly once**. Half the vocabulary is singletons.

That is not a cosmetic problem. Tags and content are what the full-text index
covers, so a fragmented tag vocabulary is fragmented keyword recall — an entry
tagged `treesitter` is invisible to a query that says `tree-sitter`. The write
side is therefore a recall-quality lever, and it is currently pulled by whichever
agent happened to be writing at the time.

Importance suffers a quieter version of the same problem. The `CLAUDE.md`
protocol's history command passes no `--importance` at all, so every history
entry this project has ever written sits at the default of `3` — and the prune
command deletes history at `importance <= 3` by default. The field that decides
what gets deleted is, in practice, never set deliberately.

## Solution

`neuron memory add` infers the metadata the caller did not supply. Tags,
importance and category each become optional; anything passed explicitly is
honoured untouched.

The three fields are inferred by different machinery, chosen by what each field
actually is:

- **Tags** are selected, not generated. The store already holds an embedding for
  every entry, so each candidate tag has a **centroid** — the mean embedding of
  the entries carrying it. Tagging is then a nearest-neighbour lookup against a
  closed vocabulary, using the embedder that is already loaded on the write path.
  It is deterministic, costs about a millisecond per tag, and is structurally
  incapable of inventing a tag.
- **Category** is inferred by the local Qwen1.5-0.5B model, which can read the
  category `description` fields as instructions rather than merely as similarity
  targets. A centroid-cosine strategy ships alongside it and the two are
  A/B tested; whichever wins on evidence becomes the default.
- **Importance** is inferred by the model, unclamped, and **measured rather than
  constrained** — a new benchmark pillar reports what it actually assigns and,
  critically, what a prune would then delete.

Because loading the 0.5B model costs ~3.2 seconds per process while the embedder
costs ~180ms, the design keeps the model off the write path wherever possible.
Tags are free and immediate. Importance defers to a backlog. Only an omitted
`--category` forces a synchronous model load, so the cost is opt-in: pass the
flag and the write stays as fast as it is today.

Deferred work drains on the next memory command whenever the backlog is
non-empty, so **any query always sees fully enriched data** — an entry is never
left under-tagged, and therefore under-findable, for an unbounded window.

## User Stories

1. As an agent recording a failure fix, I want to omit `--tags`, so that I stop
   inventing near-synonyms that fragment the index.
2. As an agent recording a failure fix, I want the tags I do pass explicitly to
   be preserved exactly, so that my deliberate intent is never second-guessed.
3. As an agent following the operating protocol, I want to keep passing
   `--category` and omit only the other two flags, so that my writes stay
   instantaneous while still being enriched.
4. As a human adding a memory ad hoc, I want to omit all three flags, so that I
   can record something without first learning the project's category taxonomy.
5. As a human adding a memory ad hoc, I want to be told clearly when the model
   could not infer a category, so that I know to pass the flag rather than
   wondering where my entry went.
6. As a maintainer, I want inferred tags drawn only from tags already in use, so
   that enrichment converges the vocabulary instead of widening it.
7. As a maintainer, I want the tags declared in my project config to always be
   eligible for selection, so that intentional vocabulary is never crowded out by
   frequency statistics.
8. As a maintainer, I want tags used only once or twice to be excluded from the
   vocabulary, so that a tag with no established meaning is not propagated.
9. As a maintainer, I want to search for an entry by a tag I never typed and
   still find it, so that inference has demonstrably improved retrieval.
10. As a maintainer, I want inferred metadata to never make recall worse than
    hand-authored metadata, so that the feature is safe to leave on.
11. As a maintainer, I want to turn enrichment off entirely in config, so that I
    can run the A/B comparison that proves the previous point.
12. As a maintainer, I want to turn off inference for one field while keeping the
    others, so that I can adopt the parts I trust.
13. As a maintainer, I want to configure a literal fallback category, so that an
    omitted `--category` never errors on my machine.
14. As a maintainer, I want to leave that fallback unset and get a hard error
    instead, so that an entry is never silently filed into the wrong category.
15. As a maintainer, I want category inference restricted to the categories I
    declared, so that the model can never invent one.
16. As a maintainer, I want an entry's category to be settled before it is
    written, so that no row ever exists in a provisional or unfiled state.
17. As a user of the memory store, I want my next query to reflect all pending
    enrichment, so that retrieval quality never depends on how recently I wrote.
18. As a user of the memory store, I want enrichment to drain completely rather
    than partially, so that results are consistent rather than varying with
    backlog size.
19. As a user of the memory store, I want enrichment to run automatically, so
    that I never have to remember a maintenance command.
20. As a user with architecture scanning disabled, I want enrichment to keep
    working, so that an unrelated config switch does not silently disable it.
21. As a user whose codebase is being scanned anyway, I want enrichment to reuse
    that already-loaded model, so that I do not pay for the same load twice.
22. As a user in a documentation-only session, I want memories written without
    any code change to still be enriched, so that enrichment does not depend on
    code churn.
23. As a user, I want an explicit command to drain the backlog on demand, so that
    I can control when the cost is paid.
24. As a user, I want my write to stay fast when I pass `--category`, so that
    adopting enrichment costs me nothing.
25. As a user, I want to understand before I opt in that omitting `--category`
    costs a few seconds, so that the latency is a choice rather than a surprise.
26. As a maintainer, I want a synchronous inference call to be bounded by a
    timeout, so that a hung model cannot hang my shell indefinitely.
27. As a maintainer, I want degraded inference to be counted and surfaced in
    status output, so that a quietly broken model does not go unnoticed for
    months.
28. As a maintainer, I want enrichment to degrade rather than crash when the
    model is unavailable, so that the write path keeps working.
29. As a maintainer, I want to know how the model actually distributes importance
    across a corpus, so that I can see whether it is discriminating or just
    emitting the default.
30. As a maintainer, I want to know whether the model gives the same entry the
    same importance across runs, so that I can judge whether the value is stable
    enough to act on.
31. As a maintainer, I want to see exactly which entries a prune would delete at
    each threshold, so that the consequence of inferred importance is visible
    before it is destructive.
32. As a maintainer, I want a hard guarantee that a known-critical entry is never
    marked prune-eligible, so that inference cannot cause data loss.
33. As a maintainer, I want the two category strategies compared on the same
    corpus, so that the choice between them is made on evidence.
34. As a maintainer, I want the benchmark to run against the real model rather
    than a stub, so that the numbers describe what ships.
35. As an agent reading the operating manual, I want the flags shown as optional,
    so that the documentation matches the behaviour.
36. As a user configuring the project, I want the memory skill to explain the
    enrichment trade-offs, so that I can choose a posture rather than guess.
37. As a user configuring the project, I want the skill to also advise what my
    agent instructions should say about the three flags, so that my config and my
    protocol block do not contradict each other.
38. As a user configuring the project, I want the skill to recommend a default
    posture, so that I am not obliged to reason through the latency trade-off
    myself.
39. As a maintainer, I want the vocabulary recomputed fresh on each run, so that
    a tag minted a moment ago is immediately available for selection.
40. As a maintainer, I want no unbounded cache file accumulating one entry per
    memory ever written, so that the write path does not degrade over time.

## Implementation Decisions

### Configuration

A new `llm` namespace is added to the project config. Only the `enrichment`
sub-key is populated by this work; the two sibling jobs in this release band fill
their own sub-keys when they are specified, so the container shape is settled
once rather than three times.

```yaml
llm:
  enrichment:
    enabled: true          # master toggle; false is the A/B control arm
    category: infer        # infer | <declared-category-name> | off
    tags: infer            # infer | off
    importance: infer      # infer | off
```

`enabled` and the per-field keys are deliberately separate. `enabled: false` is a
measurement arm that disables the whole job; `category: off` is a standing user
preference that leaves the other fields inferring. Collapsing them would make an
A/B run indistinguishable from a preference change.

A literal category name in the `category` key is the configured fallback for the
case where inference cannot produce an answer. Left as `infer`, that case is a
hard error instead.

Validation follows the existing pattern used for pull-rule category references: a
literal category named in `llm.enrichment.category` must be one of the declared
categories, and is rejected at config-load time if it is not.

### The `--category` contract

`--category` becomes optional for `add` only. It remains required for `delete`
and `update`, where it selects an existing entry and inference would be
meaningless.

Category is a non-nullable column that determines storage routing, so no entry
can be written without one. Category inference is therefore the one part of
enrichment that cannot be deferred, and it runs synchronously when the flag is
omitted.

When inference cannot produce a valid declared category — the model is cold, the
timeout fires, the model is disabled, or the output does not name a declared
category — the command fails with an error that names the cause, unless a literal
fallback is configured. It never guesses and never invents a category.

### Tag selection

Tags are chosen by nearest-neighbour lookup, not generated.

- **Vocabulary**: every tag declared in the project config, plus every store tag
  carried by at least three entries. The floor is a requirement of the method
  rather than a tuning knob — a tag on a single entry has a centroid identical to
  that entry, which is degenerate.
- **Representation**: a tag's vector is the centroid of the embeddings of the
  entries carrying it, computed from embeddings already stored. Tag *strings* are
  not embedded; short labels embed poorly and would ignore how the tag is
  actually used in this store.
- **Selection**: top-K by cosine against the entry's embedding, subject to a
  similarity floor so that a weakly-related entry receives few tags or none.
- **Cost**: the embedder is already loaded on the write path, so this is
  effectively free and runs synchronously for every write.

The vocabulary is computed per process and never persisted. Each command
invocation is its own process, so a per-process computation is always fresh —
which matters more than speed here, because a tag minted by an explicit write
must be selectable by the very next write.

### Importance

Inferred by the model on the 1–5 scale, **unclamped**. The alternative — flooring
inference at the default so it can never increase prune eligibility — was
considered and rejected in favour of measuring the model's actual behaviour
first. The prune-safety assertion in the benchmark is what guards data loss in
the interim.

Importance is inferred in the same model call as category whenever category is
being inferred, since an already-loaded model makes the extra inference nearly
free. When category was supplied explicitly and only importance is missing,
importance defers to the backlog rather than justifying a model load on its own.

### Deferral and the backlog

Entries carry an enrichment timestamp, absent until enrichment has completed.
This is a schema addition, in the same class as the supersession column the
sibling consolidation work introduces.

The backlog drains on the next memory command whenever it is non-empty, and the
drain is **unbounded** — it completes rather than working to a budget. A bounded
drain would make retrieval quality depend on how much had been written recently,
which is the kind of invisible variance the release's non-regression bar exists
to eliminate. The guard is a single count of unenriched entries, cheap enough to
run on every command in the same spirit as the existing stat-only fingerprint
guard on the drift rescan.

The drain also rides the drift-triggered rescan when that fires, since the model
is already warm in that process and the marginal cost is one inference per entry.
It is **not gated on** the scan being enabled, and it triggers independently: the
rescan is driven by source-file change, while the backlog is created by memory
writes, and coupling the two would mean a documentation-only session never
enriches while a refactor with no new memories drains an empty backlog.

An explicit drain command is exposed, primarily so the benchmark can drive
enrichment deterministically.

### Failure handling

The synchronous category call is bounded by a timeout — a primitive that does not
exist in the codebase today, where the only timeout is the database's busy
timeout and a hung generation hangs its caller forever. The suggested value is
generous (on the order of fifteen seconds) because the measured cold load is
already over three seconds on fast hardware and the degrade is a hard error
rather than a silent fallback.

Every degradation increments a counter surfaced by the status command. Silent
degradation without counters is how a broken local model goes unnoticed for
months.

### Documentation

The operating manual is updated to show the three flags as optional, and the
packaged memory-management skill gains an enrichment section covering **both**
the config keys and the agent-instruction posture — choosing one without the
other produces a store that silently does not enrich.

The skill presents three postures and their measured costs:

| Posture | Write latency | Failure risk | Vocabulary |
|---|---|---|---|
| Agent passes all three flags | none | none | fragmented |
| Agent omits all three | ~3.5s per write | hard error when model unavailable | converged |
| Agent passes category, omits tags and importance | none | none | converged |

The third is recommended as the default, and the skill explains why it is not a
compromise: category is the only field whose omission triggers a model load and
the only one that can hard-error, while tags are free and importance defers. The
second posture is recommended for human and ad-hoc use, where seconds are
invisible and a readable error is preferable to a taxonomy lesson. The skill
notes the two can coexist, since posture is protocol wording rather than config.

## Testing Decisions

A good test here asserts on **what ends up in the store and what comes back from
a query** — never on how a tag was chosen. The category strategy in particular is
being compared precisely because its winner is unknown, so tests that pin the
mechanism would have to be rewritten by the experiment they exist to support.

Five seams, four of them already established:

1. **The transaction entry point** — the single seam for enrichment. Every write
   routes through it, including the convenience helpers and the CLI, so
   enrichment placed here is exercised once: write an entry, read the stored row,
   assert on the metadata. Per-field precedence (explicit input wins, unset
   fields are filled) is tested entirely here. An injected enricher with a
   fallback flag mirrors the summarizer's existing force-fallback option, which
   the governing ADR already names as the A/B mechanism.
2. **The query entry point** — the backlog drain. Write an entry that leaves
   fields unset, query, and assert the returned entry is enriched. This asserts
   the user-visible guarantee directly rather than testing the drain's internals.
3. **Config validation** — the new schema, its defaults, and rejection of a
   literal fallback category that is not declared. Prior art is the existing
   pull-rule category cross-reference validation, which is tested the same way.
4. **The memory command handler** — only the CLI contract change: omitting
   `--category` on `add` succeeds, while omitting it on `delete` and `update`
   still fails. Prior art is the existing command handler test file.
5. **A new benchmark pillar** (new file, conventional shape) — registered in the
   benchmark runner's suite list and setting the environment to production so the
   real model runs, following the two existing pillars that already do exactly
   this. It carries:
   - **Discrimination** against a polarized corpus whose entries are unambiguous
     at both ends, so the corpus design supplies the labels.
   - **Stability** — the same entry across repeated runs.
   - **Distribution** across 1–5, catching the most likely small-model failure:
     collapsing every entry onto the default and calling it inference.
   - **Prune preview** — the exact delete set at each threshold.
   - **The category A/B** — both strategies on one corpus.

   Its one hard assertion: **no entry from the known-critical set may ever appear
   in the delete set at the default prune threshold.** False negatives are the
   destructive direction, so that is the pass/fail bar.

Explicitly **not** given their own seams: the centroid computation, the prompt
builder, and the vocabulary resolver. All are reachable through the transaction
seam, and testing them directly would pin implementation this work expects to
churn.

The whole job is also held to the release's standing bar: the adversarial
retrieval pillar must be **no worse** with enrichment enabled than disabled.
Neutral passes; worse blocks. The master config toggle is what makes both arms
runnable.

## Out of Scope

- **Redesigning pruning.** Pruning is hardcoded to the history category, from
  before categories were configurable, so a project that declares its own
  categories can neither prune them nor stop pruning history. Making pruning
  automatic and configurable per category is spun out to its own ticket. It does
  not block this work, which owns its own trigger.
- **Clamping inferred importance.** Considered — flooring inference at the
  default so it could never increase prune eligibility — and set aside in favour
  of measuring first. Revisit if the benchmark shows the model marking critical
  entries prune-eligible.
- **A hand-labelled calibration tier** for importance. Discrimination, stability
  and prune safety are what protect data; whether a "4" is objectively a 4 costs
  a human labelling session, is the tier most likely to go stale, and is least
  actionable while the thresholds themselves are being redesigned.
- **Content-hash caching of inference results.** Dropped as inherited from a job
  with the opposite shape: the summarizer re-reads the same files every scan,
  while memory content is authored fresh on every write, so the hit rate
  approaches zero while the costs — an unbounded cache file, rewritten in full on
  every write — land on the interactive path.
- **A model daemon or warm process.** The correct fix for a per-process model
  load, and far too large for this release band.
- **Query-side salvage expansion and consolidation dedupe.** The sibling jobs in
  this band, specified by their own tickets.

## Further Notes

Measured on the maintainer's machine, warm disk cache, models already downloaded:

| | Cold load | Per item |
|---|---|---|
| Qwen1.5-0.5B (q4) | 3205ms | ~183ms |
| bge-small-en-v1.5 (q8) | 177ms | ~4ms |

The 18× load gap and the fact that the embedder is *already loaded on the write
path* are what drove tags off the model entirely. The generation model's load is
87% of its total cost and is amortised over exactly one inference, because every
command invocation is its own process.

The governing ADR needs amending on three points once this lands:

1. Its per-field precedence rule implies unconstrained inference for all three
   fields, but category is now *conditionally required* — optional on add, still
   mandatory elsewhere, and hard-failing when inference is unavailable and no
   fallback is configured.
2. Its tag-frequency floor is described as a threshold over store frequency; it
   is now a requirement of the centroid method, and the vocabulary is smaller and
   better-defined than the ADR anticipated.
3. It assumes the model performs tag selection. It no longer does.

One pre-existing hazard was surfaced while specifying this and is worth recording
even though it is not this work's to fix: the default entry importance and the
default prune threshold are the same number, and the prune is inclusive. Every
history entry written by the current protocol — which passes no importance flag —
is therefore prune-eligible after thirty days. This is true today with no model
involved, and it is the strongest argument for the pruning redesign being
scheduled soon after this work.
