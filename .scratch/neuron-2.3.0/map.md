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
   earns its cost — a counterfactual A/B (`07`–`10`), now extended by a
   second, more specific A/B on `08`'s own finding (`14`) and published as a
   repeatable benchmark suite rather than left as tracker findings (`15`).

Reaching the end means every ticket here is resolved, what neuron *claims*
matches what it *does* for each shipped harness, each config shape and each
token claim, `2.3.0` ships with a published, re-runnable benchmark suite
showing neuron's measured effect (favorable or not) versus raw harness, and
`2.3.0` is cut and published.

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
  never committed, so no session had run under its format), so `08` waited
  on `12` judging whether enough had accumulated since `07` shipped. `12`
  resolved 2026-08-07 — enough accumulated (see Decisions so far) — so `08`
  is unblocked and its Scope/Open-question decisions (definition of "already
  had," redundancy measure, textual-vs-timeliness ruling) remain exactly as
  open as `08`'s own Comments left them. **`08` itself resolved 2026-08-07**,
  correcting its own Scope's stated failure direction (see Decisions so
  far) and unblocking `09`. **`09` itself resolved 2026-08-07**, ruling
  compress-and-disclose over reopening ADR 0014, and unblocking `10`.
  Frontier is now `01`, `02`, `05`, `10`, `11`, `13`.
- **The epic's destination was elevated 2026-08-07**, in the same session
  that resolved `08`: the maintainer asked to come out of this map with a
  *published, repeatable benchmark suite* proving (or honestly disclaiming)
  neuron's improvement over raw harness, not just an internal tracker
  finding on `10`. Two tickets graduated straight from `08`'s finding without
  a fog stop, since both were already sharp: `14` (a second, narrower A/B —
  does a hook-injected git-log search beat the agent invoking `git log`
  itself, the direct product implication of `08`'s ~100%-redundant-`history`
  finding) and `15` (publish `10`'s and `14`'s findings into `benchmarks/`,
  wired as a real blocker of `04` since it's a deliverable, not fog). `14`
  and `15` both block on `10` rather than duplicate its harness — `10`'s own
  Comments now flag that its harness must be built reusably for exactly this
  reason.
- **`10` resolved 2026-08-07 with an unfavorable finding**, not the
  favorable one the destination-elevation above was written expecting to
  disclose: no measured token difference, and a higher failure rate for the
  memory arm than the no-memory control. `14` and `15` inherit this as
  their starting point — `14`'s own premise (does hook-injected git-log
  search beat the agent running `git log` itself) is unaffected, but `15`'s
  publication now needs to present a mixed-to-negative result honestly, not
  primarily a favorable one.
- **`10`'s finding graduated fog into [16 — Memory
  Supersession](issues/16-memory-supersession.md)** the same session,
  2026-08-07: both of `10`'s failure cases were a superseded
  `.neuron/decisions.md` entry outcompeting the later entry that reverses
  it, which is a measured instance of what this map's fog had been calling
  "capturing a maintainer decision, not just an agent action" — that fog
  entry is now closed, folded into `16`'s Question rather than restated
  here. **Maintainer decision: `16` blocks `04`** — 2.3.0 does not cut with
  this failure mode unfixed, rather than shipping the benchmark suite's
  unfavorable finding as a disclosed-but-unaddressed limitation. `16` is
  explicitly not a reopening of `neuron-2.2.0`'s automatic pruning (killed
  by ticket 24's false-delete results) — it marks entries as superseded
  without deleting them, a different mechanism the false-delete lesson
  argues *against* reusing a content-only judgement call for. Frontier is
  now `01`, `02`, `05`, `11`, `13`, `14`, `16`.
