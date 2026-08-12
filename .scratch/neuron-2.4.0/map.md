# Map — neuron 2.4.0

## Destination

`@kovartravis/neuron` **v2.4.0** published to npm. Like
[neuron-2.3.0](../neuron-2.3.0/map.md) (itself renamed from a
narrower-scoped predecessor), this map is a **catch-all for the next
release** — its destination is "whatever `2.4.0` ships," fixed only by its
own eventual cut-and-publish ticket, not chartered here yet.

Seeded with one concrete piece of known work rather than a blank slate:
[ADR 0017 — Category Declaration Authority](../../docs/adr/0017-category-declaration-authority.md),
designed and fully resolved on `neuron-2.3.0`'s own
[ticket 35](../neuron-2.3.0/issues/35-categories-authoritative-or-advisory.md),
redirected here mid-session once its real scope became clear (a
comment-preserving `neuron.yaml` round-trip write path, plus a `status
--repair` backfill) — bigger than a same-map implementation ticket on a
map already accumulating toward its own rc2 cut.

Reaching the end means at minimum ADR 0017's design is implemented and
verified, plus whatever else lands here before a cut ticket is chartered
and closes it out. **As of 2026-08-10** that "whatever else" is no longer
hypothetical — ten tickets and their fog moved here wholesale from
neuron-2.3.0's own scope-narrowing pass (see Notes); this map still has no
cut ticket of its own and no breadth-first charter, but it is no longer
thin.

## Notes

- **Split off from [neuron-2.3.0](../neuron-2.3.0/map.md) on 2026-08-09**,
  mid-grilling-session, at the maintainer's direct request — not a full
  chartering session (no breadth-first frontier grilling has happened
  yet). The single seed ticket below is real, sized, and unblocked; nothing
  else has been surfaced or fogged in yet. Treat this map as thin by
  design, not as a sign the destination is small — the next session
  working this map should breadth-first grill for what else `2.4.0` should
  admit, the same way `neuron-2.3.0` accreted its config/context-cost bands
  after its own initial harness-expansion charter.
- **Received ten tickets and a fog dump from neuron-2.3.0's own scope
  narrowing, 2026-08-10.** With ~50% of the maintainer's weekly usage
  remaining, that map audited what its own
  [04 — Cut and Publish 2.3.0](../neuron-2.3.0/issues/04-cut-and-publish.md)
  actually blocks on (`01`/`02`/`03`, waiting on real-harness-install
  verification — everything else there was already resolved) and moved
  everything not wired as a blocker of that cut here, renumbered:
  - `02` — [Verify the Publish Workflow Against a Real
    Push](issues/02-verify-publish-workflow-real-run.md) (was `36`; claimed,
    in progress — first live workflow run already confirmed the fix for a
    real bug, `NPM_TOKEN`-less publish auth now works via OIDC; items 3/4/5
    of its own Scope remain)
  - `03` — [GitHub Action: Automated npm Publish on Push to
    Main](issues/03-github-action-automated-publish.md) (was `21`; claimed,
    blocked by `02`)
  - `04` — [Run the Counterfactual A/B on Synthetic Repos with Synthetic
    Memory Sets](issues/04-synthetic-fixture-counterfactual-ab.md) (was
    `19`; claimed, harness built and live-piloted — favorable, adequately
    powered result already shipped to `README.md`; its own Status/Answer
    bookkeeping was left stale by a later session and still needs fixing)
  - `05` — [Architecture Card A/B: With vs
    Without](issues/05-architecture-card-ab.md) (was `24`; claimed, harness
    built and dry-run-validated; blocked only on choosing a funded execution
    path — see the fog entry below)
  - `06` — [Per-Prompt Discovery-Command
    Hint](issues/06-per-prompt-discovery-command-hint.md) (was `32`;
    unclaimed, unblocked — its own blocker `31` resolved on neuron-2.3.0
    before the move)
  - `07` — [Measure Whether the Discovery-Command Hint Gets
    Used](issues/07-measure-discovery-hint-usage.md) (was `33`; unclaimed,
    blocked by `06`)
  - `08` — [Implement the Git-Log Index](issues/08-implement-git-log-index.md)
    (was `40`; unclaimed, unblocked — its own blocker `39` resolved on
    neuron-2.3.0 before the move)
  - `09` — [Update Generated Protocol Block, Packaged Skill & README for the
    Git-Log Index](issues/09-update-init-skill-readme-for-git-log-index.md)
    (was `41`; unclaimed, blocked by `08`)
  - `10` — [Dogfood the Git-Log Index in This
    Repo](issues/10-dogfood-git-log-index.md) (was `42`; unclaimed, blocked
    by `08`, `09`)
  - `11` — [Re-run the Git-Log A/B Against the Real (Semantic)
    Mechanism](issues/11-rerun-gitlog-ab-semantic-mechanism.md) (was `43`;
    unclaimed, blocked by `08`)

  Each kept its own claimed/unclaimed status and in-progress work — this was
  a scope move, not a reset. Cross-links between these ten tickets now point
  within this map's own `issues/`; links to tickets that stayed on
  neuron-2.3.0 (`10`, `11`, `14`, `25`–`30`, `39` — all already resolved
  there) point back at that map's `issues/` by relative path. One ticket,
  [37 — Cut and Publish 2.3.0-rc3](../neuron-2.3.0/issues/37-cut-rc3.md),
  was **not** moved — closed as superseded on neuron-2.3.0 instead, since an
  interim rc gated on `06`'s now-deferred landing wasn't worth its own
  session once `2.3.0`'s real remaining blockers narrowed to two HITL
  install checks. True frontier here is now `01`, `06`, `08` (all unclaimed
  and unblocked); `02`, `04`, `05` are claimed and in progress; `03`, `07`,
  `09`, `10`, `11` are blocked.
- **Breadth-first grilling session, 2026-08-10**, chartering two new
  threads the maintainer brought directly rather than a full re-charter of
  the whole map: "dogfood neuron everywhere possible" and "clean up the
  repo so it reads well." Split into five tickets:
  - [12 — Should `neuron exec`'s Pre-Command Lookup Become a Hook
    Instead?](issues/12-precommand-hook-vs-exec.md) — graduated from this
    map's own standing fog item once its prerequisite (Copilot/Cursor
    adapters shipping on neuron-2.3.0) was confirmed resolved. Unblocked;
    blocks `13`.
  - [13 — Audit: Dogfooding Gaps in This
    Repo](issues/13-audit-dogfooding-gaps.md) — process-rigor track of the
    dogfooding thread. Blocked by `12` at the maintainer's request, so it
    audits against whatever pre-command mechanism `12` lands on rather than
    the convention it might replace.
  - [14 — Design: Should Neuron Replace `.scratch/` as This Repo's Issue
    Tracker?](issues/14-neuron-as-tracker-design.md) — raised by the
    maintainer mid-session when asked whether `.scratch/` itself was in
    scope for the cleanup thread; reframes both new threads at once
    (dogfooding the tracker itself, and removing most of what makes
    `.scratch/` look sprawling). Includes deciding how/whether to migrate
    the 20+ existing `.scratch/` efforts. Unblocked.
  - [15 — Audit: Repo Cleanup Punch List](issues/15-audit-repo-cleanup-punch-list.md)
    — code readability + repo hygiene sweep (root-level stray docs, the
    untracked `tmp/` dir, `src/` structure). Explicitly excludes `.scratch/`
    itself, which `14` now governs. Unblocked.
  - [16 — Curate This Repo's `.neuron/` Store as the
    Showcase](issues/16-curate-neuron-store-showcase.md) — showcase track of
    the dogfooding thread; the maintainer's chosen deliverable is the
    repo's own store, not a separate demo doc. Blocked by `13` and `14`,
    since both change what the store looks like by the time this runs.

  True frontier as of this session: `01`, `06`, `08`, `12`, `14`, `15` (all
  unclaimed and unblocked); `02`, `04`, `05` claimed and in progress; `03`,
  `07`, `09`, `10`, `11`, `13`, `16` blocked.
