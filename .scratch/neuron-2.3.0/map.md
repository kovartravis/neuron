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
- **Benchmark evidence (harness code, `results.json`, `findings.md`) lives
  under each harness's own `results/` directory, not `.scratch/`** — moved
  2026-08-09 from `.scratch/neuron-2.3.0/audits/` to
  `benchmarks/token-ab/results/`, `benchmarks/architecture-card-ab/results/`,
  and `benchmarks/results/` (for the one standalone script, ticket `08`).
  `.scratch/` is the issue tracker (maps and tickets); it should hold
  narrative and decisions, not the code and data that produced them. Tickets
  still link out to the evidence, they just no longer store it inline. Only
  `.neuron/*.md` is exempt — the append-only memory log's own citations of
  the old path are historical fact as of when they were written and are
  deliberately left unrewritten.
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
- **[11 — Re-Inject the Architecture Card on the First `pre-prompt` of Each
  Epoch](issues/11-reinject-architecture-card-per-epoch.md) resolved
  2026-08-08.** No open design questions — Scope was fully specified.
  `hook.ts`'s `pre-prompt` branch now re-fetches and injects the card on the
  first turn of each epoch (`loadEpochState(...).turns === 0`), reserving the
  turn's own `PRE_PROMPT_CHAR_BUDGET` first so the card can only spend what
  the turn wouldn't have used, and charging both through the single existing
  `recordPrePromptTurn` call so `07`'s telemetry sees the true combined
  spend with no second budget pool. One `emit()` call (concatenated
  two-section payload), not two — no evidence any harness parses a second
  stdout write. 5 new tests, full suite 557/557. Immediately followed by a
  maintainer request for a repeatable A/B proving the card's real value;
  graduated [24 — Architecture Card A/B: With vs
  Without](issues/24-architecture-card-ab.md) for it rather than folding
  proof-of-value into this build ticket, the same split `18` used for `17`.
  Frontier is now `05`, `13`, `14`, `19`, `20`, `21`, `22`.
- **[25 — Architecture Card: Fetch by Stable Id, Truncate Instead of Drop
  When Oversized](issues/25-architecture-card-stable-id-and-truncation.md)
  surfaced and resolved 2026-08-08**, mid-session while scoping `24` against
  this repo's own real store. Two compounding gaps, both predating `11`
  (affecting the original `session-start` injection too, not just `11`'s new
  path): the generic `memory.query({categories, limit})` fetch can rank the
  scan-produced blueprint out of its result window once enough other entries
  share the category — exactly what `ingest.ts`'s own `blueprintCardId`
  comment already warned a semantic/ranked query would do, reproduced live by
  this repo's own `scan.category: decisions` config; and even when fetched,
  `buildPayload`'s whole-entry-drop semantics silently discard this repo's
  real ~53,000-character blueprint against the 6,000-character
  `SESSION_START_CHAR_BUDGET` (Claude Code's own hard cap is 10,000, so no
  amount of *more* budget fixes this — the card has to reach the model
  *within* a realistic cap). Fixed by fetching the blueprint via its stable
  id first (truncated with a marker if it alone exceeds the cap), additively
  layered under the existing top-N-in-category query so this repo's
  deliberate shared-category setup keeps working. Maintainer's proposal to
  exempt the card from the shared epoch budget entirely was considered and
  rejected — it wouldn't survive the harness's own hard cap regardless, so
  budget-model changes weren't the actual fix. Also corrected this session's
  own earlier mischaracterization: the blueprint card itself is not stale —
  `neuron exec`'s `autoRescanIfDriftDetected` refreshed it live, mid-session,
  as this ticket's own source changes landed. 2 new tests, full suite
  559/559.
- **[24 — Architecture Card A/B](issues/24-architecture-card-ab.md) claimed
  and built, not resolved, 2026-08-08.** Harness complete and dry-run
  validated (`benchmarks/architecture-card-ab/`, reusing `token-ab/
  session.mjs`), using the real post-`25` captured card content and two
  tasks graded against it. The live 8-session pilot failed on a credentials
  gap — see the *Not yet specified* entry on the A/B harness's execution
  mechanism and funding, now concretely blocking rather than open. `24`
  stays claimed and open (not resolved, not out of scope) — it isn't in the
  frontier list below since a claimed ticket never is, but it's the first
  thing to pick back up once an execution path is chosen. Frontier is now
  `05`, `13`, `14`, `19`, `20`, `21`, `22`.
- **[26 — Shrink the Architecture Card: Drop the LLM, Deterministic Per-File
  Purpose Only](issues/26-shrink-architecture-card-drop-llm.md) surfaced and
  resolved 2026-08-08**, at the maintainer's direct request immediately
  after `25` — sequenced to run *before* `24`'s A/B so it tests the shrunk
  card, not the old one. Removed `summarizeFile()`'s per-file 0.5B-model
  call entirely (`src/components/summarizer.ts`), which was both the card's
  dominant cost (~50,000 of a real ~53,000-character card) and its main
  quality problem — confirmed real garbled/non-English output in this
  repo's own store. Deleted the now-pointless disk cache alongside it;
  `neuron init`'s model preload stays, since write-side enrichment
  (`enricher.ts`) still uses the same shared loader independently.
  **Measured honestly in two steps, not assumed**: removing the LLM alone
  barely helped (54,924 → 53,487 bytes, ~2.6%) — the deterministic
  fallback template was nearly as verbose as the model's prose. A second
  pass at the maintainer's explicit follow-up request, tightening that
  template to stop repeating the filename/exports the caller already
  renders, got a real reduction: 54,924 → 49,243 bytes (~10.3%). Still far
  past the 6,000-char budget — `25`'s truncation stays necessary, now
  truncating less, and the remaining size is legitimate hand-written JSDoc
  content, not noise, so left alone rather than cut further. This repo's
  own `.neuron/decisions.md` regenerated via a real `neuron scan`; `24`'s
  `captured-card.txt` refreshed to match. `npm test` 559/559 both before
  and after the tightening pass.
