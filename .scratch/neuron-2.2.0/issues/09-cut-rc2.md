Type: task
Status: unclaimed
Blocked by: 05, 06, 07, 08
Band: 2.2.0-rc2

# 09 — Cut and Publish 2.2.0-rc2

## Question

Do the three new LLM jobs clear the "must not make recall worse" bar set in
ticket `05`, and is the store safe to ship them against?

## Scope

1. Version bump to `2.2.0-rc2`.
2. CHANGELOG covering write-side enrichment, query expansion and consolidation
   dedupe — including the added latency on the query path and the fact that
   consolidation now merges entries.
3. **Gate on the `05` bar, honestly.** Report the before/after recall numbers from
   `06` and `07` and the merge/non-merge results from `08`. A job that fails its
   bar gets disabled by default or held back — the release note says which, and
   why. Do not ship a job on the argument that it is probably fine.
4. Record the p50/p95 latency added to `neuron memory query`, warm and cold cache.
   This number becomes the budget rc3's auto-injection has to live inside.
5. Update `CONTEXT.md` — the Qwen1.5-0.5B glossary entry currently describes a
   summarizer with exactly one job. It now has four.
6. Update `CLAUDE.md` and the packaged skill if `--tags`/`--importance` became
   optional in ticket `06`.
7. Run `npm test` and `npm run test:e2e`. Pillars 2 and 5 carry the new coverage.
8. Tag and publish under the `rc` dist-tag.

## Deliverables

- [ ] `2.2.0-rc2` published under the `rc` dist-tag
- [ ] CHANGELOG including latency and merge-behaviour notes
- [ ] Per-job pass/fail against the `05` bar, stated plainly
- [ ] Recorded query-path latency budget carried into rc3
- [ ] `CONTEXT.md` glossary updated for the model's expanded role
- [ ] Unit + E2E suites green