- **[16 — Memory Supersession](issues/16-memory-supersession.md) resolved
  2026-08-08**, grilling all six of its Scope items with the maintainer:
  supersession triggers as a hard block on `neuron memory add` when the
  (model-free) embedder finds a high-similarity existing entry, not a
  standing protocol step; superseded entries hard-exclude from default
  recall but are never deleted; the schema gets dedicated
  `superseded_by`/`superseded_at` columns rather than reusing the generic
  `fields` mechanism; the mechanism is one-way with no undo (a correction
  is a new forward-linking entry); the two known-reversed pairs in this
  repo's own store are hand-fixed rather than built into a migration tool;
  and it stays fully orthogonal to `importance`/pruning. Full rationale in
  [ADR 0015](../../docs/adr/0015-memory-supersession.md). Graduated
  [17 — Implement Memory Supersession](issues/17-implement-memory-supersession.md)
  for the build, and — split out separately so the build ticket doesn't
  grade its own outcome —
  [18 — Re-run Counterfactual A/B After Supersession](issues/18-rerun-counterfactual-ab-post-supersession.md)
  blocked by `17`, re-running `10`'s harness to confirm the failure-rate
  regression is actually fixed. `04` rewired to block on `18` instead of
  the now-resolved `16`. Frontier is now `01`, `02`, `05`, `11`, `13`, `14`,
  `17`.
- **[17 — Implement Memory Supersession](issues/17-implement-memory-supersession.md)
  resolved 2026-08-08**, built against ADR 0015 with no design questions
  left open. The write-time gate scopes its candidate search across every
  category rather than the inferred one, because category resolution
  happens inside write-side enrichment, which runs *after* the gate must
  already have fired — a scope call this ticket made, not one ADR 0015
  specified. Hand-fixing the two known-reversed pairs (Deliverable 4)
  surfaced a real instance of the map's own "write-side capture gap": *
  neither pair's correction entry actually existed in this repo's own
  `.neuron/decisions.md`* — the maintainer's rulings had only ever been
  captured in Claude's own cross-session memory and in `CHANGELOG.md`
  prose. Both missing entries were written for real through the new
  `--supersedes` flow rather than fabricated as a link between two
  pre-existing rows. Full detail and the specific entry ids in
  [17](issues/17-implement-memory-supersession.md)'s own Answer/Comments.
  Unblocks `18`. Frontier is now `01`, `02`, `05`, `11`, `13`, `14`, `18`.
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
- **[01 — GitHub Copilot CLI Adapter](issues/01-copilot-adapter.md) built,
  not resolved, 2026-08-08.** `CopilotAdapter` implemented and tested (14
  new tests, full suite 502/502) against `.scratch/neuron-2.2.0/research/
  harness-compatibility.md` plus a direct fetch of GitHub's own hooks
  docs, which resolved two things that research left open: Copilot's
  stdout contract is a flat `additionalContext` object, not Claude
  Code/Codex's `hookSpecificOutput` wrapper, and its hook entries are a
  flat array per event rather than matcher-grouped — both required real
  `hook.ts` changes. Only `session-start` is wired; `pre-prompt` and
  `context-reset` are honestly left unwired (documented notification-only,
  and no compaction-equivalent event at all, respectively).
  Maintainer scrutinized the adapter's actual value mid-session — coverage
  is narrower than "session-start injection" sounds, a single guaranteed
  `architecture`-category card and nothing else, unmeasured against
  `10`/`18`'s A/B which tested full recall — and confirmed keeping it as
  built rather than dropping to disclosure-only. Real-install verification
  split into [20 — Verify Copilot CLI Adapter Against a Real
  Installation](issues/20-verify-copilot-adapter-real-install.md) (HITL,
  same split-verification-from-build move `18` used for `17`), at the
  maintainer's request — `01`'s `Blocked by` now includes `20`, so `01`
  drops out of the frontier until the maintainer resolves `20`
  independently. Frontier is now `02`, `05`, `11`, `13`, `14`, `19`, `20`.
- **Branch reconciled to `main` and renamed, 2026-08-08.** The working
  branch (`feat/2.2.0-tree-sitter-grammars`, stale-named since before this
  map existed) had drifted from `main`, which independently carried real
  fixes from a separate `.scratch/2.1.x-hardening` effort. Merged both
  directions (this branch's work into `main`, then reconciled a concurrent
  PR that landed on `main` mid-session), fast-forwarded `main` to include
  everything, and cut a fresh branch — `feat/2.3.0` — for this map's
  ongoing work, per the new epic-boundary branch policy recorded in this
  repo's own `decisions` store. Also cut `v2.3.0-rc1` (npm publish pending
  the maintainer's own `npm login`), specifically so `20`'s real-install
  verification can happen on another machine without waiting for the full
  map to close.