- **[27 — Structurally Compress the Architecture Card at Injection
  Time](issues/27-structural-card-compression.md) surfaced and resolved
  2026-08-08**, immediately after `26` — the maintainer rejected `26`'s
  result outright ("the architecture needs to be compressible"): 49,243
  bytes against a 6,000-char budget still meant truncation cut off after
  ~2 of 14 subsystems, arbitrarily, by document order. Unlocked by finding
  that `parseBaselineBlueprint` (`diff.ts`, the only consumer needing the
  card *complete*, for `scan --diff`) only ever parses file path + `Exports:`
  off each line — purpose/prose text is never read by anything — so an
  *injected* rendering can drop it freely without ever desyncing drift
  detection, as long as the stored card stays untouched. New
  `src/scanner/compressCard.ts` (`compressArchitectureCard`) parses the card
  into header + per-module file lists, then lays sections back out against
  the budget in fixed order (header whole, then each module whole/partial/
  omitted) rather than truncating raw text at an arbitrary offset — and
  reserves a fixed budget for the omission note *before* laying out
  anything, so a cut is never silent (an earlier draft of this same ticket's
  own code let the note itself get dropped when there was no room left;
  caught by its own test suite, not by inspection). Real measured result on
  this repo: the injected card now **fits whole** (5,970 of 6,000 chars),
  covering 7 of 14 subsystems in complete file+export detail plus an honest
  note naming what's omitted. `scan --diff`/`--check` confirmed unaffected.
  9 new unit tests plus the existing hook-level coverage; `npm test`
  568/568. `24`'s `captured-card.txt` refreshed again to match.
- **`27` rejected by the maintainer as not actually solving the scaling
  problem, 2026-08-08**: "This is a fairly small repo though so on a large
  repo how is this supposed to work ... I don't see how this could work as
  neuron grows or its in a larger repo." Correct — a fixed-size single card
  still can't hold unbounded content no matter how tightly it's compressed;
  `27` only delays the cutoff, it doesn't remove it. The maintainer proposed
  the real fix: reference points that point at detail without containing
  it, so the agent can reach the detail on demand rather than needing it
  all pushed up front. Grilled via `AskUserQuestion` to two decisions: the
  "follow the path" mechanism reuses *existing* pre-prompt relevance
  recall (per-module cards become ordinary queryable entries — no new
  lookup mechanism), and the storage model is single-source-of-truth (the
  monolithic blueprint is retired outright, not kept alongside a derived
  index). Chartered as three sequenced tickets rather than one
  session-sized ticket, then re-blocked `24` on all three at the
  maintainer's direct request, so the A/B tests the real final mechanism:
  [28 — Architecture Card: Split into an Index Entry + Per-Module Detail
  Cards](issues/28-architecture-index-and-module-cards.md) (the data model:
  new `moduleCardId`, `synthesizeArchitecture` returns index + per-module
  markdown separately, stale module cards deleted on removal); [29 —
  Reassemble the Diff Baseline from the Index + Module
  Cards](issues/29-diff-baseline-reassembly.md), blocked by `28` (keeps
  `scan --diff` working by reconstructing the legacy monolithic shape at
  read time rather than teaching the parser a new format — also fixes a
  second live instance of `25`'s category-crowding bug, found while
  scoping this, in `getArchitecturalDrift`'s own baseline fetch); [30 —
  Injection Fetches Only the Index; Module Cards Surface via Ordinary
  Recall](issues/30-injection-fetches-index-only.md), blocked by `28`
  (`hook.ts` fetches just the small index; `27`'s `compressArchitectureCard`
  either adapts to the new shape or is retired, decided from a real
  measurement, not assumed). `27`'s own lessons (stable-id fetch, never cut
  silently) carry forward into `30`, applied to the new artifact — not
  wasted, just no longer the whole answer. Frontier is now `13`, `14`,
  `19`, `20`, `21`, `22`, `28`.
- **[13 — `neuron status --check`/`--repair`](issues/13-status-check-repair.md)
  resolved 2026-08-09.** No open design questions — carried `36`/ADR 0013's
  design forward unchanged, so this was a straight implementation session.
  `NeuronMemory.checkFieldCompliance()`/`repairFieldCompliance()`
  (`src/index.ts`) report and fix live entries missing a *currently*-required
  field; repair applies a configured `default:` first, then centroid-based
  inference for enum-typed fields only (reusing write-side category
  enrichment's own `buildCategoryCentroids`/`selectCategory` directly rather
  than duplicating the math), and leaves free-text identity fields and
  low-evidence enum fields `unresolved` rather than fabricating anything.
  Wired into `neuron status --check`/`--repair`, mutually exclusive, both
  exit `1` on remaining non-compliance — the same CI-gate posture `scan
  --check` set. **Found and fixed a real pre-existing bug while wiring
  this in**: `src/cli.ts`'s `status` branch returned
  `handleStatusCommand(memory)` without `await` inside a
  `try { ... } finally { memory.close(); }`, so `memory.close()` could run
  before a pending continuation inside the handler resumed — silently
  absorbed until now by the old scan-drift path's blanket `catch`, surfaced
  immediately as a hard `TypeError` once `--check`/`--repair` added a real
  await with no such catch. Fixed to match every other subcommand branch,
  which already awaited. 10 new tests (8 unit, 2 CLI-level); `npm test`
  578/578 (up from 568); `tsc --noEmit` clean; `npm run test:e2e` skipped,
  no coupling found (same reasoning `05`/`06`/`23` used). Dogfooded clean
  against this repo's own store. Docs swept (`docs/COMMANDS.md`,
  `MASTER_HELP`). Frontier is now `14`, `19`, `20`, `21`, `22`, `28`.
