Type: task
Status: unclaimed
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

- [ ] `2.2.0-rc2` published under the `rc` dist-tag
- [ ] CHANGELOG including latency and merge-behaviour notes
- [ ] Per-job pass/fail against the `05` bar, stated plainly
- [ ] Recorded query-path latency budget carried into rc3
- [ ] `CONTEXT.md` glossary verified as still describing one model job
- [ ] Unit + E2E suites green

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
