Type: task
Status: resolved
Blocked by: 05, 06, 24, 26
Band: 2.2.0-rc2

# 09 — Cut and Publish 2.2.0-rc2

## Question

Do the three new LLM jobs clear the "must not make recall worse" bar set in
ticket `05`, and is the store safe to ship them against?

> [!NOTE]
> **The rc2 band shrank three times, and the question above is now void.** Of
> the three LLM jobs this ticket was written to gate, **none ships**:
>
> - **`08` consolidation dedupe — [out of scope](08-consolidation-dedupe.md).**
>   Ruled out 2026-08-01; the premise did not survive measurement.
> - **`07` salvage expansion — [out of scope](07-query-expansion.md).** Killed
>   2026-08-02: the weakness floor is *inverted* on the failures it was meant to
>   catch, so there is nothing for it to rescue.
> - **`23`/`24` automatic pruning — removed** from 2.2.0 on the A/B verdict.
> - **`25` prune config — [deferred](25-prune-config-and-collision-fix.md).**
> - **`06` write-side enrichment shipped with the 0.5B model off the write path
>   entirely** — tags and category are centroid cosine; only importance used the
>   model, and [`26`](26-remove-model-importance-inference.md) removes that too.
>
> **The net change to the model's job list this band is zero.** It still has
> exactly the one default-on job it had in 2.1.0: code summarization during
> `neuron scan`. This release note must not claim new LLM jobs — it must say
> plainly that the band measured its way to the opposite conclusion, and what
> was learned. **The prune hazard `25` was to fix is still live and unfixed** —
> decide deliberately whether rc2 ships with it.
>
> What rc2 *does* ship, and what the notes should lead with: centroid-based tag
> and category inference on `memory add`, a timeout primitive
> (`src/components/timeout.ts`), degradation counters on `neuron status`, and
> conditional-required category semantics.

## Scope

1. Version bump to `2.2.0-rc2`.
2. CHANGELOG covering write-side enrichment. Do **not** describe consolidation
   as merging entries — it does not, and `08` is out of scope — and do **not**
   mention salvage expansion as shipping; `07` is out of scope. Include the
   added latency on the query path.
3. **Gate on the `05` bar, honestly.** Report `06`'s before/after recall numbers
   (Pillar 12: delta 0.0 on `recallAt1`/`recallAt5`/`mrr`). For `07` and `08`,
   report that the bar was never reached because the premise failed first. Do
   not ship a job on the argument that it is probably fine.
4. Record the p50/p95 latency added to `neuron memory query`, warm and cold cache.
   This number becomes the budget rc3's auto-injection has to live inside.
5. **Leave `CONTEXT.md`'s Qwen1.5-0.5B entry describing one job** — that is now
   correct, and this scope item previously said to change it to four. Verify
   rather than edit.
6. Update `CLAUDE.md` and the packaged skill if `--tags`/`--importance` became
   optional in ticket `06`.
7. Run `npm test` and `npm run test:e2e`. Pillar 12 carries `06`'s coverage;
   Pillar 10's fate is decided by [`26`](26-remove-model-importance-inference.md).
8. Tag and publish under the `rc` dist-tag.

## Deliverables

- [ ] **`2.2.0-rc2` published under the `rc` dist-tag — OUTSTANDING, owned by the
      maintainer**, matching ticket `04`'s precedent. Everything else is
      committed, tagged `v2.2.0-rc2` and pushed. Run: `npm login && npm publish
      --tag rc`. `--tag rc` is mandatory — without it npm moves `latest`.
- [x] CHANGELOG including latency and merge-behaviour notes
- [x] Per-job pass/fail against the `05` bar, stated plainly
- [x] Recorded query-path latency budget carried into rc3
- [x] `CONTEXT.md` glossary verified as still describing one model job
- [x] Unit + E2E suites green (one pre-existing, unrelated failure — see below)

## Answer

`v2.2.0-rc2` is cut, verified, committed, tagged and pushed. **It is not
published to npm** — deliberately left to the maintainer, same as `04`.

### Is it releasable? Yes, with one honest correction to the plan.