- **[21 — GitHub Action: Automated npm Publish on Push to
  Main](issues/21-github-action-automated-publish.md)** added 2026-08-08 at
  the maintainer's direct request, immediately after manually walking
  through the `v2.3.0-rc1` cut and hitting the exact friction point
  (`npm publish` blocked on interactive `npm login`) the ticket exists to
  remove. Chooses the `rc`/`latest` dist-tag from `package.json`'s own
  version string rather than a manual flag. Not wired as a blocker of `04`
  — it's forward-looking release infrastructure, not a dependency of this
  cut. Frontier is now `02`, `05`, `11`, `13`, `14`, `19`, `20`, `21`.
- **[02 — Cursor Adapter](issues/02-cursor-adapter.md) built, not resolved,
  2026-08-08.** `CursorAdapter` implemented and tested (14 new tests in
  `cursor.test.ts`, plus an 8-test `cursor` block in `hook.test.ts`; full
  suite passing modulo one pre-existing, unrelated
  `concurrency-stress.test.ts` flake — a SQLite migration race independent
  of this ticket) against `.scratch/neuron-2.2.0/research/harness-
  compatibility.md` plus a direct fetch of `cursor.com/docs/hooks`, which
  resolved two things research left open: the stdout contract is a third
  distinct shape — flat, snake_case `{"additional_context": ...}`, matching
  neither Claude Code/Codex's wrapped form nor Copilot's flat camelCase one
  — and `preCompact` (Cursor's compaction-equivalent event) exists and runs
  in cloud/background agents but carries no `session_id` on its stdin, so
  it's wired for real firing evidence but can never actually roll the
  session ledger epoch — a different root cause than Copilot's gap (no
  compaction event at all) with the same practical consequence. Both
  `session-start` and `context-reset` are wired; `pre-prompt` is honestly
  left unwired (`beforeSubmitPrompt` confirmed permission-only, no context
  field). `failurePosture: 'fail-open'` is a real, known value (Cursor's
  documented default) — better-documented than Copilot's `'unknown'` — but
  `payloadCapChars`/`timeoutMs` stay `'unknown'`, keeping the verdict
  `best-effort` as expected. Real-install verification (including the
  cloud/background-agent hole Scope item 3 calls out) is deliberately not
  done this session — Cursor isn't installed on this machine — split into
  [22 — Verify Cursor Adapter Against a Real
  Installation](issues/22-verify-cursor-adapter-real-install.md), the same
  split-verification-from-build move `20` used for `01`. `02`'s `Blocked by`
  now includes `22`, so `02` drops out of the frontier until `22` resolves.
  Frontier is now `05`, `11`, `13`, `14`, `19`, `20`, `21`, `22`.

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
- **[08 — Injection Redundancy Audit](issues/08-injection-redundancy-audit.md)**
  — `history` redundancy against `git log` is total (18/18 entries, 29/29
  occurrences ≥0.70 embedding similarity, the noise floor ticket 39
  established for this embedder); `decisions` is substantially redundant
  (72–83%, with the one exception being a vacuous single-word entry, not a
  genuinely novel one); `learning` stays a one-data-point limitation.
  Corrected the ticket's own stated failure direction from understating to
  overstating redundancy, per maintainer ruling, to match the band-wide
  posture `07` set. Textual redundancy only; timeliness handed to `10`.
  Unblocks `09`, and its `history` finding is `09`'s strongest input.
- **[09 — Shrink the Resident Footprint](issues/09-shrink-resident-footprint.md)**
  — ruled compress + disclose the floor; option 2 (move a step to a hook)
  left in fog rather than reopening ADR 0014 this session. Compressed
  `metadataFlagsSection` (31% of the deterministic block, mostly rationale
  prose) plus lighter trims to `failureFixStep`/`sessionEndStep`: 2,323 →
  1,832 chars deterministic, 2,759 → 2,268 fallback (−491 chars / ~123
  tokens / −21%, identical absolute saving on both variants). The
  hook-install saving over fallback is unchanged in relative terms (~436
  chars / ~109 tokens) since the same compression applied to both. Net
  floor handed to `03`/`04`: ~450 tokens deterministic, ~570 fallback,
  disclosed as ADR 0014's write-side cost, not a bug. This repo's own
  `CLAUDE.md` regenerated in place to match. Unblocks `10`.
