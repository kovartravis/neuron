# Map — neuron 2.3.0

## Destination

`@kovartravis/neuron` **v2.3.0** published to npm. Unlike
[neuron-2.2.0](../neuron-2.2.0/map.md), this map is deliberately **not a
single-purpose effort** — it is the catch-all for the next release, and its
destination is "whatever `2.3.0` ships," fixed only by the release cut at
ticket `04`. Two bands are chartered today:

1. **Harness expansion** — best-effort hook-based recall for **GitHub Copilot
   CLI** and **Cursor**, plus the fuller compatibility-disclosure surface (a
   real `neuron init` remediation UX and a README compatibility matrix with a
   fallback row) that only earns its engineering cost once there is a
   less-than-deterministic harness to explain truthfully (`01`–`03`).
2. **Config vocabulary** — `storage.path` and `storage.mode` both settable at
   the top level and overridable per category, with `split` deleted as a mode
   in its own right (`05`, `06`).
3. **Context cost** — a defensible answer to *"why would I plug in a hook that
   eats my context?"*: the per-session cost bounded and disclosed, the
   injection's redundancy measured, the resident footprint shrunk, and — if it
   earns its cost — a counterfactual A/B (`07`–`10`).

Reaching the end means every ticket here is resolved, what neuron *claims*
matches what it *does* for each shipped harness, each config shape and each
token claim, and `2.3.0` is cut and published.

## Notes

- **Split off from [neuron-2.2.0](../neuron-2.2.0/map.md) on 2026-08-04**,
  when that map's destination narrowed to a fast, focused 3-pillar cut
  (deterministic Claude Code/Codex recall, md-first, deterministic
  scanning) close to a weekly usage-limit boundary. Nothing in the harness
  band was load-bearing for that release — `10`'s research already found both
  harnesses land `best-effort`, and this effort is a continuation, not a
  resumption: per that map's own wayfinder rules, closed-out-of-scope work
  returns only as a fresh effort.
- **Renamed from `neuron-harness-expansion` to `neuron-2.3.0` on 2026-08-04**
  by maintainer decision, at the same time the config band was added. The
  rename is the scope change: this is now the next *release* map, so new work
  that isn't owed by any earlier map lands here rather than spawning a third
  concurrent effort. **A catch-all map still charts one ticket at a time** —
  the looser destination widens what may be admitted, not how much a session
  takes on.
- **The context-cost band was added 2026-08-04** from a maintainer question —
  *"prove neuron works and is at least token-equivalent to not using it; no
  one wants to plug in a hook that is going to consume their context."*
  Charting it established that **gross token-equivalence is not winnable** —
  injected tokens cost what they cost — so the band aims at three narrower
  claims instead: a bounded and disclosed cost (`07`), an injection that isn't
  mostly restating resident context (`08`), a net resident footprint (`09`),
  and only then the counterfactual (`10`). Measured while charting, and the
  reason `07` leads: the payload has a per-*injection* budget and **no
  per-session budget**, so the real ceiling is the whole store re-injected
  once per ledger epoch — and `clearLedger` starts a fresh epoch at every
  compaction. Full numbers in `07`.
- **Nothing existing measures this.** Benchmark pillars 1–9 measure retrieval
  (pillar 2 is saturated at recall@1 = 1.0), and ticket
  [22](../neuron-2.2.0/issues/22-longmemeval-harness.md) is a
  competitor-comparability number. Both answer *"does it find the right
  thing"*; none answer *"what does it cost you"*. `10` reuses their
  orchestration, not their pillars.