- **Grilled a new idea 2026-08-09, immediately after `13`'s resolution**:
  the maintainer wants future sessions' work reliably discoverable for
  downstream synthesis tasks (the README was the concrete trigger) — right
  now an agent asked to write it only sees whatever fit through the hook's
  per-epoch injection budget. Modeled explicitly on tickets 28-30's
  index+detail-card restructuring of the architecture card, but a different
  mechanism: instead of making detail reachable via ordinary relevance
  recall (28-30's approach — no hint needed), the hook actively teaches the
  agent the query surface exists, via a conditional, per-turn, *literal*
  ready-to-run command (`neuron memory query "<prompt text>" --limit
  <real-count>`), fired only when a cheap FTS `COUNT` shows the existing
  recall left a real, counted gap — never a static repeated note (which
  would hit the same redundancy ticket 08 already measured against
  `history`). No session-start equivalent — ruled out as resident-but-
  unearned content, the same class ticket 09 already trimmed. Store-wide
  scope, matching the existing pre-prompt query's own scope. Three tickets
  graduated: [31 — Fix `neuron memory` Query/List Default Ordering and
  Limits](issues/31-fix-query-list-defaults.md) (unblocked; two independent
  pre-existing bugs found while grounding this — list mode orders
  oldest-first, and shares text-query mode's `limit ?? 5` default despite
  answering a different question), [32 — Per-Prompt Discovery-Command
  Hint](issues/32-per-prompt-discovery-command-hint.md) (blocked by `31` —
  no point pointing at a command with broken defaults), and [33 — Measure
  Whether the Discovery-Command Hint Gets Used](issues/33-measure-discovery-
  hint-usage.md) (blocked by `32`, the same split-proof-of-value-from-build
  move `11`→`24` and `17`→`18` used, motivated directly by `10`'s finding
  that the memory arm sometimes performed *worse*). Landed on this map
  rather than a new one — small enough in shape, and touches the same
  `hook.ts` pre-prompt path `08`/`09`/`11` already own (all three already
  resolved, so no live blocking from them). Frontier is now `14`, `19`,
  `20`, `21`, `22`, `28`, `31`.
- **[14 — Git-Log Recall: Hook-Injected Search vs Agent-Invoked `git
  log`](issues/14-git-log-hook-vs-agent-log-ab.md) claimed and built, not
  resolved, 2026-08-09.** Hit the same credential blocker ticket 10's first
  pickup did (`ant auth login` needs a browser the maintainer couldn't get
  to this session), so followed that same precedent: built and
  dry-run-validated the harness rather than leaving the ticket idle.
  Extracted `report.mjs` and `grading.mjs` out of ticket 10's `run.mjs`/
  `tasks.mjs` so this second pillar reuses rather than duplicates (Scope
  item 1) — refactor-only, full suite still 578/578. New `gitlog-tasks.mjs`
  (3 git-history-only tasks), `gitlog-search.mjs` (the minimal
  hook-injection prototype: generic `git log --grep` keyword search), and
  `run-gitlog-ab.mjs` (orchestrator, both arms built on `fixtures.mjs`'s
  existing `'control'` shape). All three tasks' grading verified against
  gold/wrong answers. **Found mid-session:** ticket numbers collide across
  this repo's own concurrent wayfinder maps (a git-log search surfaced a
  decoy commit about a *different* ticket 14, from `neuron-2.2.0`), which
  is now disclosed in the ticket's own injected-note caveat rather than
  hidden. `14` stays claimed and open — not resolved, not in the frontier —
  until a session with working `ant` credentials runs the live pilot.
  Frontier is now `19`, `20`, `21`, `22`, `28`, `31`.
- **[19 — Run the Counterfactual A/B on Synthetic Repos with Synthetic
  Memory Sets](issues/19-synthetic-fixture-counterfactual-ab.md) claimed
  and built, not resolved, 2026-08-09.** Grilled all six Scope items with
  the maintainer: supplement the real-repo run (10/18), not replace it;
  pivoted from a hand-authored fake repo to real SWE-bench Lite instances
  at the maintainer's suggestion (a pinned pre-fix commit gets "answer
  structurally absent" for free); explicitly not running the real SWE-bench
  harness (no Docker/hidden-test execution) — only borrowing its
  repos/issues/gold-patches, with the task reshaped from "produce a patch"
  to "diagnose and describe the fix," graded by the same deterministic
  `/ANSWER.md` keyword-check `grading.mjs` machinery 10/14 already use;
  memory arm gets a fabricated CLAUDE.md-shaped "prior fix recorded" entry;
  task prompts stripped to symptom-level (several candidate instances
  rejected during selection for leaking the fix in their own issue text —
  the exact confound this ticket exists to close); live-fetch with no
  vendored cache; a difficulty-calibration pilot (`--pilot`, control-only)
  required before any full-A/B spend, targeting ticket 10's own observed
  17-33% control-failure range; and a hard $5 budget cap (scaled down from
  an initial $15 float once the maintainer's real available spend
  surfaced), enforced in code after every session, not just estimated up
  front — N=2 instances x k=2 repeats, 12 sessions worst case. Hit the same
  credential wall tickets 10 and 14's first pickups did (expired `ant`
  OAuth token, no browser to re-auth) — built and dry-run-validated both
  modes end to end instead of leaving the ticket idle, including a real
  live fetch of astropy/django at the two pinned commits. New
  `swebench-instances.mjs`/`swebench-tasks.mjs`/`swebench-fixtures.mjs`/
  `run-swebench-ab.mjs`, reusing `session.mjs`/`report.mjs`/`grading.mjs`/
  `fixtures.mjs`'s `MEMORY_NOTE` rather than duplicating them. Grading
  verified against gold, plausible-wrong, and near-miss answers on both
  tasks. `npm test` 578/578 unaffected. Stays claimed, not resolved, until
  a session with working credentials runs `npm run bench:swebench-ab:pilot`
  first, then the full A/B. Frontier is now `20`, `21`, `22`, `28`, `31`.