- **Ticket 17 added, 2026-08-10**, direct maintainer request: [17 —
  Antagonistic Recall: Does Neuron Abstain When Nothing Is
  Relevant?](issues/17-antagonistic-recall-abstention-benchmark.md). Every
  existing recall benchmark (Pillar 7's adversarial corpus, LongMemEval's
  `retrieval_eval.py`) measures ranking when a relevant memory exists; none
  measure the mirror case ADR 0012 opened with — a query with nothing
  relevant in the store at all, and whether the shipped lexical-only gate
  (ticket `41`) actually abstains rather than passing through an incidental
  keyword match. `relevance_gate_eval.py`'s Run 3 negative control already
  builds the right fixture (a cross-partition query guaranteed to share no
  gold evidence) but only recorded its cosine, never its actual gate
  decision — this ticket finishes that measurement and adds the resident
  E2E equivalent. Unclaimed, unblocked. True frontier updated to include
  `17`.
- **Ticket 06 resolved, 2026-08-10.** Built the discovery-command hint;
  see its own Answer and the Decisions-so-far entry above. Resolving it
  unblocks [07 — Measure Whether the Discovery-Command Hint Gets
  Used](issues/07-measure-discovery-hint-usage.md), which now joins the
  frontier. True frontier as of this session: `07`, `08`, `12`, `14`, `15`,
  `17` (all unclaimed and unblocked); `02`, `04`, `05` claimed and in
  progress; `03`, `09`, `10`, `11`, `13`, `16` blocked.
- **Ticket 07 resolved, 2026-08-10.** Before building anything, checked
  with the maintainer whether to spend real money on
  `benchmarks/token-ab/` for this ticket's outcome-quality question, given
  the map's own fog already flags that exact funding/execution decision as
  unresolved and blocking `05` — same precedent, same question, asked
  again rather than assumed. Maintainer chose free dogfooding
  instrumentation over a paid run. Built a passive, zero-cost, ongoing
  measurement instead: `src/harnesses/hintFollowLog.ts` plus a
  `post-tool-use` hook point (deliberately *not* a `LifecyclePoint` —
  Claude-Code-only, hand-wired into this repo's own
  `.claude/settings.json`, never installed by `neuron init`) records every
  hint firing and every matching `neuron memory query` Bash call;
  `benchmarks/hint-follow/analyze.mjs` (`npm run bench:hint-follow`) joins
  them into a follow rate. See its own Answer for the two false-positive
  bugs found and fixed during live smoke testing. The outcome-quality
  question is *not* answered by this ticket — moved to Not yet specified
  below, alongside `05`'s. True frontier as of this session: `08`, `12`,
  `14`, `15`, `17` (all unclaimed and unblocked); `02`, `04`, `05` claimed
  and in progress; `03`, `09`, `10`, `11`, `13`, `16` blocked.
- **Four tickets and two fog items added, 2026-08-10, from a real dogfooding
  feedback batch** (maintainer-photographed terminal output from a session
  using a published neuron install in another repo, `travisos`). Triaged
  against current `src/`, not transcribed blindly — two of the seven
  recommendations in the original feedback turned out to already be shipped
  behavior once checked against the code rather than assumed broken:
  - [18 — Fix Concurrent-Write Data Loss in Markdown
    Storage](issues/18-fix-concurrent-write-data-loss.md) — the critical
    item: two racing `neuron memory add` calls each report `created` but
    only one persists. Confirmed as a real, still-open bug —
    `mdStorageAdapter.ts`'s `writeEntry`/`updateEntry`/`deleteEntry` are
    unlocked read-modify-write cycles. Folds in the batch's own item 2
    ("make `--supersedes` fail loudly on a missing target") as the *same*
    race rather than a separate gap, since flag-target validation
    (`memory.ts:88-93`) already fails loud today.
  - [19 — Non-Interactive Write Mode for Scheduled/Cron
    Writers](issues/19-non-interactive-write-mode-for-cron.md) — cron jobs
    can't answer the supersession gate's interactive prompt-and-retry loop.
  - [20 — Ship `neuron doctor`](issues/20-ship-neuron-doctor.md) — one
    command for duplicate groups, importance histogram, superseded count,
    `sessionsObserved`; open question whether it's new or folds into
    `neuron status`.
  - [21 — Warn When Recall Is Never Invoked
    (`sessionsObserved: 0`)](issues/21-warn-on-zero-sessions-observed.md) —
    smallest item in the batch, good next pickup.

  Unclaimed and unblocked: `18`, `19`, `20`, `21`.

  Two more items moved to fog (Not yet specified, below) rather than
  ticketed, because checking them against current code raised a real open
  question instead of a sized task:
  - The batch's item 3 claimed the supersession similarity gate "never
    fired" (0 superseded across 670 entries) — but
    `findSupersessionCandidate`/`SUPERSESSION_SIMILARITY_THRESHOLD`
    (`src/index.ts:839,1644`) already exist, are already wired into
    `memory add`, and have their own test coverage. Whether 0/670 means the
    gate is broken, the 0.97 threshold is too strict for realistic
    near-duplicate content, or the store genuinely never had a near-dup, is
    unknown without a live repro — not a reimplementation task.
  - The batch's item 7 (decay importance by recency/access-frequency
    instead of trusting self-reported importance at write time) has no
    chosen formula or mechanism yet.

  **One item from the same feedback explicitly did not graduate to this
  map at all**: an open question about wiring up real session-start recall
  via `.github/hooks/neuron.json` in `travisos` itself — that file doesn't
  exist in this repo (confirmed), so it's a `travisos`-side dogfooding
  decision, not `neuron`-the-tool work. Answered back to the maintainer
  directly rather than ticketed here.

  True frontier as of this session: `08`, `12`, `14`, `15`, `17`, `18`,
  `19`, `20`, `21` (all unclaimed and unblocked); `02`, `04`, `05` claimed
  and in progress; `03`, `09`, `10`, `11`, `13`, `16` blocked.
- **Ticket 08 resolved, 2026-08-10.** Built the git-log index end to end
  per `39`'s rulings; see its own Answer and the Decisions-so-far entry
  above. Resolving it unblocks [09 — Update Generated Protocol Block,
  Packaged Skill & README for the Git-Log
  Index](issues/09-update-init-skill-readme-for-git-log-index.md) and
  [11 — Re-run the Git-Log A/B Against the Real (Semantic)
  Mechanism](issues/11-rerun-gitlog-ab-semantic-mechanism.md) directly;
  [10](issues/10-dogfood-git-log-index.md) still waits on `09` too. True
  frontier as of this session: `09`, `11`, `12`, `14`, `15`, `17`, `18`,
  `19`, `20`, `21` (all unclaimed and unblocked); `02`, `04`, `05` claimed
  and in progress; `03`, `10`, `13`, `16` blocked.