- **[10 — Counterfactual Token A/B](issues/10-counterfactual-token-ab.md)**
  — ran the real thing: 24 Claude Sonnet 5 sessions (4 tasks × 2 arms ×
  3 repeats), $5.20 total against the $20 approved budget. **No measured
  token difference; the memory arm's failure rate was higher than
  control's (33% vs 17%), not lower**, both misses caused by a superseded
  entry in `.neuron/decisions.md` outcompeting the later entry that
  reverses it — a live instance of the "confidently-wrong retrieval" and
  "write-side capture gap" fog items below, not a new problem. Full
  numbers and root-cause analysis in
  `.scratch/neuron-2.3.0/audits/10-counterfactual-token-ab/findings.md`.
  **This is not a favorable finding** — `03`'s disclosure and `04`'s
  claim-versus-behaviour audit inherit it as-is, not rounded toward "no
  effect." Unblocks `14` (which reuses this ticket's harness verbatim per
  its own Scope item 1) and `15` (publication).
- **[16 — Memory Supersession](issues/16-memory-supersession.md)** —
  grilled all six Scope items. Supersession is a hard block on
  `neuron memory add` (embedder-only candidate shortlisting, agent
  resolves via `--supersedes <old-id>`); hard-excludes from default recall
  without deleting; dedicated `superseded_by`/`superseded_at` columns; one
  direction only, no undo (a correction is a new forward-linking entry);
  the two known-reversed pairs are hand-fixed, not migration-tooled; zero
  interaction with `importance`/pruning. Full design in
  [ADR 0015](../../docs/adr/0015-memory-supersession.md). Graduated
  [17](issues/17-implement-memory-supersession.md) for the build and
  [18](issues/18-rerun-counterfactual-ab-post-supersession.md) (blocked by
  `17`) to re-run `10`'s harness and confirm the fix.
- **[17 — Implement Memory Supersession](issues/17-implement-memory-supersession.md)
  resolved 2026-08-08.** Additive `superseded_by`/`superseded_at` SQLite
  migration (v8) with markdown frontmatter round-trip; a write-time
  embedding-similarity gate on `neuron memory add` (threshold `0.97`,
  searching all categories since category isn't known until after the gate
  must fire) that hard-blocks near-duplicates unless resolved via
  `--supersedes <id>` or `--not-a-reversal`; default hard-exclusion of
  superseded rows from `query`/`list`/`exec` with a query-only
  `--include-superseded` escape hatch; a `findById()` direct-lookup method.
  Reconcile/sync/bootstrap-seed switched their internal reads to
  `includeSuperseded: true` and `computeMemoryHash` now folds in
  `supersededBy`, so a markdown hand-fix is never lost by the mirror.
  **Found mid-ticket:** neither of ticket `10`'s two known-reversed pairs
  had an actual correction entry in this repo's own `.neuron/decisions.md`
  — the maintainer's rulings existed only in Claude's own cross-session
  memory and in `CHANGELOG.md` prose, a live instance of the write-side
  capture gap this feature exists to fix. Both missing correction entries
  were written for real via the new `--supersedes` flow (dogfooding),
  rather than fabricating links between two pre-existing entries. Unblocks
  `18`.