The question this ticket was filed to answer — "do the three new LLM jobs
clear the recall bar" — is void, because **none of the three jobs it was
gating shipped**. `07` and `08` were both ruled out before reaching the bar
(their own premises failed first, not their scores against it), and `23`/`24`
removed automatic pruning outright on a double disqualification. `06` shipped
with the model **off** the write path entirely — tags and category are
centroid cosine over the already-loaded embedder, and `26` then removed the
one job that had briefly used the model (importance) too. **The model's
default-on job list is unchanged from 2.1.0**: one job, code summarization
during `neuron scan`. The CHANGELOG's rc2 section states this plainly rather
than describing four new LLM jobs, which was the original (now-wrong) framing.

**Gate result, stated per-job, per scope item 3:**

| Job | Bar | Result |
|---|---|---|
| `06` write-side tag/category inference | Strict non-regression (ADR 0010 §7) | **Passed** — Pillar 12: delta 0.0 on `recallAt1`/`recallAt5`/`mrr` |
| `07` salvage query expansion | Same | **Never reached** — weakness floor inverted on the failures it targeted (mean top-1 cosine on wrong answers 0.7779 > on right answers 0.7518); ruled out before implementation |
| `08` LLM dedupe | Same | **Never reached** — measured 1 genuine duplicate in 239 entries, findable by content hash; the band that would catch more needs negation detection neither the model nor the embedder has |
| `23`/`24` automatic pruning | Pre-committed recoverability bar | **Failed** — both judgement arms false-deleted ground-truth-unrecoverable entries (2/11, 4/11); removed from 2.2.0 |

No job shipped on "probably fine" — each either passed a real measurement or
was cut before one was needed.

### The prune hazard, decided rather than left ambient

Ticket `25` (the fix) is deferred by the maintainer; the hazard it would have
fixed is unfixed and **rc2 ships with it live**: default entry importance and
default prune ceiling are both `3`, compared inclusively, so a bare
`neuron memory prune` deletes nearly everything. Pillar 10 now measures this
directly on every E2E run rather than leaving it ambient — at the default
ceiling, **9 of 12 entries delete, including 3 of 6 marked critical**, every
one an entry written without `--importance`; the 3 explicitly guarded critical
entries all survive. That is the deliberate decision scope item 3 asked for,
and it is stated in the CHANGELOG, not only here.

### Item 6, corrected beyond what `26`'s comment claimed

`26`'s comment said item 6 was "done for `--importance` in both `CLAUDE.md`
and the packaged skill... re-verify `--tags`, which `26` did not touch." On
verification, `--tags` was **not** actually consistent: `CLAUDE.md`'s "On the
metadata flags" section and the skill's `§0a` both explicitly recommend
omitting `--tags`, but the mandatory protocol steps (CLAUDE.md steps 3–4;
skill §§3–4) still hardcoded `--tags <topic>` on every example — the exact
"config infers, protocol still says pass it" trap `§0a`'s own text warns
against, verified live in `§0a`'s wording (`.claude/skills/neuron-memory/SKILL.md:174-176`).
Fixed in both files: the protocol-step examples now omit `--tags` (keeping
`--importance 4` on the failure-fix example, since that one must survive a
prune), and the skill's history/decisions examples drop their hardcoded tags
too. `CONTEXT.md`'s Qwen1.5-0.5B entry was verified unchanged — it already
describes exactly one job.

### Query-path latency baseline (item 4)

Measured `neuron memory query`, each CLI invocation its own process: cold
(first invocation in a shell session, OS/model file cache cold) **~4.8s**;
warm (steady-state, back-to-back) **p50 ~223ms, p95 ~229ms** over 20 runs (min
221ms, max 232ms). Worth stating plainly: write-side enrichment runs on `add`,
not `query`, so rc2's own changes did not move this number — it is recorded
now as the baseline budget rc3's auto-injection hooks have to fit inside.

### A wrinkle worth flagging: this build also carries rc5 content