- **This map carries execution**, matching `neuron-2.2.0`'s own posture
  (and, before it, `architecture-scans-2.1.0`'s) — tickets are worked one at
  a time, ending with a cut-and-publish ticket.
- **Three bands; the context-cost band gated the harness band.** `01`–`03`
  touch `src/harnesses/`; `05`–`06` touch `src/config/` and `src/storage/`;
  `07`–`12` measure and bound what the hook costs a session. The config band
  is independent of both. **`01` and `02` were blocked on `07`** by
  maintainer decision on 2026-08-04 — measuring the cost on the two
  deterministic adapters that already shipped, before building two more —
  and unblocked once `07` resolved (see Decisions so far). Frontier is now
  `01`, `02`, `05`, `08`, `11`, `13`.
- **Each band is sequenced internally.** `06` waits on `05` because both
  express the same precedence chain — `05` builds the resolver, `06` reuses
  it. `09`→`10` waits on `08` because each consumes the previous one's
  measurement: you cannot shrink a block without knowing what the hook
  reliably re-injects, or size an A/B's expected effect without both. `11`
  (surfaced by `07`) is unblocked — it can be worked independently of `08`.
  `08` itself surfaced `12` on 2026-08-04, mid-pickup: its own Scope assumed
  real per-session telemetry that did not yet exist (`07` was unclaimed code,
  never committed, so no session had run under its format), so `08` now also
  waits on `12` judging whether enough has accumulated since `07` shipped.
  See `08`'s own Comments for the full finding.
- **[13 — `neuron status --check`/`--repair`](issues/13-status-check-repair.md)
  arrived 2026-08-05**, continued from
  [neuron-2.2.0's ticket 46](../neuron-2.2.0/issues/46-status-check-repair.md)
  when that map dropped its separate rc5 cut and shipped `2.2.0` stable
  directly from rc3 — the validation surface wasn't load-bearing for the
  three pillars 2.2.0 narrowed to, but the design is fully specified from
  `36`'s grilling on that map and its prerequisites already shipped there.
  Unblocked from arrival; wired as a blocker of `04` since it's a real
  feature, not fog.
- **Inherited, not re-derived:** the adapter interface
  ([ADR 0014](../../docs/adr/0014-recall-adapter-architecture.md), ticket
  [11](../neuron-2.2.0/issues/11-recall-adapter-architecture.md)), the
  shared `src/harnesses/` layer (`types`/`payload`/`ledger`/`hookState`,
  tickets [12](../neuron-2.2.0/issues/12-claude-code-adapter.md)/
  [13](../neuron-2.2.0/issues/13-codex-adapter.md)), and the harness
  research ([10](../neuron-2.2.0/issues/10-harness-compatibility-research.md))
  all already exist and are not re-litigated here — read them before
  starting `01`/`02`. The two deterministic adapters are the reference
  implementations this map's `best-effort` adapters are validated against.
- **Skills to consult:** `/tdd` for the two adapter tickets and for both
  config tickets; `/grilling` if either adapter's real-world behaviour forces
  an interface question ADR 0014 didn't anticipate, and on `06` before any
  code — deleting a shipped config value is a compatibility decision first
  and an implementation second. Read `CONTEXT.md` and `docs/adr/*.md` before
  changing module boundaries; `05`/`06` change
  [ADR 0011](../../docs/adr/0011-markdown-as-store-of-record.md)'s storage
  vocabulary
  and owe it an update or a successor ADR.
- **Protocol:** every session follows the `CLAUDE.md` memory-store loop
  (or its post-`14` short form, once that ticket lands upstream). Record
  ADRs under `decisions`, session logs under `history`.

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

- **[07 — Session Token Budget & Cost Telemetry](issues/07-session-token-budget-and-cost-telemetry.md)**
  — per-*epoch* (not per-session) char budget, default 18,000, hard stop on
  exhaustion, published at the conservative 3 chars/token. `clearLedger`
  became `rollEpoch`: the dedupe ledger and the spend counter now share one
  file and one reset point. `neuron status` reports real recorded cost
  (median/p95/max per epoch, mean chars/turn) via a new `recallCost` section.
  Surfaced [11](issues/11-reinject-architecture-card-per-epoch.md): the
  architecture card never returns after a compaction, because
  `context-reset` is execution-only. `01`/`02` are unblocked now that this
  is resolved — the maintainer's specific ask (measure before building more
  adapters) is answered; whether neuron "has legs" more broadly still
  continues via `08`.
- **[12 — Accumulate Real Per-Session Telemetry](issues/12-accumulate-real-session-telemetry.md)**
  — enough has accumulated: 7 sessions / 5 epochs recorded under `07`'s
  format (up from the 2-session/0-epoch baseline), with real `history`
  injections in 5 of 5 new-format sessions (28 of 45 total injected ids,
  zero unresolved against `.neuron/`). `learning` coverage is thin (1 id)
  and carried to `08` as a stated limitation, not a reason to keep waiting.
  `08` is unblocked.

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

- **Plan-vs-architecture-diff (`diffAgainstArchitecture`).** Requested in the
  2026-08-02 repositioning handoff as a generic per-category flag in
  `neuron.yaml`, letting a category's entries (e.g. `plans`) be compared
  against the architecture diff by a two-stage pipeline — embedding
  similarity for matching, the 0.5B model only for phrasing already-confirmed
  matches, never for the match decision itself. **Cannot be ticketed: the
  handoff cites a full spec at `neuron-plan-vs-drift-handoff.md` that does
  not exist in this repo or anywhere reachable.** The handoff is explicit
  that the feature must be scoped *exactly* as that spec has it — no new
  package, no PM-software creep, no hardcoded category-name logic — so
  writing a replacement spec from the one-paragraph summary would be
  inventing the thing it says not to invent. Graduates the moment the spec
  is supplied. Note the two-stage shape is consistent with everything
  `neuron-2.2.0` measured: embedder decides, model only phrases.
- **Capturing a maintainer decision, not just an agent action.** Surfaced
  2026-08-01 on `neuron-2.2.0` when a session re-claimed a deferred ticket.
  Protocol step 4 records what the *agent did*; nothing records what the
  *maintainer decided*, so a verbal reversal left no trace anywhere while
  several artifacts kept asserting the opposite. Retrieval worked perfectly
  and returned the wrong answer, which means deterministic hooks do not fix
  this — hooks own the read side, and this is a write-side capture gap.
  What is unformed is whose job the write is, and how a reversal
  *supersedes* a stale high-confidence entry rather than merely competing
  with it.
- **A write-time content-integrity floor.** On `neuron-2.2.0`'s own store,
  roughly a quarter of entries held a single token (`Fix`, `Updated`,
  `When`) because unquoted shell arguments word-split and `neuron memory
  add` kept only the first positional. Otherwise well-formed rows, so
  nothing flags them and they still occupy an embedding slot. Whether the
  fix is a length floor, a whitespace check, a confirmation prompt, or an
  argument-count guard is unformed.
- **Bootstrapping category centroids on a cold store.** `init` produces a
  working project, so the very first `neuron memory add` a user runs is
  against an empty store — and without `--category` it hard-errors
  ("category inference found no category close enough"). The recommended
  posture passes `--category` explicitly, so this may be acceptable; not a
  storage-mode problem (a fresh `md` project has exactly the cliff a fresh
  `vector` project has). Whether the cliff is worth removing, and how,
  given the rejection of embedding short label strings, is unformed.
- **Tag vocabulary is a full-table read per process.** Write-side
  enrichment reads every tagged row's embedding to build centroids on the
  first inferring write. Fine at a few hundred entries; wants a cached
  centroid table or an index long before it's a real problem. Not ticketed
  because the trigger — what store size actually hurts — has not been
  measured.
- **Should `neuron exec`'s pre-command lookup also become a hook?** Step 2
  of the protocol still asks the agent to wrap commands. `10` confirmed
  every harness exposes *some* `PreToolUse`-equivalent, so the prerequisite
  fact is known — but whether to build on it is an adapter-architecture
  design call, not a separable decision, and touching it now would mean
  reopening ADR 0014 rather than extending it.
- **Confidently-wrong retrieval is unowned.** A `neuron-2.2.0` measurement
  found raw cosine *inverted* on wrong answers — top-1 cosine on queries
  retrieval got wrong (mean 0.7779) is *higher* than on queries it got
  right (mean 0.7518) — and no relevance gate addresses it: a gate rejects
  the *irrelevant*, not the *wrong*, and both its legs measure forms of
  confidence. Unformed because the prior question is unanswered: is a
  confidently-wrong top hit detectable at all from retrieval signals, or
  does catching it require adjudicating semantic opposites — the weakest
  capability of both the embedder and the 0.5B model? If undetectable, the
  honest response may be a disclosure rather than a fix.
- **Threat model for grammar delivery.** Tree-Sitter `.wasm` grammars fetch
  from the npm registry over TLS with pinned versions, but do not verify
  the registry's `dist.integrity` checksum. A compromised mirror could
  serve a bad grammar. Not ticketed because the prior question is unformed:
  what threat model does a local-only dev tool owe its users?
- **Cross-harness testing strategy.** This map's two adapters (plus the two
  already shipped) need verification against real harness installations.
  Whether that is CI-automatable or stays manual is unknown.