- **[18 — Re-run Counterfactual A/B After Supersession](issues/18-rerun-counterfactual-ab-post-supersession.md)
  resolved 2026-08-08 — confirmed fixed, not just improved.** Ticket 17's
  implementation had to be committed to `HEAD` first (it was fully
  uncommitted, and the harness's fixtures build from `git worktree add
  HEAD`, not the working tree — see the ticket's own Comments). Live
  12-session re-run (Claude Sonnet 5, $1.11) on the 2-task subset that
  actually regressed in `10` (`prune-default-collision`,
  `pruning-ab-verdict`; the other two tasks were saturated 3/3 on both arms
  and mechanically unaffected by supersession): memory-arm failure dropped
  from `10`'s 67% (recomputed on this subset) to **0%**, beating control's
  unchanged 33%. Both named regression repeats individually resolve
  correctly, not just the aggregate. A grading-heuristic gap in
  `benchmarks/token-ab/tasks.mjs`'s negation detection (missed "not *a*
  bug" and "rather than a bug") was found and fixed mid-resolution, then
  all 12 captured answers re-graded offline at zero extra spend — same move
  `10` made for its own negation bug. Also disclosed: two earlier attempts
  at this run were killed by an operator mistake (2-minute foreground
  timeout, no partial-results recovery), costing ~$2.10 in unrecovered real
  spend on top of this run's $1.11 (~$3.21 total this session against `10`'s
  $20 approved budget). Full findings, including the caveat that this is a
  2-task subset rather than `10`'s full N=4, at
  `.scratch/neuron-2.3.0/audits/18-rerun-counterfactual-ab-post-supersession/findings.md`.
  Fed forward to `03`, `04`, `15`, and back onto `10` itself (now marked
  superseded by this result). Unblocks `04`'s `18` dependency (many of `04`'s
  other blockers remain open; `15` stays blocked on `14`, unaffected by this
  resolution).
- **[19 — Run the Counterfactual A/B on Synthetic Repos with Synthetic
  Memory Sets](issues/19-synthetic-fixture-counterfactual-ab.md)** added
  2026-08-08 at the maintainer's direct request, chartering the fix for the
  methodological gap `10`'s own findings.md flagged (a task's answer can be
  independently documented in this repo's ordinary docs, weakening the
  control-arm comparison) plus the real-repo dogfooding friction `18` hit
  mechanically (fixtures build from committed `HEAD`, entangling a
  benchmark re-run with this repo's own release-branch state). Not wired as
  a blocker of `14`/`15`/`04` — whether synthetic fixtures replace or
  supplement the real-repo run is the ticket's own first Scope item, left
  open rather than decided at creation. Frontier is now `01`, `02`, `05`,
  `11`, `13`, `14`, `19`.

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
- **Should `neuron exec`'s pre-command lookup also become a hook?** Step 1
  of the deterministic protocol block (Command Execution) still asks the
  agent to wrap commands. `10` confirmed every harness exposes *some*
  `PreToolUse`-equivalent, so the prerequisite fact is known — but whether
  to build on it is an adapter-architecture design call, not a separable
  decision, and touching it now would mean reopening ADR 0014 rather than
  extending it. Revisited (not resolved) by `09` on 2026-08-07 as its
  "option 2" — confirmed ADR 0014 doesn't mention `neuron exec` at all, so
  this would be a real scope expansion of that ADR, not an extension. `09`
  ruled to leave it here rather than open a `/grilling` session under its
  own ticket; best scoped as its own ticket once `01`/`02` make the
  question concrete, if ever.
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
- **The git-log-as-searchable-resident-source feature itself.** `14` only
  tests the premise (does hook-injected git-log search beat the agent
  running `git log` itself); it deliberately does not commit to *how* a
  favourable answer gets built — whether it replaces the `history`-logging
  write step in `CLAUDE.md`'s protocol block entirely, only supplements it,
  and whether the index refreshes via a git hook or a check-HEAD-on-read
  comparison at session-start/pre-prompt (the latter needs no separate
  install step and can't be silently bypassed the way a git hook can, which
  is the working lean, but it's not decided). Also unformed: `history`
  entries that never correspond to any commit (this very ticket's own
  resolution, at the time it was written, had none) are exactly what a
  git-log index cannot cover, so "replace" and "supplement" are materially
  different products, not just an implementation detail. Cannot be ticketed
  until `14` answers whether the premise holds at all.
- **The A/B harness's execution mechanism and funding.** Neither `10` nor
  `14` specifies whether the "N tasks × 2 arms × k repeats" sessions run as
  real Claude Code sessions (covered by whatever Claude Code subscription
  the maintainer already pays for, not separately metered) or as a scripted
  Claude API harness (billed per-token against a separate Anthropic Console
  balance). Surfaced 2026-08-07 when the maintainer asked whether a monthly
  Claude API credit allotment could fund the API-harness path — unconfirmed
  from this session, since a coding session has no visibility into the
  maintainer's actual Console billing/plan; check console.anthropic.com
  directly. The two paths have very different cost profiles (subscription
  sessions are effectively free at the margin but must be driven live and
  are not scriptable for repeatable `k` repeats; an API harness is
  scriptable and repeatable but bills per token at standard rates — roughly
  low-single-digit dollars per run at Sonnet-tier pricing for a
  medium-length agentic session, cheap enough that a modest monthly budget
  could fund a small `N`×`k`, but this needs pricing against the tasks `10`
  actually picks, not a guess). Whichever ticket claims `10` should settle
  this before spending anything, per `10`'s own Scope item 6.

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