- **[19 — Synthetic-Fixture Counterfactual A/B](issues/19-synthetic-fixture-counterfactual-ab.md)
  picked back up 2026-08-09** once a live `ant` OAuth token cleared the
  credential wall that left it claimed-but-not-resolved. Ran the `--pilot`
  for real ($0.14, 4 sessions) — it reported 100% control-arm failure on
  both tasks, but that reading was a grading bug, not genuine difficulty:
  the model's answers were correct in all 4 sessions, and `check()`'s
  keyword matching missed them because markdown line-wraps and emphasis
  split phrases like `'constant 1'` across a literal newline. Fixed
  (`normalizeForMatch()` in `grading.mjs`), re-verified against wrong/
  near-miss answers so the fix isn't just loosened, `npm test` 580/580
  unaffected. **Corrected result: 0/4 failures — still outside the 15–40%
  target band, now too easy rather than too hard.** At the maintainer's
  direction, swapped in two harder instances (`matplotlib-24265`,
  `django-11019`, chosen by patch complexity — the dataset has no
  difficulty field — and verified against real `baseCommit` content, not
  just the diff) and re-ran the pilot live: **also 4/4 pass, $0.31.** Two
  independently-chosen pairs, 8/8 correct diagnoses total — the too-easy
  signal now looks like it may be structural to the "diagnose and
  describe" task shape itself (Scope item 3's own tradeoff), not a
  property of any one instance. Did not attempt a third swap; that fork
  (harder instances again vs. reconsidering task shape/effort level) is
  now a maintainer call. **Mid-session mistake, caught and recovered:** a
  `--dry-run` invocation against the new pair overwrote the first pair's
  real `results.json` (the harness doesn't scope output by dry-run vs
  live) — reconstructed byte-faithful from the console log and the
  already-printed conversation transcript, archived separately, recorded
  as a `learning` entry. $0.45 of the $5 cap spent total. **Continued same
  session at the maintainer's direction: raised effort to `'medium'`**
  (made a `session.mjs` parameter, default `'low'` preserves tickets
  10/14/18's behavior) on the same pair. Mixed result: `django-11019`
  still 2/2 pass; `matplotlib-24265` flipped to 2/2 fail — but both
  "failed" answers are actually correct and more thorough on inspection,
  exposing a second, more structural gap: `check()`'s `identifiesFix` gate
  tests for a proposed fix the task prompt never actually asks for, true
  of every task in this file including the retired pair, only masked
  historically because models tend to volunteer fix-shaped phrasing
  anyway. Did not patch a third time this session — three live-spend
  rounds have each surfaced a new judgment call, so checked in rather than
  continuing unilaterally. $0.92 of the $5 cap spent. **Maintainer
  decision: rewrite the prompts, keep the gate** — added an explicit "and
  how would you fix it?" clause to all four task prompts (both live and
  retired, for consistency); `check()` logic itself unchanged. `npm test`
  580/580. Not re-run live this session — the medium-effort pilot's two
  "failed" answers were captured under the old prompt, so confirming the
  fix needs a fresh pilot, left as the next pickup rather than a fourth
  live-spend round. $4.08 of the $5 cap remains. Stays claimed, not
  resolved.
- **[34 — Cut and Publish 2.3.0-rc2](issues/34-cut-rc2.md) graduated
  2026-08-09** at the maintainer's direct request, immediately after `31`'s
  resolution — a real interim release tag, not the final `04` cut (which
  stays blocked on `01`, `02`, `03`, `15` and the rest). Modeled on
  [neuron-2.2.0 ticket 09's own rc2
  cut](../neuron-2.2.0/issues/09-cut-rc2.md): audit `git log
  v2.3.0-rc1..HEAD` directly for what actually ships, not the nominal band
  structure, since there's no per-band branch. Scopes in the Cursor adapter
  (`02`, best-effort, not yet real-install-verified), the storage
  vocabulary change (`05`/`06`), the architecture-card work through `27`
  (explicitly flagging `27`'s own mid-band rejection and supersession by
  `28`-`30`), `13`, and `31` — explicitly excludes any claim from `14`/`19`,
  neither of which has a live run yet. Charting this ticket surfaced a real,
  live doc-drift instance: README.md still reads "Cursor support is on the
  roadmap" despite `02` shipping two commits after `rc1` — folded into this
  ticket's scope rather than opened separately, alongside an audit of
  `docs/COMMANDS.md`, `CONTEXT.md`, and the packaged `neuron-memory` skill
  against the same trunk diff. Not wired as a blocker of `04` — an interim
  snapshot, not a release dependency. Frontier is now `20`, `21`, `22`,
  `28`, `32`, `34`.
- **[35 — Is `categories` Authoritative or
  Advisory?](issues/35-categories-authoritative-or-advisory.md) graduated,
  claimed, and resolved 2026-08-09**, at the maintainer's direct request to
  work a ticket needing real grilling rather than the mechanical frontier
  order (`20`/`22` need real harness installs this session doesn't have;
  `21`/`28`/`32`/`34` are fully-specified build/verify tasks with no open
  design questions). Pulled from this map's own fog (itself inherited from
  [neuron-2.2.0's fog](../neuron-2.2.0/map.md#not-yet-specified)). Resolved
  advisory-but-self-maintaining: an undeclared category auto-declares
  itself in `neuron.yaml` on first write rather than being rejected or
  left permanently undeclared. Full decision in [ADR
  0017](../../docs/adr/0017-category-declaration-authority.md). **Mid-session
  structural redirect**: once the design grew real scope (comment-preserving
  `neuron.yaml` round-trip writes, a `status --repair` backfill), the
  maintainer moved the *implementation* off this map onto a freshly
  chartered [neuron-2.4.0](../neuron-2.4.0/map.md) rather than graduating
  a same-map ticket — this map's own posture (catch-all, nearing an rc2
  cut) didn't need to absorb it. Frontier is unchanged: `20`, `21`, `22`,
  `28`, `32`, `34`.
