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

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

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
  than a fix.
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