- **Ticket 09 resolved, 2026-08-10.** Updated the packaged skill, README,
  and `docs/COMMANDS.md`/`CONTEXT.md` to match `08`'s shipped git-log index;
  `protocolBlock.ts` needed no code change (`39` ruled supplement, not
  replace — see its own Answer and the Decisions-so-far entry above).
  Resolving it unblocks [10 — Dogfood the Git-Log Index in This
  Repo](issues/10-dogfood-git-log-index.md). True frontier as of this
  session: `10`, `11`, `12`, `14`, `15`, `17`, `18`, `19`, `20`, `21` (all
  unclaimed and unblocked); `02`, `04`, `05` claimed and in progress; `03`,
  `13`, `16` blocked.
- **Ticket 10 resolved, 2026-08-10.** Dogfooded `08`/`09`'s shipped git-log
  index against this repo's own real history and store; see its own Answer
  and the Decisions-so-far entry above. Found and fixed one real bug along
  the way (`CLAUDE.md`'s protocol header stale since `01`'s live category
  auto-declare) but didn't unblock anything new — `11` was already
  unblocked (blocked only by `08`). True frontier as of this session: `11`,
  `12`, `14`, `15`, `17`, `18`, `19`, `20`, `21` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `13`, `16`
  blocked.
- **Ticket 11 claimed, 2026-08-10 — harness built, blocked on live-run
  credentials.** Built the new `semantic` arm per Scope items 1-2, reusing
  `14`'s harness verbatim: `gitlog-semantic-search.mjs` (shells out to the
  real built CLI's `hook claude-code pre-prompt` path, zero-spend, local
  git + local embedder only), `gitlog-gate-task.mjs` (Scope item 4's
  silence case), and `run-gitlog-ab-semantic.mjs` (orchestrator; cites
  `14`'s `agent` and oracle `gitlog` arms rather than re-running them, per
  Scope item 3). `--dry-run` confirms the whole pipeline end to end for
  free — real semantic notes fire on all 3 reused tasks, genuine silence on
  the new gate task. Found a real result along the way: the shipped
  relevance gate (`cleanFtsQuery`'s OR-across-any-shared-word design) is
  much looser than "topically relevant" against this repo's own
  self-referential commit corpus — see the ticket's own Comments for the
  three failed silence-case attempts and how the passing one was
  constructed (computed corpus vocabulary, not a guess). Blocked on the
  live run itself: no `ANTHROPIC_API_KEY` in this environment, and the
  `ant` CLI's OAuth profile was expired with no way to refresh or
  interactively re-login from this session. Asked the maintainer directly
  (same funding/execution-blocker shape as `05`'s own fog item, immediately
  below); chose to leave `11` blocked rather than supply credentials this
  session. True frontier as of this session (excluding `11`, claimed but
  blocked): `12`, `14`, `15`, `17`, `18`, `19`, `20`, `21` (all unclaimed
  and unblocked); `02`, `04`, `05` claimed and in progress; `03`, `13`,
  `16` blocked.
- **Ticket 12 resolved, 2026-08-11.** Grilled with the maintainer to a
  four-part decision (scope, ADR treatment, injection timing, CLI-surface
  impact); see its own Answer and the Decisions-so-far entry above.
  Graduated `22`/`23`/`24` (unclaimed, unblocked/blocked-by-22/blocked-by-22-and-23
  respectively) rather than implementing here. Rewired `13` to block on
  `24` instead of `12`. True frontier as of this session (excluding `11`,
  claimed but blocked on credentials): `14`, `15`, `17`, `18`, `19`, `20`,
  `21`, `22` (all unclaimed and unblocked); `02`, `04`, `05` claimed and in
  progress; `03`, `13`, `16`, `23`, `24` blocked.
- **Ticket 14 resolved, 2026-08-11.** Grilled with the maintainer to a
  five-part decision (category shape, blocking representation, tracker-doc
  treatment, migration approach, ADR-or-amendment); see its own Answer and
  the Decisions-so-far entry above. Wrote [ADR 0018 — Neuron as This Repo's
  Issue Tracker](../../docs/adr/0018-neuron-as-issue-tracker.md). Graduated
  `25` (declare the `tickets` category, rewrite `issue-tracker.md`;
  unclaimed, unblocked) and `26` (bulk-migrate all 19 `.scratch/` efforts —
  including this map itself — into the `tickets` category, then delete
  `.scratch/`; unclaimed, blocked by `25`) rather than implementing here.
  True frontier as of this session (excluding `11`, claimed but blocked on
  credentials): `15`, `17`, `18`, `19`, `20`, `21`, `22`, `25` (all
  unclaimed and unblocked); `02`, `04`, `05` claimed and in progress; `03`,
  `13`, `16`, `23`, `24`, `26` blocked.
- **Ticket 15 resolved, 2026-08-11.** Swept the repo for code readability
  and hygiene per its own Question; full punch list published as
  [15-repo-cleanup-punch-list.md](issues/15-repo-cleanup-punch-list.md). Two
  items graduated to sized, low-risk candidates (delete three orphaned
  `2.0.0`-era root docs; decide `tmp/`'s gitignore fate); everything else
  recon'd (`console.log` audit, `src/` vs. the architecture card, the
  traversal-test fixtures, `CHANGELOG.md` size) was checked and cleared, not
  flagged — see its own Answer for detail. Didn't unblock anything directly
  (no ticket here lists it as a blocker); its punch list is input for a
  future graduation session, mirroring `13`'s relationship to `16`. True
  frontier as of this session (excluding `11`, claimed but blocked on
  credentials): `17`, `18`, `19`, `20`, `21`, `22`, `25` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `13`, `16`,
  `23`, `24`, `26` blocked.
- **Ticket 17 resolved, 2026-08-11.** Built and ran both measurements for
  real; see its own Answer and the Decisions-so-far entry above. Didn't
  unblock anything directly (no ticket here lists it as a blocker) — its
  99.80% LongMemEval false-accept measurement is input for a future
  cosine-floor/adjudication ticket, not chartered yet. One off-band finding
  (`Pillar 8`'s pre-existing concurrent-migration race, `no such column:
  "scope"`) confirmed unrelated and left for `18`. True frontier as of this
  session (excluding `11`, claimed but blocked on credentials): `18`, `19`,
  `20`, `21`, `22`, `25` (all unclaimed and unblocked); `02`, `04`, `05`
  claimed and in progress; `03`, `13`, `16`, `23`, `24`, `26` blocked.
- **Ticket 27 added and resolved, 2026-08-11**, direct maintainer request
  immediately after `17`'s resolution, then grilled live in the same
  session: [27 — Should Anything Be Done About the Gate's 99.80%
  False-Accept Rate?](issues/27-improve-gate-precision-decision.md). See its
  own Answer and the Decisions-so-far entry above for the full six-part
  decision. Graduated [28](issues/28-research-local-reranker-model.md)
  (research, unclaimed, unblocked) and
  [29](issues/29-build-pilot-reranker-gate.md) (task, unclaimed, blocked by
  `28`) rather than built here, mirroring `12`→22/23/24 and `14`→25/26's
  design-then-implementation split. True frontier as of this session
  (excluding `11`, claimed but blocked on credentials): `18`, `19`, `20`,
  `21`, `22`, `25`, `28` (all unclaimed and unblocked); `02`, `04`, `05`
  claimed and in progress; `03`, `13`, `16`, `23`, `24`, `26`, `29` blocked.
- **Ticket 30 added, 2026-08-11**, direct maintainer request: [30 — Fix
  `autoRescanIfDriftDetected`'s cwd/storage Project-Root
  Mismatch](issues/30-fix-autorescan-cwd-storage-mismatch.md). Caught live,
  mid-`27`'s grilling session: `neuron exec`'s own drift-auto-rescan
  overwrote the real architecture card with a scan of an unrelated
  subdirectory (`process.cwd()` used as the scan root with no upward-walk
  guard, while the storage write it lands in resolves the real project root
  via a separate upward walk — the two can silently diverge). Root cause
  traced to source before filing (`src/scanner/diff.ts:410-412`,
  `src/scanner/analyzer.ts:83`), not filed as a vague investigation.
  Second confirmed live instance of this bug class (first: 2026-08-08,
  `harness-idempotent-test`). Unclaimed, unblocked. True frontier as of
  this session (excluding `11`, claimed but blocked on credentials): `18`,
  `19`, `20`, `21`, `22`, `25`, `28`, `30` (all unclaimed and unblocked);
  `02`, `04`, `05` claimed and in progress; `03`, `13`, `16`, `23`, `24`,
  `26`, `29` blocked.
- **Ticket 18 resolved, 2026-08-11.** Fixed the concurrent-write data-loss
  race; see its own Answer and the Decisions-so-far entry above. Didn't
  unblock anything directly (no ticket here lists it as a blocker). True
  frontier as of this session (excluding `11`, claimed but blocked on
  credentials): `19`, `20`, `21`, `22`, `25`, `28`, `30` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `13`, `16`,
  `23`, `24`, `26`, `29` blocked.
- **Ticket 19 resolved, 2026-08-11.** Built `--if-novel` on `memory add`; see
  its own Answer and the Decisions-so-far entry below. Didn't unblock
  anything directly (no ticket here lists it as a blocker). True frontier as
  of this session (excluding `11`, claimed but blocked on credentials): `20`,
  `21`, `22`, `25`, `28`, `30` (all unclaimed and unblocked); `02`, `04`, `05`
  claimed and in progress; `03`, `13`, `16`, `23`, `24`, `26`, `29` blocked.
- **Ticket 20 resolved, 2026-08-11.** Shipped `neuron status --health`
  rather than a new `neuron doctor` command; see its own Answer and the
  Decisions-so-far entry above. Didn't unblock anything directly (no ticket
  here lists it as a blocker) — `21` (the proactive-warning half of the same
  dogfooding batch) remains open and unclaimed, since `--health`'s inline
  `sessionsObserved` warning is opt-in, not the proactive surface `21` asks
  for. True frontier as of this session (excluding `11`, claimed but blocked
  on credentials): `21`, `22`, `25`, `28`, `30` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `13`, `16`,
  `23`, `24`, `26`, `29` blocked.
- **Ticket 20 addendum, same session, 2026-08-11.** Maintainer asked
  immediately after 20's resolution whether `--health` actually fixes
  anything or only reports — correctly only reports — and asked for a
  repair mode. Added `--health --repair` (see 20's own Answer for the
  design) rather than a new ticket, since it's the same subject and the
  maintainer was live. Ran it for real against this repo's own store at the
  maintainer's confirmed go-ahead: 30 of 34 duplicate groups merged, 5 real
  near-dups correctly left unresolved. Didn't change the frontier.
- **Ticket 21 resolved, 2026-08-11.** Built the proactive surface `20`'s
  addendum flagged as still missing; see its own Answer and the
  Decisions-so-far entry below. Didn't unblock anything directly (no ticket
  here lists it as a blocker). True frontier as of this session (excluding
  `11`, claimed but blocked on credentials): `22`, `25`, `28`, `30` (all
  unclaimed and unblocked); `02`, `04`, `05` claimed and in progress; `03`,
  `13`, `16`, `23`, `24`, `26`, `29` blocked.
- **Ticket 22 resolved, 2026-08-11.** Built the `pre-command` hook end to
  end per `12`'s ruling; see its own Answer and the Decisions-so-far entry
  below. Found and fixed a real latent bug along the way: `init.ts`'s
  recall-fidelity report would have misreported an unaffected, already-wired
  recall setup as un-wired the moment `pre-command` — a different feature —
  wasn't yet installed on an upgraded-but-not-re-`init`'d project; scoped to
  a new `RECALL_LIFECYCLE_POINTS` constant instead. Resolving it unblocks
  [23 — Fidelity-Conditional Command Execution
  Step](issues/23-fidelity-conditional-exec-step.md) directly (its only
  blocker). True frontier as of this session (excluding `11`, claimed but
  blocked on credentials): `23`, `25`, `28`, `30` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `13`, `16`,
  `24`, `26`, `29` blocked.
- **Ticket 23 resolved, 2026-08-11.** Made `execStep()` independently
  fidelity-conditional per `12`'s ruling 4; see its own Answer and the
  Decisions-so-far entry above. Resolving it unblocks [24 — Dogfood the
  Pre-Command Hook in This
  Repo](issues/24-dogfood-precommand-hook.md) directly (its only remaining
  blocker, `22`, was already resolved). True frontier as of this session
  (excluding `11`, claimed but blocked on credentials): `24`, `25`, `28`,
  `30` (all unclaimed and unblocked); `02`, `04`, `05` claimed and in
  progress; `03`, `13`, `16`, `26`, `29` blocked.
- **Ticket 24 resolved, 2026-08-12.** Live-verified `22`/`23`'s shipped
  `pre-command` hook against this repo's own real install; see its own
  Answer and the Decisions-so-far entry below. Found and reverted one
  unintended side effect: a bare (unscoped) `neuron init` auto-onboarded
  the GitHub/Copilot harness because this repo has a `.github/` directory,
  recreating `AGENTS.md`/`.github/hooks|skills/` — reverted as out of this
  ticket's scope, matching an already-recorded memory gotcha. Didn't unblock
  anything directly (no ticket here lists it as a blocker). True frontier as
  of this session (excluding `11`, claimed but blocked on credentials):
  `25`, `28`, `30` (all unclaimed and unblocked); `02`, `04`, `05` claimed
  and in progress; `03`, `13`, `16`, `26`, `29` blocked.
- **Ticket 31 added, 2026-08-12**, direct maintainer request, filed as a bug
  from `24`'s own found-and-reverted side effect rather than left as a
  workaround-only learning entry: [31 — `neuron init` Silently Onboards
  Every Detected Harness, Not Just the One In
  Use](issues/31-unscoped-init-silently-onboards-harnesses.md). Unclaimed,
  unblocked. True frontier as of this session (excluding `11`, claimed but
  blocked on credentials): `25`, `28`, `30`, `31` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `13`, `16`,
  `26`, `29` blocked.
- **Ticket 13 resolved, 2026-08-12.** Note: `24`'s own resolution note
  (immediately above) said it "didn't unblock anything directly," which
  missed that `13`'s `Blocked by: 24` field was satisfied the moment `24`
  resolved — a bookkeeping gap in this map's narrative, not in the
  tickets themselves (the frontier scan is defined over the ticket files,
  which were correct throughout). Picked up via that scan rather than the
  map's own stated frontier. See its own Answer and the Decisions-so-far
  entry above for the audit itself. Resolving it unblocks
  [16](issues/16-curate-neuron-store-showcase.md) directly (its other
  blocker, `14`, was already resolved) — `16` should have joined the
  frontier alongside `13` back at `24`'s resolution and didn't, same gap.
  True frontier as of this session (excluding `11`, claimed but blocked on
  credentials): `16`, `25`, `28`, `30`, `31` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `26`, `29`
  blocked.
- **Ticket 16 resolved, 2026-08-12.** See its own Answer and the
  Decisions-so-far entry above. Curation surfaced two real, previously
  undiagnosed-at-this-scale findings rather than confirming the store was
  already fine: the 5 duplicate architecture cards `20` had flagged but
  left unresolved, and a 204-entry (31% of the store) junk problem from two
  already-dead historical bugs. Both maintainer-confirmed before deletion
  given the destructive/at-scale nature of the actions. Didn't unblock
  anything directly (no ticket here lists it as a blocker, confirmed by
  scan). True frontier as of this session (excluding `11`, claimed but
  blocked on credentials): `25`, `28`, `30`, `31` (all unclaimed and
  unblocked); `02`, `04`, `05` claimed and in progress; `03`, `26`, `29`
  blocked.
- **This map carries execution**, matching `neuron-2.3.0`'s own posture
  (and, before it, `neuron-2.2.0`'s and `architecture-scans-2.1.0`'s) —
  tickets are worked one at a time, ending with a cut-and-publish ticket
  once one is chartered.
- **Skills to consult:** `/tdd` for ticket `01`'s implementation (schema
  migration to comment-preserving I/O plus a new write-time hook is exactly
  the shape prior tickets like `17`/`05`/`06` used `/tdd` for).
- **Protocol:** every session follows the `CLAUDE.md` memory-store loop.
  Record ADRs under `decisions`, session logs under `history`.

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

- [01 — Implement Category Declaration Authority](issues/01-implement-category-declaration-authority.md) — built ADR 0017 end to end: `neuron.yaml` I/O moved to the `yaml` package's `Document` API, an auto-declare hook in `NeuronMemory.transact()` appends a minimal `categories.<name>: {}` block on first write to an undeclared category (comments/formatting preserved), `neuron status --check`/`--repair` gained a distinct `undeclaredCategories` finding kind for pre-existing backfill, and this repo's own `scan: category: decisions` alias was reverted and re-verified live (`categories.architecture: {}` auto-declared for real). Found and fixed a real bug along the way: auto-vivifying a `categories` key on a file that had none at all would have silently dropped the schema's implicit default category set.
- [06 — Per-Prompt Discovery-Command Hint](issues/06-per-prompt-discovery-command-hint.md) — built: `NeuronMemory.countFtsMatches()` (raw, unranked, store-wide `COUNT(*)` against the same FTS index/cleaned query as the keyword leg) feeds `buildDiscoveryHint()`, which appends a real `neuron memory query "<prompt>" --limit <total>` line, dropped whole rather than truncated, when a real gap exists. Had to resolve one design question the ticket left open by omission: the gap must be measured against this turn's gated `limit: 10` recall count (`results.length`), not the post-ledger-dedup injected count — comparing against the latter re-fires the hint every turn on an already-seen entry and broke four pre-existing ledger-dedup tests.
- [07 — Measure Whether the Discovery-Command Hint Gets Used](issues/07-measure-discovery-hint-usage.md) — maintainer chose free dogfooding instrumentation over a paid `benchmarks/token-ab/` run (same funding question already open on `05`). Built a passive, zero-cost, always-on measurement: `hintFollowLog.ts` + a Claude-Code-only `post-tool-use` hook (hand-wired into this repo's own `.claude/settings.json`, not a `LifecyclePoint`, not installed by `neuron init`) log every hint firing and every matching `neuron memory query` Bash call; `npm run bench:hint-follow` joins them into a follow rate. Found and fixed two real false positives live, both stemming from this repo's self-referential nature (its own memory entries and commits routinely talk about its own commands): a bare substring match flagged commands that only *mentioned* the phrase in quoted text, and — after anchoring to shell-separator position — a `neuron memory add` entry whose quoted content described a chained invocation as prose still matched until a quote-parity check excluded matches inside string literals. The outcome-quality half of the question is unanswered — moved to fog, next to `05`'s.
- [08 — Implement the Git-Log Index](issues/08-implement-git-log-index.md) — built exactly what `39` (neuron-2.3.0) ruled: `src/harnesses/gitLog.ts` (pure git shell-out, ASCII-delimiter-safe commit parsing), a new `git_log_index`/`git_log_fts` SQLite migration (v9) with `refreshGitLogIndex()` (check-HEAD-on-read, one-time backfill then incremental) and `searchGitLog()` (a literal reuse of the ADR 0012 gate — FTS-match required before a dot-product rank, so a topically-absent prompt yields true silence), and pre-prompt-only wiring in `hook.ts` with its own additive, epoch-budget-carved `GIT_LOG_CHAR_BUDGET`. Found and fixed a real test-isolation bug along the way: `hook.test.ts`'s temp project dirs have no `.git` of their own and sit inside this real repo's tree, so without `GIT_CEILING_DIRECTORIES` every hook test started picking up this repo's *actual* git history the moment git shell-outs entered the code path. Manually dogfooded against this repo's real history — a prompt naming ticket 06 correctly surfaced its real commit (`65b9fcf6`) and the real ticket-07 follow-on (`e4742a9`). Unblocks `09` and `11` directly.
- [09 — Update Generated Protocol Block, Packaged Skill & README for the Git-Log Index](issues/09-update-init-skill-readme-for-git-log-index.md) — `protocolBlock.ts` needed **no code change**, confirmed rather than assumed: `39` ruled supplement (not replace) on the history write step, and hook-injected content the agent never invokes was already undocumented there by precedent (the architecture card, the discovery hint). Updated the three agent/human-facing surfaces that do need to match `08`'s shipped behavior: the packaged skill (`.claude/skills/neuron-memory/SKILL.md`, now telling agents the deterministic hook also covers `git log` search, not just memory), `README.md` (new "Your git history is a searchable resident source too" section — deliberately claims "surfaces real, correct commits," not a quantified win, since `39` found `14`'s favorable numbers were measured against oracle search terms the real semantic mechanism hasn't been re-verified against yet), and a `docs/COMMANDS.md`/`CONTEXT.md` sweep (one line, one new glossary entry). `TEST_INFRA.md` checked and left alone — scoped to `md-file-management`, nothing relevant. `npm test` 645/645, `tsc` clean. Unblocks `10`.
- [12 — Should `neuron exec`'s Pre-Command Lookup Become a Hook Instead?](issues/12-precommand-hook-vs-exec.md) — yes, for Claude Code and Codex CLI only, permanently: both confirmed to support `PreToolUse`/`additionalContext` injection (Claude Code verified live against the docs mid-session), while Copilot CLI's `preToolUse` and Cursor's `beforeShellExecution` are both permission/gating-only with no context field at all — a structural ceiling, not a research gap, so those two keep the CLAUDE.md-instructed `neuron exec` step permanently. Amends ADR 0014 (new `pre-command` `LifecyclePoint`, `CapabilityMap`/`SupportRecord` shape unchanged) rather than a new ADR. `protocolBlock.ts`'s `execStep()` becomes fidelity-conditional like `recallStep()` already is; `neuron exec`'s CLI surface itself is unchanged. Implementation graduated as tickets 22/23/24 rather than built here, mirroring `08`/`09`/`10`'s split for the git-log index; `13` rewired to block on `24` instead of this now-resolved ticket.
- [10 — Dogfood the Git-Log Index in This Repo](issues/10-dogfood-git-log-index.md) — re-`init`'d this repo for real and found live drift `09` didn't cause: `CLAUDE.md`'s protocol header still read `learning, history, decisions` / `category: decisions`, stale since `01`'s live auto-declare of `categories.architecture: {}` and its `scan.category` alias revert never got swept back into the header. Fixed by hand (the `--overwrite-hooks` write was blocked by the permission classifier as destructive) after confirming byte-for-byte match against the real generator output; re-init then reported `unchanged`. Packaged skill already matched `09`. Live-demonstrated the shipped injection path twice against real data (captured in `10-live-demo-capture.txt` and `10-commitless-gap-capture.txt`): a two-ticket-number prompt surfaced two real, verified commits; a prompt naming a real commit-less `history` entry (the session that chartered tickets 12–16, never committed on its own) confirmed it still surfaces via the ordinary memory-query leg per `39`'s supplement-not-replace ruling, while git-log correctly didn't fabricate a match for it. `npm test` 645/645, `tsc` clean. Unblocks nothing directly (was itself the last gate before `11`'s A/B could be trusted as measuring the real shipped thing) but confirms `08`/`09` actually work end to end, not just in tests.
- [14 — Design: Should Neuron Replace `.scratch/` as This Repo's Issue Tracker?](issues/14-neuron-as-tracker-design.md) — yes: a new `tickets` category built entirely from ADR 0011 (markdown store of record) and ADR 0013 (declared-field schema) machinery, no new storage mechanism. `status`/`type`/`blockedBy` are declared user-defined fields; mutation is the existing `transact({ op: 'update' })` path. Blocking stays a plain frontmatter field, not tracker-native, per the wayfinder skill's own documented fallback. `docs/agents/issue-tracker.md`'s local-markdown section is removed outright, not kept alongside. Migration is bulk — all 19 `.scratch/` efforts at once, `.scratch/` deleted once verified — rejecting both a permanent archive (incompatible with fully removing `.scratch` references from the doc) and lazy/on-touch migration (an indefinite, silently-decaying straggler set). Recorded as [ADR 0018](../../docs/adr/0018-neuron-as-issue-tracker.md). Implementation graduated as `25`/`26` rather than built here, mirroring `12`'s own split.
- [15 — Audit: Repo Cleanup Punch List](issues/15-audit-repo-cleanup-punch-list.md) — full sweep published as [15-repo-cleanup-punch-list.md](issues/15-repo-cleanup-punch-list.md). Two sized candidates graduated for a future session (delete three orphaned `2.0.0`-era root docs; decide `tmp/`'s gitignore fate); `console.log` audit, `src/` structure, the traversal-test fixtures, and `CHANGELOG.md` size were all checked and cleared.
- [27 — Should Anything Be Done About the Gate's 99.80% False-Accept Rate?](issues/27-improve-gate-precision-decision.md) — yes, fix it: the gate runs on every agent turn now, so 99.80% is near-constant noise, not a rare edge case. The cosine floor stays rejected (structural overlap, not a bar-too-strict problem). Direction: a local-only (hard maintainer constraint, no remote API) second-stage gate layer using a small cross-encoder reranker — not another chat model — ANDed onto the existing lexical leg without touching ranking. Acceptance bar pre-committed: false-accept rate must drop >5x (99.80% → under 20%) with ~zero new false-silence. Graduated as [28](issues/28-research-local-reranker-model.md) (find a real local ONNX reranker) and [29](issues/29-build-pilot-reranker-gate.md) (build and pilot it against the bar, blocked by `28`) rather than built here.
- [17 — Antagonistic Recall: Does Neuron Abstain When Nothing Is Relevant?](issues/17-antagonistic-recall-abstention-benchmark.md) — built both measurements; they sharply disagree, which is the finding. New resident `Pillar 13: Antagonistic Recall & Abstention` (19 queries verified disjoint from Pillar 7's store) measures **0% false-accept**. `relevance_gate_eval.py`'s extended negative control on the real LongMemEval-S split (500 questions) measures **99.80% false-accept**. Gap is corpus construction, not a bug: the resident pillar's vocabulary is adversarially disjoint by design, while LongMemEval's cross-partition negative control still shares ordinary conversational words with its query — the shipped OR-across-any-word lexical gate clears almost all of them. Measurement only, no fix attempted (mirrors `39`→`41`'s split); the 99.80% number is the input a future cosine-floor or adjudication ticket would need. One unrelated off-band finding: `Pillar 8`'s real e2e-runner.js run failed on a `no such column: "scope"` concurrent-migration race, confirmed pre-existing and squarely `18`'s territory, not fixed here.

- [18 — Fix Concurrent-Write Data Loss in Markdown Storage](issues/18-fix-concurrent-write-data-loss.md) — fixed with a per-category-file `mkdir`-based lock (no new dependency) serializing `writeEntry`/`updateEntry`/`deleteEntry`'s read-modify-write cycle across both processes and same-process `Promise.all` races, plus a read-back-and-byte-compare verify layered in regardless as a belt-and-suspenders floor. A stale lock (>30s, a crashed holder) is stolen rather than deadlocking forever. Four new `Promise.all`-driven regression tests confirmed to fail with real data loss when the fix is reverted, and pass with it in place. `npm test` 649/649, `tsc` clean.
- [19 — Non-Interactive Write Mode for Scheduled/Cron Writers](issues/19-non-interactive-write-mode-for-cron.md) — built `--if-novel` on `memory add`: on a supersession-gate hit it skips the write (exit 0, job still succeeds) instead of hard-erroring, but never silently — the candidate id/similarity go to stderr and the JSON on stdout becomes `{"skipped": true, "reason": "supersession-candidate", ...}` instead of the written entry, so a scripted caller can tell a skip from a real write by shape. Chose a flag on `memory add` itself over a separate `neuron exec --no-history` mode, since the gate lives on the write command, not `exec`. Mutually exclusive with `--supersedes`/`--not-a-reversal` (those assert a human already decided; `--if-novel` defers to the gate because none is present). Documented in `neuron memory --help` and a new README "Scheduled and cron writers" section — no prior cron/scheduled documentation existed in this repo to extend. `npm test` 653/653, `tsc` clean.
- [20 — Ship `neuron doctor`](issues/20-ship-neuron-doctor.md) — extension, not a new command: same "no new commands" precedent ADR 0013's ticket 36 already set for config-validation (`--check`/`--repair`) applies here too, so store-health signals landed as `neuron status --health` instead of a `doctor` binary. Built `NeuronMemory.getStoreHealth()` reusing `findSupersessionCandidate`'s embedding-cosine machinery pairwise across the whole live store, grouped via union-find so a near-duplicate chain reads as one group; importance histogram (1-5) and superseded count round it out. Human-readable by default, `--json` for scripting. `sessionsObserved` surfaced inline (not delegated — `21` hasn't landed). **Same-session addendum, direct maintainer follow-up**: added `--health --repair` (combines with `--health`, unlike `--check`, which stays mutually exclusive with both) — auto-merges exact-content duplicate subgroups within a cluster (latest-created survives, rest marked `supersededBy` it, never deleted), leaves genuinely different-worded near-dups unresolved for a human `--supersedes` call. Live-verified twice: `--health` alone found real store pollution (leftover test-fixture strings, architecture cards duplicated across `decisions`/`architecture` from the pre-`01`-revert alias period); `--health --repair` then ran for real against this repo's own store at the maintainer's confirmed go-ahead, merging 30 of 34 groups (155 entries) and correctly leaving the 5 real architecture-card near-dups unresolved. `npm test` 663/663, `tsc` clean.
- [21 — Warn When Recall Is Never Invoked (`sessionsObserved: 0`)](issues/21-warn-on-zero-sessions-observed.md) — built the proactive surface `20`'s addendum flagged as still missing: a `session-start` hook warning (once per session), not gated behind an explicit `--health`/`--status` call, and not folded into `--check` (scoped to config-schema compliance, a different question). `buildZeroSessionsWarning()` (`src/harnesses/ledger.ts`) fires only on literal `sessionsObserved === 0` with a non-empty store, appended alongside (not replacing) the architecture card within the same per-injection char budget; the `session-start` branch no longer returns early on "no card" now that it can have something to say on its own. `npm test` 670/670, `tsc` clean.
- [22 — Implement the Pre-Command Hook](issues/22-implement-precommand-hook.md) — built `pre-command` as `LifecyclePoint`'s fourth value with capability records verified via direct fetch, not carried over from `pre-prompt`: Claude Code and Codex CLI get `injects: true` (10,000/7,500-char caps, fail-open, 600s — `PreToolUse`'s own default, not `UserPromptSubmit`'s 30s); Copilot CLI and Cursor get `injects: false` permanently, confirmed structural (neither's shell hook has any context-carrying output field at all). The `pre-command` handler (`src/commands/hook.ts`) reuses `exec.ts`'s `resolveExecCategories`/`queryGated` verbatim, no-ops for any non-`Bash` tool call, and packs results under a new fixed `PRE_COMMAND_CHAR_BUDGET` — deliberately not wired into the session-ledger epoch, since this point fires per tool call rather than per turn. Found and fixed a real latent bug along the way: `init.ts`'s recall-fidelity report blindly included every injecting capability point, which would have misreported an unaffected, already-wired recall setup as un-wired the moment `pre-command` wasn't yet installed on an upgraded project; scoped to a new `RECALL_LIFECYCLE_POINTS` constant instead. `npm test` 676/676, `tsc` clean.
- [23 — Fidelity-Conditional Command Execution Step](issues/23-fidelity-conditional-exec-step.md) — made `execStep()` independently fidelity-conditional the same way `recallStep()` already is, rather than coupling the two: `generateProtocolBlock` now takes a separate `execFidelity` and numbers whichever steps survive by position, so all four combinations (both hooked, either alone, neither) are reachable. `init.ts` generalized `resolveHarnessFidelity` to take a `points` parameter and added `EXEC_LIFECYCLE_POINTS = ['pre-command']` beside `RECALL_LIFECYCLE_POINTS`, deriving `execFidelity` from real `verify()` state rather than assuming it tracks recall. Swept the packaged skill (mirrored `## 1. Beginning of Run`'s skip-this-section framing onto `## 2. Pre-Command Memory Lookup & Execution`), `README.md` (new subsection, same shape as `09`'s git-log precedent), `docs/COMMANDS.md` (was missing `pre-command` entirely), and `CONTEXT.md` (two glossary entries were flatly wrong post-`22`). This repo's own `CLAUDE.md` needed no edit — hand-verified byte-identical against the real generator output at `fidelity: deterministic, execFidelity: fallback` (pre-command isn't installed here yet; that's `24`'s job, deliberately left alone rather than run and step on its scope). `npm test` 678/678, `tsc` clean. Unblocks `24` directly.
- [24 — Dogfood the Pre-Command Hook in This Repo](issues/24-dogfood-precommand-hook.md) — live-verified end to end against this repo's real install: re-`init` wrote a real `PreToolUse` → `pre-command` entry in `.claude/settings.json`; two independent live Bash calls through this session actually triggered `additionalContext` injection matching two different `onExec` rules (captured in `tmp/24-live-capture-{1,2}.txt`); `--overwrite-hooks` confirmed `CLAUDE.md`'s `## 1. Command Execution` step is really gone (not just theorized); `protocolBlock.test.ts`'s fallback/fallback fixture confirms Copilot/Cursor still get the step. Found and reverted one unintended side effect: a bare `neuron init` also auto-onboarded the GitHub/Copilot harness via this repo's `.github/` directory (`AGENTS.md`, `.github/hooks|skills/`) — out of scope, reverted. `npm test` 678/678 (no regression), `tsc` clean.
- [16 — Curate This Repo's `.neuron/` Store as the Showcase](issues/16-curate-neuron-store-showcase.md) — found and fixed real showcase-undermining noise rather than treating the store as already fine: deleted 5 stale `decisions`-category duplicates of `architecture` cards (the exact 5 `20`'s repair pass had already found and correctly left for a human call, matching `neuron-2.2.0` ticket 37's own precedent for the same problem), then — after checking, not assuming — found 204 of 653 entries (31%) were pure junk from two already-dead historical bugs (141 test-fixture leaks predating tickets 42/47's test isolation; 63 argv-truncations predating v2.1.2) and deleted those too, maintainer-confirmed given the scale. `--health` now reports 0 duplicate groups; `npm test` 678/678, `tsc` clean. Added a direct `README.md` pointer to this repo's own `.neuron/*.md` files as the real example, alongside (not replacing) the existing synthetic schema-demo snippet.
- [13 — Audit: Dogfooding Gaps in This Repo](issues/13-audit-dogfooding-gaps.md) — full sweep published as [13-dogfooding-gaps-audit.md](issues/13-dogfooding-gaps-audit.md). One of the ticket's own four recon candidates (unwrapped `npm test`/`git commit`) turned out to already be resolved as a side effect of `22`-`24`'s pre-command hook; checked against source, not assumed. Five real gaps found and prioritized: **F1** CI never invokes `neuron` (recommend an architecture-drift `neuron scan --check` gate; recommend *against* CI write-back — no safe way to persist a `.neuron/` commit against a concurrent human push); **F2** the stale-global-binary trap (bitten twice already, both on record) now also covers every `.claude/settings.json` hook since `22`, not just `neuron exec`, with nothing detecting a version mismatch; **F3** `CLAUDE.md`'s generated protocol block can drift from `neuron.yaml` silently (already happened once, per `10`'s fix); **F4** no scheduled cadence for `neuron status --health`, so store rot is only ever caught manually; **F5** the free dry-run benchmark harnesses have no CI regression gate. Mirrors `15`'s own precedent: recon only, no tickets graduated this session — the backlog is input for a following session's implementation tickets. Resolving it unblocks [16](issues/16-curate-neuron-store-showcase.md) (its other blocker, `14`, was already resolved).

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

- **Supersession similarity gate reported never firing in real dogfood
  use.** Added 2026-08-10 from the same feedback batch as tickets
  `18`-`21`: a `travisos` session saw 0 superseded entries across 670,
  despite writing what the maintainer judged to be near-duplicates over
  time. The gate exists and is tested (`findSupersessionCandidate` /
  `SUPERSESSION_SIMILARITY_THRESHOLD = 0.97`, `src/index.ts:839,1644`,
  wired into `memory add` at `src/commands/memory.ts:94-105`), so this
  isn't "build the feature" — it's "find out why it didn't fire here."
  Candidate explanations, unranked: the 0.97 cosine threshold is too
  strict for what a human would call a near-duplicate; every actual
  near-dup in that store went through `--supersedes`/`--not-a-reversal`
  explicitly and correctly bypassed detection; or the store genuinely
  never contained a near-duplicate pair and 0/670 is simply correct.
  Needs a live repro (a deliberately near-duplicate write against a real
  or fixture store) before it's sharp enough to ticket either a threshold
  change or a "confirmed working as designed" close.
- **Importance decay.** Added 2026-08-10 from the same feedback batch:
  self-reported importance (passed once at write time via `--importance`)
  predictably inflates, and doesn't move afterward regardless of whether
  an entry is ever recalled again. The field feedback's suggestion is
  ranking by recency/access-frequency instead of trusting the write-time
  value verbatim. Unformed: whether this changes the stored `importance`
  field itself (mutating history) or only affects query-time ranking,
  what the decay function is, and whether access-frequency requires new
  tracking (query hits aren't currently recorded per-entry, only
  aggregated via `sessionsObserved`).
- **Everything else `2.4.0` admits.** This map is a catch-all seeded from a
  single redirected ticket, not yet breadth-first grilled. What else lands
  here (new bands, fresh maintainer asks) is unknown until a session runs
  that grilling pass.
- **The A/B harness's execution mechanism and funding — concretely
  blocking `05`, not just open.** Moved from neuron-2.3.0 2026-08-10 along
  with the ticket it blocks. `05` built and dry-run-validated a real harness
  2026-08-08, then hit this exact question live: that session's sandbox had
  no `ANTHROPIC_API_KEY`, and `@anthropic-ai/sdk`'s fallback OAuth
  credential discovery couldn't reach its token endpoint from there, so the
  scripted 8-session pilot failed 2 sessions in. Maintainer chose to stop
  rather than pick a path that session; `05` is left open, harness ready,
  for whichever path (supplied API key, or driving the sessions as live
  Claude Code subagents instead of a scripted harness) gets chosen next.

  The underlying question predates `05`: neither
  [neuron-2.3.0's `10`](../neuron-2.3.0/issues/10-counterfactual-token-ab.md)
  nor [its `14`](../neuron-2.3.0/issues/14-git-log-hook-vs-agent-log-ab.md)
  specifies whether the "N tasks × 2 arms × k repeats" sessions run as real
  Claude Code sessions (covered by whatever Claude Code subscription the
  maintainer already pays for, not separately metered) or as a scripted
  Claude API harness (billed per-token against a separate Anthropic Console
  balance). The two paths have very different cost profiles (subscription
  sessions are effectively free at the margin but must be driven live and
  are not scriptable for repeatable `k` repeats; an API harness is
  scriptable and repeatable but bills per token at standard rates — roughly
  low-single-digit dollars per run at Sonnet-tier pricing for a
  medium-length agentic session). Whichever session claims `05` should
  settle this before spending anything.
- **Does the discovery-command hint (ticket 06) actually improve task
  outcomes, not just get followed?** Raised 2026-08-10 while resolving `07`:
  the maintainer chose free dogfooding instrumentation for the
  hint-*followed* question (built, see `07`'s Decisions-so-far entry and
  its own Answer — `npm run bench:hint-follow`), explicitly leaving this
  half open rather than spending on it that session. Answering it needs a
  task that genuinely depends on discovering more than the initial recall
  surfaces (a README/summary task spanning many entries), run through
  `benchmarks/token-ab/` with and without the hint — the same paid-harness
  funding/execution question already blocking `05`, immediately above.
  Worth revisiting once `05` settles that question, or once
  `bench:hint-follow`'s real follow-rate signal (still empty as of `07`'s
  close — the instrument only starts collecting from the next real session
  onward) is strong enough to justify the spend.
- **`findById` doesn't fully reconcile a cold store.** Moved from
  neuron-2.3.0 2026-08-10. Found 2026-08-08 while building `05`'s A/B
  fixtures: `findById` calls `this.router.query({ limit: 0 })` to force a
  reconcile before its raw SQLite read, but on a genuinely cold store (fresh
  worktree, brand-new project, first invocation ever) that `limit: 0` call
  doesn't actually populate the mirror — confirmed live, a fresh git
  worktree's very first `neuron hook claude-code session-start` missed the
  architecture card entirely, while every call after that first one
  succeeded, since the mirror was warmed by then. Self-healing after one
  miss, so low severity, but affects `findById` broadly (including the
  `--supersedes` flow), not just one call site. Whether the fix is making
  `router.query({limit:0})` actually force a real reconcile, or `findById`
  falling back to a `limit:1` query on a miss, is unformed.
- **Plan-vs-architecture-diff (`diffAgainstArchitecture`).** Moved from
  neuron-2.3.0 2026-08-10. Requested in a 2026-08-02 repositioning handoff
  as a generic per-category flag in `neuron.yaml`, letting a category's
  entries (e.g. `plans`) be compared against the architecture diff by a
  two-stage pipeline — embedding similarity for matching, the 0.5B model
  only for phrasing already-confirmed matches, never for the match decision
  itself. **Cannot be ticketed: the handoff cites a full spec at
  `neuron-plan-vs-drift-handoff.md` that does not exist in this repo or
  anywhere reachable.** The handoff is explicit that the feature must be
  scoped *exactly* as that spec has it — no new package, no PM-software
  creep, no hardcoded category-name logic — so writing a replacement spec
  from the one-paragraph summary would be inventing the thing it says not to
  invent. Graduates the moment the spec is supplied.
- **A write-time content-integrity floor.** Moved from neuron-2.3.0
  2026-08-10. On `neuron-2.2.0`'s own store, roughly a quarter of entries
  held a single token (`Fix`, `Updated`, `When`) because unquoted shell
  arguments word-split and `neuron memory add` kept only the first
  positional. Otherwise well-formed rows, so nothing flags them and they
  still occupy an embedding slot. Whether the fix is a length floor, a
  whitespace check, a confirmation prompt, or an argument-count guard is
  unformed.
- **Bootstrapping category centroids on a cold store.** Moved from
  neuron-2.3.0 2026-08-10. `init` produces a working project, so the very
  first `neuron memory add` a user runs is against an empty store — and
  without `--category` it hard-errors ("category inference found no
  category close enough"). The recommended posture passes `--category`
  explicitly, so this may be acceptable. Whether the cliff is worth
  removing, and how, given the rejection of embedding short label strings,
  is unformed.
- **Tag vocabulary is a full-table read per process.** Moved from
  neuron-2.3.0 2026-08-10. Write-side enrichment reads every tagged row's
  embedding to build centroids on the first inferring write. Fine at a few
  hundred entries; wants a cached centroid table or an index long before
  it's a real problem. Not ticketed because the trigger — what store size
  actually hurts — has not been measured.
- **Confidently-wrong retrieval is unowned.** Moved from neuron-2.3.0
  2026-08-10. A `neuron-2.2.0` measurement found raw cosine *inverted* on
  wrong answers — top-1 cosine on queries retrieval got wrong (mean 0.7779)
  is *higher* than on queries it got right (mean 0.7518) — and no relevance
  gate addresses it: a gate rejects the *irrelevant*, not the *wrong*, and
  both its legs measure forms of confidence. Unformed because the prior
  question is unanswered: is a confidently-wrong top hit detectable at all
  from retrieval signals, or does catching it require adjudicating semantic
  opposites — the weakest capability of both the embedder and the 0.5B
  model? If undetectable, the honest response may be a disclosure rather
  than a fix. **[17](issues/17-antagonistic-recall-abstention-benchmark.md)
  is this fog item's cheaper, sharper-edged sibling** — no answer present at
  all, rather than a wrong one present — and needs no adjudication of
  "wrong," only "present vs. absent." Should settle first; its result may
  inform how tractable this one is.
- **Threat model for grammar delivery.** Moved from neuron-2.3.0 2026-08-10.
  Tree-Sitter `.wasm` grammars fetch from the npm registry over TLS with
  pinned versions, but do not verify the registry's `dist.integrity`
  checksum. A compromised mirror could serve a bad grammar. Not ticketed
  because the prior question is unformed: what threat model does a
  local-only dev tool owe its users?
- **Cross-harness testing strategy.** Moved from neuron-2.3.0 2026-08-10.
  neuron-2.3.0's four adapters (Claude Code, Codex, Copilot, Cursor) need
  verification against real harness installations. Whether that is
  CI-automatable or stays manual is unknown.

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

(none yet)