This ticket sat on the frontier, fully unblocked, since `26` resolved — but
other sessions kept resolving rc5-band tickets (`28`, `35`, `38`, `29`) on the
same trunk before this cut happened, per the map's explicit permission to pull
rc5 forward. There is no branch per band, so **whatever is on trunk when an
`rc` tag is cut is what ships under it**, regardless of which band a ticket was
filed under. Rather than hold `scope` removal and frontmatter round-trip fixes
out of the CHANGELOG to preserve the original band boundary, they are
documented under `2.2.0-rc2` now, because that is genuinely what installing
this tag gets you. **Consequence for tickets `15`, `20`, `34`** (the rc3/rc4/rc5
cut tickets): check what is actually new on trunk since the *previous cut*,
not what is nominally in the planned band — rc5's cut may find most of its
content already shipped and documented here.

### Test results

**290/290 unit tests green** (35 files). **12/13 E2E pillars pass.** Pillar 8
(multi-process contention) fails at `3/50` rejected writes against a `<5%`
bar — reproduced as pre-existing per this ticket's own comment log and
unrelated to rc2's content (SQLite write-lock contention, not enrichment).
Pillar 12 confirms delta 0.0 non-regression; Pillar 10 confirms the prune
hazard measurement above; Pillar 11 confirms centroid beat model 9/9 to 0/9 on
this run (accuracy `{"model":0,"centroid":1}`).

### Left for the maintainer

**Publish** (above) — same reason as `04`: irreversible, and this session has
no npm credentials to lose by trying.

## Comments

- 2026-08-02: Rewired by ticket `07`'s resolution. `07` dropped from the
  blockers (out of scope), `26` added — so this is the last blocker standing
  between the band and the rc2 cut.
- 2026-08-02: **[`26`](26-remove-model-importance-inference.md) is resolved. Every
  blocker is now closed and this ticket is on the frontier.** What `26` changed
  for the scope items above:
  - **Item 2** — a `## [Unreleased]` section is already written in
    `CHANGELOG.md` covering `26`'s user-visible removals (the config key,
    `neuron memory enrich`, `enrichment.pending`). Fold it into the rc2 entry
    rather than writing it twice.
  - **Item 6** — done for `--importance` in both `CLAUDE.md` and the packaged
    skill, which were still describing an `importance` config key and telling
    users to run `neuron memory enrich`. Re-verify `--tags`, which `26` did not
    touch.
  - **Item 7** — Pillar 10's fate is decided: **re-pointed at prune safety**, no
    longer loads the model, runs in milliseconds. Pillars 10/11/12 all green.
  - **Item 3** — `26` strengthens the honest framing this ticket already
    demands. rc2 does not merely add no new model jobs; it *removes* the last
    one that had been added to the write path.
  - **Carry into item 3 or its own release note**: Pillar 10 now measures ticket
    `23`'s live hazard directly — at the default prune ceiling, **9 of 12
    entries delete including 3 of 6 critical ones**, every one an entry written
    without `--importance`. `25` is deferred, so **rc2 ships with this live**.
    That is the deliberate decision item 3 asks for, and it needs to be visible
    in the release notes rather than only in the map.
  - Known-red before you start: **Pillar 8 (multi-process contention)** fails at
    `3/50` rejected writes against a `<5%` bar. Reproduced on a clean tree — it
    is pre-existing and unrelated to rc2's content, but `npm run test:e2e` will
    not be all-green.
- 2026-08-02: Resolved. `v2.2.0-rc2` cut, verified, committed, tagged and
  pushed; `npm publish --tag rc` left to the maintainer. Found and fixed a
  real gap while re-verifying item 6: `--tags` guidance was inconsistent
  between the skill's own `§0a` and its mandatory protocol steps. Found and
  fixed a documentation gap `26`'s comment didn't anticipate: ticket `06`'s
  actual feature (centroid tag/category inference) had no CHANGELOG entry at
  all, only its later importance-removal amendment did — added one. This
  build also carries rc5's `scope` removal and frontmatter fixes, which
  reached trunk first; see the Answer's "wrinkle" section for what that means
  for tickets `15`/`20`/`34`.