- **Is `categories` authoritative or advisory?** `05` and `06` both make
  per-category config *more* load-bearing — a category's path and its storage
  mode both become things only `neuron.yaml` knows. That sharpens, but does
  not answer, the question already fogged on
  [neuron-2.2.0](../neuron-2.2.0/map.md#not-yet-specified) as *"an undeclared
  category is written but never mirrored"*: nothing validates `--category`
  against the config, so a store routinely holds categories the config never
  declares (`neuron scan`'s `architecture` being the standing example) and
  steady-state reconcile runs on the declared set only. After `05`, an
  undeclared category has no declared path either. Not ticketed here because
  the decision is a behaviour change across every command and belongs to
  whichever map resolves it first — but a session working `05` or `06` should
  read that patch before assuming the declared set is the whole store.
- **What the cost band does if the answer is bad.** `07`–`10` are charted as
  if the finding will be favourable enough to disclose. If it isn't — if the
  hook costs materially more than it returns — the response is a product
  decision this map has not made: narrow what the hook injects, make the hook
  opt-in per category, or ship the honest number and let users choose.
  Unformed because the options only become comparable once `08` reports, and
  pre-committing to one now would bias what gets measured.
- **What `2.3.0` else admits.** This map is a catch-all, so its own scope is
  fog by construction: work not owed by an earlier map lands here, and what
  lands is not yet known. The cut (`04`) is the only fixed point.

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

- **Google Antigravity CLI and OpenCode adapters** — ruled out on
  `neuron-2.2.0` during ticket 11's grilling (2026-08-03) and not revisited
  here: their reliability cannot be *stated* from documentation that
  contradicts itself (Antigravity) or requires shipping arbitrary plugin
  code (OpenCode). See
  [neuron-2.2.0's Out of scope](../neuron-2.2.0/map.md#out-of-scope) for the
  full reasoning. Return only behind a fresh research ticket that measures
  their behaviour directly.