- **[21 — GitHub Action: Automated npm Publish on Push to
  Main](issues/21-github-action-automated-publish.md) built, not resolved,
  2026-08-09**, picked up at the maintainer's direct request to skip `20`
  and `22` (both need real harness installs this session doesn't have).
  Grilled Scope items 2 and 7 via `AskUserQuestion` first: only `-rcN`
  prerelease versions are recognized (anything else fails the workflow
  loudly rather than guessing a dist-tag), and failure visibility stays
  GitHub's own Actions UI with no added notification step. Built
  `.github/workflows/publish.yml` (`push`-to-`main`-only trigger, never
  `pull_request`/`pull_request_target`): a `build-and-test` job that always
  runs `npm ci && npm test` and resolves the version/dist-tag/already-
  published outputs, followed by a `publish` job (`needs: build-and-test`,
  gated `if: already_published == 'false'`) that publishes and then tags
  the release commit, guarded so an existing git tag warns instead of
  re-tagging. **Mid-session, the maintainer separately asked what stops
  someone from opening a branch and publishing** — answered (opening a
  branch alone does nothing, since the trigger is push-to-`main`
  specifically; the real gate is branch protection on `main`, a GitHub
  repo-settings concern outside this file, which the maintainer chose to
  configure themselves rather than have set via `gh api` this session) and
  acted on by splitting `publish` into its own job gated by
  `environment: npm-publish`, a second independent layer that can require
  reviewer approval on the specific act of exposing `NPM_TOKEN` and running
  `npm publish` — inert until the maintainer creates that environment and
  adds a reviewer, since `environment:` protection rules live in repo
  Settings, not this file. Auth (`NPM_TOKEN` provisioning) stays HITL, with
  exact npmjs.com/GitHub steps for both the plain-repo-secret and
  environment-scoped-secret variants documented in the ticket's own Answer.
  YAML syntax checked with `pyyaml`; the four-case dist-tag regex checked
  by hand in `bash`. **Not run live** — no `NPM_TOKEN` and no `npm-publish`
  environment exist yet, so nothing here has been exercised against a real
  push. Split into [36 — Verify the Publish Workflow Against a Real
  Push](issues/36-verify-publish-workflow-real-run.md) (`21`'s `Blocked by`
  now includes `36`), the same split-verification-from-build move `20`/`22`
  used for `01`/`02`. Frontier is now `20`, `22`, `28`, `32`, `34`, `36`.
- **[34 — Cut and Publish 2.3.0-rc2](issues/34-cut-rc2.md) resolved
  2026-08-09**, picked up at the maintainer's direct instruction ("I have a
  ticket out there for rc-2 cut. Lets cut rc2 and merge to main") given
  specifically to unblock [36 — Verify the Publish Workflow Against a Real
  Push](issues/36-verify-publish-workflow-real-run.md), which needs the new
  `publish.yml` on `main` (its trigger) to test for real. Full CHANGELOG/
  README/doc-audit detail in the ticket's own Answer — one genuinely new
  stale-doc find beyond the already-known Cursor line: `CONTEXT.md`'s
  `harness adapter` glossary entry still said adapters shipped only "for
  Claude Code and Codex CLI," not yet updated for Copilot/Cursor. **At the
  maintainer's explicit direction, `feat/2.3.0` was also merged into
  `main`** — earlier than this map's own "merge at epic end" cadence,
  called out as a deliberate one-time exception, not a departure from the
  policy itself. Merging hit the documented `autoRescanIfDriftDetected`
  trap (a `neuron exec`-wrapped command run against `main`'s pre-merge
  tree silently rewrote `.neuron/decisions.md`'s architecture card
  mid-merge, blocking the fast-forward): recovered by discarding the
  incidental rescan with a plain, unwrapped `git checkout --
  .neuron/decisions.md` (deliberately bypassing `neuron exec` to avoid
  re-triggering the same side effect) and completing the fast-forward with
  plain `git merge --ff-only`, safe here specifically because the merge was
  about to wholesale-replace that file with `feat/2.3.0`'s own already-
  correct version anyway. The push to `main` also surfaced that this
  repo's branch protection is live — an active GitHub ruleset named
  "Protect" (id `20346327`, created 2026-08-03) — correcting an earlier,
  incomplete read from ticket `21`'s session that checked only the legacy
  `branches/main/protection` endpoint (404) and missed the newer Rulesets
  API where the real rule lives.
- **[36 — Verify the Publish Workflow Against a Real Push](issues/36-verify-publish-workflow-real-run.md)
  claimed and partially worked 2026-08-09**, unblocked the moment `34`'s
  merge put `publish.yml` on `main` for the first time. The first real
  trigger ([run 31327652836](https://github.com/kovartravis/neuron/actions/runs/31327652836))
  failed `build-and-test` with a genuine, previously-undetected bug, not a
  workflow mistake: `src/db.ts`'s `node:sqlite` fallback needs Node
  ≥22.13.0 (unflagged `DatabaseSync`), but the workflow pinned Node 20 —
  invisible locally since dev runs Node 24. Fixed by bumping both jobs to
  Node 22 and adding `"engines": {"node": ">=22.13.0"}` to `package.json`
  to document the real minimum (commit `e9157a1`, pushed straight to
  `main` as a direct, narrowly-scoped follow-on to the same verification
  task). The retriggered [run 31327940336](https://github.com/kovartravis/neuron/actions/runs/31327940336)
  confirmed the fix: `build-and-test` passed for real, and `publish` ran
  (no `npm-publish` environment exists yet to gate it) and failed cleanly
  at `npm publish` with `ENEEDAUTH` — no `NPM_TOKEN`, so nothing was
  published and no tag was created, exactly the safe failure mode
  expected. Full Scope-item-by-item status in the ticket's own Answer;
  `36` stays claimed, not resolved — Scope items 1 (provision `NPM_TOKEN`),
  3 (real stable push), 4 (unbumped-push skip), and 5 (branch-protection
  rejection) remain unexercised, all downstream of the same HITL
  provisioning step. Frontier is now `20`, `22`, `28`, `32`.
- **`21`/`36`'s publish auth model changed from token to OIDC,
  2026-08-09**, mid-verification: the maintainer provisioned `NPM_TOKEN`
  as planned (confirming the environment-approval gate really does pause
  a run — real evidence for `36`'s Scope item 5), but a manual publish
  attempt's `EOTP` error led to discovering npm no longer offers
  Automation tokens at all, and is removing Granular tokens' 2FA-bypass
  publish capability entirely in January 2027 per npm's own guidance to
  move to **Trusted Publishing (OIDC)** instead. `publish.yml`'s `publish`
  job now authenticates via GitHub OIDC identity with no `NPM_TOKEN`
  secret at all. One remaining HITL step (configuring `@kovartravis/neuron`'s
  Trusted Publisher on npmjs.com) supersedes the original "provision
  `NPM_TOKEN`" framing in both tickets' own Scope. Full detail in each
  ticket's own addendum.
- **`2.3.0-rc2` published for real, 2026-08-09** — once the maintainer
  registered the Trusted Publisher, [run
  31328784737](https://github.com/kovartravis/neuron/actions/runs/31328784737)
  went green end to end with no token anywhere in the workflow.
  Independently verified against the live registry (not just the
  checkmark): `npm view @kovartravis/neuron dist-tags` shows `rc:
  '2.3.0-rc2'`, and git tag `v2.3.0-rc2` is on `origin`. This is real,
  first-ever evidence the whole `publish.yml` mechanism works — `36`'s
  own Scope items 1 and 2 are now fully confirmed; items 3 (a real stable
  push) and 5 (a genuinely rejected non-exempt push) are the only
  remainder, both left to the maintainer rather than forced artificially.
  `36` and `21` both stay claimed, not resolved, at the maintainer's own
  discretion to close.
- **Scoped the remaining route to `2.3.0` and graduated [37 — Cut and
  Publish 2.3.0-rc3](issues/37-cut-rc3.md), 2026-08-09.** [04 — Cut and
  Publish](issues/04-cut-and-publish.md) itself has only four blockers left
  open — `01`/`02` (adapters built, each waiting on a real-install
  verification: `20`, `22`), `03` (waits on both), and `15` (waits on `14`'s
  live-credentialed pilot) — all HITL and outside this session's reach
  (real Copilot CLI/Cursor installs, a re-authed `ant` session). Everything
  else open on this map (`19`, `21`/`36`, `24`, `28`-`30`, `32`/`33`) is not
  wired as a blocker of `04` at all. Presented the maintainer two forks — cut
  an interim rc3 now (thin: only publish-workflow infra has changed since
  `rc2`) versus push straight for the full `04` cut — and the maintainer
  chose neither immediately: **`37` gates the next rc on `28`-`30` (the
  architecture index+module-card restructure) and `32` (the discovery-command
  hint) landing first**, so the rc actually carries new content the way
  `rc2` did over `rc1`. `37` is independent of `04`'s own blockers and can
  resolve in either order relative to it — whichever HITL step clears first.
  Frontier is unchanged: `20`, `22`, `28`, `32`.
- **[28 — Architecture Index + Module Cards](issues/28-architecture-index-and-module-cards.md)
  resolved 2026-08-09, together with [29 — Diff Baseline
  Reassembly](issues/29-diff-baseline-reassembly.md) in the same session**,
  not sequentially — landing `28` alone leaves `scan --diff`/`--check`
  broken (verified concretely, not just theorized: the old baseline-fetch
  ranked query matches on a `'scan'` tag every module card now also carries,
  and even a correct match — the index alone — lacks the per-file/export
  detail the parser needs), and `29`'s reassembly fix was small, fully
  specified, and explicitly this map's own "required companion, not an
  optional follow-up." Both resolved rather than landing `28` with a known,
  disclosed regression. Frontier is now `20`, `22`, `30`, `32` — `30`
  (injection fetches index only) is unblocked by `28`'s resolution but not
  picked up this session.
- **Real-world verification of `28`/`29` surfaced an unrelated, pre-existing
  bug, filed as [38 — `MdStorageAdapter`'s Parser Silently Drops Entries
  After a Stray `---`](issues/38-md-parser-loses-entries-on-stray-dashes.md),
  not fixed this session.** A real `neuron scan` + `scan --check` against
  this repo's own store hit a data-integrity defect already committed on
  `main` (confirmed via `git show HEAD`, predates this session by at least a
  day): one `.neuron/decisions.md` entry has a stray `---` inside its body,
  which throws off the frontmatter parser's pairing for every entry after
  it — 109 real entries, only 68 parsed — and `reconcileCategory`'s
  vector-mirror delete step then silently drops the unparsed ~40% from
  SQLite on every reconcile. **Not data loss**: `git diff` confirmed zero
  committed entries were ever removed from the markdown file itself (the
  source of truth), only the derived SQLite index degrades. This session's
  own experimental writes were reverted (`git checkout -- .neuron/`) and a
  reconcile restored the pre-session baseline before continuing — `28`/`29`'s
  own correctness is verified by the test suite (584/584) against clean
  synthetic fixtures, unaffected by this unrelated bug. Not wired as a
  blocker of anything; unclaimed, unblocked, sized for its own session.

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
  `benchmarks/token-ab/results/10-counterfactual-token-ab/findings.md`.
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
  `benchmarks/token-ab/results/18-rerun-counterfactual-ab-post-supersession/findings.md`.
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
- **[05 — Per-Category Storage Path](issues/05-per-category-storage-path.md)
  resolved 2026-08-08.** `categories.<name>.path > storage.path > '.neuron'`
  resolver (`src/config/categoryPath.ts`), backed by an adapter-per-root
  registry (`MultiRootMdStorage`) rather than teaching the existing
  single-root `MdStorageAdapter` to resolve internally — a maintainer call
  via `AskUserQuestion` on Scope item 3, alongside three more: absolute
  per-category paths are allowed; a category's resolved root changing
  between runs triggers a per-category re-export from the vector index into
  the new location (extending `bootstrapSeed`'s existing `md_seeded_at`
  pattern with a per-category `md_root:<category>` meta key) rather than a
  physical move — the old file is left orphaned on disk, not deleted or
  renamed; and a `path` set on a category whose storage resolves to
  `vector` (ticket `06`) warns rather than errors. `storage.path` itself is
  now `undefined` by default (no more baked-in `.default('.neuron')`) so
  "top level unset" is observable — an intentional, tested behaviour change
  to the config shape, not to any file's actual location. Collision
  validation (same file, not same directory) lives in `validateNeuronYaml`;
  "path resolves to a file, not a directory" is checked where it's
  fs-checkable, at adapter construction. 23 new tests, `npm test` 546/546,
  `tsc --noEmit` clean; `npm run test:e2e` deliberately skipped (grepped,
  zero coupling to anything this ticket touched). **ADR deferred, not
  written** — ticket's own text calls for one ADR covering both `05` and
  `06`'s vocabulary changes, written by whichever lands second; `06` hasn't
  landed. Unblocks `06`. Frontier is now `01`, `02`, `06`, `11`, `13`, `14`,
  `19`.
- **[06 — Storage Mode: Top-Level Default with Per-Category Override, `split`
  Removed](issues/06-storage-mode-override-remove-split.md) resolved
  2026-08-08.** Grilled the upgrade-hazard question first, per its own Scope
  item 1, via `AskUserQuestion`. While grounding the questions against the
  real router code, found a **real, mechanical data-loss bug** the
  always-live override would newly trigger:
  `DualStorageRouter.reconcileCategoryWithPathGuard`'s first-sighting branch
  fell through to the destructive strict-mirror reconcile instead of
  reseeding, on an assumption ("nothing to compare against yet") that held
  only while `split` gated whether the per-category override was live —
  broken once the override is always live, since a category can now enter
  the `md`-reconciled set for the first time on a store that already has
  real vector rows for it. Fixed by reseeding every first sighting the same
  way a root change already does, with a regression test that reproduces
  the exact scenario. Three rulings: `split` aliases to `md`, not `vector`
  (reproduces split's own pre-existing default byte-for-byte); a category
  flipping `md`→`vector` warns once on stderr rather than refusing to load
  or auto-migrating `neuron.yaml`; general upgrade posture is warn, never
  refuse, never auto-migrate. Ticket 44's field-column warning (Scope item
  5) turned out already moot — ticket 44 (2.2.0) shipped unconditional
  SQLite column support for declared fields regardless of storage mode;
  only stale comments claimed otherwise. [ADR 0016 — Per-Category Storage
  Vocabulary](../../docs/adr/0016-per-category-storage-vocabulary.md)
  written, covering both `05`'s and this ticket's vocabulary changes (owed
  jointly per `05`'s own Answer). Docs swept — scaffold template, README,
  `docs/COMMANDS.md`, `CONTEXT.md`, `TEST_INFRA.md`, and the packaged
  `neuron-memory` skill (`.claude/skills/neuron-memory/SKILL.md`, copied
  into every user project by `neuron init`) — the skill sweep done at the
  maintainer's direct mid-session request. ADR 0011's own historical text
  and `CHANGELOG.md` deliberately left untouched (append-only record), as
  was `test/e2e/adversarial-corpus.ts`'s deliberately-superseded
  `contra-storage-default` fixture. `npm test` 552/552 green, `tsc --noEmit`
  clean; `npm run test:e2e` skipped (no coupling, same reasoning `05`
  used — retrieval parity across storage modes is unchanged by this
  ticket). Frontier is now `11`, `13`, `14`, `19`, `20`, `21`, `22`.
- **[23 — `init.test.ts`'s "harness-idempotent-test" Case Still Pollutes the
  Real `.neuron` Store](issues/23-init-test-harness-idempotent-isolation-gap.md)**
  added 2026-08-08, surfaced while committing `06`: one test in
  `init.test.ts` never plants the `package.json` isolation guard every
  sibling test in the file uses, so `findProjectRoot` walks past it to this
  repo's real root and `neuron init`'s markdown writes land in the real
  `.neuron/decisions.md`. A one-test gap in
  [neuron-2.2.0's ticket 42](../neuron-2.2.0/issues/42-isolate-cli-tests-from-real-store.md)'s
  audit, not a regression it introduced — verified via `git show`/`git log`
  that ticket 42's own commit never touched this file, consistent with its
  Answer's (in this one case incorrect) claim the file was already safe.
  Not wired as a blocker of `04` — a test-infrastructure correctness gap,
  not a release dependency.
- **[23 — `init.test.ts`'s "harness-idempotent-test" Case Still Pollutes the
  Real `.neuron` Store](issues/23-init-test-harness-idempotent-isolation-gap.md)
  resolved 2026-08-08.** The named test wasn't the only gap: `init.test.ts`
  has no global `beforeEach` planting `package.json` the way every other CLI
  test file does, so each test manages isolation individually — and the
  file's first four tests (`'should support the init command...'`,
  `'copies skill to existing .agents/ directory...'`, `'copies skill to all
  detected harness dirs...'`, `'falls back to .agents/skills/...'`) had the
  identical gap, unnoticed until this ticket's Scope item 2 forced a
  per-test grep across all 10 `execSync`/`spawnSync`-using CLI test files
  rather than a file-level skim (the exact mistake ticket 42's original
  audit made). All five fixed with the same one-line guard. The other nine
  files audited clean: six already isolate every test via a shared
  `beforeEach` or per-`describe` setup, and `feedback.test.ts`/
  `scan.test.ts`/`status.test.ts` run at the real repo root by design but
  never write (URL-builder, `--dry-run`, and a read-only status command
  respectively — verified against source, not assumed). `npm test` run
  twice consecutively, 552/552 both times, `.neuron/` byte-identical.
  Frontier is now `11`, `13`, `14`, `19`, `20`, `21`, `22`.
- **[11 — Re-Inject the Architecture Card on the First `pre-prompt` of Each
  Epoch](issues/11-reinject-architecture-card-per-epoch.md)** — re-fetches
  and injects the architecture card on the first `pre-prompt` of each epoch
  (never from `context-reset`), reserving the turn's own budget first and
  charging both through one `recordPrePromptTurn` call so `07`'s telemetry
  reflects the true combined spend. One concatenated `emit()` payload, not
  two. Graduated [24](issues/24-architecture-card-ab.md), a repeatable A/B
  proving the card's value, at the maintainer's direct request. Frontier is
  now `05`, `13`, `14`, `19`, `20`, `21`, `22`, `24`.
- **[31 — Fix `neuron memory` Query/List Default Ordering and
  Limits](issues/31-fix-query-list-defaults.md) resolved 2026-08-09.** No
  open design questions — carried forward exactly as scoped. List mode
  (`NeuronMemory.queryVector`, `src/index.ts`) now orders `ORDER BY rowid
  DESC` (recency) instead of `ASC` (oldest-first), matching the deprecated
  `listHistory` wrapper it had regressed behind; its default limit split
  from text-query mode's unchanged `?? 5` to its own `?? 20`, matching
  `listHistory`'s own existing default. `hook.ts`'s
  `fetchArchitectureCardPayload` category-fill fallback passes an explicit
  limit (unaffected by the default change) but inherits the ordering fix,
  now filling from the most recent same-category entries rather than the
  oldest — no regression against ticket `25`'s own stable-id test, which
  asserts no ordering. **Found while verifying:**
  `src/commands/ui.test.ts`'s `/api/learnings` test asserted the old
  oldest-first order — a real instance of the same bug surfaced through the
  HTTP API instead of the CLI; corrected to expect the fixed order rather
  than loosened. Two new tests added to `src/index.test.ts` (list-mode
  ordering, list-vs-text default-limit divergence), since neither was
  covered before. `npm test` 580/580, `tsc --noEmit` clean; `test:e2e`
  skipped — grepped, every e2e call site already passes explicit `text` and
  `limit`. Unblocks `32`. Frontier is now `20`, `21`, `22`, `28`, `32`.
- **[35 — Is `categories` Authoritative or
  Advisory?](issues/35-categories-authoritative-or-advisory.md)** —
  advisory, not validated, but self-maintaining: the first write to an
  undeclared category auto-appends a minimal `categories.<name>: {}` block
  to `neuron.yaml` (via the `yaml` package's comment-preserving `Document`
  API, not a plain overwrite). Inferred-category strictness stays
  unchanged (deliberately asymmetric with explicit `--category`); this
  repo's own `scan.category: decisions` alias reverts to the real
  `'architecture'` default; existing undeclared categories backfill via an
  extended `neuron status --repair`; one hook point
  (`NeuronMemory.transact()`, `src/index.ts:828`) covers both `memory add`
  and `neuron scan` since both already funnel through it. Full design in
  [ADR 0017](../../docs/adr/0017-category-declaration-authority.md).
  **Implementation graduates onto a new map,
  [neuron-2.4.0](../neuron-2.4.0/map.md), not this one** — see this map's
  own Notes for the redirect rationale.
- **[34 — Cut and Publish 2.3.0-rc2](issues/34-cut-rc2.md)** — `v2.3.0-rc2`
  tagged and pushed; CHANGELOG/README/doc-audit against the real
  `v2.3.0-rc1..HEAD` diff (one new stale-doc find: `CONTEXT.md`'s harness-
  adapter glossary entry); 580/580 unit, `tsc` clean, 12/13 e2e (Pillar 8 a
  known pre-existing flake). At the maintainer's direct instruction,
  `feat/2.3.0` was also merged into `main` early — a deliberate one-time
  exception to this map's own merge-at-epic-end cadence — specifically to
  unblock [36](issues/36-verify-publish-workflow-real-run.md)'s real-push
  verification. Full detail, including the `autoRescanIfDriftDetected`
  merge trap hit and recovered from, and the discovery of an active branch-
  protection ruleset on `main`, in this map's own Notes.
- **[28 — Architecture Index + Module Cards](issues/28-architecture-index-and-module-cards.md)**
  — the monolithic blueprint card is now an always-small index (module list
  + project metadata) plus one separately-addressable markdown card per
  module, upserted in one transaction; stale module cards (a module removed
  from the repo) are deleted on re-scan. Follow mechanism is ordinary
  pre-prompt relevance recall — no new fetch API. 584/584 tests.
- **[29 — Reassemble the Diff Baseline from the Index + Module
  Cards](issues/29-diff-baseline-reassembly.md)** — `getArchitecturalDrift`
  now fetches the index by stable id (`findById`, fixing a second instance
  of ticket 25's category-crowding bug) and reassembles it with each module
  card back into the legacy monolithic shape, so `parseBaselineBlueprint`/
  `calculateArchitecturalDiff` need zero changes. Resolved together with
  `28` in the same session — see that entry above for why.

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
- **The A/B harness's execution mechanism and funding — now concretely
  blocking, not just open.** [24](issues/24-architecture-card-ab.md) built
  and dry-run-validated a real harness 2026-08-08, then hit this exact
  question live: this session's sandbox has no `ANTHROPIC_API_KEY`, and
  `@anthropic-ai/sdk`'s fallback OAuth credential discovery can't reach its
  token endpoint from here, so the scripted 8-session pilot failed 2
  sessions in. Maintainer chose to stop rather than pick a path this
  session; `24` is left open, harness ready, for whichever path (supplied
  API key, or driving the sessions as live Claude Code subagents instead of
  a scripted harness) gets chosen next.

  The underlying question predates `24`: neither `10` nor `14` specifies
  whether the "N tasks × 2 arms × k repeats" sessions run as
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

- **`findById` doesn't fully reconcile a cold store.** Found 2026-08-08 while
  building [24](issues/24-architecture-card-ab.md)'s A/B fixtures: `findById`
  calls `this.router.query({ limit: 0 })` to force a reconcile before its raw
  SQLite read, but on a genuinely cold store (fresh worktree, brand-new
  project, first invocation ever) that `limit: 0` call doesn't actually
  populate the mirror — confirmed live, a fresh git worktree's very first
  `neuron hook claude-code session-start` missed the architecture card
  entirely (`findById` returned not-found for a row a normal `query()`
  immediately afterward found under the exact same id), while every call
  after that first one succeeded, since the mirror was warmed by then. Self-
  healing after one miss, so low severity, but affects `findById` broadly —
  including the `--supersedes` flow (`17`) — not just `25`'s new call site.
  Whether the fix is making `router.query({limit:0})` actually force a real
  reconcile, or `findById` falling back to a `limit:1` query on a miss, is
  unformed.

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
